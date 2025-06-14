import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
	args: {
		threadId: v.id("threads"),
		content: v.string(),
		type: v.string(),
		metadata: v.optional(v.any()),
		attachmentIds: v.optional(v.array(v.id("attachments"))),
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

		const messageId = await ctx.db.insert("messages", {
			threadId: args.threadId,
			senderId: userId,
			content: args.content,
			type: args.type,
			metadata: args.metadata,
			attachmentIds: args.attachmentIds,
		});

		// Update attachment records to link them to this message
		if (args.attachmentIds && args.attachmentIds.length > 0) {
			for (const attachmentId of args.attachmentIds) {
				await ctx.db.patch(attachmentId, {
					messageId: messageId,
				});
			}
		}

		return messageId;
	},
});

export const list = query({
	args: {
		threadId: v.id("threads"),
		branchId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const thread = await ctx.db.get(args.threadId);
		if (!thread) {
			throw new Error("Thread not found");
		}

		const allMessages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.order("asc")
			.collect();

		const filteredMessages = !args.branchId
			? allMessages.filter(
					(msg) => !msg.branchId || msg.isActiveBranch !== false,
				)
			: allMessages.filter(
					(msg) =>
						msg.branchId === args.branchId && msg.isActiveBranch !== false,
				);

		// Return messages with attachmentIds - attachment URLs will be handled by the frontend
		return filteredMessages;
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

		const message = await ctx.db.get(args.id);
		if (!message) {
			throw new Error("Message not found");
		}

		await ctx.db.delete(args.id);

		return args.id;
	},
});
