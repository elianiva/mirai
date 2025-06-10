import type { Id } from "convex/_generated/dataModel";
import { z } from "zod";
import { api } from "~/../convex/_generated/api";
import { useMutation } from "convex/react";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";

export const createBranchSchema = z.object({
	parentMessageId: z.custom<Id<"messages">>(),
});

export type CreateBranchVariables = z.infer<typeof createBranchSchema>;

export const switchBranchSchema = z.object({
	threadId: z.custom<Id<"threads">>(),
	branchId: z.string(),
});

export type SwitchBranchVariables = z.infer<typeof switchBranchSchema>;

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

export type RegenerateMessageVariables = z.infer<typeof regenerateMessageSchema>;

export function useCreateBranch() {
	return useMutation(api.chat.createBranch);
}

export function useSwitchBranch() {
	return useMutation(api.chat.switchBranch);
}

export function useBranches(threadId: Id<"threads">) {
	return useReactQuery(
		convexQuery(api.chat.getBranches, threadId !== "new" ? { threadId } : "skip"),
	);
}

export function useSendMessage() {
	return useMutation(api.chat.sendMessage);
}

export function useRegenerateMessage() {
	return useMutation(api.chat.regenerateMessage);
}
