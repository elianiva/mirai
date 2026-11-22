import { DurableObject } from 'cloudflare:workers'
import { BACKGROUND_CONTEXT } from '@earendil-works/chord/context'
import {
  createRegistry,
  Harness,
  type Conversation,
  type ConversationView,
  type EntryRecord,
  type LiveState,
} from '@earendil-works/pi-durable'
import { SqliteStorage } from '@earendil-works/pi-durable/storage/sqlite'
import { DurableObjectSqliteDatabase } from '@earendil-works/pi-durable/storage/sqlite/cloudflare'
import { createModels } from '@earendil-works/pi-ai/models'
import { openrouterProvider } from '@earendil-works/pi-ai/providers/openrouter'
import { Schema } from 'effect'
import { ChatSubmit, type ChatFrame, type ChatMessage } from '@mirai/rpc'
import type { Env } from '../env.ts'

const PROVIDER = 'openrouter'
const DEFAULT_MODEL = 'deepseek/deepseek-v4.1-flash-1017'
const TITLE_LENGTH = 80

type SocketState = {
  entry: number
  live: string | null
  status: 'idle' | 'thinking' | 'streaming' | 'error'
  error: string | null
}

const titleFrom = (text: string): string => text.trim().replace(/\s+/g, ' ').slice(0, TITLE_LENGTH)

/** Text from a pi-ai message, whose content is a string or a list of blocks. */
const textOf = (content: unknown): string => {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .flatMap((part) => {
      if (typeof part !== 'object' || part === null) return []
      const block = part as { type?: unknown; text?: unknown }
      return block.type === 'text' && typeof block.text === 'string' ? [block.text] : []
    })
    .join('')
}

/** One durable entry as a row the browser can append. */
const messageOf = (entry: EntryRecord): ChatMessage | undefined => {
  const message = entry.model?.[0]
  if (!message) return undefined

  if (entry.kind === 'pi.user' && message.role === 'user') {
    const text = textOf(message.content).trim()
    return text === '' ? undefined : { id: String(entry.id), role: 'user', text }
  }
  if (entry.kind === 'pi.assistant' && message.role === 'assistant') {
    const text = textOf(message.content).trim()
    return text === '' ? undefined : { id: String(entry.id), role: 'assistant', text }
  }
  return undefined
}

const liveText = (view: ConversationView): string | null => {
  const live = view.docs['pi.live'] as LiveState | undefined
  const partial = live?.generation?.message
  if (!partial) return null
  const text = textOf(partial.content)
  return text === '' ? null : text
}

const runFailure = (view: ConversationView): string | null => {
  const live = view.docs['pi.live'] as LiveState | undefined
  const failure = live?.runFailure
  if (!failure) return null
  return failure.detail ?? failure.reason
}

/**
 * One thread. pi-durable owns the conversation, its durable run state, and the
 * SQLite tables; this object adds the socket fan-out and the Hub row.
 */
