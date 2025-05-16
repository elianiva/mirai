import { createClerkClient } from "@clerk/backend";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";

export const authStateFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const { userId } = await getAuth(getWebRequest() as Request);

		if (!userId) {
			throw redirect({
				to: "/sign-in",
			});
		}

		const clerkClient = createClerkClient({
			secretKey: process.env.CLERK_SECRET_KEY,
		});

		const user = userId ? await clerkClient.users.getUser(userId) : null;

		return {
			user: {
				id: user?.id,
				email: user?.emailAddresses[0].emailAddress,
				firstName: user?.firstName,
				lastName: user?.lastName,
				imageUrl: user?.imageUrl,
			},
		};
	},
);
