import { Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'
import { ApiRpc } from './rpc.ts'
import { Message } from './message.ts'
import { Model } from './model.ts'
import { connect, fromListener } from './socket.ts'

export const subscriptions = Subscription.make<Model, Message, ApiRpc>()((entry) => ({
  socket: entry(
    { threadId: Schema.NullOr(Schema.String), epoch: Schema.Number },
    {
      modelToDependencies: (model) => ({
        threadId: model.activeThreadId,
        epoch: model.connection,
      }),
      dependenciesToStream: ({ threadId }) =>
        threadId === null
          ? Stream.empty
          : fromListener<Message>((emit) =>
              connect(threadId, {
                onFrame: (frame) => emit(Message.GotFrame({ frame })),
                onOpen: () => emit(Message.SocketOpened()),
                onClose: () => emit(Message.SocketClosed()),
              }),
            ),
    },
  ),
}))
