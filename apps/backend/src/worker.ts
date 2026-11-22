import { handlerFor } from './handler.ts'
import { ThreadsPlatform } from './platform/threads.ts'
import type { Env } from './env.ts'

export type { Env } from './env.ts'
export { Hub } from './platform/hub.ts'

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handlerFor(ThreadsPlatform(env.Hub)).handler(request)
  },
}