export class ChatAgent extends DurableObject<Env> {
  private harness: Harness | undefined
  private conversation: Conversation | undefined
  private view: ConversationView | undefined
  private openError: string | null = null
  private readonly sockets = new Map<WebSocket, SocketState>()
  private readonly threadId: string

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.threadId = ctx.id.name ?? 'main'
    void ctx.blockConcurrencyWhile(async () => {
      try {
        await this.open()
      } catch (cause) {
        this.openError = cause instanceof Error ? cause.message : String(cause)
        console.error('ChatAgent failed to open', cause)
      }
    })
  }

  private async open(): Promise<void> {
    const models = createModels({
      authContext: {
        env: async (name) => (name === 'OPENROUTER_API_KEY' ? this.env.OPENROUTER_API_KEY : ''),
        fileExists: async () => false,
      },
    })
    models.setProvider(openrouterProvider())

    const modelId = this.env.MODEL || DEFAULT_MODEL
    const model = models.getModel(PROVIDER, modelId)
    if (!model) throw new Error(`Unknown model ${PROVIDER}/${modelId}`)

    const storage = await SqliteStorage.open(new DurableObjectSqliteDatabase(this.ctx.storage))

    this.harness = await Harness.open(
      storage,
      {
        models,
        registry: createRegistry(),
        settings: {
          compaction: { enabled: true },
          retry: { maxRetries: 3 },
          stream: { timeoutMs: 180_000 },
          progress: { partialIntervalMs: 120, outputIntervalMs: 200, persistWithinMs: 500 },
        },
        onWake: (wake) => {
          void this.arm(wake)
        },
      },
      BACKGROUND_CONTEXT,
    )

    await this.arm(this.harness.wake())
    this.harness.resume()

    this.conversation = await this.harness.root(BACKGROUND_CONTEXT, {
      agent: { model: { provider: PROVIDER, modelId }, thinkingLevel: 'medium' },
    })
    await this.conversation.configure(
      { model: { provider: PROVIDER, modelId }, thinkingLevel: 'medium' },
      BACKGROUND_CONTEXT,
    )

    const watch = await this.conversation.watch(BACKGROUND_CONTEXT, { min: 20, max: 40 })
    this.view = watch.value
    watch.start(async (call) => {
      if (call.kind !== 'value') return
      this.view = call.value
      this.publish(call.value)
    })
  }

  /** Move the alarm earlier, never later. */
  private async arm(wake: { active: boolean; at?: number }): Promise<void> {
    const at = wake.active ? Date.now() : wake.at
    if (at === undefined) return
    const current = await this.ctx.storage.getAlarm()
    if (current === null || at < current) await this.ctx.storage.setAlarm(at)
  }

  async alarm(): Promise<void> {
    if (!this.harness) return
    await this.arm({ ...this.harness.wake(), active: true })
    this.harness.resume()
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade.', { status: 426 })
    }

    const pair = new WebSocketPair()
    const client = pair[0]
    const server = pair[1]
    server.accept()
    this.sockets.set(server, { entry: 0, live: null, status: 'idle', error: null })

    if (this.openError !== null) {
      this.send(server, { type: 'error', message: this.openError })
    } else if (this.view) {
      this.snapshot(server, this.view)
    }

    server.addEventListener('message', (event) => {
      void this.receive(server, event.data)
    })
    server.addEventListener('close', () => {
      this.sockets.delete(server)
    })

    return new Response(null, { status: 101, webSocket: client })
  }

  private async receive(socket: WebSocket, data: string | ArrayBuffer): Promise<void> {
    if (typeof data !== 'string') return

    let input: ChatSubmit
    try {
      input = Schema.decodeUnknownSync(ChatSubmit)(JSON.parse(data))
    } catch {
      this.send(socket, { type: 'error', message: 'That message could not be read.' })
      return
    }

    const text = input.text.trim()
    if (text === '') return
    if (!this.conversation) {
      this.send(socket, {
        type: 'error',
        message: this.openError ?? 'The conversation is not ready yet.',
      })
      return
    }

    try {
      await this.conversation.submit(
        { type: 'input', content: text, requestId: input.clientId },
        BACKGROUND_CONTEXT,
      )
      this.ctx.waitUntil(
        this.env.Hub.getByName('hub')
          .touch(this.threadId, titleFrom(text))
          .catch(() => undefined),
      )
    } catch (cause) {
      this.send(socket, {
        type: 'error',
        message: cause instanceof Error ? cause.message : String(cause),
      })
    }
  }

  private snapshot(socket: WebSocket, view: ConversationView): void {
    const messages = view.entries.flatMap((entry) => {
      const message = messageOf(entry)
      return message ? [message] : []
    })
    const live = liveText(view)
    const state = this.sockets.get(socket)
    if (state) {
      state.entry = Number(view.entries.at(-1)?.id ?? 0)
      state.live = live
      state.status = live === null ? 'idle' : 'streaming'
      state.error = null
    }
    this.send(socket, { type: 'snapshot', messages, live })
  }

  private publish(view: ConversationView): void {
    const messages = view.entries.flatMap((entry) => {
      const message = messageOf(entry)
      return message ? [message] : []
    })
    const newest = Number(view.entries.at(-1)?.id ?? 0)
    const live = liveText(view)
    const failure = runFailure(view)

    for (const [socket, state] of this.sockets) {
      for (const message of messages) {
        if (Number(message.id) > state.entry) this.send(socket, { type: 'message', message })
      }
      if (live !== state.live) {
        this.send(socket, { type: 'live', text: live })
        state.live = live
      }

      const status = failure !== null ? 'error' : live !== null ? 'streaming' : 'idle'
      if (status !== state.status) {
        this.send(socket, { type: 'status', status })
        state.status = status
      }
      if (failure !== null && failure !== state.error) {
        this.send(socket, { type: 'error', message: failure })
        state.error = failure
      } else if (failure === null) {
        state.error = null
      }
      state.entry = newest
    }
  }

  private send(socket: WebSocket, frame: ChatFrame): void {
    try {
      socket.send(JSON.stringify(frame))
    } catch {
      this.sockets.delete(socket)
    }
  }
}
