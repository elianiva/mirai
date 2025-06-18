import { getAuth } from "@clerk/tanstack-react-start/server";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { clerkClient } from "../auth";
import { z } from "zod";

type UserData = {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	imageUrl: string;
	token: string | null;
};

const userCache = new Map<string, { data: UserData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export const authStateFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const auth = await getAuth(getWebRequest() as Request);
		const token = await auth.getToken({ template: "convex" });

		return {
			userId: auth.userId,
			token,
		};
	},
);

export const authUserFn = createServerFn({ method: "GET" })
	.validator(
		z
			.object({
				shouldRedirect: z.boolean(),
			})
			.optional(),
	)
	.handler(async ({ data }) => {
		const shouldRedirect = data?.shouldRedirect ?? true;
		const auth = await authStateFn();
		if (!auth.userId) {
			if (shouldRedirect) {
				throw redirect({ to: "/sign-in" });
			}
			return null;
		}

		const cached = userCache.get(auth.userId);
		const now = Date.now();

		if (cached && now - cached.timestamp < CACHE_TTL) {
			return cached.data;
		}

		const user = await clerkClient.users.getUser(auth.userId);

		const userData = {
			id: user?.id,
			email: user?.emailAddresses[0].emailAddress,
			firstName: user?.firstName,
			lastName: user?.lastName,
			imageUrl: user?.imageUrl,
			token: auth.token,
		};

		userCache.set(auth.userId, {
			data: userData,
			timestamp: now,
		});

		return userData;
	});

export const clearUserCache = (userId?: string) => {
	if (userId) {
		userCache.delete(userId);
	} else {
		userCache.clear();
	}
};
