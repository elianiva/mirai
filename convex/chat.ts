import { generateText, smoothStream, streamText } from "ai";
import { v } from "convex/values";
import { buildSystemPrompt, getChatModel } from "../src/lib/ai";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	type QueryCtx,
	action,
	internalAction,
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";

type MessageRole = "user" | "assistant";

type MessageMetadata = {
	isStreaming?: boolean;
	modeId?: string;
	profileId?: string;
	reasoning?: string;
	modelName?: string;
	finishReason?: string;
	isCondensedHistory?: boolean;
	originalThreadId?: Id<"threads">;
};

type DatabaseMessage = {
	_id: Id<"messages">;
	threadId: Id<"threads">;
	senderId: string;
	content: string;
	role: "user" | "assistant";
	metadata?: MessageMetadata;
	attachmentIds?: Id<"attachments">[];
	_creationTime: number;
};

type StreamingStatus = {
	isStreaming: boolean;
	content: string;
};

type SendMessageResult = {
	threadId: Id<"threads">;
};

type SaveUserMessageResult = {
	threadId: Id<"threads">;
	userMessageId: Id<"messages">;
};

export const sendMessage = mutation({
	args: {
		threadId: v.optional(v.id("threads")),
		modeId: v.string(),
		message: v.string(),
		openrouterKey: v.optional(v.string()),
		attachmentIds: v.optional(v.array(v.id("attachments"))),
	},
	handler: async (ctx, args): Promise<SendMessageResult> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthorized");

		const { message, modeId, threadId, openrouterKey, attachmentIds } = args;

		if (!openrouterKey) throw new Error("OpenRouter API key is required");

		const mode = await ctx.db.get(modeId as Id<"modes">);
		if (!mode) throw new Error("Mode not found");

		const profile = await ctx.db.get(mode.profileSelector as Id<"profiles">);
		if (!profile) throw new Error("Profile not found");

		const { threadId: finalThreadId, userMessageId } = await ctx.runMutation(
			internal.chat.saveUserMessage,
			{
				threadId,
				userMessage: message,
				modeId,
				userId: identity.subject,
				openrouterKey,
				attachmentIds,
			},
		);

		const messageId = await ctx.runMutation(
			internal.chat.createStreamingMessage,
			{
				threadId: finalThreadId,
				modeId,
				parentMessageId: userMessageId,
			},
		);

		const pastMessages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", finalThreadId))
			.order("asc")
			.collect();

		await ctx.scheduler.runAfter(0, api.chat.streamResponse, {
			threadId: finalThreadId,
			messageId,
			messages: pastMessages.map((msg) => ({
				role: msg.role as MessageRole,
				content: msg.content,
			})),
			mode: {
				modeDefinition: mode.modeDefinition,
				model: profile.model,
			},
			profile: {
				model: profile.model,
				topP: profile.topP,
				topK: profile.topK,
				temperature: profile.temperature,
			},
			userName: identity.name ?? "User",
			openrouterKey,
		});

		return { threadId: finalThreadId };
	},
});

