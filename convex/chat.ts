import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	internalAction,
	internalMutation,
	internalQuery,
} from "./_generated/server";
import { type CoreMessage, streamText } from "ai";
import { buildSystemPrompt, getChatModel } from "../src/lib/ai";

type SaveUserMessageResult = {
	threadId: Id<"threads">;
	userMessageId: Id<"messages">;
};

export const getMessageById = internalQuery({
	args: {
		messageId: v.id("messages"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.messageId);
	},
});

export const resetMessageToStreaming = internalMutation({
	args: {
		messageId: v.id("messages"),
		modeId: v.string(),
		toolCallMetadata: v.optional(
			v.array(
				v.object({
					name: v.string(),
					status: v.union(
						v.literal("streaming"),
						v.literal("success"),
						v.literal("error"),
					),
					arguments: v.any(),
					output: v.any(),
					startTime: v.optional(v.number()),
					endTime: v.optional(v.number()),
					streamingArgs: v.optional(v.string()),
					toolCallId: v.optional(v.string()),
				}),
			),
		),
		clearPendingOrchestrator: v.optional(v.boolean()),
		clearProfileAndReasoning: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) {
			throw new Error("Message not found");
		}

		const updatedMetadata = {
			...message.metadata,
			modeId: args.modeId,
			isStreaming: true,
			toolCallMetadata: args.toolCallMetadata,
		};

		if (args.clearPendingOrchestrator) {
			updatedMetadata.isPendingOrchestrator = false;
		}

		if (args.clearProfileAndReasoning) {
			updatedMetadata.profileId = undefined;
			updatedMetadata.reasoning = undefined;
		}

		await ctx.db.patch(args.messageId, {
			content: "",
			metadata: updatedMetadata,
		});
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

		if (!threadId) {
			threadId = await ctx.db.insert("threads", {
				title:
					userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : ""),
			});
		}

		const thread = await ctx.db.get(threadId);
		if (thread && thread.title === "New conversation") {
			await ctx.scheduler.runAfter(0, internal.threads.generateThreadTitle, {
				threadId,
				message: userMessage,
				openrouterKey,
			});
		}

		const userMessageId = await ctx.db.insert("messages", {
			threadId,
			senderId: userId,
			content: userMessage,
			role: "user",
			metadata: {
				modeId,
			},
			attachmentIds,
		});

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
		modelName: v.string(),
	},
	handler: async (ctx, args) => {
		const { threadId, modeId, modelName } = args;

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
			metadata: {
				...message.metadata,
				isStreaming: true,
			},
		});
	},
});

export const updateMessageReasoning = internalMutation({
	args: {
		messageId: v.id("messages"),
		reasoning: v.string(),
	},
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) {
			throw new Error("Message not found");
		}

		await ctx.db.patch(args.messageId, {
			metadata: {
				...message.metadata,
				reasoning: args.reasoning,
				isStreaming: true,
			},
		});
	},
});

export const appendMessageReasoning = internalMutation({
	args: {
		messageId: v.id("messages"),
		chunk: v.string(),
	},
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) {
			throw new Error("Message not found");
		}

		const currentReasoning = message.metadata?.reasoning ?? "";
		await ctx.db.patch(args.messageId, {
			metadata: {
				...message.metadata,
				isStreaming: true,
				reasoning: currentReasoning + args.chunk,
			},
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
				reasoning: reasoning ?? message.metadata?.reasoning,
			},
		});
	},
});

export const createPlaceholderMessage = internalMutation({
	args: {
		threadId: v.id("threads"),
		modeId: v.string(),
	},
	handler: async (ctx, args) => {
		const messageId = await ctx.db.insert("messages", {
			threadId: args.threadId,
			senderId: "assistant",
			content: "",
			role: "assistant",
			metadata: {
				modeId: args.modeId,
				isPendingOrchestrator: true,
				isStreaming: false,
			},
		});
		return messageId;
	},
});

export const executeDelegatedTask = internalMutation({
	args: {
		assistantMessageId: v.id("messages"),
		rewrittenMessage: v.string(),
		selectedModeSlug: v.string(),
		reasoning: v.string(),
		originalUserContent: v.string(),
		threadId: v.id("threads"),
		openrouterKey: v.string(),
		userId: v.string(),
		userName: v.string(),
	},
	handler: async (ctx, args) => {
		const {
			assistantMessageId,
			rewrittenMessage,
			selectedModeSlug,
			reasoning,
			originalUserContent,
			threadId,
			openrouterKey,
			userId,
			userName,
		} = args;

		const newMode = await ctx.db
			.query("modes")
			.filter((q) => q.eq(q.field("slug"), selectedModeSlug))
			.first();

		if (!newMode) {
			throw new Error(`Mode with slug ${selectedModeSlug} not found.`);
		}

		const newProfile = await ctx.db.get(newMode.profileId as Id<"profiles">);
		if (!newProfile) {
			throw new Error(`Profile not found for mode ${newMode.name}.`);
		}

		const accountSettings = await ctx.runQuery(
			api.accountSettings.getAccountSettings,
		);

		await ctx.db.patch(assistantMessageId, {
			content: "",
			metadata: {
				modeId: newMode._id,
				isStreaming: true,
				isDelegatedExecution: true,
				delegationMetadata: {
					selectedMode: newMode.name,
					rewrittenMessage,
					reasoning,
					originalUserMessage: originalUserContent,
				},
			},
		});

		await ctx.scheduler.runAfter(0, internal.chat.executeDelegatedTaskStream, {
			assistantMessageId,
			newMode: newMode._id,
			newProfile: newProfile._id,
			threadId,
			openrouterKey,
			userId,
			userName,
			rewrittenMessage,
		});

		return { success: true };
	},
});

