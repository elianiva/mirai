import { z } from "zod";
import { api } from "~/../convex/_generated/api";

export const updateAccountSettingsSchema = z.object({
	name: z.string().min(1),
	role: z.string(),
	behavior: z.string(),
	openrouterKey: z.string().optional(),
});

export const accountSettingsApi = {
	get: api.accountSettings.getAccountSettings,
	update: api.accountSettings.updateAccountSettings,
};
