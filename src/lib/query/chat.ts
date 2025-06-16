import { useMutation as useTanStackMutation } from "@tanstack/react-query";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { z } from "zod";
import { api } from "~/../convex/_generated/api";

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

export function useThreadMetadata(threadId: Id<"threads">) {
	return useQuery(
		api.threads.getById,
		threadId !== "new" ? { id: threadId } : "skip",
	);
}

// @ts-expect-error - import.meta.env is not typed
const CONVEX_HTTP_URL = import.meta.env.VITE_CONVEX_HTTP_URL as string;

export const regenerateMessageHttpSchema = z.object({
	messageId: z.string(),
	modeId: z.string(),
	openrouterKey: z.string(),
});

export type RegenerateMessageHttpVariables = z.infer<
	typeof regenerateMessageHttpSchema
>;

async function regenerateMessageHttp({
	messageId,
	modeId,
	openrouterKey,
}: RegenerateMessageHttpVariables) {
	const response = await fetch(`${CONVEX_HTTP_URL}/api/regenerate`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
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
			}),
		onError: (error: Error) => {
			console.error("Error regenerating message:", error);
		},
	});
}
