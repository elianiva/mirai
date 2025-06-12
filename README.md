# Mirai

AI chat client because I don't like existing ones.

## Why

- I don't like monthly subscription since I don't use them religiously, token-based approach saved me a lot of money
- I want to be able to choose my own custom models
- I want a simple and fast app without a lot of features I won't need
- I want an app that I can use from both my computer and my phone, which is why it's a PWA
- I basically want RooCode for general use, where it can switch modes, I like the orchestration pattern a lot
- I want a chat app that I can write my own modes and define tools for that mode
- I want a web chat app that supports remote MCP use, cloudflare ai agents type of thing
- I want it to be easily deployed on serverless services, a lot of existing solutions requires a server, I'm too broke for that stuff
- because it's fun??? this is just yet another side project

## Other chat clients

You might be better off using these chat clients, they are proven to work well and might suit your use case better. I just have issues with them (not necessarily a bad thing, it's just that the feature I'm looking for isn't there)

- [t3.chat](https://t3.chat) - Probably the fastest chat client out there, also super cheap. I don't use it just because I don't really like monthly subscription and I want more features for myself.
- [Cherry Studio](https://github.com/CherryHQ/cherry-studio) - Good desktop chat client with a lot of features. Too many features for me, and it still feels clunky.
- [LibreChat](https://www.librechat.ai/) - If you want a reliable self hosted solution you might as well use this one. I don't use it since it requires me to rent a server.
- ...other generic chat app - You know, ChatGPT, Claude, etc. I don't like them since I can't switch between models.

## How to use

If you still want to use this, you need to self-host this yourself. I designed it to be single user only because I don't want to deal with securely storing user's API key and I don't want to pay other people's usage :p

Even though it's BYOK, if people use this, I may have to pay for the convex instance or clerk, which I don't want. There's no such thing as free lunch lol.

Thankfully, it's super easy to do!

[Cloudflare deploy button when I get to that]

## Tech

- Tanstack Start / Tanstack Router
- Tanstack Query
- Tanstack Form
- Convex DB
- shadcn/ui
- Vercel AI SDK
- Clerk

## Features

- Quick navigation (thanks to local storage caching)
- Smooth and resumable stream (thanks to convex)
- Create modes and profiles (see how it works in [roocode.com](https://roocode.com))
- Remote MCP support
- Attachments
- Good markdown rendering
- LaTeX support

## Contributing

I appreciate that (though tbf i highly doubt if there's anyone who wants to :p) but I'm probably going to reject most of your ideas because this project is reaaallllly opinionated and tailored to myself, I don't want to maintain stuff that I won't use.
I encourage you to just fork this if you want to add your own stuff.

I just put the code here because idk maybe it can also be useful for someone else? who knows

## License

See [LICENSE](./LICENSE)
