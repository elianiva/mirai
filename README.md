# Mirai

A small chat app on Cloudflare. Foldkit renders the client, PandaCSS styles it, Effect owns the server and the wire contract, Alchemy deploys it, and pi-durable runs each turn.

One thread is one Durable Object. Every turn is a durable pi-durable run: the streaming answer, tool state, and final entry are committed to the object's SQLite before the browser sees them. A restart resumes the turn. A reconnect replays the transcript from the object.

## What is here

- `apps/web` — the Foldkit chat: transcript, composer, thread list, and the socket client. PandaCSS extracts the styles at build time.
- `apps/backend` — the API Worker, the `Hub` thread index, and one `ChatAgent` Durable Object per thread.
- `packages/rpc` — the RPC contract and the socket frame schemas.
- `examples/reference` — the starter's separate RPC example. It is not part of the default deployment.

## Run it

Requires Node.js 26 or newer, pnpm 12, and an [OpenRouter](https://openrouter.ai) key.

```sh
cp .env.example .env
# fill OPENROUTER_API_KEY
pnpm install
pnpm dev
```

`pnpm dev` runs the full Alchemy stack: the API Worker on port 1337 and the website on port 5173. The local Website Worker cannot forward a POST body through its service binding, so the browser RPC call fails there. For a working local preview, build the client and serve it with the preview proxy:

```sh
pnpm --filter @mirai/web build
pnpm --filter @mirai/web preview
```

The preview runs on port 4173 and proxies `/api` to the API Worker on 1337. A production deployment uses the Website Worker and its service binding; the preview proxy exists only for local work.

## Verify a change

```sh
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

`pnpm check` formats and lints through Vite+. The other scripts run through Turbo.

## How a turn works

1. The browser opens `/api/chat/<thread>/ws`. The `ChatAgent` for that thread sends a snapshot of the last 20 entries and the current partial, if any.
2. A submit frame carries a client id. The object calls `conversation.submit`, and pi-durable commits the user entry before the model runs.
3. `conversation.watch` emits committed state. The object sends each new entry and the in-flight partial over the socket.
4. If the object is evicted, the next start reopens the harness, resumes the run, and the client reconnects to the same log.
5. The Hub row records the title and last activity. It never holds the transcript.

The model is configured by `MODEL` and defaults to `deepseek/deepseek-v4.1-flash-1017` on OpenRouter.

## Scope

This is the basic chat. Generative UI blocks, web search, fact checking, and the PWA shell are the next layers. The socket, the tool registry, and the transcript are already the right shape for them.

## Deploy

`pnpm run deploy` deploys the default stack to Cloudflare with the `prod` stage. Use `pnpm run`, because plain `pnpm deploy` is pnpm's own workspace deploy command. Configure your Alchemy credentials and stack state first, then set `OPENROUTER_API_KEY` as a secret for the API Worker.

The API Worker has no `workers.dev` URL. The website reaches it through its service binding, so the RPC endpoint has one public origin.
