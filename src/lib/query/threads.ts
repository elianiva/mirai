import type { Id } from "convex/_generated/dataModel";
import { z } from "zod";
import { api } from "~/../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";

export const listThreadsSchema = z.object({});

export type ListThreadsVariables = z.infer<typeof listThreadsSchema>;

export const getThreadSchema = z.object({
	id: z.custom<Id<"threads">>(),
});

export type GetThreadVariables = z.infer<typeof getThreadSchema>;

export const createThreadSchema = z.object({
	message: z.string(),
});

export type CreateThreadVariables = z.infer<typeof createThreadSchema>;

export const removeThreadSchema = z.object({
	id: z.custom<Id<"threads">>(),
});

export type RemoveThreadVariables = z.infer<typeof removeThreadSchema>;

export function useThreads() {
	return useQuery(api.threads.list, {});
}

export function useThread(id: Id<"threads">) {
	return useQuery(api.threads.getById, id !== "new" ? { id } : "skip");
}

export function useCreateThread() {
	return useMutation(api.threads.create);
}

export function useRemoveThread() {
	return useMutation(api.threads.remove);
}
