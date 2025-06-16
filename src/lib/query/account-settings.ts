import type { Doc } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { api } from "~/../convex/_generated/api";
import {
	loadFromLocalStorage,
	saveToLocalStorage,
} from "../local-storage-sync";

export const getAccountSettingsSchema = z.object({});

export type GetAccountSettingsVariables = z.infer<
	typeof getAccountSettingsSchema
>;

export const updateAccountSettingsSchema = z.object({
	name: z.string(),
	role: z.string(),
	behavior: z.string(),
});

export type UpdateAccountSettingsVariables = z.infer<
	typeof updateAccountSettingsSchema
>;

export function useAccountSettings() {
	const [cachedData, setCachedData] = useState(() =>
		loadFromLocalStorage<
			Doc<"accountSettings"> | { name: string; role: string; behavior: string }
		>("account-settings-data"),
	);
	const result = useQuery(api.accountSettings.getAccountSettings, {});

	useEffect(() => {
		if (result !== undefined) {
			saveToLocalStorage("account-settings-data", result);
			setCachedData(result);
		}
	}, [result]);

	return result !== undefined ? result : cachedData;
}

export function useUpdateAccountSettings() {
	return useMutation(api.accountSettings.updateAccountSettings);
}