export const regenerateMessage = mutation({
	args: {
		messageId: v.id("messages"),
		modeId: v.string(),
		openrouterKey: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthorized");

		const { messageId, modeId, openrouterKey } = args;

		const messageToRegenerate = await ctx.db.get(messageId);
		if (!messageToRegenerate || messageToRegenerate.role !== "assistant") {
			throw new Error("Invalid message to regenerate");
		}

		const thread = await ctx.db.get(messageToRegenerate.threadId);
		if (!thread) throw new Error("Thread not found");

		const allMessages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) =>
				q.eq("threadId", messageToRegenerate.threadId),
			)
			.order("asc")
			.collect();

		const messageIndex = allMessages.findIndex((msg) => msg._id === messageId);
		if (messageIndex === -1) throw new Error("Message not found in thread");

		const conversationHistory = [];
		for (let i = 0; i < messageIndex; i++) {
			const msg = allMessages[i];
			if (msg.role === "user" || msg.role === "assistant") {
				conversationHistory.push({
					role: msg.role,
					content: msg.content,
				});
			}
		}

		const mode = await ctx.db.get(modeId as Id<"modes">);
		if (!mode) throw new Error("Mode not found");

		const profile = await ctx.db.get(mode.profileSelector as Id<"profiles">);
		if (!profile) throw new Error("Profile not found");

		await ctx.db.patch(messageId, {
			content: "",
			metadata: {
				modeId,
				isStreaming: true,
				profileId: undefined,
				reasoning: undefined,
			},
		});

		await ctx.scheduler.runAfter(0, api.chat.streamResponse, {
			threadId: messageToRegenerate.threadId,
			messageId,
			messages: conversationHistory,
			mode: {
				modeDefinition: mode.modeDefinition,
				model: profile.model,
			},
			profile: {
				model: profile.model,
				topP: profile.topP,
				topK: profile.topK,
				temperature: profile.temperature,
			},
			userName: identity.name ?? "User",
			openrouterKey,
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
		mode: v.object({
			modeDefinition: v.string(),
			model: v.string(),
		}),
		profile: v.object({
			model: v.string(),
			topP: v.number(),
			topK: v.number(),
			temperature: v.number(),
		}),
		userName: v.string(),
		openrouterKey: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { messageId, userName, messages, profile, mode } = args;

		try {
			if (!args.openrouterKey || args.openrouterKey.trim() === "") {
				throw new Error(
					"OpenRouter API key is required to use OpenRouter models. Please add your API key in the account settings.",
				);
			}

			const accountSettings = await ctx.runQuery(
				api.accountSettings.getAccountSettings,
			);

			const abortController = new AbortController();
			const { fullStream } = streamText({
				model: getChatModel(profile.model, args.openrouterKey),
				system: buildSystemPrompt({
					user_name: accountSettings.name || userName,
					model: mode.model,
					mode_definition: mode.modeDefinition,
					ai_behavior: accountSettings.behavior,
				}),
				messages,
				topP: profile.topP,
				topK: profile.topK,
				temperature: profile.temperature,
				abortSignal: abortController.signal,
				experimental_transform: smoothStream({
					delayInMs: 1000, // throttle to 1 second between chunks
				}),
			});

			let fullContent = "";
			let reasoning = "";
			for await (const part of fullStream) {
				// TODO: there should be a better way of doing this? not sure
				//       ideally using AbortSignal but i'm not entirely sure how to do that
				const streamStatus = await ctx.runQuery(
					internal.chat.getStreamingStatus,
					{
						messageId,
					},
				);
				if (streamStatus?.isStreaming === false) {
					abortController.abort();
					await ctx.runMutation(internal.chat.finalizeStreamingMessage, {
						messageId,
						content: fullContent,
					});
					break;
				}

				if (part.type === "text-delta" || part.type === "reasoning") {
					if (part.type === "text-delta") {
						fullContent += part.textDelta;
					}
					if (part.type === "reasoning") {
						reasoning += part.textDelta;
					}
					await ctx.runMutation(internal.chat.updateStreamingMessage, {
						messageId,
						content: fullContent,
						reasoning,
					});
				}
				if (part.type === "finish") {
					let content = "";
					if (part.finishReason === "content-filter") {
						content = "Sorry, the content was filtered by the model.";
					}
					if (part.finishReason === "error") {
						content =
							"Sorry, I encountered an error while generating a response.";
					}
					if (part.finishReason === "stop") {
						content = fullContent;
					}
					await ctx.runMutation(internal.chat.finalizeStreamingMessage, {
						messageId,
						content,
						reasoning,
					});
				}
			}
		} catch (error) {
			console.error("Streaming error:", error);
			await ctx.runMutation(internal.chat.finalizeStreamingMessage, {
				messageId,
				content: "Sorry, I encountered an error while generating a response.",
				reasoning: undefined,
			});
		}
	},
});

export const createStreamingMessage = internalMutation({
	args: {
		threadId: v.id("threads"),
		modeId: v.string(),
		parentMessageId: v.optional(v.id("messages")),
	},
	handler: async (ctx, args) => {
		const { threadId, modeId, parentMessageId } = args;

		const messageId = await ctx.db.insert("messages", {
			threadId,
			senderId: "assistant",
			content: "",
			role: "assistant",
			metadata: {
				modeId,
				isStreaming: true,
				profileId: undefined,
				reasoning: undefined,
			},
		});

		return messageId;
	},
});

export const updateStreamingMessage = internalMutation({
	args: {
		messageId: v.id("messages"),
		content: v.string(),
		reasoning: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.messageId, {
			content: args.content,
			metadata: {
				isStreaming: true,
				reasoning: args.reasoning,
			},
		});
	},
});

