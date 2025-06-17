import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const addToolCallStart = internalMutation({
	args: {
		messageId: v.id("messages"),
		toolCallId: v.string(),
		toolName: v.string(),
	},
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) {
			console.warn(`Message with ID ${args.messageId} not found.`);
			return;
		}

		const newToolCall = {
			name: args.toolName,
			toolCallId: args.toolCallId,
			status: "streaming" as const,
			arguments: {},
			output: null,
			startTime: Date.now(),
		};

		const updatedToolCallMetadata = message.metadata?.toolCallMetadata
			? [...message.metadata.toolCallMetadata, newToolCall]
			: [newToolCall];

		await ctx.db.patch(args.messageId, {
			metadata: {
				...message.metadata,
				toolCallMetadata: updatedToolCallMetadata,
				isStreamingToolCalls: true,
			},
		});
	},
});

export const updateToolCallStatus = internalMutation({
	args: {
		messageId: v.id("messages"),
		toolCallId: v.string(),
		status: v.union(
			v.literal("streaming"),
			v.literal("success"),
			v.literal("error"),
		),
		streamingArgs: v.optional(v.string()),
		output: v.optional(v.any()), // Changed from v.string().optional() for flexibility
	},
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) {
			console.warn(`Message with ID ${args.messageId} not found.`);
			return;
		}

		type ToolCallType = {
			name: string;
			status: "streaming" | "success" | "error";
			arguments: unknown;
			output: unknown;
			startTime?: number;
			endTime?: number;
			streamingArgs?: string;
			toolCallId?: string;
		};

		const updatedToolCallMetadata = (
			message.metadata?.toolCallMetadata || []
		).map((toolCall: ToolCallType) => {
			if (toolCall.toolCallId === args.toolCallId) {
				return {
					...toolCall,
					status: args.status,
					streamingArgs: args.streamingArgs,
					output: args.output !== undefined ? args.output : toolCall.output, // Only update if output is provided
					endTime: args.status !== "streaming" ? Date.now() : toolCall.endTime,
				};
			}
			return toolCall;
		});

		// Update isStreamingToolCalls based on whether any tool call is still streaming
		const isStreamingToolCalls = updatedToolCallMetadata.some(
			(toolCall: ToolCallType) => toolCall.status === "streaming",
		);

		await ctx.db.patch(args.messageId, {
			metadata: {
				...message.metadata,
				toolCallMetadata: updatedToolCallMetadata,
				isStreamingToolCalls: isStreamingToolCalls || undefined, // Remove if no longer streaming
			},
		});
	},
});
