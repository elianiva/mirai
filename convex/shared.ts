import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

export const shareThread = internalMutation({
	args: { threadId: v.id("threads") },
	handler: async (ctx, args) => {
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.collect();

		const chatSnapshot = JSON.stringify(messages);

		const existingShare = await ctx.db
			.query("sharedChats")
			.withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
			.unique();

		if (existingShare) {
			await ctx.db.patch(existingShare._id, { chatSnapshot });
			return existingShare._id;
		}

		const sharedChatId = await ctx.db.insert("sharedChats", {
			threadId: args.threadId,
			chatSnapshot,
		});

		return sharedChatId;
	},
});

export const removeThread = internalMutation({
	args: { threadId: v.id("threads") },
	handler: async (ctx, args) => {
		const sharedChat = await ctx.db
			.query("sharedChats")
			.withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
			.unique();

		if (sharedChat) {
			await ctx.db.delete(sharedChat._id);
		}
	},
});

export const get = query({
	args: { id: v.id("sharedChats") },
	handler: async (ctx, args) => {
		const sharedChat = await ctx.db.get(args.id);
		if (!sharedChat) return null;

		const thread = await ctx.db.get(sharedChat.threadId);

		return {
			...sharedChat,
			title: thread?.title ?? "Untitled Thread",
		};
	},
});

export const share = action({
	args: { threadId: v.id("threads") },
	handler: async (ctx, args): Promise<Id<"sharedChats">> => {
		return await ctx.runMutation(internal.shared.shareThread, {
			threadId: args.threadId,
		});
	},
});

export const remove = action({
	args: { threadId: v.id("threads") },
	handler: async (ctx, args) => {
		await ctx.runMutation(internal.shared.removeThread, {
			threadId: args.threadId,
		});
	},
});

export const getByThreadId = query({
	args: { threadId: v.id("threads") },
	handler: async (ctx, args) => {
		return ctx.db
			.query("sharedChats")
			.withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
			.unique();
	},
});
