import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const updateAccountSettingsSchema = z.object({
	name: z.string().min(1),
	role: z.string(),
	behavior: z.string(),
});

export const getAccountSettingsFn = createServerFn({
	method: "GET",
}).handler(async () => {
	// Placeholder for account settings retrieval logic
	return { message: "Account settings retrieval placeholder" };
});

export const updateAccountSettingsFn = createServerFn({
	method: "POST",
})
	.validator(updateAccountSettingsSchema)
	.handler(async ({ data }) => {
		// Placeholder for account settings update logic
		// parsedVariables are now validated and typed
		return {
			message: "Account settings update placeholder",
			data,
		};
	});
