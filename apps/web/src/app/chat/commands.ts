import * as Effect from 'effect/Effect'
import { Schema } from 'effect'
import { Command } from 'foldkit'
import { ApiRpc } from './rpc.ts'
import { Message } from './message.ts'
import { send } from './socket.ts'

export const LoadThreads = Command.define('LoadThreads', {
  messages: [Message.LoadedThreads, Message.FailedThreads],
  execute: Effect.gen(function* () {
    const rpc = yield* ApiRpc
    const threads = yield* rpc.threadsList()
    return Message.LoadedThreads({ threads })
  }).pipe(
    Effect.catch((error) => Effect.succeed(Message.FailedThreads({ message: error.message }))),
  ),
})

export const CreateThread = Command.define('CreateThread', {
  messages: [Message.CreatedThread, Message.FailedCreateThread],
  execute: Effect.gen(function* () {
    const rpc = yield* ApiRpc
    const thread = yield* rpc.threadsCreate({})
    return Message.CreatedThread({ thread })
  }).pipe(
    Effect.catch((error) => Effect.succeed(Message.FailedCreateThread({ message: error.message }))),
  ),
})

export const SendMessage = Command.define('SendMessage', {
  args: { clientId: Schema.String, text: Schema.String },
  messages: [Message.SentMessage, Message.FailedSend],
  execute: ({ clientId, text }) =>
    Effect.try({
      try: () => send({ type: 'submit', clientId, text }),
      catch: (cause) => (cause instanceof Error ? cause.message : String(cause)),
    }).pipe(
      Effect.as(Message.SentMessage()),
      Effect.catch((message) => Effect.succeed(Message.FailedSend({ clientId, message }))),
    ),
})

export const Navigate = Command.define('Navigate', {
  args: { path: Schema.String },
  messages: [Message.Navigated],
  execute: ({ path }) =>
    Effect.sync(() => history.pushState({}, '', path)).pipe(Effect.as(Message.Navigated())),
})
