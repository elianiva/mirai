import { Context, type Effect } from 'effect'
import type { ApiError, ThreadSummary } from '@mirai/rpc'

/** The thread list, kept apart from the server that stores it. */
export class Threads extends Context.Service<
  Threads,
  {
    readonly list: Effect.Effect<ReadonlyArray<ThreadSummary>, ApiError>
    readonly create: (title?: string) => Effect.Effect<ThreadSummary, ApiError>
    readonly rename: (id: string, title: string) => Effect.Effect<void, ApiError>
    readonly remove: (id: string) => Effect.Effect<void, ApiError>
  }
>()('mirai/Threads') {}
