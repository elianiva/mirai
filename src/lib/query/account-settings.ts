import { useMutation, queryOptions, useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import {
	getAccountSettingsFn,
	updateAccountSettingsFn,
} from "../functions/account-settings";
import type { updateAccountSettingsSchema } from "../functions/account-settings";

export const ACCOUNT_SETTINGS_QUERY_KEYS = {
	accountSettings: "accountSettings",
} as const;

export const accountSettingsQueryOptions = queryOptions({
	queryKey: [ACCOUNT_SETTINGS_QUERY_KEYS.accountSettings],
	queryFn: getAccountSettingsFn,
});

export const useAccountSettings = () => {
	return useQuery(accountSettingsQueryOptions);
};

export type UpdateAccountSettingsVariables = z.infer<
	typeof updateAccountSettingsSchema
>;

export function useUpdateAccountSettings() {
	return useMutation({
		mutationKey: [ACCOUNT_SETTINGS_QUERY_KEYS.accountSettings],
		mutationFn: (variables: UpdateAccountSettingsVariables) =>
			updateAccountSettingsFn({ data: variables }),
	});
}
