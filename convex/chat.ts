import {
	action,
	internalAction,
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getChatModel } from "../src/lib/ai";
import { streamText, generateText } from "ai";

export const sendMessage = mutation({
	args: {
		threadId: v.optional(v.id("threads")),
		modeId: v.string(),
		message: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		let { message, modeId, threadId } = args;

		const mode = await ctx.db.get(modeId as Id<"modes">);
		if (!mode) {
			throw new Error("Mode not found");
		}

		const profile = await ctx.db.get(mode.profileSelector as Id<"profiles">);
		if (!profile) {
			throw new Error("Profile not found");
		}

		if (!threadId) {
			threadId = await ctx.db.insert("threads", {
				title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
			});

			// schedule title generation
			await ctx.scheduler.runAfter(0, internal.chat.generateThreadTitle, {
				threadId,
				message,
			});
		}

		await ctx.db.insert("messages", {
			threadId,
			senderId: identity.subject,
			content: message,
			type: "user",
			metadata: { modeId },
		});

		const messageId = await ctx.runMutation(
			internal.chat.createStreamingMessage,
			{
				threadId,
				modeId,
			},
		);

		await ctx.scheduler.runAfter(0, api.chat.streamResponse, {
			threadId,
			messageId,
			messages: [{ role: "user", content: message }],
			modeId,
			profileModel: profile.model,
			systemPrompt: mode.modeDefinition,
		});

		return { threadId };
	},
});

export const regenerateMessage = mutation({
	args: {
		messageId: v.id("messages"),
		modeId: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		const { messageId, modeId } = args;

		// Get the message to regenerate
		const messageToRegenerate = await ctx.db.get(messageId);
		if (!messageToRegenerate || messageToRegenerate.type !== "assistant") {
			throw new Error("Invalid message to regenerate");
		}

		// Get the thread
		const thread = await ctx.db.get(messageToRegenerate.threadId);
		if (!thread) {
			throw new Error("Thread not found");
		}

		// Get all messages in the thread up to this point
		const allMessages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", messageToRegenerate.threadId))
			.order("asc")
			.collect();

		// Find the index of the message to regenerate
		const messageIndex = allMessages.findIndex((msg) => msg._id === messageId);
		if (messageIndex === -1) {
			throw new Error("Message not found in thread");
		}

		// Build conversation history up to (but not including) the message to regenerate
		const conversationHistory = [];
		for (let i = 0; i < messageIndex; i++) {
			const msg = allMessages[i];
			if (msg.type === "user" || msg.type === "assistant") {
				conversationHistory.push({
					role: msg.type as "user" | "assistant",
					content: msg.content,
				});
			}
		}

		// Get mode and profile
		const mode = await ctx.db.get(modeId as Id<"modes">);
		if (!mode) {
			throw new Error("Mode not found");
		}

		const profile = await ctx.db.get(mode.profileSelector as Id<"profiles">);
		if (!profile) {
			throw new Error("Profile not found");
		}

		// Clear the existing message content and mark as streaming
		await ctx.db.patch(messageId, {
			content: "",
			metadata: {
				modeId,
				isStreaming: true,
			},
		});

		// Schedule the streaming response
		await ctx.scheduler.runAfter(0, api.chat.streamResponse, {
			threadId: messageToRegenerate.threadId,
			messageId,
			messages: conversationHistory,
			modeId,
			profileModel: profile.model,
			systemPrompt: mode.modeDefinition,
		});

		return { success: true };
	},
});

export const streamResponse = action({
	args: {
		threadId: v.id("threads"),
		messageId: v.id("messages"),
		messages: v.array(
			v.object({
				role: v.union(v.literal("user"), v.literal("assistant")),
				content: v.string(),
			}),
		),
		modeId: v.string(),
		profileModel: v.string(),
		systemPrompt: v.string(),
	},
	handler: async (ctx, args) => {
		const {
			threadId,
			messageId,
			messages,
			modeId,
			profileModel,
			systemPrompt,
		} = args;

		try {
			const { textStream } = streamText({
				model: getChatModel(profileModel),
				system: systemPrompt,
				messages,
			});

			let fullContent = "";

			for await (const textPart of textStream) {
				fullContent += textPart;

				await ctx.runMutation(internal.chat.updateStreamingMessage, {
					messageId,
					content: fullContent,
				});
			}

			await ctx.runMutation(internal.chat.finalizeStreamingMessage, {
				messageId,
				content: fullContent,
			});
		} catch (error) {
			console.error("Streaming error:", error);

			await ctx.runMutation(internal.chat.updateStreamingMessage, {
				messageId,
				content: "Sorry, I encountered an error while generating a response.",
			});

			await ctx.runMutation(internal.chat.finalizeStreamingMessage, {
				messageId,
				content: "Sorry, I encountered an error while generating a response.",
			});
		}
	},
});

export const createStreamingMessage = internalMutation({
	args: {
		threadId: v.id("threads"),
		modeId: v.string(),
	},
	handler: async (ctx, args) => {
		const { threadId, modeId } = args;

		const messageId = await ctx.db.insert("messages", {
			threadId,
			senderId: "assistant",
			content: "",
			type: "assistant",
			metadata: {
				modeId,
				isStreaming: true,
			},
		});

		return messageId;
	},
});

export const updateStreamingMessage = internalMutation({
	args: {
		messageId: v.id("messages"),
		content: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.messageId, {
			content: args.content,
		});
	},
});

export const finalizeStreamingMessage = internalMutation({
	args: {
		messageId: v.id("messages"),
		content: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.messageId, {
			content: args.content,
			metadata: {
				isStreaming: false,
			},
		});
	},
});

export const getStreamingStatus = internalQuery({
	args: {
		messageId: v.id("messages"),
	},
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		return {
			isStreaming: message.metadata?.isStreaming ?? false,
			content: message.content,
		};
	},
});

export const generateThreadTitle = internalAction({
	args: {
		threadId: v.id("threads"),
		message: v.string(),
	},
	handler: async (ctx, args) => {
		const { threadId, message } = args;

		try {
			const { text } = await generateText({
				model: getChatModel("google/gemini-2.0-flash-lite-001"),
				system:
					"You are a helpful assistant that generates concise, descriptive titles for chat conversations. Generate a title that captures the main topic or intent of the user's message. Keep it under 50 characters and make it clear and informative.",
				prompt: `Generate a concise title for a conversation that starts with this message: "${message}"`,
			});

			await ctx.runMutation(internal.chat.updateThreadTitle, {
				threadId,
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

		// Ensure title is not too long
		const finalTitle = title.length > 50 ? `${title.slice(0, 47)}...` : title;

		await ctx.db.patch(threadId, {
			title: finalTitle,
		});
	},
});
