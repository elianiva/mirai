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

type ConversationMessage = {
	role: MessageRole;
	content: string;
};

type ModeConfig = {
	modeDefinition: string;
	model: string;
};

type ProfileConfig = {
	model: string;
	topP: number;
	topK: number;
	temperature: number;
};

type SendMessageResult = {
	threadId: Id<"threads">;
	branchId?: string;
};

type SaveUserMessageResult = {
	threadId: Id<"threads">;
	userMessageId: Id<"messages">;
	branchId?: string;
};

type MessageMetadata = {
	isStreaming?: boolean;
	modeId?: string;
	profileId?: string;
	reasoning?: string;
	modelName?: string;
	finishReason?: string;
	isCondensedHistory?: boolean;
	originalThreadId?: Id<"threads">;
	originalParentMessageId?: Id<"messages">;
};

type DatabaseMessage = {
	_id: Id<"messages">;
	threadId: Id<"threads">;
	senderId: string;
	content: string;
	role: "user" | "assistant";
	metadata?: MessageMetadata;
	parentMessageId?: Id<"messages">;
	branchId?: string;
	isActiveBranch?: boolean;
	attachmentIds?: Id<"attachments">[];
	_creationTime: number;
};

type BranchInfo = {
	branchId: string;
	parentMessageId: Id<"messages">;
	firstMessage: DatabaseMessage;
	messageCount: number;
	isActive: boolean;
};

type BranchMetadata = {
	originalThreadId: Id<"threads">;
	originalParentMessageId: Id<"messages">;
	originalBranchId?: string;
};

type DetachedBranchMetadata = BranchMetadata & {
	isDetached: boolean;
	condensedHistoryMessageId: Id<"messages">;
};

type CreateBranchResult = {
	branchId: string;
	threadId: Id<"threads">;
	branchMetadata: BranchMetadata;
};

type CreateDetachedBranchResult = {
	threadId: Id<"threads">;
	branchMetadata: DetachedBranchMetadata;
	condensedHistoryMessageId: Id<"messages">;
};

type StreamingStatus = {
	isStreaming: boolean;
	content: string;
};

type SuccessResult = {
	success: boolean;
};

type StopStreamingResult = {
	success: boolean;
	reason?: string;
};

async function getActiveBranchMessages(
	ctx: QueryCtx,
	threadId: Id<"threads">,
	currentBranchId?: string,
) {
	const allMessages = await ctx.db
		.query("messages")
		.withIndex("by_thread", (q) => q.eq("threadId", threadId))
		.order("asc")
		.collect();

	if (!currentBranchId) return allMessages;

	const activeBranchMessages: typeof allMessages = [];
	const messageMap = new Map(allMessages.map((msg) => [msg._id, msg]));

	const branchMessages = allMessages.filter(
		(msg) => msg.branchId === currentBranchId && msg.isActiveBranch !== false,
	);

	for (const msg of branchMessages) {
		let currentMsg = msg;
		const ancestors = [];

		while (currentMsg.parentMessageId) {
			const parent = messageMap.get(currentMsg.parentMessageId);
			if (!parent) break;

			if (parent.branchId !== currentBranchId) {
				ancestors.unshift(parent);
				let ancestor = parent;
				while (ancestor.parentMessageId) {
					const grandParent = messageMap.get(ancestor.parentMessageId);
					if (!grandParent) break;
					ancestors.unshift(grandParent);
					ancestor = grandParent;
				}
				break;
			}

			currentMsg = parent;
		}

		for (const ancestor of ancestors) {
			if (!activeBranchMessages.find((m) => m._id === ancestor._id)) {
				activeBranchMessages.push(ancestor);
			}
		}

		if (!activeBranchMessages.find((m) => m._id === msg._id)) {
			activeBranchMessages.push(msg);
		}
	}

	return activeBranchMessages.sort((a, b) => a._creationTime - b._creationTime);
}

