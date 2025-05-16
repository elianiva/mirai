import { query } from "./_generated/server";
import { v } from "convex/values";

export const getProfileOptions = query({
	args: {},
	handler: async (ctx) => {
		const profiles = await ctx.db.query("profiles").collect();
		return profiles;
	},
});

export const getProfileById = query({
	args: { id: v.id("profiles") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});
