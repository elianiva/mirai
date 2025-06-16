import { type CoreMessage, streamText } from "ai";
import { z } from "zod";
import { buildSystemPrompt, getChatModel } from "../../src/lib/ai";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { httpAction } from "../_generated/server";
import { CORS_HEADERS } from "./common";

const schema = z.object({
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
	branchId: z.string().optional(),
	parentMessageId: z.string().optional(),
	threadId: z.string().optional(),
	openrouterKey: z.string(),
	attachmentIds: z.array(z.string()).optional(),
});

export const chatHandler = httpAction(async (ctx, req) => {
	const body = await req.json();
	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		return new Response(JSON.stringify(parsed.error.flatten().fieldErrors), {
			status: 400,
			headers: CORS_HEADERS,
		});
	}

	const {
		messages,
		modeId,
		branchId,
		parentMessageId,
		threadId,
		openrouterKey,
		attachmentIds,
	} = parsed.data;

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

	const mode = await ctx.runQuery(internal.chat.getMode, { modeId });
	if (!mode) {
		return new Response(JSON.stringify({ error: "Mode not found" }), {
			status: 404,
			headers: CORS_HEADERS,
		});
	}

	const profile = await ctx.runQuery(internal.chat.getProfile, {
		profileId: mode.profileSelector,
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

	const lastUserMessage = messages[messages.length - 1];
	if (!lastUserMessage || lastUserMessage.role !== "user") {
		return new Response(JSON.stringify({ error: "No user message found" }), {
			status: 400,
			headers: CORS_HEADERS,
		});
	}

	let processedMessages = messages;
	const originalUserMessageContent =
		typeof lastUserMessage.content === "string" ? lastUserMessage.content : "";

	// handle attachments based on the ids that we've uploaded previously
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

			processedMessages = [...messages];
			const lastMessageIndex = processedMessages.length - 1;

			const contentParts = [];

			contentParts.push({
				type: "text" as const,
				text: originalUserMessageContent,
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

			processedMessages[lastMessageIndex] = {
				...lastUserMessage,
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
			userMessage: originalUserMessageContent,
			modeId,
			parentMessageId: parentMessageId as Id<"messages">,
			branchId,
			userId: identity.subject,
			userName: identity.name ?? "User",
			openrouterKey,
			attachmentIds: attachmentIds
				? (attachmentIds as Id<"attachments">[])
				: undefined,
		},
	);

	const assistantMessageId = await ctx.runMutation(
		internal.chat.createAssistantMessage,
		{
			threadId: userMessageResult.threadId,
			modeId,
			parentMessageId: userMessageResult.userMessageId,
			branchId: userMessageResult.branchId,
			userId: identity.subject,
			userName: identity.name ?? "User",
			openrouterKey,
			modelName: profile.model,
		},
	);

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
			console.error("AI SDK streaming error:", error);
			await ctx.runMutation(internal.chat.finalizeAssistantMessage, {
				messageId: assistantMessageId,
				finalContent:
					"Sorry, I encountered an error while generating a response.",
				finishReason: "error",
			});
		},
	});

	return result.toDataStreamResponse({
		headers: CORS_HEADERS,
		sendReasoning: true,
	});
});
