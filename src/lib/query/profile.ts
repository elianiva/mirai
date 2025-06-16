import { convexQuery } from "@convex-dev/react-query";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import type { Doc, Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { api } from "~/../convex/_generated/api";
import {
	loadFromLocalStorage,
	saveToLocalStorage,
} from "../local-storage-sync";

export const profileFormSchema = z.object({
	slug: z.string().min(1, "Slug is required"),
	name: z.string().min(1, "Name is required"),
	model: z.string().min(1, "Model is required"),
	description: z.string(),
	temperature: z.number(),
	topP: z.number(),
	topK: z.number(),
});

export const getProfileOptionsSchema = z.object({});

export type GetProfileOptionsVariables = z.infer<
	typeof getProfileOptionsSchema
>;

export const getProfileByIdSchema = z.object({
	id: z.custom<Id<"profiles">>(),
});

export type GetProfileByIdVariables = z.infer<typeof getProfileByIdSchema>;

export const listProfilesSchema = z.object({});

export type ListProfilesVariables = z.infer<typeof listProfilesSchema>;

export const createProfileSchema = z.object({
	slug: z.string(),
	name: z.string(),
	description: z.string(),
	model: z.string(),
	temperature: z.number(),
	topP: z.number(),
	topK: z.number(),
});

export type CreateProfileVariables = z.infer<typeof createProfileSchema>;

export const updateProfileSchema = z.object({
	id: z.custom<Id<"profiles">>(),
	slug: z.string().optional(),
	name: z.string().optional(),
	description: z.string().optional(),
	model: z.string().optional(),
	temperature: z.number().optional(),
	topP: z.number().optional(),
	topK: z.number().optional(),
});

export type UpdateProfileVariables = z.infer<typeof updateProfileSchema>;

export function useProfileOptions() {
	const [cachedData, setCachedData] = useState(() =>
		loadFromLocalStorage<Doc<"profiles">[]>("profile-options-data"),
	);
	const result = useQuery(api.profileOptions.getProfileOptions, {});

	useEffect(() => {
		if (result !== undefined) {
			saveToLocalStorage("profile-options-data", result);
			setCachedData(result);
		}
	}, [result]);

	return result !== undefined ? result : cachedData;
}

export function useProfile(id: Id<"profiles">) {
	return useQuery(api.profileOptions.getProfileById, { id });
}

export function useProfiles() {
	return useQuery(api.profiles.list, {});
}

export function useProfileById(id: Id<"profiles">) {
	return useQuery(api.profiles.get, { id });
}

export type OpenRouterModel = {
	value: string;
	label: string;
};

export function useOpenRouterModels() {
	return useReactQuery({
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

export type CreateProfileData = {
	slug: string;
	name: string;
	description: string;
	model: string;
	temperature: number;
	topP: number;
	topK: number;
};

export type UpdateProfileData = {
	id: Id<"profiles">;
	slug: string;
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
