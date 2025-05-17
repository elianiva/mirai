import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
	args: {
		threadId: v.id("threads"),
		content: v.string(),
		type: v.string(),
		metadata: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const userId = identity.subject;

		const thread = await ctx.db.get(args.threadId);
		if (!thread) {
			throw new Error("Thread not found");
		}

		if (!thread.participantIds.includes(userId)) {
			throw new Error("Not authorized to post in this thread");
		}

		return await ctx.db.insert("messages", {
			threadId: args.threadId,
			senderId: userId,
			content: args.content,
			type: args.type,
			metadata: args.metadata,
		});
	},
});

export const list = query({
	args: {
		threadId: v.id("threads"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const userId = identity.subject;

		const thread = await ctx.db.get(args.threadId);
		if (!thread) {
			throw new Error("Thread not found");
		}

		if (!thread.participantIds.includes(userId)) {
			throw new Error("Not authorized to view this thread");
		}

		return await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.order("asc")
			.collect();
	},
});

export const getById = query({
	args: {
		id: v.id("messages"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const userId = identity.subject;
		const message = await ctx.db.get(args.id);

		if (!message) {
			throw new Error("Message not found");
		}

		const thread = await ctx.db.get(message.threadId);
		if (!thread || !thread.participantIds.includes(userId)) {
			throw new Error("Not authorized to view this message");
		}

		return message;
	},
});

export const update = mutation({
	args: {
		id: v.id("messages"),
		content: v.string(),
		metadata: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const userId = identity.subject;
		const message = await ctx.db.get(args.id);

		if (!message) {
			throw new Error("Message not found");
		}

		if (message.senderId !== userId) {
			throw new Error("Not authorized to update this message");
		}

		await ctx.db.patch(args.id, {
			content: args.content,
			metadata: args.metadata,
		});

		return args.id;
	},
});

export const remove = mutation({
	args: {
		id: v.id("messages"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const userId = identity.subject;
		const message = await ctx.db.get(args.id);

		if (!message) {
			throw new Error("Message not found");
		}

		if (message.senderId !== userId) {
			throw new Error("Not authorized to delete this message");
		}

		await ctx.db.delete(args.id);

		return args.id;
	},
});
