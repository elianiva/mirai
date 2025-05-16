import type { z } from "zod";
import type { updateModeSettingsSchema } from "../functions/mode";
import { modeApi } from "../functions/mode";
import { useMutation as useConvexMutation } from "convex/react";
import { useMutation } from "@tanstack/react-query";

export type UpdateModeSettingsVariables = z.infer<
	typeof updateModeSettingsSchema
>;

export function useUpdateModeSettings() {
	const convexMutation = useConvexMutation(modeApi.update);
	return useMutation({
		mutationFn: (variables: UpdateModeSettingsVariables) => {
			return convexMutation(variables);
		},
	});
}
