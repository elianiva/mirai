# Chat

One thread is one `ChatAgent` Durable Object, named by the thread id. The object owns its pi-durable harness, SQLite database, and open sockets. The `Hub` object owns only the list of threads.

## Client and server

- `apps/web/src/app/chat/` holds the Foldkit Model, messages, commands, subscriptions, update, and view.
- `apps/backend/src/platform/chat-agent.ts` holds the Durable Object. `apps/backend/src/contexts/threads/` and `apps/backend/src/platform/hub.ts` hold the thread list.
- `packages/rpc/src/chat.ts` holds the RPC group and every socket frame.

The client renders committed entries and the `live` partial in separate views. When an assistant entry commits, the partial is cleared, so the text is never shown twice.

## Frames

| Frame      | Direction | Meaning                                                    |
| ---------- | --------- | ---------------------------------------------------------- |
| `snapshot` | server    | The current transcript window and partial, sent on connect |
| `message`  | server    | One committed entry                                        |
| `live`     | server    | The in-flight assistant text, or `null`                    |
| `status`   | server    | `idle`, `thinking`, `streaming`, or `error`                |
| `error`    | server    | A model or socket failure                                  |
| `submit`   | client    | A user message with a client id used for deduplication     |

## Adding a tool

Add it to the pi-durable registry in `chat-agent.ts`, return text from `execute`, and tell the model when to call it in the system prompt. A tool call is committed with the assistant entry, so a reload replays it without another model call. A UI-bearing tool should return a validated, serializable payload; the client renders the payload rather than model-written HTML.

## Local preview

`pnpm dev` runs the Alchemy stack. The local Website Worker loses a POST body when it forwards through the service binding, so use:

```sh
pnpm --filter @mirai/web build
pnpm --filter @mirai/web preview
```

The preview server proxies `/api` to the API Worker on 1337. The production path is the Website Worker and its binding.
