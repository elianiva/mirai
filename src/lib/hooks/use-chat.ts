import { useCallback, useState, useRef, useEffect } from "react";
import type { Id } from "convex/_generated/dataModel";
import type { Message } from "ai";
import { useSendMessage, useStopStreaming } from "../query/chat";
import { useMessages } from "../query/messages";

type UseChatProps = {
	modeId?: Id<"modes">;
	onError?: (error: Error) => void;
	onStream?: (content: string) => void;
	threadId?: Id<"threads">;
	parentMessageId?: Id<"messages">;
	branchId?: string;
};

export function useChat(props: UseChatProps) {
	const [isLoading, setIsLoading] = useState(false);
	const currentStreamingMessageRef = useRef<Id<"messages"> | null>(null);
	
	const sendMessageMutation = useSendMessage();
	const stopStreamingMutation = useStopStreaming();
	
	// Watch messages to determine streaming status
	const messages = useMessages(
		props.threadId && props.threadId !== "new" ? props.threadId : ("new" as Id<"threads">),
		props.branchId
	);
	
	// Derive streaming status from messages
	const isStreaming = messages?.some((msg) => msg.metadata?.isStreaming) ?? false;
	
	// Track the currently streaming message for stop functionality
	useEffect(() => {
		const streamingMessage = messages?.find((msg) => msg.metadata?.isStreaming);
		if (streamingMessage) {
			currentStreamingMessageRef.current = streamingMessage._id;
		} else {
			currentStreamingMessageRef.current = null;
		}
	}, [messages]);
	
	// Call onStream callback when streaming content changes
	useEffect(() => {
		if (isStreaming && props.onStream) {
			const streamingMessage = messages?.find((msg) => msg.metadata?.isStreaming);
			if (streamingMessage?.content) {
				props.onStream(streamingMessage.content);
			}
		}
	}, [messages, isStreaming, props.onStream]);

	const sendMessage = useCallback(
		async (messages: Message[]) => {
			if (!props.modeId) {
				throw new Error("No mode selected");
			}

			try {
				setIsLoading(true);

				// Get the last user message content
				const lastUserMessage = messages.filter(msg => msg.role === "user").pop();
				if (!lastUserMessage) {
					throw new Error("No user message found");
				}

				const result = await sendMessageMutation({
					threadId: props.threadId,
					modeId: props.modeId,
					message: lastUserMessage.content,
					parentMessageId: props.parentMessageId,
					branchId: props.branchId,
				});

				return result;
			} catch (error) {
				if (error instanceof Error) {
					props.onError?.(error);
				}
				throw error;
			} finally {
				setIsLoading(false);
			}
		},
		[props.modeId, props.threadId, props.parentMessageId, props.branchId, props.onError, sendMessageMutation],
	);

	const stopStreaming = useCallback(async () => {
		if (currentStreamingMessageRef.current) {
			try {
				await stopStreamingMutation({
					messageId: currentStreamingMessageRef.current,
				});
			} catch (error) {
				console.error("Failed to stop streaming:", error);
				if (error instanceof Error) {
					props.onError?.(error);
				}
			}
		}
	}, [stopStreamingMutation, props.onError]);

	return {
		sendMessage,
		stopStreaming,
		isLoading,
		isStreaming,
	};
}
