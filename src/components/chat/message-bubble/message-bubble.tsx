import type { Id } from "convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { useOpenrouterKey } from "~/hooks/use-openrouter-key";
import { useRegenerateMessageHttp } from "~/lib/query/chat";
import { useRemoveMessage } from "~/lib/query/messages";
import { useUser } from "~/lib/query/user";
import type { MessageWithMetadata } from "~/types/message";
import { AssistantMessage } from "./assistant-message";
import { UserMessage } from "./user-message";

function extractReasoningFromParts(
	parts?: Array<Record<string, unknown>>,
): string {
	if (!parts) return "";

	const reasoningPart = parts.find((part) => part.type === "reasoning");
	if (!reasoningPart) return "";

	if (
		"reasoning" in reasoningPart &&
		typeof reasoningPart.reasoning === "string"
	) {
		return reasoningPart.reasoning;
	}

	if ("details" in reasoningPart && Array.isArray(reasoningPart.details)) {
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

// this is needed because we store reasoning in the metadata field on convex
// but when streaming it's in the parts field
function extractReasoning(message: MessageWithMetadata): string {
	if ("reasoning" in message && typeof message.reasoning === "string") {
		return message.reasoning;
	}
	return (
		message.metadata?.reasoning || extractReasoningFromParts(message.parts)
	);
}

type MessageBubbleProps = {
	message: MessageWithMetadata;
	userId: string;
	threadId: Id<"threads">;
	onCreateBranch?: (parentMessageId: Id<"messages">) => void;
};

export function MessageBubble(props: MessageBubbleProps) {
	const isUser = props.message.role === "user";
	const isStreaming = props.message.metadata?.isStreaming;
	const [showReasoning, setShowReasoning] = useState(false);
	const [showToolCall, setShowToolCall] = useState(
		!!props.message.metadata?.toolCallMetadata &&
			props.message.metadata.toolCallMetadata.length > 0,
	);
	const [userHasManuallyToggled, setUserHasManuallyToggled] = useState(false);
	const removeMessage = useRemoveMessage();
	const { data: user } = useUser();
	const { openrouterKey } = useOpenrouterKey(user?.id);
	const regenerateMessageHttp = useRegenerateMessageHttp();
	const reasoning = extractReasoning(props.message);

	useEffect(() => {
		if (!userHasManuallyToggled) {
			if (isStreaming && reasoning) {
				setShowReasoning(true);
			} else if (!isStreaming && showReasoning) {
				const timer = setTimeout(() => {
					setShowReasoning(false);
				}, 500);
				return () => clearTimeout(timer);
			}
		}

		if (isStreaming) {
			setShowToolCall(true);
		} else if (!isStreaming && showToolCall && !userHasManuallyToggled) {
			const timer = setTimeout(() => {
				setShowToolCall(false);
			}, 500);
			return () => clearTimeout(timer);
		}

		if (
			props.message.metadata?.toolCallMetadata &&
			props.message.metadata.toolCallMetadata.length > 0
		) {
			setShowToolCall(true);
		}
	}, [
		isStreaming,
		showReasoning,
		reasoning,
		showToolCall,
		userHasManuallyToggled,
		props.message.metadata?.toolCallMetadata,
	]);

	function handleReasoningToggle(open: boolean) {
		setShowReasoning(open);
		setUserHasManuallyToggled(true);
	}

	function handleToolCallToggle(open: boolean) {
		setShowToolCall(open);
	}

	async function handleRemove() {
		try {
			await removeMessage({ id: props.message._id });
		} catch (error) {
			console.error("Failed to remove message:", error);
		}
	}

	async function handleRegenerate(modeId: Id<"modes">) {
		if (!openrouterKey?.trim()) {
			console.error("OpenRouter key is required for regeneration");
			return;
		}

		try {
			await regenerateMessageHttp.mutateAsync({
				messageId: props.message._id,
				modeId,
				openrouterKey,
			});
		} catch (error) {
			console.error("Failed to regenerate message:", error);
		}
	}

	if (isUser) {
		return (
			<UserMessage
				attachments={props.message.attachments}
				isStreaming={isStreaming}
				onRemove={handleRemove}
				onCreateBranch={
					props.onCreateBranch
						? () => props.onCreateBranch?.(props.message._id)
						: undefined
				}
				onRegenerate={handleRegenerate}
				message={props.message}
				threadId={props.threadId}
			/>
		);
	}

	return (
		<AssistantMessage
			reasoning={reasoning}
			isStreaming={isStreaming}
			showReasoning={showReasoning}
			onShowReasoningChange={handleReasoningToggle}
			showToolCall={showToolCall}
			onShowToolCallChange={handleToolCallToggle}
			onRemove={handleRemove}
			onCreateBranch={
				props.onCreateBranch
					? () => props.onCreateBranch?.(props.message._id)
					: undefined
			}
			onRegenerate={handleRegenerate}
			message={props.message}
			threadId={props.threadId}
		/>
	);
}
