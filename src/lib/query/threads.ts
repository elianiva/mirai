import type { Doc, Id } from "convex/_generated/dataModel";
import { z } from "zod";
import { api } from "~/../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
	useMutation as useReactQueryMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { useEffect, useState } from "react";
import {
	loadFromLocalStorage,
	saveToLocalStorage,
} from "../local-storage-sync";

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
	const [cachedData, setCachedData] = useState(() =>
		loadFromLocalStorage<Doc<"threads">[]>("threads-data"),
	);
	const result = useQuery(api.threads.list, {});

	useEffect(() => {
		if (result !== undefined) {
			saveToLocalStorage<Doc<"threads">[]>("threads-data", result);
			setCachedData(result);
		}
	}, [result]);

	return result !== undefined ? result : cachedData;
}

export function useThread(id: Id<"threads">) {
	const cacheKey = `thread-${id}`;
	const [cachedData, setCachedData] = useState(() =>
		id !== "new" ? loadFromLocalStorage<Doc<"threads">>(cacheKey) : undefined,
	);

	useEffect(() => {
		if (id !== "new") {
			const newCachedData = loadFromLocalStorage<Doc<"threads">>(cacheKey);
			setCachedData(newCachedData);
		} else {
			setCachedData(undefined);
		}
	}, [id, cacheKey]);

	const result = useQuery(api.threads.getById, id !== "new" ? { id } : "skip");

	useEffect(() => {
		if (result !== undefined && id !== "new") {
			saveToLocalStorage<Doc<"threads">>(cacheKey, result);
			setCachedData(result);
		}
	}, [result, id, cacheKey]);

	return result !== undefined ? result : cachedData;
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
