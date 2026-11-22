# Reference application

This app is kept as a working example for agents and contributors. It exercises the shared Effect RPC contract, the API Worker service binding, and Foldkit Query without adding demo product behavior to `apps/web`.

Read [Adding a feature](../../docs/extending.md) for the steps that connect a contract, a handler, and a view.

Run it locally from the repository root with:

```sh
pnpm dev:reference
```

It uses the root `alchemy.run.ts` with the separate `reference` stage and is not included in the default `pnpm deploy`.
