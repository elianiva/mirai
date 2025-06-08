import {
	action,
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getChatModel } from "../src/lib/ai";
import { streamText } from "ai";

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
			// TODO: implement AI summarizer for the title
			threadId = await ctx.db.insert("threads", {
				title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
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
