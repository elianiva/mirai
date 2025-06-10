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
import { streamText, generateText } from "ai";

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
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		let { message, modeId, threadId, parentMessageId, branchId } = args;

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
			},
			userName: identity.name ?? "User",
		});

		return { threadId, branchId };
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
			},
			userName: identity.name ?? "User",
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
		}),
		userName: v.string(),
	},
	handler: async (ctx, args) => {
		const { messageId, userName, messages, profile, mode } = args;

		try {
			// Fetch account settings
			const accountSettings = await ctx.runQuery(api.accountSettings.getAccountSettings);

			const { textStream } = streamText({
				model: getChatModel(profile.model),
				system: buildSystemPrompt({
					user_name: accountSettings.name,
					user_role: accountSettings.role,
					model: mode.model,
					mode_definition: mode.modeDefinition,
					ai_behavior: accountSettings.behavior,
				}),
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
					"You are a helpful assistant that generates concise, descriptive titles for chat conversations. Generate a title that captures the main topic or intent of the user's message. Keep it under 50 characters and make it clear and informative. Do not use any markdown syntax.",
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

		const finalTitle = title.length > 50 ? `${title.slice(0, 47)}...` : title;

		await ctx.db.patch(threadId, {
			title: finalTitle,
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

		const branchId = `branch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

		const allMessages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", parentMessage.threadId))
			.order("asc")
			.collect();

		const parentIndex = allMessages.findIndex(
			(msg) => msg._id === args.parentMessageId,
		);
		const messagesToBranch = allMessages.slice(parentIndex + 1);

		for (const msg of messagesToBranch) {
			await ctx.db.insert("messages", {
				threadId: msg.threadId,
				senderId: msg.senderId,
				content: msg.content,
				type: msg.type,
				metadata: msg.metadata,
				parentMessageId:
					msg._id === messagesToBranch[0]._id
						? args.parentMessageId
						: undefined,
				branchId,
				isActiveBranch: true,
			});
		}

		for (const msg of messagesToBranch) {
			await ctx.db.patch(msg._id, { isActiveBranch: false });
		}

		return { branchId, threadId: parentMessage.threadId };
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
