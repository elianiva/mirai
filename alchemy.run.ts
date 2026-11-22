import * as Cloudflare from '@alchemy.run/cloudflare'
import * as Alchemy from 'alchemy'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { API_PREFIX } from '@mirai/rpc'

const compatibility = { date: '2026-10-08' }

/**
 * Cloudflare Workers Observability, configured on the host resources only.
 * Sampling at 1 records every request: lower both rates before real traffic.
 */
const observability = {
  enabled: true,
  headSamplingRate: 1,
  logs: { enabled: true, invocationLogs: true, headSamplingRate: 1, persist: true },
  traces: { enabled: true, headSamplingRate: 1, persist: true },
}

const state = Layer.unwrap(
  Effect.gen(function* () {
    const dev = yield* Alchemy.ALCHEMY_DEV.pipe(Effect.orDie)
    return dev ? Alchemy.localState() : Cloudflare.state()
  }),
)

export default Alchemy.Stack(
  'mirai',
  { providers: Cloudflare.providers(), state },
  Effect.gen(function* () {
    const stage = yield* Alchemy.Stack.use((stack) => Effect.succeed(stack.stage))
    const ApiWorker = Cloudflare.Worker('Api', {
      main: './apps/backend/src/worker.ts',
      compatibility,
      observability,
      // The website reaches the API through its service binding only. Remove
      // this when the API needs its own public URL or custom domain.
      workersDev: false,
    })
    const Website = Cloudflare.Website.Foldkit('Website', {
      rootDir: stage === 'reference' ? 'examples/reference' : 'apps/web',
      main: 'src/worker.ts',
      env: { API: ApiWorker },
      assets: { runWorkerFirst: [`${API_PREFIX}/*`] },
      compatibility,
      observability,
    })

    yield* ApiWorker
    const website = yield* Website
    return { url: website.url }
  }),
)
