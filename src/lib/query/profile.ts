import { useQuery as useTanstackQuery } from "@tanstack/react-query";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
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

export function useProfileOptions() {
	return useQuery(api.profileOptions.getProfileOptions, {});
}

export function useProfile(id: Id<"profiles">) {
	return useQuery(api.profileOptions.getProfileById, { id });
}

export type OpenRouterModel = {
	value: string;
	label: string;
};

export function useOpenRouterModels() {
	return useTanstackQuery({
		queryKey: ["openrouter-models"],
		queryFn: async (): Promise<OpenRouterModel[]> => {
			try {
				const response = await fetch("https://openrouter.ai/api/v1/models");
				const data = await response.json();
				return data.data.map((model: { id: string; name: string }) => ({
					value: model.id,
					label: model.name,
				}));
			} catch (error) {
				console.error("Failed to fetch OpenRouter models:", error);
				throw error;
			}
		},
	});
}

// Mutation hooks
export type CreateProfileData = {
	name: string;
	description: string;
	model: string;
	temperature: number;
	topP: number;
	topK: number;
};

export type UpdateProfileData = {
	id: Id<"profiles">;
	name: string;
	description: string;
	model: string;
	temperature: number;
	topP: number;
	topK: number;
};

export function useCreateProfile() {
	return useMutation(api.profiles.create);
}

export function useUpdateProfile() {
	return useMutation(api.profiles.update);
}
