import type { z } from "zod";
import type {
	updateOpenrouterSettingsSchema,
	openrouterSettingsResponseSchema,
} from "../functions/openrouter-settings";
import { openrouterSettingsApi } from "../functions/openrouter-settings";
import { useMutation as useConvexMutation } from "convex/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";

export const OPENROUTER_QUERY_KEYS = {
	API_KEY: "openrouter-api-key",
	SAVE_API_KEY: "save-openrouter-api-key",
};

export type UpdateOpenrouterSettingsVariables = z.infer<
	typeof updateOpenrouterSettingsSchema
>;

export type OpenrouterSettingsResponse = z.infer<
	typeof openrouterSettingsResponseSchema
>;

export function useOpenRouterApiKey() {
	return useQuery(convexQuery(openrouterSettingsApi.get, {}));
}

export function useSaveOpenRouterApiKey() {
	const convexMutation = useConvexMutation(openrouterSettingsApi.update);

	return useMutation({
		mutationKey: [OPENROUTER_QUERY_KEYS.SAVE_API_KEY],
		mutationFn: (variables: UpdateOpenrouterSettingsVariables) => {
			return convexMutation(variables);
		},
	});
}
