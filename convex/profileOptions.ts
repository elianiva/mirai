import { v } from "convex/values";
import { query } from "./_generated/server";

export const getProfileOptions = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const profiles = await ctx.db
			.query("profiles")
			.withIndex("by_user", (q) => q.eq("userId", identity.subject))
			.collect();
		return profiles;
	},
});

export const getProfileById = query({
	args: { id: v.id("profiles") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const profile = await ctx.db.get(args.id);
		if (!profile) {
			return null;
		}

		if (profile.userId !== identity.subject) {
			throw new Error("Not authorized to access this profile");
		}

		return profile;
	},
});
