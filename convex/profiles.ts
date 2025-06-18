import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		return await ctx.db
			.query("profiles")
			.withIndex("by_user", (q) => q.eq("userId", identity.subject))
			.collect();
	},
});

export const get = query({
	args: { id: v.id("profiles") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const profile = await ctx.db.get(args.id);
		if (!profile) return null;

		if (profile.userId !== identity.subject) {
			throw new Error("Not authorized to access this profile");
		}

		return profile;
	},
});

export const create = mutation({
	args: {
		slug: v.string(),
		name: v.string(),
		description: v.string(),
		model: v.string(),
		temperature: v.number(),
		topP: v.number(),
		topK: v.number(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		return await ctx.db.insert("profiles", {
			...args,
			userId: identity.subject,
		});
	},
});

export const update = mutation({
	args: {
		id: v.id("profiles"),
		slug: v.optional(v.string()),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		model: v.optional(v.string()),
		temperature: v.optional(v.number()),
		topP: v.optional(v.number()),
		topK: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const { id, ...rest } = args;
		const profile = await ctx.db.get(id);

		if (!profile) {
			throw new Error("Profile not found");
		}

		if (profile.userId !== identity.subject) {
			throw new Error("Not authorized to update this profile");
		}

		return await ctx.db.patch(id, rest);
	},
});

export const deleteProfile = mutation({
	args: { id: v.id("profiles") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const profile = await ctx.db.get(args.id);
		if (!profile) {
			throw new Error("Profile not found");
		}

		if (profile.userId !== identity.subject) {
			throw new Error("Not authorized to delete this profile");
		}

		// Check if any modes are using this profile
		const modesUsingProfile = await ctx.db
			.query("modes")
			.withIndex("by_user", (q) => q.eq("userId", identity.subject))
			.filter((q) => q.eq(q.field("profileId"), args.id))
			.collect();

		if (modesUsingProfile.length > 0) {
			throw new ConvexError("This profile is currently in use by one or more modes and cannot be deleted.");
		}

		await ctx.db.delete(args.id);
		return args.id;
	},
});
