import { profileApi } from "../functions/profile";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import type { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "~/../convex/_generated/api";

// Query hooks
export function useProfileOptions() {
	return useQuery(convexQuery(profileApi.all, {}));
}

export function useProfile(id: Id<"profiles">) {
	return useQuery(convexQuery(profileApi.getById, { id }));
}

export type OpenRouterModel = {
	value: string;
	label: string;
};

export function useOpenRouterModels() {
	return useQuery({
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
