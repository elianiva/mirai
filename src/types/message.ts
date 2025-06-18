import type { Doc, Id } from "convex/_generated/dataModel";

export const NEW_THREAD_ID = "new" as const;

export type MessageAttachment = {
	url: string;
	filename: string;
	contentType: string;
};

export type ToolCall = {
	name: string;
	status: "streaming" | "success" | "error";
	arguments: Record<string, unknown>;
	output?: unknown;
	toolCallId?: string;
	startTime?: number;
	endTime?: number;
	streamingArgs?: string;
};

export type ToolCallMetadata = ToolCall[];

export type MessageMetadata = {
	isStreaming?: boolean;
	isPendingOrchestrator?: boolean;
	modeId?: string;
	profileId?: string;
	reasoning?: string;
	modelName?: string;
	finishReason?: string;
	toolCallMetadata?: ToolCallMetadata;
};

export type MessageMetadataUI = {
	isStreaming?: boolean;
	isPendingOrchestrator?: boolean;
	isStreamingMessageContent?: boolean;
	isStreamingReasoning?: boolean;
	isStreamingToolCalls?: boolean;
	modeId?: Id<"modes"> | undefined;
	profileId?: Id<"profiles">;
	reasoning?: string;
	modelName?: string;
	finishReason?: string;
	toolCallMetadata?: ToolCallMetadata;
};

export type Message = Doc<"messages"> & {
	attachments?: MessageAttachment[];
};

export type MessageWithMetadata = {
	_id: Id<"messages">;
	content: string;
	role: "user" | "assistant";
	senderId: string;
	metadata?: MessageMetadataUI;
	parts?: Array<Record<string, unknown>>;
	attachments?: MessageAttachment[];
	attachmentIds?: Id<"attachments">[];
};

export type ReasoningPart = {
	type: "reasoning";
	reasoning: string;
	details?: Array<{ type: string; text: string }>;
};
