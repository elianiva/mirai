# Cafe

Cloudflare · Alchemy · Foldkit · Effect.

A strict, extensible full-stack starter. The name is the stack: Cloudflare for the runtime, Alchemy for infrastructure and deployment, Foldkit for the UI, and Effect for the server and the shared contract.

The website and the API are separate apps. Alchemy composes them into one deployment, with a service binding routing same-origin API requests to the backend.

## Apps and packages

- `apps/web` — Foldkit application, website Worker, and static assets.
- `apps/backend` — Effect RPC handlers and the API Worker entry.
- `packages/rpc` — the wire contract: RPC groups, schemas, declared errors, and the API path prefix.
- `examples/reference` — a complete Foldkit Query to RPC example, deployed only to the `reference` stage.

## Get started

Requirements: Node.js 24.11 or newer and pnpm 12.

```sh
pnpm install
pnpm dev
```

The default Alchemy stack creates the website and API Workers. The reference application uses the same root Alchemy entrypoint with a separate stage:

```sh
pnpm dev:reference
```

## Verify a change

```sh
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

`pnpm check` formats and lints through Vite+; the other scripts run through Turbo. Pre-commit runs `pnpm check`, and pre-push runs the typecheck and the tests.

## Deploy

`pnpm deploy` deploys the default stack to Cloudflare with the `prod` stage. Configure your Alchemy credentials and stack state before the first deploy.

The API Worker has no `workers.dev` URL. The website reaches it through its service binding, so the RPC endpoint has one public origin. Remove `workersDev: false` in `alchemy.run.ts` when the API needs its own URL or custom domain.

## Design notes

- Read [Architecture](docs/architecture.md) for app and RPC boundaries.
- Read [Tooling](docs/tooling.md) for Vite+, Turbo, and Oxfmt/Oxlint responsibilities.
- Read [Guardrails](docs/guardrails.md) for the rules and the checks that enforce them.
- Read [Adding a feature](docs/extending.md) for the path from contract to handler to UI.
- The reference example is intentionally kept separate from the starter UI. Copy patterns from it; do not move its demo behavior into the default app by default.
