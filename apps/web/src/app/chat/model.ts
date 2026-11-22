import { Schema } from 'effect'
import { ChatMessage, ThreadSummary } from '@mirai/rpc'

export const Status = Schema.Literals(['idle', 'loading', 'thinking', 'streaming', 'error'])

export const Model = Schema.Struct({
  threads: Schema.Array(ThreadSummary),
  activeThreadId: Schema.NullOr(Schema.String),
  messages: Schema.Array(ChatMessage),
  live: Schema.NullOr(Schema.String),
  status: Status,
  connected: Schema.Boolean,
  error: Schema.NullOr(Schema.String),
  draft: Schema.String,
  connection: Schema.Number,
})
export type Model = typeof Model.Type
