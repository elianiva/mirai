import { mutation } from "./_generated/server";
import { DEFAULT_PROFILES, DEFAULT_MODES } from "../src/lib/defaults";

export const seedDatabase = mutation({
	args: {},
	handler: async (ctx) => {
		console.log("Starting database seeding...");

		const existingProfiles = await ctx.db.query("profiles").collect();
		if (existingProfiles.length === 0) {
			console.log("Seeding profiles...");
			for (const profile of DEFAULT_PROFILES) {
				await ctx.db.insert("profiles", {
					slug: profile.slug,
					name: profile.name,
					description: profile.description,
					model: profile.model,
					temperature: profile.temperature,
					topP: profile.topP,
					topK: profile.topK,
				});
				console.log(`Inserted profile: ${profile.name}`);
			}
		} else {
			console.log("Profiles already exist, skipping profile seeding");
		}

		const existingModes = await ctx.db.query("modes").collect();
		if (existingModes.length === 0) {
			console.log("Seeding modes...");
			for (const mode of DEFAULT_MODES) {
				await ctx.db.insert("modes", {
					slug: mode.slug,
					icon: mode.icon,
					name: mode.name,
					description: mode.description,
					profileSelector: mode.profileSelector,
					modeDefinition: mode.modeDefinition,
					whenToUse: mode.whenToUse,
					additionalInstructions: mode.additionalInstructions,
				});
				console.log(`Inserted mode: ${mode.name}`);
			}
		} else {
			console.log("Modes already exist, skipping mode seeding");
		}

		console.log("Database seeding completed!");
		return {
			success: true,
			message: "Database seeded successfully",
			profilesSeeded: existingProfiles.length === 0 ? DEFAULT_PROFILES.length : 0,
			modesSeeded: existingModes.length === 0 ? DEFAULT_MODES.length : 0,
		};
	},
});

export const clearDatabase = mutation({
	args: {},
	handler: async (ctx) => {
		console.log("Starting database clearing...");
		
		const defaultProfileSlugs = DEFAULT_PROFILES.map(p => p.slug);
		const defaultModeSlugs = DEFAULT_MODES.map(m => m.slug);
		
		const profiles = await ctx.db.query("profiles").collect();
		const defaultProfiles = profiles.filter(profile => defaultProfileSlugs.includes(profile.slug));
		for (const profile of defaultProfiles) {
			await ctx.db.delete(profile._id);
		}
		console.log(`Cleared ${defaultProfiles.length} default profiles (left ${profiles.length - defaultProfiles.length} custom profiles)`);
		
		const modes = await ctx.db.query("modes").collect();
		const defaultModes = modes.filter(mode => defaultModeSlugs.includes(mode.slug));
		for (const mode of defaultModes) {
			await ctx.db.delete(mode._id);
		}
		console.log(`Cleared ${defaultModes.length} default modes (left ${modes.length - defaultModes.length} custom modes)`);

		console.log("Database clearing completed!");
		return {
			success: true,
			message: "Default profiles and modes cleared successfully",
			profilesCleared: defaultProfiles.length,
			modesCleared: defaultModes.length,
			customProfilesPreserved: profiles.length - defaultProfiles.length,
			customModesPreserved: modes.length - defaultModes.length,
		};
	},
}); 
