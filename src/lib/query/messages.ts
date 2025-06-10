import type { Id } from "convex/_generated/dataModel";
import { z } from "zod";
import { api } from "~/../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";

export const listMessagesSchema = z.object({
	threadId: z.custom<Id<"threads">>(),
	branchId: z.string().optional(),
});

export type ListMessagesVariables = z.infer<typeof listMessagesSchema>;

export const createMessageSchema = z.object({
	threadId: z.custom<Id<"threads">>(),
	content: z.string(),
	type: z.string(),
	metadata: z.any().optional(),
});

export type CreateMessageVariables = z.infer<typeof createMessageSchema>;

export const updateMessageSchema = z.object({
	id: z.custom<Id<"messages">>(),
	content: z.string(),
	metadata: z.any().optional(),
});

export type UpdateMessageVariables = z.infer<typeof updateMessageSchema>;

export const removeMessageSchema = z.object({
	id: z.custom<Id<"messages">>(),
});

export type RemoveMessageVariables = z.infer<typeof removeMessageSchema>;

export function useMessages(threadId: Id<"threads">, branchId?: string) {
	return useReactQuery(
		convexQuery(
			api.messages.list,
			threadId !== "new" ? { threadId, branchId } : "skip",
		),
	);
}

export function useCreateMessage() {
	return useMutation(api.messages.create);
}

export function useUpdateMessage() {
	return useMutation(api.messages.update);
}

export function useRemoveMessage() {
	return useMutation(api.messages.remove);
}

export function useSendMessage() {
	return useMutation(api.chat.sendMessage);
}

export function useRegenerateMessage() {
	return useMutation(api.chat.regenerateMessage);
}
