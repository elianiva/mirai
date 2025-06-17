import { generateText } from "ai";
import { v } from "convex/values";
import { getChatModel } from "../src/lib/ai";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalAction,
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";

export const getById = query({
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

export const create = mutation({
	args: {
		title: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const threadId = await ctx.db.insert("threads", {
			title: args.title || "New conversation",
		});

		return threadId;
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

export const cloneThread = mutation({
	args: {
		sourceThreadId: v.id("threads"),
		upToMessageId: v.optional(v.id("messages")),
		openrouterKey: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthorized");

		const sourceThread = await ctx.db.get(args.sourceThreadId);
		if (!sourceThread) throw new Error("Source thread not found");

		const sourceMessages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", args.sourceThreadId))
			.order("asc")
			.collect();

		let messagesToCopy = sourceMessages;
		if (args.upToMessageId) {
			const upToIndex = sourceMessages.findIndex(
				(msg) => msg._id === args.upToMessageId,
			);
			if (upToIndex !== -1) {
				messagesToCopy = sourceMessages.slice(0, upToIndex + 1);
			}
		}

		const newThreadId = await ctx.db.insert("threads", {
			title: `${sourceThread.title} - Copy`,
			parentThreadId: args.sourceThreadId,
		});

		const lastAssistantMessage = [...messagesToCopy]
			.reverse()
			.find((msg) => msg.role === "assistant");
		if (lastAssistantMessage) {
			await ctx.scheduler.runAfter(0, internal.threads.generateThreadTitle, {
				threadId: newThreadId,
				message: lastAssistantMessage.content,
				openrouterKey: args.openrouterKey,
			});
		}

		await ctx.runMutation(internal.threads.copyMessagesToThread, {
			messages: messagesToCopy,
			targetThreadId: newThreadId,
		});

		return { threadId: newThreadId };
	},
});

export const cloneThreadWithCondensedHistory = mutation({
	args: {
		sourceThreadId: v.id("threads"),
		upToMessageId: v.optional(v.id("messages")),
		openrouterKey: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthorized");

		const sourceThread = await ctx.db.get(args.sourceThreadId);
		if (!sourceThread) throw new Error("Source thread not found");

		const newThreadId = await ctx.db.insert("threads", {
			title: "Detached Branch",
			parentThreadId: args.sourceThreadId,
		});

		const contextMessageId = await ctx.db.insert("messages", {
			threadId: newThreadId,
			senderId: "system",
			content: "Generating condensed history...",
			role: "assistant",
			metadata: {
				isCondensedHistory: true,
				originalThreadId: args.sourceThreadId,
				isStreaming: true,
			},
		});

		await ctx.scheduler.runAfter(0, internal.threads.generateCondensedHistory, {
			sourceThreadId: args.sourceThreadId,
			upToMessageId: args.upToMessageId,
			newThreadId: newThreadId,
			contextMessageId: contextMessageId,
			openrouterKey: args.openrouterKey,
		});

		return { threadId: newThreadId };
	},
});

export const createBranchFromMessage = mutation({
	args: {
		messageId: v.id("messages"),
		useCondensedHistory: v.boolean(),
		openrouterKey: v.string(),
	},
	handler: async (ctx, args): Promise<{ threadId: Id<"threads"> }> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthorized");

		const message = await ctx.db.get(args.messageId);
		if (!message) throw new Error("Message not found");

		if (args.useCondensedHistory) {
			return await ctx.runMutation(
				api.threads.cloneThreadWithCondensedHistory,
				{
					sourceThreadId: message.threadId,
					upToMessageId: args.messageId,
					openrouterKey: args.openrouterKey,
				},
			);
		}

		return await ctx.runMutation(api.threads.cloneThread, {
			sourceThreadId: message.threadId,
			upToMessageId: args.messageId,
			openrouterKey: args.openrouterKey,
		});
	},
});

export const copyMessagesToThread = internalMutation({
	args: {
		messages: v.array(v.any()),
		targetThreadId: v.id("threads"),
	},
	handler: async (ctx, args) => {
		for (const msg of args.messages) {
			let newAttachmentIds: Id<"attachments">[] | undefined;
			if (msg.attachmentIds && msg.attachmentIds.length > 0) {
				newAttachmentIds = [];
				for (const attachmentId of msg.attachmentIds) {
					const originalAttachment = (await ctx.db.get(
						attachmentId,
					)) as Doc<"attachments"> | null;
					if (originalAttachment) {
						const newAttachmentId = await ctx.db.insert("attachments", {
							storageId: originalAttachment.storageId,
							filename: originalAttachment.filename,
							contentType: originalAttachment.contentType,
							size: originalAttachment.size,
							uploadedBy: originalAttachment.uploadedBy,
							uploadedAt: originalAttachment.uploadedAt,
						});
						newAttachmentIds.push(newAttachmentId);
					}
				}
			}

			const newMessageId = await ctx.db.insert("messages", {
				threadId: args.targetThreadId,
				senderId: msg.senderId,
				content: msg.content,
				role: msg.role,
				metadata: msg.metadata,
				attachmentIds: newAttachmentIds,
			});

			if (newAttachmentIds && newAttachmentIds.length > 0) {
				for (const attachmentId of newAttachmentIds) {
					await ctx.db.patch(attachmentId, {
						messageId: newMessageId,
					});
				}
			}
		}
	},
});

export const generateCondensedHistory = internalAction({
	args: {
		sourceThreadId: v.id("threads"),
		upToMessageId: v.optional(v.id("messages")),
		newThreadId: v.id("threads"),
		contextMessageId: v.id("messages"),
		openrouterKey: v.string(),
	},
	handler: async (ctx, args) => {
		try {
			const sourceMessages = await ctx.runQuery(
				internal.threads.getThreadMessages,
				{
					threadId: args.sourceThreadId,
				},
			);

			let messagesToCondense = sourceMessages;
			if (args.upToMessageId) {
				const upToIndex = sourceMessages.findIndex(
					(msg) => msg._id === args.upToMessageId,
				);
				if (upToIndex !== -1) {
					messagesToCondense = sourceMessages.slice(0, upToIndex + 1);
				}
			}

			if (messagesToCondense.length === 0) {
				await ctx.runMutation(internal.threads.updateCondensedMessage, {
					messageId: args.contextMessageId,
					content: "No conversation history to condense.",
				});
				return;
			}

			const conversationText = messagesToCondense
				.map((msg) => {
					const role = msg.role === "user" ? "User" : "Assistant";
					return `${role}: ${msg.content}`;
				})
				.join("\n\n");

			const { text } = await generateText({
				model: getChatModel(
					"google/gemini-2.5-flash-preview",
					args.openrouterKey,
				),
				system: `You are a helpful summarizer bot that creates concise summaries of chat conversations.
				
Your task is to condense the conversation history into a single, comprehensive summary that:
1. Captures the key topics, questions, and decisions discussed
2. Preserves important context that would be relevant for continuing the conversation
3. Maintains the essential information while significantly reducing token count
4. Uses clear, natural language that flows well as a conversation starter

The summary should be written as if you're briefing someone on "what we've discussed so far" and should be suitable as context for continuing the conversation in a new thread.`,
				prompt: `Please create a condensed summary of this conversation:

${conversationText}

Create a summary that captures the essential context and key points discussed, suitable for continuing this conversation in a new thread.`,
			});

			await ctx.runMutation(internal.threads.updateCondensedMessage, {
				messageId: args.contextMessageId,
				content: text.trim(),
			});

			await ctx.runAction(internal.threads.generateThreadTitle, {
				threadId: args.newThreadId,
				message: text.trim(),
				openrouterKey: args.openrouterKey,
			});
		} catch (error) {
			console.error("Error generating condensed history:", error);
			await ctx.runMutation(internal.threads.updateCondensedMessage, {
				messageId: args.contextMessageId,
				content:
					"Previous conversation context has been condensed. You can continue the conversation from here.",
			});
		}
	},
});

export const getThreadMessages = internalQuery({
	args: {
		threadId: v.id("threads"),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.order("asc")
			.collect();
	},
});

export const updateCondensedMessage = internalMutation({
	args: {
		messageId: v.id("messages"),
		content: v.string(),
	},
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) throw new Error("Message not found");

		await ctx.db.patch(args.messageId, {
			content: args.content,
			metadata: {
				...message.metadata,
				isStreaming: false,
			},
		});
	},
});

export const generateThreadTitle = internalAction({
	args: {
		threadId: v.id("threads"),
		message: v.string(),
		openrouterKey: v.string(),
	},
	handler: async (ctx, args) => {
		try {
			const { text } = await generateText({
				model: getChatModel(
					"google/gemini-2.0-flash-lite-001",
					args.openrouterKey,
				),
				system:
					"You are a helpful assistant that generates concise, descriptive titles for chat conversations. Generate a title that captures the main topic or intent of the user's message. Keep it under 50 characters and make it clear and informative. Do not use any markdown syntax.",
				prompt: `Generate a concise title for a conversation that starts with this message: "${args.message}"`,
			});

			await ctx.runMutation(internal.threads.updateThreadTitle, {
				threadId: args.threadId,
				title: text.trim(),
			});
		} catch (error) {
			console.error("Error generating thread title:", error);
		}
	},
});

export const updateThreadTitle = internalMutation({
	args: {
		threadId: v.id("threads"),
		title: v.string(),
	},
	handler: async (ctx, args) => {
		const { threadId, title } = args;
		const finalTitle = title.length > 50 ? `${title.slice(0, 47)}...` : title;

		await ctx.db.patch(threadId, {
			title: finalTitle,
		});
	},
});
