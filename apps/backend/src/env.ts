import type { ThreadSummary } from '@mirai/rpc'

/** The Hub's methods, as another object sees them. */
export interface HubBinding {
  getByName(name: string): {
    list(): Promise<ReadonlyArray<ThreadSummary>>
    create(title?: string): Promise<ThreadSummary>
    rename(id: string, title: string): Promise<void>
    delete(id: string): Promise<void>
    touch(id: string, title?: string): Promise<void>
  }
}

/** The ChatAgent's one method, as the Worker sees it. */
export interface ChatBinding {
  getByName(name: string): {
    fetch(request: Request): Promise<Response>
  }
}

/** Bindings and values the API Worker and its Durable Objects receive. */
export type Env = Readonly<{
  Hub: HubBinding
  ChatAgent: ChatBinding
  OPENROUTER_API_KEY: string
  MODEL: string
}>
