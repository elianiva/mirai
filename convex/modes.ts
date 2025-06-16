import { v } from "convex/values";
import { ORCHESTRATOR_MODE_CONFIG } from "../src/lib/defaults";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export const create = mutation({
	args: {
		slug: v.string(),
		icon: v.string(),
		name: v.string(),
		description: v.string(),
		profileId: v.string(),
		modeDefinition: v.string(),
		whenToUse: v.string(),
		additionalInstructions: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		return await ctx.db.insert("modes", {
			...args,
			userId: identity.subject,
		});
	},
});

export const update = mutation({
	args: {
		id: v.id("modes"),
		slug: v.string(),
		icon: v.string(),
		name: v.string(),
		description: v.string(),
		profileId: v.string(),
		modeDefinition: v.string(),
		whenToUse: v.string(),
		additionalInstructions: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const { id, ...updateData } = args;
		const existingMode = await ctx.db.get(id);

		let resultId: Id<"modes"> | undefined;
		let message: string;

		if (existingMode) {
			if (existingMode.userId !== identity.subject) {
				throw new Error("Not authorized to update this mode");
			}

			await ctx.db.patch(existingMode._id, updateData);
			resultId = existingMode._id;
			message = "Mode settings updated successfully";
		} else {
			resultId = await ctx.db.insert("modes", {
				...updateData,
				userId: identity.subject,
			});
			message = "Mode settings created successfully";
		}

		return {
			message,
			data: resultId
				? { ...updateData, _id: resultId, userId: identity.subject }
				: updateData,
		};
	},
});

export const remove = mutation({
	args: {
		id: v.id("modes"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const mode = await ctx.db.get(args.id);
		if (!mode) {
			throw new Error("Mode not found");
		}

		if (mode.userId !== identity.subject) {
			throw new Error("Not authorized to delete this mode");
		}

		if (mode.slug === ORCHESTRATOR_MODE_CONFIG.slug) {
			throw new Error("Cannot delete the orchestrator mode");
		}

		await ctx.db.delete(args.id);
		return args.id;
	},
});

export const resetOrchestrator = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const orchestratorMode = await ctx.db
			.query("modes")
			.withIndex("by_user_slug", (q) =>
				q
					.eq("userId", identity.subject)
					.eq("slug", ORCHESTRATOR_MODE_CONFIG.slug),
			)
			.first();

		if (!orchestratorMode) {
			throw new Error("Orchestrator mode not found");
		}

		const profiles = await ctx.db
			.query("profiles")
			.withIndex("by_user", (q) => q.eq("userId", identity.subject))
			.collect();
		const defaultProfile = profiles.length > 0 ? profiles[0]._id : "";

		await ctx.db.patch(orchestratorMode._id, {
			...ORCHESTRATOR_MODE_CONFIG,
			profileId: defaultProfile,
			userId: identity.subject,
		});

		return {
			message: "Orchestrator mode reset to defaults successfully",
			data: {
				...ORCHESTRATOR_MODE_CONFIG,
				_id: orchestratorMode._id,
				profileId: defaultProfile,
				userId: identity.subject,
			},
		};
	},
});

export const getById = query({
	args: {
		id: v.id("modes"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const mode = await ctx.db.get(args.id);
		if (!mode) {
			return null;
		}

		// Check if user owns this mode
		if (mode.userId !== identity.subject) {
			throw new Error("Not authorized to access this mode");
		}

		return mode;
	},
});

export const get = query({
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		return await ctx.db
			.query("modes")
			.withIndex("by_user", (q) => q.eq("userId", identity.subject))
			.collect();
	},
});

export const getBySlug = query({
	args: {
		slug: v.string(),
	},
	handler: async (ctx, args): Promise<Doc<"modes"> | null> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		return await ctx.db
			.query("modes")
			.withIndex("by_user_slug", (q) =>
				q.eq("userId", identity.subject).eq("slug", args.slug),
			)
			.first();
	},
});

export const getOrchestrator = query({
	handler: async (ctx): Promise<Doc<"modes"> | null> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		return await ctx.db
			.query("modes")
			.withIndex("by_user_slug", (q) =>
				q
					.eq("userId", identity.subject)
					.eq("slug", ORCHESTRATOR_MODE_CONFIG.slug),
			)
			.first();
	},
});
