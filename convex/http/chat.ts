import {
	type CoreMessage,
	streamText,
	type StreamTextOnChunkCallback,
	type Tool,
	tool,
} from "ai";
import type { GenericActionCtx } from "convex/server";
import { z } from "zod";
import { buildSystemPrompt, getChatModel } from "../../src/lib/ai";
import { ORCHESTRATOR_MODE_CONFIG } from "../../src/lib/defaults";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { httpAction } from "../_generated/server";
import { CORS_HEADERS } from "./common";

const chatSchema = z.object({
	messages: z.array(
		z.object({
			role: z.enum(["user", "assistant"]),
			content: z.union([
				z.string(),
				z.array(
					z.union([
						z.object({
							type: z.literal("text"),
							text: z.string(),
						}),
						z.object({
							type: z.literal("image"),
							image: z.union([
								z.string(),
								z.object({
									url: z.string(),
								}),
							]),
						}),
						z.object({
							type: z.literal("file"),
							file: z.object({
								url: z.string(),
								mimeType: z.string().optional(),
							}),
						}),
					]),
				),
			]),
		}),
	),
	modeId: z.string(),
	threadId: z.string().optional(),
	openrouterKey: z.string(),
	attachmentIds: z.array(z.string()).optional(),
});

const regenerateSchema = z.object({
	messageId: z.string(),
	modeId: z.string(),
	openrouterKey: z.string(),
});

const createStreamingHelpers = (messageId: Id<"messages">) => {
	let chunkBuffer = "";
	let reasoningChunkBuffer = "";
	let lastUpdateTime = Date.now();
	let lastReasoningUpdateTime = Date.now();
	const BUFFER_SIZE = 100;
	const BUFFER_TIME = 1000;

	// biome-ignore lint/suspicious/noExplicitAny: GenericActionCtx requires any type parameter
	const flushBuffer = async (ctx: GenericActionCtx<any>) => {
		if (chunkBuffer.length > 0) {
			await ctx.runMutation(internal.chat.appendAssistantMessageContent, {
				messageId,
				chunk: chunkBuffer,
			});
			chunkBuffer = "";
			lastUpdateTime = Date.now();
		}
	};

	// biome-ignore lint/suspicious/noExplicitAny: GenericActionCtx requires any type parameter
	const flushReasoningBuffer = async (ctx: GenericActionCtx<any>) => {
		if (reasoningChunkBuffer.length > 0) {
			await ctx.runMutation(internal.chat.appendMessageReasoning, {
				messageId,
				chunk: reasoningChunkBuffer,
			});
			reasoningChunkBuffer = "";
			lastReasoningUpdateTime = Date.now();
		}
	};

	const handleChunk = async (
		// biome-ignore lint/suspicious/noExplicitAny: GenericActionCtx requires any type parameter
		ctx: GenericActionCtx<any>,
		// biome-ignore lint/suspicious/noExplicitAny: We need to support any tools
		chunk: Parameters<StreamTextOnChunkCallback<any>>[0]["chunk"],
	) => {
		if (chunk.type === "reasoning") {
			reasoningChunkBuffer += chunk.textDelta || "";
			const currentTime = Date.now();
			if (
				reasoningChunkBuffer.length >= BUFFER_SIZE ||
				currentTime - lastReasoningUpdateTime >= BUFFER_TIME
			) {
				await flushReasoningBuffer(ctx);
			}
		}

		if (chunk.type === "text-delta") {
			chunkBuffer += chunk.textDelta || "";
			const currentTime = Date.now();

			if (
				chunkBuffer.length >= BUFFER_SIZE ||
				currentTime - lastUpdateTime >= BUFFER_TIME
			) {
				await flushBuffer(ctx);
			}
		} else if (chunk.type === "tool-call-streaming-start") {
			await ctx.runMutation(internal.toolCalls.addToolCallStart, {
				messageId,
				toolCallId: chunk.toolCallId || "",
				toolName: chunk.toolName || "",
			});
		} else if (chunk.type === "tool-call-delta") {
			await ctx.runMutation(internal.toolCalls.updateToolCallStatus, {
				messageId,
				toolCallId: chunk.toolCallId || "",
				status: "streaming",
				streamingArgs: chunk.argsTextDelta || "",
			});
		} else if (chunk.type === "tool-call") {
			// tool call has been fully generated but not yet executed
			// we'll wait for tool-result to update with final status and output
		} else if (chunk.type === "tool-result") {
			await ctx.runMutation(internal.toolCalls.updateToolCallStatus, {
				messageId,
				toolCallId: chunk.toolCallId || "",
				status: "success",
				output: chunk.result || "",
			});
		}
	};

	const handleFinish = async (
		// biome-ignore lint/suspicious/noExplicitAny: GenericActionCtx requires any type parameter
		ctx: GenericActionCtx<any>,
		{
			text,
			finishReason,
			reasoning,
		}: {
			text: string;
			finishReason?: string;
			reasoning?: string;
		},
	) => {
		await flushBuffer(ctx);
		await flushReasoningBuffer(ctx);

		let finalContent = text;
		if (finishReason === "content-filter") {
			finalContent = "Sorry, the content was filtered by the model.";
		} else if (finishReason === "error") {
			finalContent =
				"Sorry, I encountered an error while generating a response.";
		}

		if (finishReason !== "tool-calls") {
			if (!text || text.trim() === "") {
				finalContent = "I was unable to generate a response. Please try again.";
			}

			await ctx.runMutation(internal.chat.finalizeAssistantMessage, {
				messageId,
				finalContent,
				finishReason: finishReason || "unknown",
				reasoning,
			});
		}
	};

	// biome-ignore lint/suspicious/noExplicitAny: GenericActionCtx requires any type parameter
	const handleError = async (ctx: GenericActionCtx<any>, error: unknown) => {
		console.error("AI SDK streaming error:", error);
		await ctx.runMutation(internal.chat.finalizeAssistantMessage, {
			messageId,
			finalContent:
				"Sorry, I encountered an error while generating a response.",
			finishReason: "error",
		});
	};

	return { handleChunk, handleFinish, handleError };
};

