import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

		return thread;
	},
});

export const list = query({
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		return await ctx.db.query("threads").order("desc").collect();
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

		await ctx.db.patch(args.id, {
			title: args.title,
		});

		return args.id;
	},
});

export const renameThread = mutation({
	args: {
		id: v.id("threads"),
		title: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const thread = await ctx.db.get(args.id);

		if (!thread) {
			throw new Error("Thread not found");
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

		const thread = await ctx.db.get(args.id);

		if (!thread) {
			throw new Error("Thread not found");
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

export const getThreadMetadata = query({
	args: {
		id: v.id("threads"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const thread = await ctx.db.get(args.id);
		if (!thread) {
			throw new Error("Thread not found");
		}

		return {
			id: thread._id,
			title: thread.title,
			parentId: thread.parentId,
			isDetached: thread.isDetached || false,
			condensedFromThreadId: thread.condensedFromThreadId,
		};
	},
});
