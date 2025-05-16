import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const updateModeSettings = mutation({
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
		// Check if a mode with this slug already exists
		const existingMode = await ctx.db
			.query("modes")
			.filter((q) => q.eq(q.field("slug"), args.slug))
			.first();

		let id: Id<"modes"> | undefined;
		let message: string;

		if (existingMode) {
			// Update existing mode
			await ctx.db.patch(existingMode._id, args);
			id = existingMode._id;
			message = "Mode settings updated successfully";
		} else {
			// Insert new mode
			id = await ctx.db.insert("modes", args);
			message = "Mode settings created successfully";
		}

		return {
			message,
			data: id ? { ...args, _id: id } : args,
		};
	},
});

export const getModeSettings = query({
	args: {
		id: v.optional(v.id("modes")),
	},
	handler: async (ctx, args) => {
		if (args.id) {
			return await ctx.db.get(args.id);
		}

		// If no ID is provided, return the first mode or null
		return await ctx.db.query("modes").first();
	},
});
