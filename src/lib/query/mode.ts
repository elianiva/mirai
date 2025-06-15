import type { Doc, Id } from "convex/_generated/dataModel";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "~/../convex/_generated/api";
import { useEffect, useState } from "react";
import {
	loadFromLocalStorage,
	saveToLocalStorage,
} from "../local-storage-sync";

export const getModesSchema = z.object({});

export type GetModesVariables = z.infer<typeof getModesSchema>;

export const getModeByIdSchema = z.object({
	id: z.custom<Id<"modes">>(),
});

export type GetModeByIdVariables = z.infer<typeof getModeByIdSchema>;

export const createModeSchema = z.object({
	slug: z.string(),
	icon: z.string(),
	name: z.string(),
	description: z.string(),
	profileSelector: z.string(),
	modeDefinition: z.string(),
	whenToUse: z.string(),
	additionalInstructions: z.string(),
});

export type CreateModeVariables = z.infer<typeof createModeSchema>;

export const updateModeSettingsSchema = z.object({
	id: z.custom<Id<"modes">>(),
	slug: z.string(),
	icon: z.string(),
	name: z.string(),
	description: z.string(),
	profileSelector: z.string(),
	modeDefinition: z.string(),
	whenToUse: z.string(),
	additionalInstructions: z.string(),
});

export type UpdateModeSettingsVariables = z.infer<
	typeof updateModeSettingsSchema
>;

export function useModes() {
	const [cachedData, setCachedData] = useState(() =>
		loadFromLocalStorage<Doc<"modes">[]>("modes-data"),
	);
	const result = useQuery(api.modes.get, {});

	useEffect(() => {
		if (result !== undefined) {
			saveToLocalStorage("modes-data", result);
			setCachedData(result);
		}
	}, [result]);

	return result !== undefined ? result : cachedData;
}

export function useMode(id: Id<"modes">) {
	return useQuery(api.modes.getById, { id });
}

export function useCreateMode() {
	return useMutation(api.modes.create);
}

export function useUpdateMode() {
	return useMutation(api.modes.update);
}
