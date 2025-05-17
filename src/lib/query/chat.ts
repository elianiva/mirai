import type { z } from "zod";
import type {
	createThreadSchema,
	getThreadSchema,
	listMessagesSchema,
} from "../functions/chat";
import { chatApi } from "../functions/chat";
import {
	useMutation as useConvexMutation,
	useQuery as useConvexQuery,
} from "convex/react";
import { useMutation } from "@tanstack/react-query";
import type { Id } from "convex/_generated/dataModel";

export type CreateThreadVariables = z.infer<typeof createThreadSchema>;
export type GetThreadVariables = z.infer<typeof getThreadSchema>;
export type ListMessagesVariables = z.infer<typeof listMessagesSchema>;

export function useThread(threadId: Id<"threads"> | undefined) {
	return useConvexQuery(
		chatApi.getThread,
		threadId && threadId !== "new" ? { id: threadId } : "skip",
	);
}

export function useMessages(threadId: Id<"threads"> | undefined) {
	return useConvexQuery(
		chatApi.listMessages,
		threadId && threadId !== "new" ? { threadId } : "skip",
	);
}

export function useCreateThread() {
	const convexMutation = useConvexMutation(chatApi.createThread);

	return useMutation({
		mutationFn: (variables: CreateThreadVariables) => {
			return convexMutation(variables);
		},
	});
}
