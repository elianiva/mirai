import { z } from "zod";
import { api } from "~/../convex/_generated/api";

export const updateOpenrouterSettingsSchema = z.object({
	apiKey: z.string(),
});

export const openrouterSettingsResponseSchema = z.object({
	apiKey: z.string().nullable(),
});

export const openrouterSettingsApi = {
	get: api.openrouterSettings.getOpenrouterSettings,
	update: api.openrouterSettings.updateOpenrouterSettings,
};
