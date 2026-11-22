import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Scope from 'effect/Scope'
import { FetchHttpClient } from 'effect/http'
import { RpcClient, RpcSerialization } from 'effect/rpc'
import { expect, test } from 'vitest'
import { Api, RPC_PATH } from '@template/rpc'
import worker from './worker.ts'

const url = `http://api.test${RPC_PATH}`

/**
 * Sends the RPC client's HTTP requests straight to the Worker entry module, so
 * the test covers request encoding, routing, the handler, and error mapping.
 */
const fetchThroughWorker: typeof globalThis.fetch = async (input, init) => {
  const request = new Request(input, init)
  return worker.fetch(request)
}

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

test('the API Worker rejects unknown paths', async () => {
  const response = await worker.fetch(new Request('http://api.test/unknown', { method: 'POST' }))

  expect(response.status).toBe(404)
})
