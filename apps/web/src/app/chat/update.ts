import { Update } from 'foldkit'
import type { ChatMessage } from '@mirai/rpc'
import { ApiRpc } from './rpc.ts'
import { CreateThread, LoadThreads, Navigate, SendMessage } from './commands.ts'
import { Message } from './message.ts'
import { Model } from './model.ts'

const titleFrom = (text: string): string => text.trim().replace(/\s+/g, ' ').slice(0, 80)

const replacePending = (
  messages: ReadonlyArray<ChatMessage>,
  incoming: ChatMessage,
): ReadonlyArray<ChatMessage> => {
  if (incoming.role !== 'user') return [...messages, incoming]

  const index = messages.findIndex(
    (message) =>
      message.role === 'user' && message.id.startsWith('local-') && message.text === incoming.text,
  )
  return index >= 0
    ? messages.map((message, i) => (i === index ? incoming : message))
    : [...messages, incoming]
}

export const update = (model: Model, message: Message): Update.Return<Model, Message, ApiRpc> =>
  Message.match<Update.Return<Model, Message, ApiRpc>>(message, {
    LoadThreads: () => ({
      model: { ...model, status: 'loading' },
      commands: [LoadThreads()],
    }),
    LoadedThreads: ({ threads }) => ({
      model: { ...model, threads, status: 'idle' },
    }),
    FailedThreads: ({ message: error }) => ({
      model: { ...model, error, status: 'error' },
    }),
    NewThreadClicked: () => ({
      model: { ...model, status: 'loading', error: null },
      commands: [CreateThread()],
    }),
    CreatedThread: ({ thread }) => ({
      model: {
        ...model,
        threads: [thread, ...model.threads],
        activeThreadId: thread.id,
        messages: [],
        live: null,
        draft: '',
        status: 'loading',
        connected: false,
        error: null,
        connection: model.connection + 1,
      },
      commands: [Navigate({ path: `/t/${thread.id}` })],
    }),
    FailedCreateThread: ({ message: error }) => ({
      model: { ...model, error, status: 'error' },
    }),
    SelectedThread: ({ id }) => ({
      model: {
        ...model,
        activeThreadId: id,
        messages: [],
        live: null,
        status: 'loading',
        connected: false,
        error: null,
        connection: model.connection + 1,
      },
      commands: [Navigate({ path: `/t/${id}` })],
    }),
    DraftChanged: ({ value }) => ({
      model: { ...model, draft: value },
    }),
    Submitted: () => {
      const text = model.draft.trim()
      if (text === '' || model.activeThreadId === null) return { model }

      const clientId = crypto.randomUUID()
      const pending: ChatMessage = { id: `local-${clientId}`, role: 'user', text }
      const threads = model.threads.map((thread) =>
        thread.id === model.activeThreadId && thread.title === 'New chat'
          ? { ...thread, title: titleFrom(text) }
          : thread,
      )

      return {
        model: {
          ...model,
          draft: '',
          messages: [...model.messages, pending],
          threads,
          status: 'thinking',
          error: null,
        },
        commands: [SendMessage({ clientId, text })],
      }
    },
    SentMessage: () => ({ model }),
    FailedSend: ({ clientId, message: error }) => ({
      model: {
        ...model,
        messages: model.messages.filter((m) => m.id !== `local-${clientId}`),
        error,
        status: 'error',
      },
    }),
    GotFrame: ({ frame }) => {
      switch (frame.type) {
        case 'snapshot':
          return {
            model: {
              ...model,
              messages: frame.messages,
              live: frame.live,
              status: frame.live === null ? 'idle' : 'streaming',
              connected: true,
              error: null,
            },
          }
        case 'message': {
          const assistant = frame.message.role === 'assistant'
          return {
            model: {
              ...model,
              messages: replacePending(model.messages, frame.message),
              live: assistant ? null : model.live,
              status: assistant ? 'idle' : 'thinking',
            },
          }
        }
        case 'live':
          return {
            model: {
              ...model,
              live: frame.text,
              status: frame.text === null ? 'idle' : 'streaming',
            },
          }
        case 'status':
          return { model: { ...model, status: frame.status } }
        case 'error':
          return { model: { ...model, error: frame.message, status: 'error' } }
      }
    },
    SocketOpened: () => ({
      model: { ...model, connected: true, error: null },
    }),
    SocketClosed: () => ({
      model: { ...model, connected: false },
    }),
    Reconnect: () => ({
      model: {
        ...model,
        connection: model.connection + 1,
        connected: false,
        status: 'loading',
        error: null,
      },
    }),
    Navigated: () => ({ model }),
  })
