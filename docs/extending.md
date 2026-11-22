# Adding a feature

The starter ships one endpoint so the wiring is visible, not as a product
domain. Use that endpoint as the shape for your own.

## Where each change goes

| Concern                  | Location                              |
| ------------------------ | ------------------------------------- |
| Wire contract and errors | `packages/rpc/src`                    |
| Server-side behavior     | `apps/backend/src/contexts/<context>` |
| Browser state and UI     | `apps/web/src/app`                    |
| Browser details          | `apps/web/src/entry.ts`               |
| Deployment and bindings  | `alchemy.run.ts`                      |

## Add an endpoint to the existing contract

1. Declare the request, response, and declared error in
   `packages/rpc/src/system.ts`. Every endpoint returns the shared `ApiError`:

   ```ts
   import { ApiError } from './errors.ts'

   export const SystemVersion = Schema.Struct({ version: Schema.String })

   export class SystemRpc extends RpcGroup.make(
     Rpc.make('systemStatusGet', { success: SystemStatus, error: ApiError }),
     Rpc.make('systemVersionGet', { success: SystemVersion, error: ApiError }),
   ) {}
   ```

2. Export the schema from `packages/rpc/src/index.ts` when the browser needs it.

3. Implement the handler in `apps/backend/src/contexts/system/handlers.ts`.
   `SystemRpc.of` is typed from the group, so a missing method fails typecheck:

   ```ts
   SystemRpc.of({
     systemStatusGet: () => Effect.succeed({ message: 'The API Worker is connected.' }),
     systemVersionGet: () => Effect.fail(new ApiError({ message: 'No version is configured.' })),
   })
   ```

4. Call it from the browser. `apps/web` has no RPC client yet; copy the pattern
   from `examples/reference/src/platform/rpc.ts` into
   `apps/web/src/platform/rpc.ts`, then provide the layer in
   `apps/web/src/entry.ts`:

   ```ts
   const application = Runtime.makeApplication({
     // ...
     resources: ApiRpc.layer,
   })
   ```

5. Keep remote data in a Foldkit Query submodel, as
   `examples/reference/src/query-example.ts` does. Update handlers decide when to
   load or revalidate; views read the query.

## Errors

`packages/rpc/src/errors.ts` owns `ApiError`, the only declared failure on the
wire. A handler returns it with `Effect.fail(new ApiError({ message }))`. Do not
throw, and do not invent a new error shape at the edge: a client cannot type what
the contract does not declare.

The client sees two sources of failure: the declared `ApiError` and the
transport-level `RpcClientError` from `effect/rpc`. The reference app maps the
transport error into `ApiError`, which leaves the view with one type:

```ts
Effect.mapError((error) =>
  error._tag === 'RpcClientError' ? new ApiError({ message: error.message }) : error,
)
```

Match on `_tag`, not `instanceof`. `_tag` survives serialization; the prototype
does not.

## Add a bounded context

Give the context its own folder, its own RPC group, and its own handler layer,
then compose them at the edge:

```ts
// packages/rpc/src/index.ts
export class Api extends SystemRpc.merge(NotesRpc) {}
```

```ts
// apps/backend/src/worker.ts
Layer.provide(Layer.mergeAll(SystemHandlers, NotesHandlers))
```

Do not add a context until a product feature needs it. Empty domains are harder
to remove than to add.

## Verify the change

```sh
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

`apps/backend/src/worker.test.ts` calls the API Worker through a real RPC client,
so it fails when the contract, the path, or the handlers stop agreeing.
`apps/backend/src/contexts/boundary.test.ts` keeps Cloudflare and Alchemy imports,
and Cloudflare global type names, out of context code.

For the finished version of this path, read
[`examples/reference`](../examples/reference/README.md).
