import { Effect, Queue, Schema, Stream } from 'effect'
import { ChatFrame, type ChatSubmit } from '@mirai/rpc'

type Handlers = Readonly<{
  onFrame: (frame: ChatFrame) => void
  onOpen: () => void
  onClose: () => void
}>

let current: WebSocket | null = null

const closeCurrent = (): void => {
  const socket = current
  current = null
  socket?.close()
}

/** One socket per open thread. A new thread closes the previous one first. */
export const connect = (threadId: string, handlers: Handlers): (() => void) => {
  closeCurrent()

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const socket = new WebSocket(
    `${protocol}//${location.host}/api/chat/${encodeURIComponent(threadId)}/ws`,
  )
  current = socket
  let disposed = false

  socket.addEventListener('open', () => {
    if (!disposed) handlers.onOpen()
  })

  socket.addEventListener('message', (event) => {
    if (disposed || typeof event.data !== 'string') return
    try {
      const frame = Schema.decodeUnknownSync(ChatFrame)(JSON.parse(event.data))
      handlers.onFrame(frame)
    } catch {
      // A frame this client does not understand is not worth breaking the chat.
    }
  })

  socket.addEventListener('close', () => {
    if (current === socket) current = null
    if (!disposed) handlers.onClose()
  })

  return () => {
    disposed = true
    if (current === socket) current = null
    socket.close()
  }
}

export const send = (payload: ChatSubmit): void => {
  if (current === null || current.readyState !== WebSocket.OPEN) {
    throw new Error('The chat is not connected.')
  }
  current.send(JSON.stringify(payload))
}

/** A Stream of what a listener hears while the Stream runs. */
export const fromListener = <A>(
  subscribe: (emit: (value: A) => void) => () => void,
): Stream.Stream<A> =>
  Stream.callback<A>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => subscribe((value) => Queue.offerUnsafe(queue, value))),
      (stop) => Effect.sync(stop),
    ).pipe(Effect.andThen(Effect.never)),
  )
