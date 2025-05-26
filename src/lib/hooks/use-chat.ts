import { useCallback, useState } from "react";
import type { Id } from "convex/_generated/dataModel";
import type { Message } from "ai";

type UseChatProps = {
	modeId?: Id<"modes">;
	onError?: (error: Error) => void;
	onStream?: (content: string) => void;
};

export function useChat(props: UseChatProps) {
	const [isLoading, setIsLoading] = useState(false);

	const sendMessage = useCallback(
		async (messages: Message[]) => {
			if (!props.modeId) {
				throw new Error("No mode selected");
			}

			try {
				setIsLoading(true);
				const response = await fetch("/api/chat", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						messages,
						modeId: props.modeId,
					}),
				});

				if (!response.ok) {
					throw new Error("Failed to send message");
				}

				const data = response.body;
				if (!data) {
					throw new Error("No response data");
				}

				const reader = data.getReader();
				const decoder = new TextDecoder();
				let done = false;
				let content = "";

				while (!done) {
					const { value, done: doneReading } = await reader.read();
					done = doneReading;
					const chunk = decoder.decode(value);
					content += chunk;

					// Send chunk for real-time updates
					if (chunk && props.onStream) {
						props.onStream(content);
					}
				}

				return content;
			} catch (error) {
				if (error instanceof Error) {
					props.onError?.(error);
				}
				throw error;
			} finally {
				setIsLoading(false);
			}
		},
		[props.modeId, props.onError, props.onStream],
	);

	return {
		sendMessage,
		isLoading,
	};
}
