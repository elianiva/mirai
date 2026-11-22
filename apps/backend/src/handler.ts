import * as HttpRouter from 'effect/http/HttpRouter'
import * as Layer from 'effect/Layer'
import { RpcSerialization, RpcServer } from 'effect/rpc'
import { Api, RPC_PATH } from '@mirai/rpc'
import { SystemHandlers } from './contexts/system/handlers.ts'
import { ThreadsHandlers } from './contexts/threads/handlers.ts'
import type { Threads } from './contexts/threads/threads.ts'

/** The API's RPC handler, composed with the thread store a host provides. */
export const handlerFor = (threads: Layer.Layer<Threads>) =>
  HttpRouter.toWebHandler(
    RpcServer.layerHttp({
      group: Api,
      path: RPC_PATH,
      protocol: 'http',
    }).pipe(
      Layer.provide(SystemHandlers),
      Layer.provide(ThreadsHandlers.pipe(Layer.provide(threads))),
      Layer.provideMerge(RpcSerialization.layerJson),
    ),
  )
