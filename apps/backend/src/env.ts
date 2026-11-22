import type { Hub } from './platform/hub.ts'

/** Bindings and values the API Worker and its Durable Objects receive. */
export type Env = Readonly<{
  Hub: DurableObjectNamespace<Hub>
  OPENROUTER_API_KEY: string
  MODEL: string
}>
