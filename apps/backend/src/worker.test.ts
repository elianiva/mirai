import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Scope from 'effect/Scope'
import { FetchHttpClient } from 'effect/http'
import { RpcClient, RpcSerialization } from 'effect/rpc'
import { expect, test } from 'vitest'
import { Api, RPC_PATH } from '@mirai/rpc'
import { handlerFor } from './handler.ts'
import { Threads } from './contexts/threads/threads.ts'

const FakeThreads = Layer.succeed(
  Threads,
  Threads.of({
    list: Effect.succeed([
      {
        id: 'thread-1',
        title: 'A test thread',
        createdAt: 1,
        updatedAt: 2,
        lastMessageAt: null,
      },
    ]),
    create: (title) =>
      Effect.succeed({
        id: 'thread-2',
        title: title ?? 'New chat',
        createdAt: 3,
        updatedAt: 3,
        lastMessageAt: null,
      }),
    rename: () => Effect.void,
    remove: () => Effect.void,
  }),
)

const handler = handlerFor(FakeThreads)

const url = `http://api.test${RPC_PATH}`

/**
 * Sends the RPC client's HTTP requests straight to the Worker handler, so the
 * test covers request encoding, routing, the handler, and error mapping.
 */
const fetchThroughWorker: typeof globalThis.fetch = async (input, init) =>
  handler.handler(new Request(input, init))

const protocol = RpcClient.layerProtocolHttp({ url }).pipe(
  Layer.provide(RpcSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
)

const run = <A, E>(effect: Effect.Effect<A, E, RpcClient.Protocol | Scope.Scope>) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(protocol),
      Effect.provideService(FetchHttpClient.Fetch, fetchThroughWorker),
      Effect.scoped,
    ),
  )

test('the API Worker serves the shared RPC contract over HTTP', async () => {
  const response = await run(
    Effect.gen(function* () {
      const client = yield* RpcClient.make(Api)
      return yield* client.systemStatusGet()
    }),
  )

  expect(response).toEqual({ message: 'The API Worker is connected.' })
})

test('the API Worker serves the thread list', async () => {
  const response = await run(
    Effect.gen(function* () {
      const client = yield* RpcClient.make(Api)
      return yield* client.threadsList()
    }),
  )

  expect(response).toEqual([
    {
      id: 'thread-1',
      title: 'A test thread',
      createdAt: 1,
      updatedAt: 2,
      lastMessageAt: null,
    },
  ])
})

test('the API Worker rejects unknown paths', async () => {
  const response = await handler.handler(new Request('http://api.test/unknown', { method: 'POST' }))

  expect(response.status).toBe(404)
})
