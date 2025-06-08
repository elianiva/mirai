import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { Id } from "convex/_generated/dataModel";
import { useUser } from "~/lib/query/user";
import { useNavigate } from "@tanstack/react-router";
import { useCreateThread, useThread } from "~/lib/query/threads";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { ChatInput } from "./chat-input";

type ChatAreaPanelProps = {
	threadId: Id<"threads">;
	onThreadClick: (threadId: Id<"threads">) => void;
	selectedModeId?: Id<"modes">;
	onModeSelect?: (modeId: Id<"modes">) => void;
};

export function ChatAreaPanel(props: ChatAreaPanelProps) {
	const threadId = props.threadId;
	const navigate = useNavigate();

	const [message, setMessage] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);

	const thread = useThread(threadId);
	const { data: user } = useUser();

	const createThread = useCreateThread();

	const { messages, isLoading, status } =
		useChat({
			api: "/api/chat",
		});

	async function handleSendMessage() {
		if (!message.trim() || isLoading || !props.selectedModeId) {
			return;
		}

		const thread = await createThread({ message });
		navigate({ to: "/$threadId", params: { threadId: thread } });
	}

	useEffect(() => {
		if (scrollRef.current && messages?.length) {
			scrollRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages?.length]);

	return (
		<div className="flex h-full flex-col p-4">
			<ScrollArea className="flex-grow">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold">
						{thread?.title || "New Chat"}
					</h2>
				</div>

				<div className="space-y-4">
					{!messages?.length ? (
						<div className="flex h-32 items-center justify-center text-muted-foreground">
							Start a conversation by sending a message
						</div>
					) : (
						<>
							{messages?.map((msg: UIMessage) => (
								<MessageBubble
									key={msg.id}
									message={msg}
									status={status}
									userId={user?.id || ""}
								/>
							))}
						</>
					)}

					<div ref={scrollRef} />
				</div>
			</ScrollArea>

			<ChatInput
				message={message}
				onMessageChange={setMessage}
				onSendMessage={handleSendMessage}
				isLoading={isLoading}
				selectedModeId={props.selectedModeId}
				onModeSelect={props.onModeSelect}
			/>
		</div>
	);
}

type MessageBubbleProps = {
	message: UIMessage;
	userId: string;
	status: "error" | "submitted" | "streaming" | "ready";
};

function MessageBubble(props: MessageBubbleProps) {
	const isUser = props.message.role === "user";

	return (
		<div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
			<div
				className={`rounded-lg p-3 max-w-[80%] ${
					isUser
						? "bg-primary text-primary-foreground"
						: props.status === "error"
							? "bg-destructive text-destructive-foreground"
							: "bg-muted"
				}`}
			>
				<div className="whitespace-pre-wrap break-words">
					{props.message.content || (
						<span className="text-muted-foreground">
							{props.status === "streaming"
								? "Generating response..."
								: "No content"}
						</span>
					)}
				</div>

				{props.status === "streaming" && (
					<div className="mt-2 flex items-center">
						<div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
						<div className="ml-1 h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:0.2s]" />
						<div className="ml-1 h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:0.4s]" />
					</div>
				)}
			</div>
		</div>
	);
}