export const sendMessage = mutation({
	args: {
		threadId: v.optional(v.id("threads")),
		modeId: v.string(),
		message: v.string(),
		parentMessageId: v.optional(v.id("messages")),
		branchId: v.optional(v.string()),
		openrouterKey: v.optional(v.string()),
	},
	handler: async (ctx, args): Promise<SendMessageResult> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthorized");

		const {
			message,
			modeId,
			threadId,
			parentMessageId,
			branchId,
			openrouterKey,
		} = args;

		if (!openrouterKey) throw new Error("OpenRouter API key is required");

		const mode = await ctx.db.get(modeId as Id<"modes">);
		if (!mode) throw new Error("Mode not found");

		const profile = await ctx.db.get(mode.profileSelector as Id<"profiles">);
		if (!profile) throw new Error("Profile not found");

		// Use saveUserMessage to handle all message creation logic
		const {
			threadId: finalThreadId,
			userMessageId,
			branchId: finalBranchId,
		}: SaveUserMessageResult = await ctx.runMutation(
			internal.chat.saveUserMessage,
			{
				threadId,
				userMessage: message,
				modeId,
				parentMessageId,
				branchId,
				userId: identity.subject,
				userName: identity.name ?? "User",
				openrouterKey,
			},
		);

		const messageId = await ctx.runMutation(
			internal.chat.createStreamingMessage,
			{
				threadId: finalThreadId,
				modeId,
				parentMessageId: userMessageId,
				branchId: finalBranchId,
			},
		);

		const pastMessages = await getActiveBranchMessages(
			ctx,
			finalThreadId,
			finalBranchId,
		);

		await ctx.scheduler.runAfter(0, api.chat.streamResponse, {
			threadId: finalThreadId,
			messageId,
			messages: pastMessages.map(
				(msg): ConversationMessage => ({
					role: msg.role as MessageRole,
					content: msg.content,
				}),
			),
			mode: {
				modeDefinition: mode.modeDefinition,
				model: profile.model,
			} as ModeConfig,
			profile: {
				model: profile.model,
				topP: profile.topP,
				topK: profile.topK,
				temperature: profile.temperature,
			} as ProfileConfig,
			userName: identity.name ?? "User",
			openrouterKey,
		});

		return { threadId: finalThreadId, branchId: finalBranchId };
	},
});

