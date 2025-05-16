import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAccountSettings = query({
	args: {},
	handler: async (ctx) => {
		const accountSetting = await ctx.db.query("accountSettings").first();
		return (
			accountSetting || {
				name: "Default User",
				role: "User",
				behavior: "Standard",
			}
		);
	},
});

export const updateAccountSettings = mutation({
	args: {
		name: v.string(),
		role: v.string(),
		behavior: v.string(),
	},
	handler: async (ctx, args) => {
		const existingSettings = await ctx.db.query("accountSettings").first();

		if (existingSettings) {
			await ctx.db.patch(existingSettings._id, args);
			return {
				message: "Account settings updated successfully",
				data: args,
			};
		}

		await ctx.db.insert("accountSettings", args);
		return {
			message: "Account settings created successfully",
			data: args,
		};
	},
});
