import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "~/../convex/_generated/api";

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

export function useCreateMode() {
	return useMutation(api.modes.create);
}

export function useUpdateMode() {
	return useMutation(api.modes.update);
}

export function useUpdateModeSettings() {
	return useMutation(api.modes.updateModeSettings);
}

export function useModes() {
	return useQuery(api.modes.getAllModes);
}	
