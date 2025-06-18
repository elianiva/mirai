import {
	useMutation as useTanStackMutation,
	useQueryClient,
} from "@tanstack/react-query";
import type { Doc, Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { z } from "zod";
import { api } from "~/../convex/_generated/api";
import { useUser } from "./user";

export const regenerateMessageSchema = z.object({
	messageId: z.custom<Id<"messages">>(),
	modeId: z.string(),
});

export type RegenerateMessageVariables = z.infer<
	typeof regenerateMessageSchema
>;

export function useCreateBranch() {
	return useMutation(api.threads.createBranchFromMessage);
}

// @ts-expect-error - import.meta.env is not typed
const CONVEX_HTTP_URL = import.meta.env.VITE_CONVEX_HTTP_URL as string;

export const regenerateMessageHttpSchema = z.object({
	messageId: z.string(),
	modeId: z.string(),
	openrouterKey: z.string(),
	token: z.string(),
});

export type RegenerateMessageHttpVariables = z.infer<
	typeof regenerateMessageHttpSchema
>;

async function regenerateMessageHttp({
	messageId,
	modeId,
	openrouterKey,
	token,
}: RegenerateMessageHttpVariables) {
	const response = await fetch(`${CONVEX_HTTP_URL}/api/regenerate`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			messageId,
			modeId,
			openrouterKey,
		}),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to regenerate message");
	}

	return response.body;
}

export function useRegenerateMessageHttp() {
	const { data: user } = useUser();
	const queryClient = useQueryClient();

	return useTanStackMutation({
		mutationFn: ({
			messageId,
			modeId,
			openrouterKey,
		}: {
			messageId: string;
			modeId: string;
			openrouterKey: string;
		}) =>
			regenerateMessageHttp({
				messageId,
				modeId,
				openrouterKey,
				token: user?.token ?? "",
			}),

		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: [api.messages.list],
			});
		},
	});
}
