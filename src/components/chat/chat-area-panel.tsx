import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import type { Id } from "convex/_generated/dataModel";
import { useUser } from "~/lib/query/user";
import { useProfileOptions } from "~/lib/query/profile";
import { useNavigate } from "@tanstack/react-router";
import { useMessages } from "~/lib/query/messages";
import { useCreateThread, useThread } from "~/lib/query/threads";

type Message = {
	_id: Id<"messages">;
	threadId: Id<"threads">;
	senderId: string;
	content: string;
	type: string;
	metadata?: {
		status?: string;
		model?: string;
		error?: string;
	};
};

type ChatAreaPanelProps = {
	threadId: Id<"threads">;
	onThreadClick: (threadId: Id<"threads">) => void;
};

export function ChatAreaPanel(props: ChatAreaPanelProps) {
	const threadId = props.threadId;
	const navigate = useNavigate();

	const [message, setMessage] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);

	const thread = useThread(threadId);
	const { data: user } = useUser();
	const profiles = useProfileOptions();
	const defaultProfile = profiles?.[0];

	const messages = useMessages(threadId);

	const createThread = useCreateThread();

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, []);

	useEffect(() => {
		if (scrollRef.current && messages?.length) {
			scrollRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages?.length]);

	async function handleSendMessage(e: React.FormEvent) {
		e.preventDefault();

		if (!message.trim() || !user?.id || !defaultProfile) return;

		try {
			let currentThreadId: Id<"threads">;
			if (!threadId) {
				currentThreadId = await createThread({
					title: "New Chat",
					participantIds: [user.id],
				});

				navigate({ to: "/$threadId", params: { threadId: currentThreadId } });
			} else {
				currentThreadId = threadId;
			}

			setMessage("");
		} catch (error) {
			console.error("Error sending message:", error);
		}
	}

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
						messages?.map((msg: Message) => (
							<MessageBubble
								key={msg._id}
								message={msg}
								userId={user?.id || ""}
							/>
						))
					)}

					<div ref={scrollRef} />
				</div>
			</ScrollArea>

			<form onSubmit={handleSendMessage} className="mt-4 border-t pt-4">
				<div className="flex gap-2">
					<Textarea
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder="Type a message..."
						className="min-h-[60px] flex-grow resize-none"
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								handleSendMessage(e);
							}
						}}
					/>
					<Button type="submit" disabled={!message.trim()}>
						Send
					</Button>
				</div>
			</form>
		</div>
	);
}

function MessageBubble({
	message,
	userId,
}: { message: Message; userId: string }) {
	const isUser = message.senderId === userId;
	const isGenerating = message.metadata?.status === "generating";
	const isError = message.metadata?.status === "error";

	return (
		<div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
			<div
				className={`rounded-lg p-3 max-w-[80%] ${
					isUser
						? "bg-primary text-primary-foreground"
						: isError
							? "bg-destructive text-destructive-foreground"
							: "bg-muted"
				}`}
			>
				<div className="whitespace-pre-wrap break-words">
					{message.content || (
						<span className="text-muted-foreground">
							{isGenerating ? "Generating response..." : "No content"}
						</span>
					)}
				</div>

				{message.metadata?.model && (
					<div className="mt-1 text-xs opacity-70">
						{message.metadata.model}
					</div>
				)}

				{isGenerating && (
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
