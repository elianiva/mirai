import type { Id } from "convex/_generated/dataModel";
import { z } from "zod";
import { api } from "~/../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";

export const listMessagesSchema = z.object({
	threadId: z.custom<Id<"threads">>(),
});

export type ListMessagesVariables = z.infer<typeof listMessagesSchema>;

export const createMessageSchema = z.object({
	threadId: z.custom<Id<"threads">>(),
	content: z.string(),
	type: z.string(),
	metadata: z.any(),
});

export type CreateMessageVariables = z.infer<typeof createMessageSchema>;

export const removeMessageSchema = z.object({
	id: z.custom<Id<"messages">>(),
});

export type RemoveMessageVariables = z.infer<typeof removeMessageSchema>;

export function useMessages(threadId: Id<"threads">) {
	return useQuery(
		api.messages.list,
		threadId !== "new" ? { threadId } : "skip",
	);
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
