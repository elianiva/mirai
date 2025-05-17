import { api } from "~/../convex/_generated/api";
import { z } from "zod";

export const profileFormSchema = z.object({
	name: z.string().min(1, "Name is required"),
	model: z.string().min(1, "Model is required"),
	description: z.string(),
	temperature: z.number(),
	topP: z.number(),
	topK: z.number(),
});

export const profileApi = {
	all: api.profileOptions.getProfileOptions,
	getById: api.profileOptions.getProfileById,
};
