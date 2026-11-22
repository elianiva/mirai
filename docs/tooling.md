# Tooling

| Tool         | Owns                                                                          |
| ------------ | ----------------------------------------------------------------------------- |
| pnpm         | Workspace installation and package linking                                    |
| Turborepo    | Cached build, typecheck, and test task graph                                  |
| Vite+ (`vp`) | Root formatter/lint configuration and unified checks                          |
| Oxfmt        | Formatting engine used by Vite+                                               |
| Oxlint       | Lint engine used by Vite+                                                     |
| `tsrs`       | TypeScript 7 compiler for type checking and Oxlint's type-aware rules         |
| Vite         | Web app bundler, integrated into Alchemy's website dev/deploy flow            |
| Alchemy      | Local Cloudflare development and deployment through the root `alchemy.run.ts` |
| Vitest       | Unit and integration tests                                                    |

Use `pnpm check` for the Vite+ checks. Use `pnpm typecheck`, `pnpm test`, and `pnpm build` for Turbo tasks. Do not add standalone Prettier or ESLint configurations alongside Vite+.

Dependencies are pinned to exact versions in workspace manifests and `pnpm-lock.yaml`. Keep Effect on one version across the workspace. Foldkit Query is experimental, so review its release notes and run the reference tests when upgrading Foldkit.

## Type checking and type-aware linting

`pnpm typecheck` runs `tsrs --noEmit` for the root project and then the `typecheck` task in every package. `tsrs` is the Rust port of the TypeScript 7 compiler, and Vite+ bundles it: Oxlint's type-aware path runs on `tsrs-lint`, so `pnpm check` and `pnpm lint` need no extra configuration. Linting and type checking therefore share one TypeScript implementation.

`lint.options.typeAware` is enabled in `vite.config.ts`. `typeCheck` stays off there because `pnpm typecheck` already checks every package against its own `tsconfig.json`; enabling both would analyze the same code twice.

`pnpm install` runs `prepare`, which installs the Git hooks. No compiler patch is applied to `node_modules`, so an install does not change the TypeScript package.

## Common commands

```sh
pnpm check
pnpm typecheck
pnpm test
pnpm build
pnpm dev
pnpm dev:reference
```

`pnpm run deploy` modifies Cloudflare infrastructure. It is not part of routine verification.
`pnpm dev:reference` uses the same root entrypoint with the `reference` stage; the default stage selects `apps/web`.
