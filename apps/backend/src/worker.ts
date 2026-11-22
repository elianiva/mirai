import { handlerFor } from './handler.ts'
import { ThreadsPlatform } from './platform/threads.ts'
import type { Env } from './env.ts'

export type { Env } from './env.ts'
export { ChatAgent } from './platform/chat-agent.ts'
export { Hub } from './platform/hub.ts'

const CHAT_SOCKET = /^\/api\/chat\/([^/]+)\/ws$/

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const threadId = CHAT_SOCKET.exec(new URL(request.url).pathname)?.[1]
    if (threadId !== undefined && request.headers.get('Upgrade') === 'websocket') {
      return env.ChatAgent.getByName(threadId).fetch(request)
    }
    return handlerFor(ThreadsPlatform(env.Hub)).handler(request)
  },
}
