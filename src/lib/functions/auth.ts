import { getAuth } from "@clerk/tanstack-react-start/server";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { clerkClient } from "../auth";

export const authStateFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const auth = await getAuth(getWebRequest() as Request);
		const token = await auth.getToken();

		return {
			userId: auth.userId,
			token,
		};
	},
);

export const authUserFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const auth = await authStateFn();
		if (!auth.userId) {
			throw redirect({ to: "/sign-in" });
		}

		const user = await clerkClient.users.getUser(auth.userId);
		return {
			id: user?.id,
			email: user?.emailAddresses[0].emailAddress,
			firstName: user?.firstName,
			lastName: user?.lastName,
			imageUrl: user?.imageUrl,
		};
	},
);
