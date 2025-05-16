import type { z } from "zod";
import type { updateAccountSettingsSchema } from "../functions/account-settings";
import { accountSettingsApi } from "../functions/account-settings";
import { useMutation as useConvexMutation } from "convex/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";

export type UpdateAccountSettingsVariables = z.infer<
	typeof updateAccountSettingsSchema
>;

export function useAccountSettings() {
	return useQuery(convexQuery(accountSettingsApi.get, {}));
}

export function useUpdateAccountSettings() {
	const convexMutation = useConvexMutation(accountSettingsApi.update);

	return useMutation({
		mutationFn: (variables: UpdateAccountSettingsVariables) => {
			return convexMutation(variables);
		},
	});
}
