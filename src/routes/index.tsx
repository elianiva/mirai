import { createFileRoute, redirect } from "@tanstack/react-router";
import { authStateFn } from "~/lib/functions/auth";

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		const auth = await authStateFn();
		if (!auth.userId) {
			throw redirect({ to: "/sign-in" });
		}
		return auth;
	},
	// this is not great but since tanstack router doesn't support empty params yet, we'll go with this for now
	// see: https://github.com/TanStack/router/issues/3482
	loader: () => redirect({ to: "/$threadId", params: { threadId: "new" } }),
});
