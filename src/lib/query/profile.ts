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
	id: string;
	name: string;
};

export function useOpenRouterModels() {
	return useQuery({
		queryKey: ["openrouter-models"],
		queryFn: async (): Promise<OpenRouterModel[]> => {
			try {
				// In a real implementation, you would fetch from the OpenRouter API
				// This would require an API key and proper authentication
				// For now, returning a static list of common models

				// Example of how the actual fetch would look:
				// const response = await fetch("https://openrouter.ai/api/v1/models", {
				//   headers: {
				//     "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
				//     "Content-Type": "application/json"
				//   }
				// });
				// const data = await response.json();
				// return data.data.map(model => ({
				//   id: model.id,
				//   name: model.name
				// }));

				// Static list for demonstration
				return [
					{ id: "anthropic/claude-3-opus-20240229", name: "Claude 3 Opus" },
					{ id: "anthropic/claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
					{ id: "anthropic/claude-3-haiku-20240307", name: "Claude 3 Haiku" },
					{ id: "openai/gpt-4-turbo", name: "GPT-4 Turbo" },
					{ id: "openai/gpt-4o", name: "GPT-4o" },
					{ id: "openai/gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
					{ id: "google/gemini-pro", name: "Gemini Pro" },
					{ id: "google/gemini-1.5-pro", name: "Gemini 1.5 Pro" },
					{ id: "meta-llama/llama-3-70b-instruct", name: "Llama 3 70B" },
					{ id: "meta-llama/llama-3-8b-instruct", name: "Llama 3 8B" },
				];
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
