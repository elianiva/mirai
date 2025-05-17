import { z } from "zod";
import { api } from "~/../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

export const createThreadSchema = z.object({
	title: z.string(),
	participantIds: z.array(z.string()),
});

export const getThreadSchema = z.object({
	id: z.custom<Id<"threads">>(),
});

export const listMessagesSchema = z.object({
	threadId: z.custom<Id<"threads">>(),
});

export const chatApi = {
	getThread: api.threads.getById,
	listMessages: api.messages.list,
	createThread: api.threads.create,
};
