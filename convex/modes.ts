import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const create = mutation({
	args: {
		slug: v.string(),
		icon: v.string(),
		name: v.string(),
		description: v.string(),
		profileSelector: v.string(),
		modeDefinition: v.string(),
		whenToUse: v.string(),
		additionalInstructions: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("modes", args);
	},
});

export const update = mutation({
	args: {
		slug: v.string(),
		icon: v.string(),
		name: v.string(),
		description: v.string(),
		profileSelector: v.string(),
		modeDefinition: v.string(),
		whenToUse: v.string(),
		additionalInstructions: v.string(),
	},
	handler: async (ctx, args) => {
		const existingMode = await ctx.db
			.query("modes")
			.filter((q) => q.eq(q.field("slug"), args.slug))
			.first();

		let id: Id<"modes"> | undefined;
		let message: string;

		if (existingMode) {
			await ctx.db.patch(existingMode._id, args);
			id = existingMode._id;
			message = "Mode settings updated successfully";
		} else {
			id = await ctx.db.insert("modes", args);
			message = "Mode settings created successfully";
		}

		return {
			message,
			data: id ? { ...args, _id: id } : args,
		};
	},
});

export const getById = query({
	args: {
		id: v.id("modes"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

export const get = query({
	handler: async (ctx) => {
		return await ctx.db.query("modes").collect();
	},
});
