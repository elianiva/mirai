import {
	InvalidToolArgumentsError,
	NoSuchToolError,
	ToolExecutionError,
	streamText,
	type Message,
} from "ai";
import { z } from "zod";
import { getChatModel } from "../../src/lib/ai";
import { httpAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const requestSchema = z.object({
	modeId: z.string(),
	messages: z.array(
		z.object({
			id: z.string().optional(),
			content: z.string(),
			role: z.enum(["system", "assistant", "user"]),
		}),
	),
});

export const streamChat = httpAction(
	async (ctx: ActionCtx, request: Request) => {
		// Check authentication
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Parse and validate request body
		let body: unknown;
		try {
			body = await request.json();
		} catch (error) {
			return new Response(JSON.stringify({ error: "Invalid JSON" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const parsedBody = requestSchema.safeParse(body);
		if (!parsedBody.success) {
			return new Response(JSON.stringify({ error: "Invalid request" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const { messages, modeId } = parsedBody.data;

		const mode = await ctx.runQuery(api.modes.getModeSettings, {
			id: modeId as Id<"modes">,
		});
		if (!mode) {
			return new Response(JSON.stringify({ error: "Mode not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		const profile = await ctx.runQuery(api.profiles.get, {
			id: mode.profileSelector as Id<"profiles">,
		});
		if (!profile) {
			return new Response(JSON.stringify({ error: "Profile not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		const result = streamText({
			model: getChatModel(profile.model),
			system: mode.modeDefinition,
			messages: messages as Message[],
			maxTokens: 2048,
			temperature: 0.7,
		});

		return result.toDataStreamResponse({
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Transfer-Encoding": "chunked",
				Connection: "keep-alive",
			},
			getErrorMessage: (error: unknown) => {
				if (NoSuchToolError.isInstance(error)) {
					return "The model tried to call an unknown tool.";
				}
				if (InvalidToolArgumentsError.isInstance(error)) {
					return "The model called a tool with invalid arguments.";
				}
				if (ToolExecutionError.isInstance(error)) {
					return "An error occurred during tool execution.";
				}
				console.error("Error in chat API:", error);
				return error instanceof Error ? error.message : String(error);
			},
		});
	},
);
