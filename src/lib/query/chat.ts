import type { Id } from "convex/_generated/dataModel";
import { api } from "~/../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";

export function useCreateBranch() {
	return useMutation(api.chat.createBranch);
}

export function useSwitchBranch() {
	return useMutation(api.chat.switchBranch);
}

export function useBranches(threadId: Id<"threads">) {
	return useQuery(api.chat.getBranches, { threadId });
}
