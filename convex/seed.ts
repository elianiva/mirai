import {
	DEFAULT_MODES,
	DEFAULT_PROFILES,
	ORCHESTRATOR_MODE_CONFIG,
} from "../src/lib/defaults";
import { mutation } from "./_generated/server";

export const seedDatabase = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const userId = identity.subject;
		console.log(`Starting database seeding for user: ${userId}`);

		console.log("Seeding profiles...");
		let profilesSeeded = 0;
		let profilesOverridden = 0;
		for (const profile of DEFAULT_PROFILES) {
			const existingProfile = await ctx.db
				.query("profiles")
				.withIndex("by_user_slug", (q) =>
					q.eq("userId", userId).eq("slug", profile.slug),
				)
				.first();

			if (!existingProfile) {
				await ctx.db.insert("profiles", {
					userId,
					slug: profile.slug,
					name: profile.name,
					description: profile.description,
					model: profile.model,
					temperature: profile.temperature,
					topP: profile.topP,
					topK: profile.topK,
				});
				console.log(`Inserted profile: ${profile.name}`);
				profilesSeeded++;
			} else {
				await ctx.db.patch(existingProfile._id, {
					name: profile.name,
					description: profile.description,
					model: profile.model,
					temperature: profile.temperature,
					topP: profile.topP,
					topK: profile.topK,
				});
				console.log(
					`Updated existing profile: ${profile.name} (slug: ${profile.slug})`,
				);
				profilesOverridden++;
			}
		}

		console.log("Seeding modes...");
		let modesSeeded = 0;
		let modesOverridden = 0;
		const profiles = await ctx.db
			.query("profiles")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();
		const defaultProfileId = profiles.length > 0 ? profiles[0]._id : "";

		for (const mode of DEFAULT_MODES) {
			const existingMode = await ctx.db
				.query("modes")
				.withIndex("by_user_slug", (q) =>
					q.eq("userId", userId).eq("slug", mode.slug),
				)
				.first();

			if (!existingMode) {
				const profileId =
					mode.slug === ORCHESTRATOR_MODE_CONFIG.slug
						? defaultProfileId
						: mode.profileId;

				await ctx.db.insert("modes", {
					userId,
					slug: mode.slug,
					icon: mode.icon,
					name: mode.name,
					description: mode.description,
					profileId: profileId,
					modeDefinition: mode.modeDefinition,
					whenToUse: mode.whenToUse,
					additionalInstructions: mode.additionalInstructions,
				});
				console.log(`Inserted mode: ${mode.name}`);
				modesSeeded++;
			} else {
				const profileId =
					mode.slug === ORCHESTRATOR_MODE_CONFIG.slug
						? defaultProfileId
						: mode.profileId;

				await ctx.db.patch(existingMode._id, {
					icon: mode.icon,
					name: mode.name,
					description: mode.description,
					profileId: profileId,
					modeDefinition: mode.modeDefinition,
					whenToUse: mode.whenToUse,
					additionalInstructions: mode.additionalInstructions,
				});
				console.log(`Updated existing mode: ${mode.name} (slug: ${mode.slug})`);
				modesOverridden++;
			}
		}

		console.log("Database seeding completed!");
		return {
			success: true,
			message: "Database seeded successfully",
			profilesSeeded: profilesSeeded,
			profilesOverridden: profilesOverridden,
			modesSeeded: modesSeeded,
			modesOverridden: modesOverridden,
		};
	},
});

export const clearDatabase = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const userId = identity.subject;
		console.log(`Starting database clearing for user: ${userId}`);

		const defaultProfileSlugs = DEFAULT_PROFILES.map((p) => p.slug);
		const defaultModeSlugs = DEFAULT_MODES.map((m) => m.slug);

		const profiles = await ctx.db
			.query("profiles")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();
		const defaultProfiles = profiles.filter((profile) =>
			defaultProfileSlugs.includes(profile.slug),
		);
		for (const profile of defaultProfiles) {
			await ctx.db.delete(profile._id);
		}
		console.log(
			`Cleared ${defaultProfiles.length} default profiles (left ${profiles.length - defaultProfiles.length} custom profiles)`,
		);

		const modes = await ctx.db
			.query("modes")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();
		const defaultModes = modes.filter((mode) =>
			defaultModeSlugs.includes(mode.slug),
		);
		// Don't delete the orchestrator mode even during clearing
		const nonOrchestratorDefaultModes = defaultModes.filter(
			(mode) => mode.slug !== ORCHESTRATOR_MODE_CONFIG.slug,
		);
		for (const mode of nonOrchestratorDefaultModes) {
			await ctx.db.delete(mode._id);
		}

		const orchestratorDeletedCount =
			defaultModes.length - nonOrchestratorDefaultModes.length;
		if (orchestratorDeletedCount > 0) {
			console.log(
				`Preserved ${orchestratorDeletedCount} orchestrator mode from deletion`,
			);
		}

		console.log(
			`Cleared ${nonOrchestratorDefaultModes.length} default modes (left ${modes.length - nonOrchestratorDefaultModes.length} custom modes)`,
		);

		console.log("Database clearing completed!");
		return {
			success: true,
			message: "Default profiles and modes cleared successfully",
			profilesCleared: defaultProfiles.length,
			modesCleared: nonOrchestratorDefaultModes.length,
			customProfilesPreserved: profiles.length - defaultProfiles.length,
			customModesPreserved: modes.length - nonOrchestratorDefaultModes.length,
		};
	},
});
