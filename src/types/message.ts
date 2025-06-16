import type { Doc, Id } from "convex/_generated/dataModel";

export const NEW_THREAD_ID = "new" as const;

export type MessageAttachment = {
	url: string;
	filename: string;
	contentType: string;
};

export type MessageMetadata = {
	isStreaming?: boolean;
	modeId?: string;
	profileId?: string;
	reasoning?: string;
	modelName?: string;
	finishReason?: string;
};

export type MessageMetadataUI = {
	isStreaming?: boolean;
	isStreamingMessageContent?: boolean;
	isStreamingReasoning?: boolean;
	modeId?: string;
	profileId?: Id<"profiles">;
	reasoning?: string;
	modelName?: string;
	finishReason?: string;
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
