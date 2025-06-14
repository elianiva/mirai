import {
	action,
	internalAction,
	internalMutation,
	internalQuery,
	mutation,
	query,
	type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { buildSystemPrompt, getChatModel } from "../src/lib/ai";
import { streamText, generateText, smoothStream } from "ai";

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

	if (!currentBranchId) {
		return allMessages;
	}

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
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		let {
			message,
			modeId,
			threadId,
			parentMessageId,
			branchId,
			openrouterKey,
		} = args;

		if (!openrouterKey) {
			throw new Error("OpenRouter API key is required");
		}

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
				openrouterKey,
			});
		}

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

		const userMessageId = await ctx.db.insert("messages", {
			threadId,
			senderId: identity.subject,
			content: message,
			type: "user",
			metadata: { modeId },
			parentMessageId,
			branchId,
			isActiveBranch: true,
		});

		const messageId = await ctx.runMutation(
			internal.chat.createStreamingMessage,
			{
				threadId,
				modeId,
				parentMessageId: userMessageId,
				branchId,
			},
		);

		const pastMessages = await getActiveBranchMessages(ctx, threadId, branchId);

		await ctx.scheduler.runAfter(0, api.chat.streamResponse, {
			threadId,
			messageId,
			messages: pastMessages.map((msg) => ({
				role: msg.type as "user" | "assistant",
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

		return { threadId, branchId };
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
		if (!identity) {
			throw new Error("Unauthorized");
		}

		const { messageId, modeId, openrouterKey } = args;

		const messageToRegenerate = await ctx.db.get(messageId);
		if (!messageToRegenerate || messageToRegenerate.type !== "assistant") {
			throw new Error("Invalid message to regenerate");
		}

		const thread = await ctx.db.get(messageToRegenerate.threadId);
		if (!thread) {
			throw new Error("Thread not found");
		}

		const allMessages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) =>
				q.eq("threadId", messageToRegenerate.threadId),
			)
			.order("asc")
			.collect();

		const messageIndex = allMessages.findIndex((msg) => msg._id === messageId);
		if (messageIndex === -1) {
			throw new Error("Message not found in thread");
		}

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

		const mode = await ctx.db.get(modeId as Id<"modes">);
		if (!mode) {
			throw new Error("Mode not found");
		}

		const profile = await ctx.db.get(mode.profileSelector as Id<"profiles">);
		if (!profile) {
			throw new Error("Profile not found");
		}

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
			type: "assistant",
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
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		const message = await ctx.db.get(args.messageId);
		if (!message) {
			throw new Error("Message not found");
		}

		if (!message.metadata?.isStreaming) {
			return { success: false, reason: "Message is not streaming" };
		}

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
				title: userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : ""),
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
			type: "user",
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
			type: "assistant",
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
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		const parentMessage = await ctx.db.get(args.parentMessageId);
		if (!parentMessage) {
			throw new Error("Parent message not found");
		}

		// Get the original thread to copy its title
		const originalThread = await ctx.db.get(parentMessage.threadId);
		if (!originalThread) {
			throw new Error("Original thread not found");
		}

		// Create a new thread for the branch
		const newThreadId = await ctx.db.insert("threads", {
			title: `${originalThread.title} (Branch)`,
			parentId: parentMessage.threadId,
		});

		const branchId = `branch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

		// Get all messages from the original thread
		const allMessages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", parentMessage.threadId))
			.order("asc")
			.collect();

		// Get active branch messages up to and including the parent message
		const activeBranchMessages = await getActiveBranchMessages(
			ctx,
			parentMessage.threadId,
			parentMessage.branchId,
		);

		// Find the parent message index in the active branch
		const parentIndex = activeBranchMessages.findIndex(
			(msg) => msg._id === args.parentMessageId,
		);

		if (parentIndex === -1) {
			throw new Error("Parent message not found in active branch");
		}

		// Copy all messages up to and including the parent message
		const messagesToCopy = activeBranchMessages.slice(0, parentIndex + 1);
		const messageIdMap = new Map<Id<"messages">, Id<"messages">>();

		// Copy messages to the new thread
		for (let i = 0; i < messagesToCopy.length; i++) {
			const msg = messagesToCopy[i];

			// Determine the parent message ID for the copied message
			let newParentMessageId: Id<"messages"> | undefined;
			if (msg.parentMessageId && messageIdMap.has(msg.parentMessageId)) {
				newParentMessageId = messageIdMap.get(msg.parentMessageId);
			}

			// Copy attachments if they exist
			let newAttachmentIds: Id<"attachments">[] | undefined;
			if (msg.attachmentIds && msg.attachmentIds.length > 0) {
				newAttachmentIds = [];
				for (const attachmentId of msg.attachmentIds) {
					const originalAttachment = await ctx.db.get(attachmentId);
					if (originalAttachment) {
						// Create a new attachment record for the copied message
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
				type: msg.type,
				metadata: msg.metadata,
				parentMessageId: newParentMessageId,
				branchId: undefined, // Start fresh in the new thread
				isActiveBranch: true,
				attachmentIds: newAttachmentIds,
			});

			// Update attachment records to link them to this message
			if (newAttachmentIds && newAttachmentIds.length > 0) {
				for (const attachmentId of newAttachmentIds) {
					await ctx.db.patch(attachmentId, {
						messageId: newMessageId,
					});
				}
			}

			// Store the mapping for parent-child relationships
			messageIdMap.set(msg._id, newMessageId);
		}

		// Store the original thread and parent message info for tracking
		const branchMetadata = {
			originalThreadId: parentMessage.threadId,
			originalParentMessageId: args.parentMessageId,
			originalBranchId: parentMessage.branchId,
		};

		return {
			branchId,
			threadId: newThreadId,
			branchMetadata,
		};
	},
});

export const switchBranch = mutation({
	args: {
		threadId: v.id("threads"),
		branchId: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		const { threadId, branchId } = args;

		const allMessages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", threadId))
			.collect();

		for (const msg of allMessages) {
			if (msg.branchId && msg.branchId !== branchId) {
				await ctx.db.patch(msg._id, { isActiveBranch: false });
			} else if (msg.branchId === branchId) {
				await ctx.db.patch(msg._id, { isActiveBranch: true });
			}
		}

		return { success: true };
	},
});

export const getBranches = query({
	args: {
		threadId: v.id("threads"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		const messages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.collect();

		const branchMap = new Map<
			string,
			{
				branchId: string;
				parentMessageId: Id<"messages">;
				firstMessage: (typeof messages)[0];
				messageCount: number;
				isActive: boolean;
			}
		>();

		for (const msg of messages) {
			if (msg.branchId && !branchMap.has(msg.branchId)) {
				const branchMessages = messages.filter(
					(m) => m.branchId === msg.branchId,
				);
				const firstBranchMessage = branchMessages.find(
					(m) => m.type === "user",
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
