import * as HttpRouter from 'effect/http/HttpRouter'
import * as Layer from 'effect/Layer'
import { RpcSerialization, RpcServer } from 'effect/rpc'
import { Api, RPC_PATH } from '@template/rpc'
import { SystemHandlers } from './contexts/system/handlers.ts'

const routes = RpcServer.layerHttp({
  group: Api,
  path: RPC_PATH,
  protocol: 'http',
}).pipe(Layer.provide(SystemHandlers), Layer.provideMerge(RpcSerialization.layerJson))

const handler = HttpRouter.toWebHandler(routes)

export default { fetch: handler.handler }
