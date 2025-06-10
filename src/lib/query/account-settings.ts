import { z } from "zod";
import { api } from "~/../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";

export const getAccountSettingsSchema = z.object({});

export type GetAccountSettingsVariables = z.infer<typeof getAccountSettingsSchema>;

export const updateAccountSettingsSchema = z.object({
	name: z.string(),
	role: z.string(),
	behavior: z.string(),
});

export type UpdateAccountSettingsVariables = z.infer<
	typeof updateAccountSettingsSchema
>;

export function useAccountSettings() {
	return useQuery(api.accountSettings.getAccountSettings, {});
}

export function useUpdateAccountSettings() {
	return useMutation(api.accountSettings.updateAccountSettings);
}
