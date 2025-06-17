import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

export function useThreads() {
	return useQuery(api.threads.list);
}

export function useThread(threadId: string) {
	return useQuery(
		api.threads.getById,
		threadId !== "new" ? { id: threadId as Id<"threads"> } : "skip",
	);
}

export function useCreateThread() {
	return useMutation(api.threads.create);
}

export function useUpdateThreadTitle() {
	return useMutation(api.threads.updateTitle);
}

export function useRenameThread() {
	return useMutation(api.threads.updateTitle);
}

export function useRemoveThread() {
	return useMutation(api.threads.remove);
}
