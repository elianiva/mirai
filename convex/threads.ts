import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
	args: {
		title: v.optional(v.string()),
		participantIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const userId = identity.subject;

		const participantIds = args.participantIds.includes(userId)
			? args.participantIds
			: [...args.participantIds, userId];

		return await ctx.db.insert("threads", {
			title: args.title || "New Chat",
			participantIds,
		});
	},
});

export const getById = query({
	args: {
		id: v.id("threads"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const userId = identity.subject;
		const thread = await ctx.db.get(args.id);

		if (!thread) {
			throw new Error("Thread not found");
		}

		if (!thread.participantIds.includes(userId)) {
			throw new Error("Not authorized to access this thread");
		}

		return thread;
	},
});

export const list = query({
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("Not authenticated");
		}

		const userId = identity.subject;

		return await ctx.db
			.query("threads")
			.withIndex("by_participant", (q) => q.eq("participantIds", [userId]))
			.order("desc")
			.collect();
	},
});

export const updateTitle = mutation({
	args: {
		id: v.id("threads"),
		title: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const userId = identity.subject;
		const thread = await ctx.db.get(args.id);

		if (!thread) {
			throw new Error("Thread not found");
		}

		if (!thread.participantIds.includes(userId)) {
			throw new Error("Not authorized to update this thread");
		}

		await ctx.db.patch(args.id, {
			title: args.title,
		});

		return args.id;
	},
});

export const remove = mutation({
	args: {
		id: v.id("threads"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const userId = identity.subject;
		const thread = await ctx.db.get(args.id);

		if (!thread) {
			throw new Error("Thread not found");
		}

		if (!thread.participantIds.includes(userId)) {
			throw new Error("Not authorized to delete this thread");
		}

		const messages = await ctx.db
			.query("messages")
			.filter((q) => q.eq(q.field("threadId"), args.id))
			.collect();

		for (const message of messages) {
			await ctx.db.delete(message._id);
		}

		await ctx.db.delete(args.id);

		return args.id;
	},
});
