# Guardrails

These are the rules this template enforces, and how each one is checked. Change a
rule and its check in the same commit.

| Concern        | Rule                                                                                                                   | Check                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Host isolation | `apps/backend/src/contexts` must not import Alchemy or Cloudflare adapters, and must not name Cloudflare global types. | `apps/backend/src/contexts/boundary.test.ts`              |
| Wire contract  | Only `packages/rpc` declares RPC groups, schemas, declared errors, and path prefixes.                                  | Dependency direction in `docs/architecture.md`            |
| Type checking  | Every project type-checks with `tsrs`, the same engine Oxlint uses for type-aware rules.                               | `tsrs` in `pnpm typecheck`; `vp lint` in `pnpm check`     |
| Routing        | The API prefix has one definition.                                                                                     | `packages/rpc/src/paths.ts`, imported by `alchemy.run.ts` |
| API surface    | The API Worker has no public URL.                                                                                      | `workersDev: false` in `alchemy.run.ts`                   |
| Telemetry      | Observability configuration lives on the host resources, never in contexts or a shared runtime.                        | Review of `alchemy.run.ts`                                |
| Dependencies   | Effect has one version, and there is no second formatter or linter beside Vite+.                                       | `pnpm-workspace.yaml` overrides and review                |

## Type checking with tsrs

`pnpm typecheck` runs `tsrs --noEmit` for the root project and every package. Vite+ uses the same engine for Oxlint's type-aware rules, so linting and type checking agree on language behavior.

The template previously used `@effect/tsgo`, which patched the installed TypeScript compiler and added Effect's language-service diagnostics, including per-file `allowedUnstableApis` allowances. `tsrs` type-checks the code but does not run those Effect-specific rules, so an `allowedUnstableApis` entry would have no effect. Do not add a second compiler to restore them; review unstable API use in code review instead.

## Review checklist

Before you call a change done:

- Does the change extend the wire contract instead of starting a second one?
- Does every handler stay free of bindings and platform types?
- Does each new endpoint have a test that crosses the RPC path?
- Did you avoid adding a second compiler, linter, or formatter?
- Do failures use `ApiError` with `Effect.fail` instead of a thrown value?
- Do `pnpm check`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass?
