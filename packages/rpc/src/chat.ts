import { Schema } from 'effect'
import { Rpc, RpcGroup } from 'effect/rpc'
import { ApiError } from './errors.ts'

/** A thread row as the browser sees it. */
export const ThreadSummary = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  createdAt: Schema.Number,
  updatedAt: Schema.Number,
  lastMessageAt: Schema.NullOr(Schema.Number),
})
export type ThreadSummary = typeof ThreadSummary.Type

export const ThreadCreateInput = Schema.Struct({
  title: Schema.optionalKey(Schema.String),
})
export type ThreadCreateInput = typeof ThreadCreateInput.Type

export const ThreadRenameInput = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
})
export type ThreadRenameInput = typeof ThreadRenameInput.Type

export const ThreadIdInput = Schema.Struct({ id: Schema.String })
export type ThreadIdInput = typeof ThreadIdInput.Type

/** One row in the transcript, mapped from a durable conversation entry. */
export const ChatMessage = Schema.Struct({
  id: Schema.String,
  role: Schema.Literals(['user', 'assistant']),
  text: Schema.String,
})
export type ChatMessage = typeof ChatMessage.Type

/** What the durable object sends over the socket. */
export const SnapshotFrame = Schema.Struct({
  type: Schema.Literal('snapshot'),
  messages: Schema.Array(ChatMessage),
  live: Schema.NullOr(Schema.String),
})

export const MessageFrame = Schema.Struct({
  type: Schema.Literal('message'),
  message: ChatMessage,
})

export const LiveFrame = Schema.Struct({
  type: Schema.Literal('live'),
  text: Schema.NullOr(Schema.String),
})

export const StatusFrame = Schema.Struct({
  type: Schema.Literal('status'),
  status: Schema.Literals(['idle', 'thinking', 'streaming', 'error']),
})

export const ErrorFrame = Schema.Struct({
  type: Schema.Literal('error'),
  message: Schema.String,
})

export const ChatFrame = Schema.Union([
  SnapshotFrame,
  MessageFrame,
  LiveFrame,
  StatusFrame,
  ErrorFrame,
])
export type ChatFrame = typeof ChatFrame.Type

/** What the browser sends over the socket. */
export const ChatSubmit = Schema.Struct({
  type: Schema.Literal('submit'),
  clientId: Schema.String,
  text: Schema.String,
})
export type ChatSubmit = typeof ChatSubmit.Type

export class ThreadsRpc extends RpcGroup.make(
  Rpc.make('threadsList', {
    success: Schema.Array(ThreadSummary),
    error: ApiError,
  }),
  Rpc.make('threadsCreate', {
    payload: ThreadCreateInput,
    success: ThreadSummary,
    error: ApiError,
  }),
  Rpc.make('threadsRename', {
    payload: ThreadRenameInput,
    success: Schema.Void,
    error: ApiError,
  }),
  Rpc.make('threadsDelete', {
    payload: ThreadIdInput,
    success: Schema.Void,
    error: ApiError,
  }),
) {}