const getDelegateTaskTool = ({
	ctx,
	assistantMessageId,
	originalUserContent,
	threadId,
	previousContext,
	openrouterKey,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: doesn't matter if we use any
	ctx: GenericActionCtx<any>;
	assistantMessageId: Id<"messages">;
	originalUserContent: string;
	threadId?: string;
	previousContext: Array<CoreMessage>;
	openrouterKey: string;
}) =>
	tool({
		description:
			"Determines the most appropriate mode and profile for a given user message, and optionally rewrites the message for that mode. Call this tool to switch to a specialized mode.",
		parameters: z.object({
			rewrittenMessage: z
				.string()
				.describe(
					"The user's message rewritten or rephrased to be most effective for the selected mode. This message should contain all necessary context and instructions for the specific mode to execute the task fully without further input from the orchestrator. The delegated mode is expected to process this message and complete the task described within it, then report its completion back to the orchestrator.",
				),
			selectedModeSlug: z
				.string()
				.describe(
					"The slug of the mode that the task should be delegated to (e.g., 'code', 'ask', 'debug', 'architect').",
				),
			reasoning: z
				.string()
				.describe(
					"A brief explanation of why this particular mode was selected and why the message was rewritten (if applicable).",
				),
		}),
		execute: async ({
			rewrittenMessage,
			selectedModeSlug,
			reasoning,
		}: {
			rewrittenMessage: string;
			selectedModeSlug: string;
			reasoning: string;
		}) => {
			// sometimes the model get sooo stubborn and refuse to use the correct slug
			// we'll just fix it here
			selectedModeSlug = selectedModeSlug
				.toLowerCase()
				.replaceAll("_", "-")
				.replaceAll(" ", "-");

			const newMode = await ctx.runQuery(api.modes.getBySlug, {
				slug: selectedModeSlug,
			});

			if (!newMode) {
				console.error(
					`AI tried to delegate to unknown mode: ${selectedModeSlug}`,
				);
				await ctx.runMutation(internal.chat.finalizeAssistantMessage, {
					messageId: assistantMessageId,
					finalContent: `Error: Could not delegate to mode "${selectedModeSlug}". Mode not found.`,
					finishReason: "error",
				});
				throw new Error(`Mode with slug ${selectedModeSlug} not found.`);
			}

			const newProfile = await ctx.runQuery(api.profiles.get, {
				id: newMode.profileId as Id<"profiles">,
			});
			if (!newProfile) {
				console.error(
					`Profile not found for mode: ${newMode.name} (ID: ${newMode._id})`,
				);
				await ctx.runMutation(internal.chat.finalizeAssistantMessage, {
					messageId: assistantMessageId,
					finalContent: `Error: Profile for mode "${newMode.name}" not found.`,
					finishReason: "error",
				});
				throw new Error(`Profile not found for mode ${newMode.name}.`);
			}

			const identity = await ctx.auth.getUserIdentity();
			if (!identity) {
				throw new Error("Unauthorized");
			}

			await ctx.runMutation(internal.chat.executeDelegatedTask, {
				assistantMessageId,
				rewrittenMessage,
				selectedModeSlug,
				reasoning,
				originalUserContent,
				threadId: threadId as Id<"threads">,
				openrouterKey,
				userId: identity.subject,
				userName: identity.name ?? "User",
			});

			return "Task delegated and execution started.";
		},
	});

