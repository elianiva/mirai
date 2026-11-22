import * as Effect from 'effect/Effect'
import { ThreadsRpc } from '@mirai/rpc'
import { Threads } from './threads.ts'

export const ThreadsHandlers = ThreadsRpc.toLayer(
  Effect.gen(function* () {
    const threads = yield* Threads

    return ThreadsRpc.of({
      threadsList: () => threads.list,
      threadsCreate: (input) => threads.create(input.title),
      threadsRename: (input) => threads.rename(input.id, input.title),
      threadsDelete: (input) => threads.remove(input.id),
    })
  }),
)
