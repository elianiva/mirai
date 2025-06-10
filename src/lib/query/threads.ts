import type { Id } from "convex/_generated/dataModel";
import { z } from "zod";
import { api } from "~/../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useMutation as useReactQueryMutation, useQueryClient } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";

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

export const renameThreadSchema = z.object({
	id: z.custom<Id<"threads">>(),
	title: z.string(),
});

export type RenameThreadVariables = z.infer<typeof renameThreadSchema>;

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

export function useRenameThread() {
	const queryClient = useQueryClient();
	const convexMutation = useConvexMutation(api.threads.renameThread);
	
	return useReactQueryMutation({
		mutationFn: convexMutation,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["threads"] });
		},
	});
}