export const regenerateMessage = mutation({
	args: {
		messageId: v.id("messages"),
		modeId: v.string(),
		openrouterKey: v.optional(v.string()),
	},
	handler: async (ctx, args): Promise<SuccessResult> => {
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
					role: msg.role as MessageRole,
					content: msg.content,
				} as ConversationMessage);
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
			// Check if OpenRouter key is required for this model
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
		branchId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { threadId, modeId, parentMessageId, branchId } = args;

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
			parentMessageId,
			branchId,
			isActiveBranch: true,
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
	handler: async (ctx, args): Promise<StopStreamingResult> => {
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

			await ctx.runMutation(internal.chat.updateThreadTitle, {
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
		parentMessageId: v.optional(v.id("messages")),
		branchId: v.optional(v.string()),
		userId: v.string(),
		userName: v.string(),
		openrouterKey: v.string(),
		attachmentIds: v.optional(v.array(v.id("attachments"))),
	},
	handler: async (ctx, args) => {
		let {
			threadId,
			userMessage,
			modeId,
			parentMessageId,
			branchId,
			userId,
			userName,
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
			await ctx.scheduler.runAfter(0, internal.chat.generateThreadTitle, {
				threadId,
				message: userMessage,
				openrouterKey,
			});
		}

		// Handle branching logic
		if (parentMessageId && !branchId) {
			branchId = `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		}

		if (parentMessageId && branchId) {
			const siblingMessages = await ctx.db
				.query("messages")
				.withIndex("by_parent", (q) => q.eq("parentMessageId", parentMessageId))
				.collect();

			for (const sibling of siblingMessages) {
				if (sibling.branchId !== branchId) {
					await ctx.db.patch(sibling._id, { isActiveBranch: false });
				}
			}
		}

		// Insert user message
		const userMessageId = await ctx.db.insert("messages", {
			threadId,
			senderId: userId,
			content: userMessage,
			role: "user",
			metadata: { modeId },
			parentMessageId,
			branchId,
			isActiveBranch: true,
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

		return { threadId, userMessageId, branchId };
	},
});

export const createAssistantMessage = internalMutation({
	args: {
		threadId: v.id("threads"),
		modeId: v.string(),
		parentMessageId: v.id("messages"),
		branchId: v.optional(v.string()),
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
			branchId,
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
			parentMessageId,
			branchId,
			isActiveBranch: true,
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

export const createBranch = mutation({
	args: {
		parentMessageId: v.id("messages"),
		openrouterKey: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthorized");

		const parentMessage = await ctx.db.get(args.parentMessageId);
		if (!parentMessage) throw new Error("Parent message not found");

		const originalThread = await ctx.db.get(parentMessage.threadId);
		if (!originalThread) throw new Error("Original thread not found");

		const branchId = `branch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

		const activeBranchMessages = await getActiveBranchMessages(
			ctx,
			parentMessage.threadId,
			parentMessage.branchId,
		);

		const parentIndex = activeBranchMessages.findIndex(
			(msg) => msg._id === args.parentMessageId,
		);

		if (parentIndex === -1)
			throw new Error("Parent message not found in active branch");

		const messagesToCopy = activeBranchMessages.slice(0, parentIndex + 1);

		const newThreadId = await ctx.db.insert("threads", {
			// temporary title, will be updated by scheduled action, but keep it like this in case
			// it fails to generate a title
			title: `${originalThread.title} - Branch`,
			parentId: parentMessage.threadId,
		});

		// generate dynamic title based on conversation context using the last assistant message
		const lastAssistantMessage = messagesToCopy
			.reverse()
			.find((msg) => msg.role === "assistant");
		if (lastAssistantMessage) {
			await ctx.scheduler.runAfter(0, internal.chat.generateThreadTitle, {
				threadId: newThreadId,
				message: lastAssistantMessage.content,
				openrouterKey: args.openrouterKey,
			});
		}

		const messageIdMap = new Map<Id<"messages">, Id<"messages">>();

		for (let i = 0; i < messagesToCopy.length; i++) {
			const msg = messagesToCopy[i];

			let newParentMessageId: Id<"messages"> | undefined;
			if (msg.parentMessageId && messageIdMap.has(msg.parentMessageId)) {
				newParentMessageId = messageIdMap.get(msg.parentMessageId);
			}

			let newAttachmentIds: Id<"attachments">[] | undefined;
			if (msg.attachmentIds && msg.attachmentIds.length > 0) {
				newAttachmentIds = [];
				for (const attachmentId of msg.attachmentIds) {
					const originalAttachment = await ctx.db.get(attachmentId);
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
				threadId: newThreadId,
				senderId: msg.senderId,
				content: msg.content,
				role: msg.role,
				metadata: msg.metadata,
				parentMessageId: newParentMessageId,
				branchId: undefined,
				isActiveBranch: true,
				attachmentIds: newAttachmentIds,
			});

			if (newAttachmentIds && newAttachmentIds.length > 0) {
				for (const attachmentId of newAttachmentIds) {
					await ctx.db.patch(attachmentId, {
						messageId: newMessageId,
					});
				}
			}

			messageIdMap.set(msg._id, newMessageId);
		}

		return {
			branchId,
			threadId: newThreadId,
			branchMetadata: {
				originalThreadId: parentMessage.threadId,
				originalParentMessageId: args.parentMessageId,
				originalBranchId: parentMessage.branchId,
			},
		};
	},
});

export const getBranches = query({
	args: {
		threadId: v.id("threads"),
	},
	handler: async (ctx, args): Promise<BranchInfo[]> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthorized");

		const messages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.collect();

		const branchMap = new Map<string, BranchInfo>();

		for (const msg of messages) {
			if (msg.branchId && !branchMap.has(msg.branchId)) {
				const branchMessages = messages.filter(
					(m) => m.branchId === msg.branchId,
				);
				const firstBranchMessage = branchMessages.find(
					(m) => m.role === "user",
				);

				if (firstBranchMessage?.parentMessageId) {
					branchMap.set(msg.branchId, {
						branchId: msg.branchId,
						parentMessageId: firstBranchMessage.parentMessageId,
						firstMessage: firstBranchMessage,
						messageCount: branchMessages.length,
						isActive: msg.isActiveBranch !== false,
					});
				}
			}
		}

		return Array.from(branchMap.values());
	},
});

export const condenseHistory = internalAction({
	args: {
		threadId: v.id("threads"),
		branchId: v.optional(v.string()),
		openrouterKey: v.string(),
	},
	handler: async (ctx, args): Promise<string> => {
		try {
			const activeBranchMessages = await ctx.runQuery(
				internal.chat.getActiveBranchMessagesForCondensing,
				{
					threadId: args.threadId,
					branchId: args.branchId,
				},
			);

			if (activeBranchMessages.length === 0) {
				return "No conversation history to condense.";
			}

			const conversationText = activeBranchMessages
				.map((msg: ConversationMessage) => {
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

			return text.trim();
		} catch (error) {
			console.error("Error condensing history:", error);
			throw error;
		}
	},
});

export const getActiveBranchMessagesForCondensing = internalQuery({
	args: {
		threadId: v.id("threads"),
		branchId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await getActiveBranchMessages(ctx, args.threadId, args.branchId);
	},
});

export const createDetachedBranch = mutation({
	args: {
		parentMessageId: v.id("messages"),
		openrouterKey: v.string(),
		useCondensedHistory: v.boolean(),
	},
	handler: async (
		ctx,
		args,
	): Promise<CreateDetachedBranchResult | CreateBranchResult> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthorized");

		const parentMessage = await ctx.db.get(args.parentMessageId);
		if (!parentMessage) throw new Error("Parent message not found");

		const originalThread = await ctx.db.get(parentMessage.threadId);
		if (!originalThread) throw new Error("Original thread not found");

		if (!args.useCondensedHistory) {
			// If not using condensed history, fall back to regular branch creation
			return await ctx.runMutation(api.chat.createBranch, {
				parentMessageId: args.parentMessageId,
				openrouterKey: args.openrouterKey,
			});
		}

		// Create new detached thread
		const newThreadId = await ctx.db.insert("threads", {
			title: "Detached Branch", // temporary title, will be updated
			parentId: parentMessage.threadId,
			isDetached: true,
			condensedFromThreadId: parentMessage.threadId,
		});

		// Create placeholder message that will be updated with condensed history
		const contextMessageId = await ctx.db.insert("messages", {
			threadId: newThreadId,
			senderId: "system",
			content: "Generating condensed history...",
			role: "assistant",
			metadata: {
				isCondensedHistory: true,
				originalThreadId: parentMessage.threadId,
				originalParentMessageId: args.parentMessageId,
				isStreaming: true,
			},
			isActiveBranch: true,
		});

		// Schedule action to generate condensed history and update the message
		await ctx.scheduler.runAfter(
			0,
			internal.chat.generateAndSetCondensedHistory,
			{
				threadId: parentMessage.threadId,
				branchId: parentMessage.branchId,
				newThreadId: newThreadId,
				contextMessageId: contextMessageId,
				openrouterKey: args.openrouterKey,
			},
		);

		const branchMetadata = {
			originalThreadId: parentMessage.threadId,
			originalParentMessageId: args.parentMessageId,
			originalBranchId: parentMessage.branchId,
			isDetached: true,
			condensedHistoryMessageId: contextMessageId,
		};

		return {
			threadId: newThreadId,
			branchMetadata,
			condensedHistoryMessageId: contextMessageId,
		};
	},
});

export const generateAndSetCondensedHistory = internalAction({
	args: {
		threadId: v.id("threads"),
		branchId: v.optional(v.string()),
		newThreadId: v.id("threads"),
		contextMessageId: v.id("messages"),
		openrouterKey: v.string(),
	},
	handler: async (ctx, args) => {
		try {
			// Generate condensed history
			const condensedHistory = await ctx.runAction(
				internal.chat.condenseHistory,
				{
					threadId: args.threadId,
					branchId: args.branchId,
					openrouterKey: args.openrouterKey,
				},
			);

			// Update the context message with the condensed history
			await ctx.runMutation(internal.chat.updateCondensedHistoryMessage, {
				messageId: args.contextMessageId,
				content: condensedHistory,
			});

			// Generate dynamic title based on condensed content
			await ctx.runAction(internal.chat.generateThreadTitle, {
				threadId: args.newThreadId,
				message: condensedHistory,
				openrouterKey: args.openrouterKey,
			});
		} catch (error) {
			console.error("Error generating condensed history:", error);
			// Update with fallback content
			await ctx.runMutation(internal.chat.updateCondensedHistoryMessage, {
				messageId: args.contextMessageId,
				content:
					"Previous conversation context has been condensed. You can continue the conversation from here.",
			});
		}
	},
});

export const updateCondensedHistoryMessage = internalMutation({
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
