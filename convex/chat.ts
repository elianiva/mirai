import { generateObject, generateText } from "ai";
import { v } from "convex/values";
import { getChatModel } from "../src/lib/ai";
import { ORCHESTRATOR_MODE_CONFIG } from "../src/lib/defaults";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
	type DatabaseWriter,
	internalAction,
	internalMutation,
	internalQuery,
	mutation,
} from "./_generated/server";
import { z } from "zod";

type ToolCall = {
	name: string;
	status: string;
	arguments: Record<string, unknown>;
	output?: unknown;
};

type ToolCallMetadata = ToolCall[];

type StreamingStatus = {
	isStreaming: boolean;
	content: string;
};

type SaveUserMessageResult = {
	threadId: Id<"threads">;
	userMessageId: Id<"messages">;
};

type OrchestratorResult = {
	finalMode: Doc<"modes">;
	finalProfile: Doc<"profiles">;
	finalModeId: string;
	toolCallMetadata?: ToolCallMetadata;
	processedMessage: string;
};

export const handleOrchestratorFlow = internalAction({
	args: {
		modeId: v.string(),
		originalMessage: v.string(),
		openrouterKey: v.string(),
		isRegeneration: v.optional(v.boolean()),
		previousContext: v.optional(
			v.array(
				v.object({
					role: v.union(v.literal("user"), v.literal("assistant")),
					content: v.string(),
				}),
			),
		),
	},
	handler: async (ctx, args): Promise<OrchestratorResult> => {
		const {
			modeId,
			originalMessage,
			openrouterKey,
			isRegeneration = false,
			previousContext = [],
		} = args;

		let finalMode: Doc<"modes">;
		let toolCallMetadata: ToolCallMetadata | undefined = undefined;
		let processedMessage = originalMessage;
		let finalModeId = modeId;

		const currentMode = await ctx.runQuery(api.modes.getById, {
			id: modeId as Id<"modes">,
		});
		if (!currentMode) throw new Error("Mode not found");

		if (currentMode.slug === ORCHESTRATOR_MODE_CONFIG.slug) {
			const availableModes = await ctx.runQuery(api.modes.get, {});
			const selectableModes = availableModes.filter(
				(m: Doc<"modes">) => m.slug !== ORCHESTRATOR_MODE_CONFIG.slug,
			);
			if (selectableModes.length === 0) {
				throw new Error("No modes available for orchestrator to select");
			}

			let selectedMode: Doc<"modes">;
			let aiReasoning = "";
			let rewrittenMessage = originalMessage;

			try {
				const modesDescription = selectableModes
					.map(
						(mode: Doc<"modes">) =>
							`- ${mode.name} (${mode.slug}): ${mode.description}\n  When to use: ${mode.whenToUse}`,
					)
					.join("\n");

				const { object } = await generateObject({
					model: getChatModel("google/gemini-2.5-flash-preview", openrouterKey),
					schema: z.object({
						selectedMode: z.string().describe("The slug of the mode to use"),
						reasoning: z
							.string()
							.describe("A brief explanation of why this mode was selected"),
						rewrittenMessage: z
							.string()
							.describe(
								"The refined version of the user's message that would work better with the selected mode",
							),
					}),
					system: `You are an intelligent mode selector for an AI assistant. Your task is to analyze the user's message and select the most appropriate mode from the available options.

Available modes:
${modesDescription}

Instructions:
1. Analyze the user's message and conversation context to understand their intent and requirements
2. Select the most appropriate mode based on the task type and conversation flow
3. Provide a brief reasoning for your choice
4. If needed, suggest a refined version of the user's message that would work better with the selected mode`,
					prompt: `Please analyze this message and select the most appropriate mode.

${
	previousContext.length > 0
		? `Previous conversation context:
${previousContext.map((msg) => `${msg.role}: ${msg.content}`).join("\n")}

`
		: ""
}Current user message:
${originalMessage}`,
				});

				const aiResponse = object;
				const selectedModeSlug = aiResponse.selectedMode;
				aiReasoning =
					aiResponse.reasoning || "AI selected this mode as most appropriate";
				rewrittenMessage = aiResponse.rewrittenMessage || originalMessage;

				selectedMode =
					selectableModes.find(
						(m: Doc<"modes">) => m.slug === selectedModeSlug,
					) || selectableModes[0];
			} catch (error) {
				console.error("Error using AI for mode selection:", error);
				selectedMode =
					selectableModes.find((m: Doc<"modes">) => m.slug === "general") ||
					selectableModes[0];
				aiReasoning = "Fallback selection due to AI routing error";
			}

			toolCallMetadata = [
				{
					name: "delegate_task",
					status: "success",
					arguments: {
						rewrittenMessage: rewrittenMessage,
						selectedModeSlug: selectedMode.slug,
						reasoning: isRegeneration
							? aiReasoning
							: `Orchestrator analysis: ${aiReasoning}`,
					},
					output: {
						selectedMode: selectedMode.name,
						rewrittenMessage: rewrittenMessage,
						reasoning: isRegeneration
							? aiReasoning
							: `Orchestrator analysis: ${aiReasoning}`,
						originalUserMessage: originalMessage,
					},
				},
			];

			processedMessage = rewrittenMessage;
			finalModeId = selectedMode._id;
			finalMode = selectedMode;
		} else {
			finalMode = currentMode;
		}

		const finalProfile = await ctx.runQuery(api.profiles.get, {
			id: finalMode.profileId as Id<"profiles">,
		});
		if (!finalProfile) throw new Error("Profile not found");

		return {
			finalMode,
			finalProfile,
			finalModeId,
			toolCallMetadata,
			processedMessage,
		};
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

		const selectedMode = await ctx.db.get(modeId as Id<"modes">);
		if (!selectedMode) throw new Error("Selected mode not found");

		const selectedProfile = await ctx.db.get(
			selectedMode.profileId as Id<"profiles">,
		);
		if (!selectedProfile)
			throw new Error("Profile not found for selected mode");

		await ctx.db.patch(messageId, {
			content: "",
			metadata: {
				modeId: selectedMode._id,
				isStreaming: true,
				profileId: undefined,
				reasoning: undefined,
				toolCallMetadata: undefined,
			},
		});

		return { success: true };
	},
});

export const updateStreamingMessage = internalMutation({
	args: {
		messageId: v.id("messages"),
		content: v.string(),
		reasoning: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) {
			throw new Error("Message not found");
		}

		await ctx.db.patch(args.messageId, {
			content: args.content,
			metadata: {
				...message.metadata,
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
		const message = await ctx.db.get(args.messageId);
		if (!message) {
			throw new Error("Message not found");
		}

		await ctx.db.patch(args.messageId, {
			content: args.content,
			metadata: {
				...message.metadata,
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
					status: v.string(),
					arguments: v.any(),
					output: v.any(),
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
