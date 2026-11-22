import { Runtime } from 'foldkit'
import { LoadThreads } from './chat/commands.ts'
import { Message } from './chat/message.ts'
import { Model } from './chat/model.ts'
import { ApiRpc } from './chat/rpc.ts'
import { subscriptions } from './chat/subscriptions.ts'
import { update } from './chat/update.ts'
import { view } from './chat/view.ts'

export { Message, Model, subscriptions, update, view }

const threadFromPath = (): string | null => {
  if (typeof location === 'undefined') return null
  const match = /^\/t\/([^/]+)$/.exec(location.pathname)
  const encoded = match?.[1]
  if (encoded === undefined) return null
  try {
    return decodeURIComponent(encoded)
  } catch {
    return encoded
  }
}

export const init: Runtime.ApplicationInit<Model, Message, void, ApiRpc> = () => ({
  model: Model.make({
    threads: [],
    activeThreadId: threadFromPath(),
    messages: [],
    live: null,
    status: 'loading',
    connected: false,
    error: null,
    draft: '',
    connection: 0,
  }),
  commands: [LoadThreads()],
})
