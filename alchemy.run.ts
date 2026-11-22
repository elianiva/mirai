import * as Cloudflare from '@alchemy.run/cloudflare'
import * as Alchemy from 'alchemy'
import * as Config from 'effect/Config'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { API_PREFIX } from '@mirai/rpc'
import type { ChatAgent } from './apps/backend/src/platform/chat-agent.ts'
import type { Hub } from './apps/backend/src/platform/hub.ts'

const compatibility = { date: '2026-10-08' }
const apiCompatibility = { ...compatibility, flags: ['nodejs_compat'] }

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
      compatibility: apiCompatibility,
      observability,
      env: {
        // The thread list. Each ChatAgent gets its own object by name.
        Hub: Cloudflare.DurableObject<Hub>('Hub'),
        ChatAgent: Cloudflare.DurableObject<ChatAgent>('ChatAgent'),
        OPENROUTER_API_KEY: Config.Redacted('OPENROUTER_API_KEY'),
        MODEL: Config.String('MODEL').pipe(Config.withDefault('deepseek/deepseek-v4.1-flash-1017')),
      },
      // The website reaches the API through its service binding only. Remove
      // this when the API needs its own public URL or custom domain.
      workersDev: false,
    })
    const Website = Cloudflare.Website.Foldkit('Website', {
      rootDir: stage === 'reference' ? 'examples/reference' : 'apps/web',
      main: 'src/worker.ts',
      dev: { port: 5173 },
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
