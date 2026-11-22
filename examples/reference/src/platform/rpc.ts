import { Context, Layer } from 'effect'
import { RpcClient, RpcClientError, RpcSerialization } from 'effect/rpc'
import { Http } from 'foldkit'
import { Api, RPC_PATH } from '@template/rpc'

export class ApiRpc extends Context.Service<
  ApiRpc,
  RpcClient.FromGroup<typeof Api, RpcClientError.RpcClientError>
>()('template/reference/ApiRpc') {
  static readonly layer = Layer.effect(ApiRpc, RpcClient.make(Api)).pipe(
    Layer.provide(RpcClient.layerProtocolHttp({ url: RPC_PATH })),
    Layer.provide(RpcSerialization.layerJson),
    Layer.provide(Http.layer),
  )
}
