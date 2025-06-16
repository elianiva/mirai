import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("profiles").collect();
	},
});

export const get = query({
	args: { id: v.id("profiles") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
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
		return await ctx.db.insert("profiles", args);
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
		const { id, ...rest } = args;
		return await ctx.db.patch(id, rest);
	},
});
