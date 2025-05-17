import type { z } from "zod";
import type { updateAccountSettingsSchema } from "../functions/account-settings";
import { accountSettingsApi } from "../functions/account-settings";
import { useMutation, useQuery } from "convex/react";

export type UpdateAccountSettingsVariables = z.infer<
	typeof updateAccountSettingsSchema
>;

export function useAccountSettings() {
	return useQuery(accountSettingsApi.get, {});
}

export function useUpdateAccountSettings() {
	return useMutation(accountSettingsApi.update);
}