export const finalizeStreamingMessage = internalMutation({
	args: {
		messageId: v.id("messages"),
		content: v.string(),
		reasoning: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.messageId, {
			content: args.content,
			metadata: {
				isStreaming: false,
				reasoning: args.reasoning,
			},
		});
	},
});

export const stopStreaming = mutation({
	args: {
		messageId: v.id("messages"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthorized");

		const message = await ctx.db.get(args.messageId);
		if (!message) throw new Error("Message not found");

		if (!message.metadata?.isStreaming) {
			return { success: false, reason: "Message is not streaming" };
		}

		// TODO: this is a bit of a hack, sometimes it could fail due to race condition
		//       because when the message is streaming, it will keep updating this row
		//       and we can't update it while it's being updated in other places
		await ctx.db.patch(args.messageId, {
			metadata: {
				...message.metadata,
				isStreaming: false,
			},
		});

		return { success: true };
	},
});

export const getStreamingStatus = internalQuery({
	args: {
		messageId: v.id("messages"),
	},
	handler: async (ctx, args): Promise<StreamingStatus | null> => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		return {
			isStreaming: message.metadata?.isStreaming ?? false,
			content: message.content,
		};
	},
});



// New helper functions for HTTP streaming

export const getMode = internalQuery({
	args: {
		modeId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.modeId as Id<"modes">);
	},
});

export const getProfile = internalQuery({
	args: {
		profileId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.profileId as Id<"profiles">);
	},
});

export const saveUserMessage = internalMutation({
	args: {
		threadId: v.optional(v.id("threads")),
		userMessage: v.string(),
		modeId: v.string(),
		userId: v.string(),
		openrouterKey: v.string(),
		attachmentIds: v.optional(v.array(v.id("attachments"))),
	},
	handler: async (ctx, args): Promise<SaveUserMessageResult> => {
		let {
			threadId,
			userMessage,
			modeId,
			userId,
			openrouterKey,
			attachmentIds,
		} = args;

		// Create thread if it doesn't exist
		if (!threadId) {
			threadId = await ctx.db.insert("threads", {
				title:
					userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : ""),
			});

			// Schedule title generation
			await ctx.scheduler.runAfter(0, internal.threads.generateThreadTitle, {
				threadId,
				message: userMessage,
				openrouterKey,
			});
		}

		// Insert user message
		const userMessageId = await ctx.db.insert("messages", {
			threadId,
			senderId: userId,
			content: userMessage,
			role: "user",
			metadata: { modeId },
			attachmentIds,
		});

		// Update attachment records to link them to this message
		if (attachmentIds && attachmentIds.length > 0) {
			for (const attachmentId of attachmentIds) {
				await ctx.db.patch(attachmentId, {
					messageId: userMessageId,
				});
			}
		}

		return { threadId, userMessageId };
	},
});

export const createAssistantMessage = internalMutation({
	args: {
		threadId: v.id("threads"),
		modeId: v.string(),
		parentMessageId: v.id("messages"),
		userId: v.string(),
		userName: v.string(),
		openrouterKey: v.string(),
		modelName: v.string(),
	},
	handler: async (ctx, args) => {
		const {
			threadId,
			modeId,
			parentMessageId,
			userId,
			userName,
			openrouterKey,
			modelName,
		} = args;

		const assistantMessageId = await ctx.db.insert("messages", {
			threadId,
			senderId: "assistant",
			content: "",
			role: "assistant",
			metadata: {
				modeId,
				isStreaming: true,
				modelName,
			},
		});

		return assistantMessageId;
	},
});

export const appendAssistantMessageContent = internalMutation({
	args: {
		messageId: v.id("messages"),
		chunk: v.string(),
	},
	handler: async (ctx, args) => {
		const { messageId, chunk } = args;

		const message = await ctx.db.get(messageId);
		if (!message) {
			throw new Error("Message not found");
		}

		await ctx.db.patch(messageId, {
			content: message.content + chunk,
		});
	},
});

export const finalizeAssistantMessage = internalMutation({
	args: {
		messageId: v.id("messages"),
		finalContent: v.string(),
		finishReason: v.string(),
		reasoning: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { messageId, finalContent, finishReason, reasoning } = args;

		const message = await ctx.db.get(messageId);
		if (!message) {
			throw new Error("Message not found");
		}

		await ctx.db.patch(messageId, {
			content: finalContent,
			metadata: {
				...message.metadata,
				isStreaming: false,
				finishReason,
				reasoning,
			},
		});
	},
});


