import type { Id } from "convex/_generated/dataModel";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "~/../convex/_generated/api";

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
	return useReactQuery(convexQuery(api.modes.get, {}));
}

export function useMode(id: Id<"modes">) {
	return useReactQuery(
		convexQuery(api.modes.getById, id !== "new" ? { id } : "skip"),
	);
}

export function useCreateMode() {
	return useMutation(api.modes.create);
}

export function useUpdateMode() {
	return useMutation(api.modes.update);
}

export function useUpdateModeSettings() {
	return useMutation(api.modes.update);
}