export const chatHandler = httpAction(async (ctx, req) => {
	const body = await req.json();
	const parsed = chatSchema.safeParse(body);
	if (!parsed.success) {
		return new Response(JSON.stringify(parsed.error.flatten().fieldErrors), {
			status: 400,
			headers: CORS_HEADERS,
		});
	}

	const { messages, modeId, threadId, openrouterKey, attachmentIds } =
		parsed.data;

	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: CORS_HEADERS,
		});
	}

	if (!openrouterKey || openrouterKey.trim() === "") {
		return new Response(
			JSON.stringify({
				error:
					"OpenRouter API key is required to use OpenRouter models. Please add your API key in the account settings.",
			}),
			{
				status: 400,
				headers: CORS_HEADERS,
			},
		);
	}

	const mode = await ctx.runQuery(api.modes.getById, {
		id: modeId as Id<"modes">,
	});

	if (!mode) {
		return new Response(JSON.stringify({ error: "Mode not found" }), {
			status: 404,
			headers: CORS_HEADERS,
		});
	}

	const profile = await ctx.runQuery(api.profiles.get, {
		id: mode.profileId as Id<"profiles">,
	});
	if (!profile) {
		return new Response(JSON.stringify({ error: "Profile not found" }), {
			status: 404,
			headers: CORS_HEADERS,
		});
	}

	const accountSettings = await ctx.runQuery(
		api.accountSettings.getAccountSettings,
	);

	if (!messages || messages.length === 0) {
		return new Response(JSON.stringify({ error: "No messages provided" }), {
			status: 400,
			headers: CORS_HEADERS,
		});
	}

	let previousContext: Array<CoreMessage> = [];
	if (threadId && threadId !== "new") {
		try {
			const existingMessages = await ctx.runQuery(api.messages.list, {
				threadId: threadId as Id<"threads">,
			});

			previousContext = existingMessages
				.filter((msg) => msg.role === "user" || msg.role === "assistant")
				.slice(-10)
				.map((msg) => ({
					role: msg.role as "user" | "assistant",
					content: msg.content,
				}));
		} catch (error) {
			console.warn("Failed to get previous context:", error);
		}
	}

	const processedMessages = [...previousContext, ...messages];

	const lastUserMessageInProcessed =
		processedMessages[processedMessages.length - 1];
	if (
		!lastUserMessageInProcessed ||
		lastUserMessageInProcessed.role !== "user"
	) {
		return new Response(
			JSON.stringify({ error: "No user message found in processed messages" }),
			{
				status: 400,
				headers: CORS_HEADERS,
			},
		);
	}
	const originalUserContent =
		typeof lastUserMessageInProcessed.content === "string"
			? lastUserMessageInProcessed.content
			: "";

	if (attachmentIds && attachmentIds.length > 0) {
		try {
			const attachmentData = await ctx.runQuery(
				api.attachments.getAttachmentData,
				{
					attachmentIds: attachmentIds as Id<"attachments">[],
				},
			);

			if (!attachmentData || attachmentData.length === 0) {
				return new Response(
					JSON.stringify({ error: "Failed to get attachment URLs" }),
					{
						status: 500,
						headers: CORS_HEADERS,
					},
				);
			}

			const contentParts = [];

			contentParts.push({
				type: "text" as const,
				text: originalUserContent,
			});

			for (const attachment of attachmentData) {
				if (!attachment?.url) continue;

				if (attachment.contentType.startsWith("image/")) {
					contentParts.push({
						type: "image" as const,
						image: {
							url: attachment.url as string,
						},
					});
				} else {
					contentParts.push({
						type: "file" as const,
						file: {
							url: attachment.url as string,
							mimeType: attachment.contentType,
						},
					});
				}
			}

			processedMessages[processedMessages.length - 1] = {
				...lastUserMessageInProcessed,
				content: contentParts,
			};
		} catch (error) {
			console.error("Error getting attachment URLs:", error);
			return new Response(
				JSON.stringify({ error: "Failed to process attachments" }),
				{
					status: 500,
					headers: CORS_HEADERS,
				},
			);
		}
	}

	const userMessageResult = await ctx.runMutation(
		internal.chat.saveUserMessage,
		{
			threadId: threadId as Id<"threads">,
			userMessage: originalUserContent,
			modeId,
			userId: identity.subject,
			openrouterKey,
			attachmentIds: attachmentIds
				? (attachmentIds as Id<"attachments">[])
				: undefined,
		},
	);

	const assistantMessageId: Id<"messages"> = await ctx.runMutation(
		internal.chat.createAssistantMessage,
		{
			threadId: userMessageResult.threadId,
			modeId: mode._id,
			modelName: profile.model,
		},
	);

	const { handleChunk, handleFinish, handleError } =
		createStreamingHelpers(assistantMessageId);

	// TODO: revisit later
	const tools =
		mode.slug === ORCHESTRATOR_MODE_CONFIG.slug
			? {
					delegate_task: getDelegateTaskTool({
						ctx,
						assistantMessageId,
						originalUserContent,
						threadId,
						previousContext,
						openrouterKey,
					}),
				}
			: undefined;

	const result = streamText({
		model: getChatModel(profile.model, openrouterKey),
		system: buildSystemPrompt({
			user_name: accountSettings.name || identity.name || "User",
			model: profile.model,
			mode_definition: mode.modeDefinition,
			ai_behavior: accountSettings.behavior,
		}),
		messages: processedMessages as CoreMessage[],
		topP: profile.topP,
		topK: profile.topK,
		temperature: profile.temperature,
		tools: tools,
		toolCallStreaming: true,
		maxSteps: 5,
		async onChunk({ chunk }) {
			await handleChunk(ctx, chunk);
		},
		async onFinish({ text, finishReason, reasoning }) {
			await handleFinish(ctx, { text, finishReason, reasoning });
		},
		async onError(error) {
			await handleError(ctx, error);
		},
	});

	return result.toDataStreamResponse({
		headers: CORS_HEADERS,
		sendReasoning: true,
	});
});

