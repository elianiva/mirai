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
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { Send, Paperclip, Mic, MoreHorizontal } from "lucide-react";
import { ModeSelector } from "./mode-selector";
import { ProfileSelector } from "./profile-selector";

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
	selectedModeId?: Id<"modes">;
	selectedProfileId?: Id<"profiles">;
	onModeSelect?: (modeId: Id<"modes">) => void;
	onProfileSelect?: (profileId: Id<"profiles">) => void;
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

	const createThread = useCreateThread();

	const { messages, handleSubmit, handleInputChange, isLoading, status } =
		useChat({
			api: "/api/chat",
		});

	async function handleSendMessage() {
		if (
			!message.trim() ||
			isLoading ||
			!props.selectedModeId ||
			!props.selectedProfileId
		)
			return;

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

			<div className="mt-4 px-4">
				{/* Enhanced Input Area */}
				<div className="relative mx-auto max-w-4xl rounded-2xl border bg-background shadow-sm transition-all duration-200 focus-within:shadow-md">
					{/* Input Container */}
					<div className="flex items-center gap-3 p-4">
						{/* Left Actions */}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
						>
							<Paperclip className="h-4 w-4" />
						</Button>

						{/* Text Input */}
						<div className="flex-1">
							<Textarea
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder="Type your task here..."
								className="min-h-[20px] max-h-32 resize-none border-0 bg-transparent p-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										handleSendMessage();
									}
								}}
							/>
						</div>

						{/* Right Actions */}
						<div className="flex items-center gap-2">
							{message.trim() ? (
								<Button
									type="button"
									onClick={handleSendMessage}
									disabled={
										isLoading ||
										!props.selectedModeId ||
										!props.selectedProfileId
									}
									size="sm"
									className="h-8 w-8 rounded-full p-0"
								>
									<Send className="h-4 w-4" />
								</Button>
							) : (
								<>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
									>
										<Mic className="h-4 w-4" />
									</Button>
								</>
							)}
						</div>
					</div>

					{/* Bottom Section with Mode Display and Helper Text */}
					<div className="border-t bg-muted/30 px-4 py-2">
						<div className="flex items-center justify-between text-xs text-muted-foreground">
							<div className="flex items-center gap-2">
								<ModeSelector
									selectedModeId={props.selectedModeId}
									onModeSelect={props.onModeSelect || (() => {})}
								/>
								<ProfileSelector
									selectedProfileId={props.selectedProfileId}
									onProfileSelect={props.onProfileSelect || (() => {})}
								/>
							</div>
							<div className="flex items-center gap-2">
								{!props.selectedModeId && (
									<span className="text-destructive">Please select a mode</span>
								)}
								{!props.selectedProfileId && (
									<span className="text-destructive">
										Please select a profile
									</span>
								)}
								{isLoading && (
									<div className="flex items-center gap-1">
										<div className="h-1 w-1 rounded-full bg-current animate-pulse" />
										<div className="h-1 w-1 rounded-full bg-current animate-pulse [animation-delay:0.2s]" />
										<div className="h-1 w-1 rounded-full bg-current animate-pulse [animation-delay:0.4s]" />
										<span>Generating...</span>
									</div>
								)}
							</div>
						</div>
						<div className="mt-1 text-xs text-muted-foreground">
							(@ to add context, / to switch modes, hold shift to drag in
							files/images)
						</div>
					</div>
				</div>
			</div>
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
