import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	// this is not great but since tanstack router doesn't support empty params yet, we'll go with this for now
	// see: https://github.com/TanStack/router/issues/3482
	loader: () => redirect({ to: "/$threadId", params: { threadId: "new" } }),
});