export const regenerateHandler = httpAction(async (ctx, req) => {
	const body = await req.json();
	const parsed = regenerateSchema.safeParse(body);
	if (!parsed.success) {
		return new Response(JSON.stringify(parsed.error.flatten().fieldErrors), {
			status: 400,
			headers: CORS_HEADERS,
		});
	}

	const { messageId, modeId, openrouterKey } = parsed.data;

	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: CORS_HEADERS,
		});
	}

	if (!openrouterKey || openrouterKey.trim() === "") {
		return new Response(
			JSON.stringify({
				error:
					"OpenRouter API key is required to use OpenRouter models. Please add your API key in the account settings.",
			}),
			{
				status: 400,
				headers: CORS_HEADERS,
			},
		);
	}

	const messageToRegenerate = await ctx.runQuery(internal.chat.getMessageById, {
		messageId: messageId as Id<"messages">,
	});
	if (!messageToRegenerate || messageToRegenerate.role !== "assistant") {
		return new Response(
			JSON.stringify({ error: "Invalid message to regenerate" }),
			{
				status: 400,
				headers: CORS_HEADERS,
			},
		);
	}

	const thread = await ctx.runQuery(api.threads.getById, {
		id: messageToRegenerate.threadId,
	});
	if (!thread) {
		return new Response(JSON.stringify({ error: "Thread not found" }), {
			status: 404,
			headers: CORS_HEADERS,
		});
	}

	const allMessages = await ctx.runQuery(api.messages.list, {
		threadId: messageToRegenerate.threadId,
	});

	const messageIndex = allMessages.findIndex((msg) => msg._id === messageId);
	if (messageIndex === -1) {
		return new Response(
			JSON.stringify({ error: "Message not found in thread" }),
			{
				status: 404,
				headers: CORS_HEADERS,
			},
		);
	}

	const conversationHistory: CoreMessage[] = [];
	for (let i = 0; i < messageIndex; i++) {
		const msg = allMessages[i];
		if (msg.role === "user" || msg.role === "assistant") {
			conversationHistory.push({
				role: msg.role,
				content: msg.content,
			});
		}
	}

	const mode = await ctx.runQuery(api.modes.getById, {
		id: modeId as Id<"modes">,
	});
	if (!mode) {
		return new Response(JSON.stringify({ error: "Mode not found" }), {
			status: 404,
			headers: CORS_HEADERS,
		});
	}

	if (mode.slug === ORCHESTRATOR_MODE_CONFIG.slug) {
		return new Response(
			JSON.stringify({
				error: "Orchestrator mode is not supported for regeneration",
			}),
			{
				status: 400,
				headers: CORS_HEADERS,
			},
		);
	}

	const profile = await ctx.runQuery(api.profiles.get, {
		id: mode.profileId as Id<"profiles">,
	});
	if (!profile) {
		return new Response(JSON.stringify({ error: "Profile not found" }), {
			status: 404,
			headers: CORS_HEADERS,
		});
	}

	const accountSettings = await ctx.runQuery(
		api.accountSettings.getAccountSettings,
	);

	await ctx.runMutation(internal.chat.resetMessageToStreaming, {
		messageId: messageId as Id<"messages">,
		modeId,
		clearProfileAndReasoning: true,
	});

	const { handleChunk, handleFinish, handleError } = createStreamingHelpers(
		messageId as Id<"messages">,
	);

	// TODO: revisit later - tools for regeneration
	const tools =
		mode.slug === ORCHESTRATOR_MODE_CONFIG.slug
			? {
					delegate_task: getDelegateTaskTool({
						ctx,
						assistantMessageId: messageId as Id<"messages">,
						originalUserContent:
							conversationHistory[
								conversationHistory.length - 1
							]?.content?.toString() || "",
						threadId: messageToRegenerate.threadId,
						previousContext: conversationHistory.slice(0, -1),
						openrouterKey,
					}),
				}
			: undefined;

	const result = streamText({
		model: getChatModel(profile.model, openrouterKey),
		system: buildSystemPrompt({
			user_name: accountSettings.name || identity.name || "User",
			model: profile.model,
			mode_definition: mode.modeDefinition,
			ai_behavior: accountSettings.behavior,
		}),
		messages: conversationHistory,
		topP: profile.topP,
		topK: profile.topK,
		temperature: profile.temperature,
		tools: tools,
		toolCallStreaming: true,
		maxSteps: 5,
		async onChunk({ chunk }) {
			await handleChunk(ctx, chunk);
		},
		async onFinish({ text, finishReason, reasoning }) {
			await handleFinish(ctx, { text, finishReason, reasoning });
		},
		async onError(error) {
			await handleError(ctx, error);
		},
	});

	return result.toDataStreamResponse({
		headers: CORS_HEADERS,
		sendReasoning: true,
	});
});
