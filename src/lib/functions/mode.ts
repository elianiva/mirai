import { z } from "zod";
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

export const modeApi = {
	get: api.modes.getModeSettings,
	update: api.modes.updateModeSettings,
};
