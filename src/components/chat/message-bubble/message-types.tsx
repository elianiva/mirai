import type { Id } from "convex/_generated/dataModel";
import type { TextPart } from "ai";

export type MessageMetadata = {
	isStreaming?: boolean; // Keep for backward compatibility
	isStreamingMessageContent?: boolean;
	isStreamingReasoning?: boolean;
	modeId?: string;
	profileId?: Id<"profiles">;
	reasoning?: string;
};

export type ReasoningPart = {
	type: "reasoning";
	reasoning: string;
	details?: Array<{ type: string; text: string }>;
};

export type MessageWithMetadata = {
	_id: Id<"messages">;
	content: string;
	type: string; // Keep original 'type' for backward compatibility
	role?: "user" | "assistant" | "system" | "tool"; // Optional role for AI SDK compatibility
	senderId: string;
	metadata?: MessageMetadata;
	parts?: Array<Record<string, unknown>>;
	attachments?: { url: string; filename: string; contentType: string }[];
};

export const REASONING_COLLAPSE_DELAY = 500;

export function extractReasoningFromParts(
	parts?: Array<Record<string, unknown>>,
): string {
	if (!parts) return "";
	
	const reasoningPart = parts.find((part) => 
		typeof part === 'object' && part !== null && 'type' in part && part.type === "reasoning"
	);
	
	if (!reasoningPart) return "";

	// Handle direct reasoning property
	if ('reasoning' in reasoningPart && typeof reasoningPart.reasoning === "string") {
		return reasoningPart.reasoning;
	}

	// Handle details array format
	if ('details' in reasoningPart && Array.isArray(reasoningPart.details)) {
		return reasoningPart.details
			.map((detail: unknown) => {
				if (
					typeof detail === "object" &&
					detail !== null &&
					"type" in detail &&
					"text" in detail
				) {
					const detailObj = detail as Record<string, unknown>;
					return detailObj.type === "text"
						? String(detailObj.text)
						: "<redacted>";
				}
				return "<redacted>";
			})
			.join("");
	}

	return "";
}

export function extractReasoning(message: MessageWithMetadata): string {
	return (
		message.metadata?.reasoning || extractReasoningFromParts(message.parts)
	);
}
