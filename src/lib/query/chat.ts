import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { z } from "zod";
import { api } from "~/../convex/_generated/api";

export const createBranchSchema = z.object({
	parentMessageId: z.custom<Id<"messages">>(),
	openrouterKey: z.string(),
});

export type CreateBranchVariables = z.infer<typeof createBranchSchema>;

export const createDetachedBranchSchema = z.object({
	parentMessageId: z.custom<Id<"messages">>(),
	openrouterKey: z.string(),
	useCondensedHistory: z.boolean(),
});

export type CreateDetachedBranchVariables = z.infer<
	typeof createDetachedBranchSchema
>;

export const getBranchesSchema = z.object({
	threadId: z.custom<Id<"threads">>(),
});

export type GetBranchesVariables = z.infer<typeof getBranchesSchema>;

export const sendMessageSchema = z.object({
	threadId: z.custom<Id<"threads">>().optional(),
	modeId: z.string(),
	message: z.string(),
	parentMessageId: z.custom<Id<"messages">>().optional(),
	branchId: z.string().optional(),
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
	return useMutation(api.chat.createBranch);
}

export function useCreateDetachedBranch() {
	return useMutation(api.chat.createDetachedBranch);
}

export function useBranches(threadId: Id<"threads">) {
	return useQuery(
		api.chat.getBranches,
		threadId !== "new" ? { threadId } : "skip",
	);
}

export function useThreadMetadata(threadId: Id<"threads">) {
	return useQuery(
		api.threads.getThreadMetadata,
		threadId !== "new" ? { id: threadId } : "skip",
	);
}
