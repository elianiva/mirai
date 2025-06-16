import type { Doc, Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { api } from "~/../convex/_generated/api";
import {
	loadFromLocalStorage,
	saveToLocalStorage,
} from "../local-storage-sync";

export const listMessagesSchema = z.object({
	threadId: z.custom<Id<"threads">>(),
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

export function useMessages(threadId: Id<"threads">) {
	const cacheKey = `messages-data-${threadId}`;

	const [cachedData, setCachedData] = useState<Doc<"messages">[] | undefined>(
		undefined,
	);

	useEffect(() => {
		if (threadId !== "new") {
			const newCachedData = loadFromLocalStorage<Doc<"messages">[]>(cacheKey);
			setCachedData(newCachedData);
		} else {
			setCachedData(undefined);
		}
	}, [threadId, cacheKey]);

	const result = useQuery(
		api.messages.list,
		threadId !== "new" ? { threadId } : "skip",
	);

	useEffect(() => {
		if (result !== undefined && threadId !== "new") {
			saveToLocalStorage<Doc<"messages">[]>(cacheKey, result);
			setCachedData(result);
		}
	}, [result, threadId, cacheKey]);

	return result !== undefined ? result : (cachedData ?? []);
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
