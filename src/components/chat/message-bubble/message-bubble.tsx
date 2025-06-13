import type { Id } from "convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { useRemoveMessage } from "~/lib/query/messages";
import { UserMessage } from "./user-message";
import { AssistantMessage } from "./assistant-message";
import {
	type MessageWithMetadata,
	extractReasoning,
	REASONING_COLLAPSE_DELAY,
} from "./message-types";

type MessageBubbleProps = {
	message: MessageWithMetadata;
	userId: string;
	threadId: Id<"threads">;
	isStreamingReasoning?: boolean;
	onRegenerate: (messageId: Id<"messages">, modeId: Id<"modes">) => void;
	onCreateBranch?: (parentMessageId: Id<"messages">) => void;
};

export function MessageBubble(props: MessageBubbleProps) {
	const isUser = props.message.type === "user";
	const isStreaming = props.message.metadata?.isStreaming;
	const [showReasoning, setShowReasoning] = useState(false);
	const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
	const [userHasManuallyToggled, setUserHasManuallyToggled] = useState(false);
	const removeMessage = useRemoveMessage();
	const reasoning = extractReasoning(props.message);

	// Handle dynamic expansion and collapse based on streaming state
	useEffect(() => {
		if (props.isStreamingReasoning) {
			setShowReasoning(true);
			setUserHasManuallyToggled(false); // Reset manual toggle when new streaming starts
		} else if (
			!props.isStreamingReasoning &&
			showReasoning &&
			!isStreaming &&
			!userHasManuallyToggled
		) {
			// Only auto-collapse if user hasn't manually toggled
			const timer = setTimeout(() => {
				setShowReasoning(false);
			}, REASONING_COLLAPSE_DELAY);
			return () => clearTimeout(timer);
		}
	}, [
		props.isStreamingReasoning,
		isStreaming,
		showReasoning,
		userHasManuallyToggled,
	]);

	function handleReasoningToggle(open: boolean) {
		setShowReasoning(open);
		setUserHasManuallyToggled(true);
	}

	async function handleRemove() {
		try {
			await removeMessage({ id: props.message._id });
		} catch (error) {
			console.error("Failed to remove message:", error);
		}
	}

	function handleRegenerate(modeId: Id<"modes">) {
		props.onRegenerate(props.message._id, modeId);
		setShowRegenerateDialog(false);
	}

	if (isUser) {
		return (
			<UserMessage
				content={props.message.content}
				isStreaming={isStreaming}
				onRemove={handleRemove}
				onCreateBranch={
					props.onCreateBranch
						? () => props.onCreateBranch?.(props.message._id)
						: undefined
				}
				showRegenerateDialog={showRegenerateDialog}
				onShowRegenerateDialog={setShowRegenerateDialog}
				onRegenerate={handleRegenerate}
				initialModeId={props.message.metadata?.modeId as Id<"modes">}
			/>
		);
	}

	return (
		<AssistantMessage
			content={props.message.content}
			reasoning={reasoning}
			isStreaming={isStreaming}
			isStreamingReasoning={props.isStreamingReasoning}
			showReasoning={showReasoning}
			onShowReasoningChange={handleReasoningToggle}
			onRemove={handleRemove}
			onCreateBranch={
				props.onCreateBranch
					? () => props.onCreateBranch?.(props.message._id)
					: undefined
			}
			showRegenerateDialog={showRegenerateDialog}
			onShowRegenerateDialog={setShowRegenerateDialog}
			onRegenerate={handleRegenerate}
			initialModeId={props.message.metadata?.modeId as Id<"modes">}
		/>
	);
}
