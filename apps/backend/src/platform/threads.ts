import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { ApiError, type ThreadSummary } from '@mirai/rpc'
import { Threads } from '../contexts/threads/threads.ts'
import type { HubBinding } from '../env.ts'

const toApiError = (cause: unknown) =>
  new ApiError({ message: cause instanceof Error ? cause.message : String(cause) })

/** The thread list, backed by the one Hub Durable Object. */
export const ThreadsPlatform = (hub: HubBinding) =>
  Layer.succeed(
    Threads,
    Threads.of({
      list: Effect.tryPromise({
        try: () => hub.getByName('hub').list() as Promise<ReadonlyArray<ThreadSummary>>,
        catch: toApiError,
      }),
      create: (title) =>
        Effect.tryPromise({
          try: () => hub.getByName('hub').create(title),
          catch: toApiError,
        }),
      rename: (id, title) =>
        Effect.tryPromise({
          try: () => hub.getByName('hub').rename(id, title),
          catch: toApiError,
        }),
      remove: (id) =>
        Effect.tryPromise({
          try: () => hub.getByName('hub').delete(id),
          catch: toApiError,
        }),
    }),
  )
