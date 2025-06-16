import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { z } from "zod";
import { api } from "~/../convex/_generated/api";

export const createBranchSchema = z.object({
	messageId: z.custom<Id<"messages">>(),
	useCondensedHistory: z.boolean(),
	openrouterKey: z.string(),
});

export type CreateBranchVariables = z.infer<typeof createBranchSchema>;

export const sendMessageSchema = z.object({
	threadId: z.custom<Id<"threads">>().optional(),
	modeId: z.string(),
	message: z.string(),
	attachmentIds: z.array(z.custom<Id<"attachments">>()).optional(),
});

export type SendMessageVariables = z.infer<typeof sendMessageSchema>;

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
