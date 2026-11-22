import { Schema } from 'effect'
import { ChatFrame, ThreadSummary } from '@mirai/rpc'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  LoadThreads: {},
  LoadedThreads: { threads: Schema.Array(ThreadSummary) },
  FailedThreads: { message: Schema.String },
  NewThreadClicked: {},
  CreatedThread: { thread: ThreadSummary },
  FailedCreateThread: { message: Schema.String },
  SelectedThread: { id: Schema.String },
  DraftChanged: { value: Schema.String },
  Submitted: {},
  SentMessage: {},
  FailedSend: { clientId: Schema.String, message: Schema.String },
  GotFrame: { frame: ChatFrame },
  SocketOpened: {},
  SocketClosed: {},
  Reconnect: {},
  Navigated: {},
})
export type Message = typeof Message.Type
