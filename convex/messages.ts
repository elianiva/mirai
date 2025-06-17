import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
	args: {
		threadId: v.id("threads"),
		content: v.string(),
		role: v.union(v.literal("user"), v.literal("assistant")),
		metadata: v.optional(v.any()),
		attachmentIds: v.optional(v.array(v.id("attachments"))),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Not authenticated");

		const userId = identity.subject;

		const thread = await ctx.db.get(args.threadId);
		if (!thread) throw new Error("Thread not found");

		const messageId = await ctx.db.insert("messages", {
			threadId: args.threadId,
			senderId: userId,
			content: args.content,
			role: args.role,
			metadata: args.metadata,
			attachmentIds: args.attachmentIds,
		});

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
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Not authenticated");

		const thread = await ctx.db.get(args.threadId);
		if (!thread) throw new Error("Thread not found");

		const messages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.order("asc")
			.collect();

		return messages;
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
		if (!identity) throw new Error("Not authenticated");

		const userId = identity.subject;
		const message = await ctx.db.get(args.id);

		if (!message) throw new Error("Message not found");

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
		if (!identity) throw new Error("Not authenticated");

		const message = await ctx.db.get(args.id);
		if (!message) throw new Error("Message not found");

		await ctx.db.delete(args.id);

		return args.id;
	},
});

export const addToolCall = mutation({
	args: {
		messageId: v.id("messages"),
		toolCallId: v.string(),
		toolName: v.string(),
		arguments: v.any(),
		output: v.optional(v.any()),
		status: v.optional(v.union(v.literal("streaming"), v.literal("success"), v.literal("error"))),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Not authenticated");

		const message = await ctx.db.get(args.messageId);
		if (!message) throw new Error("Message not found");

		const newToolCall = {
			name: args.toolName,
			toolCallId: args.toolCallId,
			status: args.status || "streaming",
			arguments: args.arguments,
			output: args.output || null,
			startTime: Date.now(),
		};

		const updatedToolCallMetadata = message.metadata?.toolCallMetadata
			? [...message.metadata.toolCallMetadata, newToolCall]
			: [newToolCall];

		await ctx.db.patch(args.messageId, {
			metadata: {
				...message.metadata,
				toolCallMetadata: updatedToolCallMetadata,
			},
		});

		return args.messageId;
	},
});