export const executeDelegatedTaskStream = internalMutation({
	args: {
		assistantMessageId: v.id("messages"),
		newMode: v.id("modes"),
		newProfile: v.id("profiles"),
		threadId: v.id("threads"),
		openrouterKey: v.string(),
		userId: v.string(),
		userName: v.string(),
		rewrittenMessage: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.scheduler.runAfter(
			0,
			internal.chat.executeDelegatedTaskAction,
			args,
		);
	},
});

export const executeDelegatedTaskAction = internalAction({
	args: {
		assistantMessageId: v.id("messages"),
		newMode: v.id("modes"),
		newProfile: v.id("profiles"),
		threadId: v.id("threads"),
		openrouterKey: v.string(),
		userId: v.string(),
		userName: v.string(),
		rewrittenMessage: v.string(),
	},
	handler: async (ctx, args) => {
		const {
			assistantMessageId,
			newMode,
			newProfile,
			threadId,
			openrouterKey,
			userName,
			rewrittenMessage,
		} = args;

		const mode = await ctx.runQuery(api.modes.getById, {
			id: newMode,
		});

		if (!mode) {
			await ctx.runMutation(internal.chat.finalizeAssistantMessage, {
				messageId: assistantMessageId,
				finalContent: "Error: Mode not found for delegated task.",
				finishReason: "error",
			});
			return;
		}

		const profile = await ctx.runQuery(api.profiles.get, {
			id: newProfile,
		});

		if (!profile) {
			await ctx.runMutation(internal.chat.finalizeAssistantMessage, {
				messageId: assistantMessageId,
				finalContent: "Error: Profile not found for delegated task.",
				finishReason: "error",
			});
			return;
		}

		const accountSettings = await ctx.runQuery(
			api.accountSettings.getAccountSettings,
		);

		let previousContext: Array<CoreMessage> = [];
		try {
			const existingMessages = await ctx.runQuery(api.messages.list, {
				threadId: threadId,
			});

			previousContext = existingMessages
				.filter((msg) => msg.role === "user" || msg.role === "assistant")
				.filter((msg) => !msg.metadata?.isDelegatedTask)
				.slice(-10)
				.map((msg) => ({
					role: msg.role as "user" | "assistant",
					content: msg.content,
				}));
		} catch (error) {
			console.warn("Failed to get previous context:", error);
		}

		const processedMessages: CoreMessage[] = [
			...previousContext,
			{
				role: "user",
				content: rewrittenMessage,
			},
		];

		let chunkBuffer = "";
		let lastUpdateTime = Date.now();
		const BUFFER_SIZE = 100;
		const BUFFER_TIME = 1000;

		const flushBuffer = async () => {
			if (chunkBuffer.length > 0) {
				await ctx.runMutation(internal.chat.appendAssistantMessageContent, {
					messageId: assistantMessageId,
					chunk: chunkBuffer,
				});
				chunkBuffer = "";
				lastUpdateTime = Date.now();
			}
		};

		try {
			const result = streamText({
				model: getChatModel(profile.model, openrouterKey),
				system: buildSystemPrompt({
					user_name: accountSettings.name || userName || "User",
					model: profile.model,
					mode_definition: mode.modeDefinition,
					ai_behavior: accountSettings.behavior,
				}),
				messages: processedMessages,
				topP: profile.topP,
				topK: profile.topK,
				temperature: profile.temperature,
				async onChunk({ chunk }) {
					if (chunk.type === "text-delta") {
						chunkBuffer += chunk.textDelta;
						const currentTime = Date.now();

						if (
							chunkBuffer.length >= BUFFER_SIZE ||
							currentTime - lastUpdateTime >= BUFFER_TIME
						) {
							await flushBuffer();
						}
					}
				},
				async onFinish({ text, finishReason, reasoning }) {
					await flushBuffer();

					let finalContent = text;
					if (finishReason === "content-filter") {
						finalContent = "Sorry, the content was filtered by the model.";
					} else if (finishReason === "error") {
						finalContent =
							"Sorry, I encountered an error while generating a response.";
					}

					await ctx.runMutation(internal.chat.finalizeAssistantMessage, {
						messageId: assistantMessageId,
						finalContent,
						finishReason: finishReason || "unknown",
						reasoning,
					});
				},
				async onError(error) {
					console.error("AI SDK streaming error in delegated task:", error);
					await ctx.runMutation(internal.chat.finalizeAssistantMessage, {
						messageId: assistantMessageId,
						finalContent:
							"Sorry, I encountered an error while executing the delegated task.",
						finishReason: "error",
					});
				},
			});
		} catch (error) {
			console.error("Error executing delegated task:", error);
			await ctx.runMutation(internal.chat.finalizeAssistantMessage, {
				messageId: assistantMessageId,
				finalContent:
					"Sorry, I encountered an error while executing the delegated task.",
				finishReason: "error",
			});
		}
	},
});
