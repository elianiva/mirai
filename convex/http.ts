import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { streamText } from "ai";
import { getChatModel, buildSystemPrompt } from "../src/lib/ai";
import { internal, api } from "./_generated/api";
import { z } from "zod";
import type { Id } from "./_generated/dataModel";

const schema = z.object({
	messages: z.array(
		z.object({
			role: z.enum(["user", "assistant"]),
			content: z.string(),
		}),
	),
	modeId: z.string(),
	branchId: z.string().optional(),
	parentMessageId: z.string().optional(),
	threadId: z.string().optional(),
	openrouterKey: z.string(),
});

const CORS_HEADERS = new Headers({
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
	"Access-Control-Allow-Headers":
		"Content-Type, Authorization, X-Requested-With, Accept, Origin, Digest",
	"Access-Control-Max-Age": "86400",
	Vary: "origin",
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

	const userMessageResult = await ctx.runMutation(
		internal.chat.saveUserMessage,
		{
			threadId: threadId as Id<"threads">,
			userMessage: lastUserMessage.content,
			modeId,
			parentMessageId: parentMessageId as Id<"messages">,
			branchId,
			userId: identity.subject,
			userName: identity.name ?? "User",
			openrouterKey,
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
		messages,
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
		async onFinish({ text, finishReason }) {
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
	});
});

const http = httpRouter();

http.route({
	path: "/api/chat",
	method: "POST",
	handler: chatHandler,
});

http.route({
	path: "/api/chat",
	method: "OPTIONS",
	handler: httpAction(async () => {
		return new Response(null, {
			status: 200,
			headers: CORS_HEADERS,
		});
	}),
});

export default http;
