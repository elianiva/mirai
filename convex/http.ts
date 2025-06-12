import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { streamText } from "ai";
import { getChatModel, buildSystemPrompt } from "../src/lib/ai";
import { internal, api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

export const chat = httpAction(async (ctx, req) => {
	// Extract request data
	const {
		messages,
		modeId,
		branchId,
		parentMessageId,
		threadId,
		openrouterKey
	} = await req.json();

	// Validate authentication
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new Error("Unauthorized");
	}

	if (!openrouterKey || openrouterKey.trim() === "") {
		throw new Error("OpenRouter API key is required to use OpenRouter models. Please add your API key in the account settings.");
	}

	// Get mode and profile information
	const mode = await ctx.runQuery(internal.chat.getMode, { modeId });
	if (!mode) {
		throw new Error("Mode not found");
	}

	const profile = await ctx.runQuery(internal.chat.getProfile, { profileId: mode.profileSelector });
	if (!profile) {
		throw new Error("Profile not found");
	}

	// Get account settings for system prompt
	const accountSettings = await ctx.runQuery(api.accountSettings.getAccountSettings);

	// Get the last user message to save to DB
	const lastUserMessage = messages[messages.length - 1];
	if (!lastUserMessage || lastUserMessage.role !== "user") {
		throw new Error("No user message found");
	}

	// Call the language model
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
		async onFinish({ text, toolCalls, toolResults, usage, finishReason }) {
			// Save the complete conversation to the database
			let finalContent = text;
			if (finishReason === "content-filter") {
				finalContent = "Sorry, the content was filtered by the model.";
			} else if (finishReason === "error") {
				finalContent = "Sorry, I encountered an error while generating a response.";
			}

			await ctx.runMutation(internal.chat.saveChatMessages, {
				threadId,
				userMessage: lastUserMessage.content,
				assistantMessage: finalContent,
				modeId,
				parentMessageId,
				branchId,
				userId: identity.subject,
				userName: identity.name ?? "User",
				openrouterKey,
			});
		},
	});

	// Respond with the stream
	return result.toDataStreamResponse({
		headers: {
			"Access-Control-Allow-Origin": "*",
			Vary: "origin",
		},
	});
});

const http = httpRouter();

http.route({
	path: "/api/chat",
	method: "POST",
	handler: chat,
});

http.route({
	path: "/api/chat",
	method: "OPTIONS",
	handler: httpAction(async (_, request) => {
		// Make sure the necessary headers are present
		// for this to be a valid pre-flight request
		const headers = request.headers;
		if (
			headers.get("Origin") !== null &&
			headers.get("Access-Control-Request-Method") !== null &&
			headers.get("Access-Control-Request-Headers") !== null
		) {
			return new Response(null, {
				headers: new Headers({
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST",
					"Access-Control-Allow-Headers": "Content-Type, Digest",
					"Access-Control-Max-Age": "86400",
				}),
			});
		}
		return new Response();
	}),
});

// Convex expects the router to be the default export of `convex/http.js`.
export default http;
