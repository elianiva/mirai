import { useNavigate } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { GitBranch, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
	useMessages,
	useRegenerateMessage,
	useRemoveMessage,
	useSendMessage,
} from "~/lib/query/messages";
import { useModes } from "~/lib/query/mode";
import { useThread } from "~/lib/query/threads";
import { useUser } from "~/lib/query/user";
import { cn } from "~/lib/utils";
import { ChatInput } from "./chat-input";
import { MarkdownRenderer } from "./markdown-renderer";
import { ModeSelector } from "./mode-selector";
import { BranchIndicator } from "./branch-indicator";
import { BranchTimeline } from "./branch-timeline";
import { useMutation } from "convex/react";
import { api } from "~/../convex/_generated/api";
import { EmptyState } from "./empty-state";

type ChatAreaPanelProps = {
	threadId: Id<"threads">;
	onThreadClick: (threadId: Id<"threads">) => void;
};

export function ChatAreaPanel(props: ChatAreaPanelProps) {
	const threadId = props.threadId;
	const navigate = useNavigate();
	const modes = useModes();
	const [selectedModeId, setSelectedModeId] = useState<Id<"modes">>();
	const [currentBranchId, setCurrentBranchId] = useState<string>();

	if (!selectedModeId && modes?.[0]?._id) {
		setSelectedModeId(modes[0]._id);
	}

	const [message, setMessage] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [autoScroll, setAutoScroll] = useState(true);
	const prevMessageCountRef = useRef(0);
	const isInitialMount = useRef(true);

	const thread = useThread(threadId);
	const { data: user } = useUser();

	const sendMessage = useSendMessage();
	const messages = useMessages(threadId);
	const regenerateMessage = useRegenerateMessage();
	const createBranch = useMutation(api.chat.createBranch);

	async function handleSendMessage() {
		if (!message.trim() || isLoading || !selectedModeId) {
			return;
		}

		setIsLoading(true);
		setAutoScroll(true);
		try {
			const result = await sendMessage({
				threadId: threadId === "new" ? undefined : threadId,
				modeId: selectedModeId,
				message: message.trim(),
				branchId: currentBranchId,
			});

			if (threadId === "new" && result.threadId) {
				navigate({ to: "/$threadId", params: { threadId: result.threadId } });
			}

			if (result.branchId) {
				setCurrentBranchId(result.branchId);
			}

			setMessage("");
		} catch (error) {
			console.error("Failed to send message:", error);
		} finally {
			setIsLoading(false);
		}
	}

	async function handleRegenerate(
		messageId: Id<"messages">,
		modeId: Id<"modes">,
	) {
		if (!threadId || threadId === "new") return;

		setIsLoading(true);
		setAutoScroll(true);
		try {
			await regenerateMessage({
				messageId: messageId,
				modeId: modeId,
			});
		} catch (error) {
			console.error("Failed to regenerate message:", error);
		} finally {
			setIsLoading(false);
		}
	}

	// Scroll to bottom when new messages arrive or autoScroll is enabled
	useEffect(() => {
		const currentMessageCount = messages?.length || 0;
		const hasNewMessage = currentMessageCount > prevMessageCountRef.current;
		const lastMessage = messages?.[messages.length - 1];
		const isStreaming = lastMessage?.metadata?.isStreaming;

		// Scroll on initial mount, when new messages arrive, or when streaming
		if (
			(isInitialMount.current && currentMessageCount > 0) ||
			(hasNewMessage && autoScroll) ||
			(isStreaming && autoScroll)
		) {
			// Use requestAnimationFrame to ensure DOM has updated
			requestAnimationFrame(() => {
				const scrollContainer = scrollAreaRef.current?.querySelector(
					'[data-slot="scroll-area-viewport"]',
				) as HTMLElement | null;

				if (scrollContainer) {
					scrollContainer.scrollTop = scrollContainer.scrollHeight;
				}
			});

			if (isInitialMount.current) {
				isInitialMount.current = false;
			}
		}

		prevMessageCountRef.current = currentMessageCount;
	}, [messages, autoScroll]);

	// Handle scroll detection
	useEffect(() => {
		const scrollContainer = scrollAreaRef.current?.querySelector(
			'[data-slot="scroll-area-viewport"]',
		) as HTMLElement | null;

		if (!scrollContainer) return;

		function handleScroll() {
			if (!scrollContainer) return;
			const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
			const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
			setAutoScroll(isAtBottom);
		}

		scrollContainer.addEventListener("scroll", handleScroll);
		return () => scrollContainer.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<div className="flex flex-col h-full bg-background">
			{threadId !== "new" && (
				<BranchTimeline
					threadId={threadId}
					currentBranchId={currentBranchId}
					onBranchSwitch={setCurrentBranchId}
				/>
			)}
			<div className="flex-1 min-h-0">
				{!messages?.length ? (
					<EmptyState userName={user?.firstName ?? undefined} />
				) : (
					<ScrollArea ref={scrollAreaRef} className="h-full w-full">
						<div className="relative px-4 space-y-4 max-w-2xl mx-auto py-4">
							{messages?.map((msg, index) => (
								<div key={msg._id}>
									<MessageBubble
										message={msg}
										userId={user?.id || ""}
										threadId={threadId}
										onRegenerate={handleRegenerate}
										onCreateBranch={async (parentMessageId) => {
											setIsLoading(true);
											try {
												const result = await createBranch({
													parentMessageId,
												});

												if (result.branchId) {
													setCurrentBranchId(result.branchId);
												}
											} catch (error) {
												console.error("Failed to create branch:", error);
											} finally {
												setIsLoading(false);
											}
										}}
									/>
									{/* Show branch indicator after assistant messages */}
									{msg.type === "assistant" && index < messages.length - 1 && (
										<div className="ml-4 mt-1">
											<BranchIndicator
												messageId={msg._id}
												threadId={threadId}
												currentBranchId={currentBranchId}
												onBranchSwitch={setCurrentBranchId}
											/>
										</div>
									)}
								</div>
							))}
							<div ref={messagesEndRef} className="h-4" />
						</div>
					</ScrollArea>
				)}
			</div>
			<div className="flex-shrink-0">
				<ChatInput
					message={message}
					onMessageChange={setMessage}
					onSendMessage={handleSendMessage}
					isLoading={isLoading}
					selectedModeId={selectedModeId}
					onModeSelect={setSelectedModeId}
				/>
			</div>
		</div>
	);
}

type MessageBubbleProps = {
	message: {
		_id: Id<"messages">;
		content: string;
		type: string;
		senderId: string;
		metadata?: {
			isStreaming?: boolean;
			modeId?: string;
			profileId?: Id<"profiles">;
		};
	};
	userId: string;
	threadId: Id<"threads">;
	onRegenerate: (messageId: Id<"messages">, modeId: Id<"modes">) => void;
	onCreateBranch?: (parentMessageId: Id<"messages">) => void;
};

function MessageBubble(props: MessageBubbleProps) {
	const isUser = props.message.type === "user";
	const isStreaming = props.message.metadata?.isStreaming;
	const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
	const [selectedModeId, setSelectedModeId] = useState<Id<"modes">>(
		props.message.metadata?.modeId as Id<"modes">,
	);
	const removeMessage = useRemoveMessage();

	async function handleRemove() {
		try {
			await removeMessage({ id: props.message._id });
		} catch (error) {
			console.error("Failed to remove message:", error);
		}
	}

	function handleRegenerate() {
		if (selectedModeId) {
			props.onRegenerate(props.message._id, selectedModeId);
			setShowRegenerateDialog(false);
		}
	}

	return (
		<div
			className={`group flex flex-col ${isUser ? "items-end" : "items-start"} w-full`}
		>
			{isUser ? (
				<div className="prose prose-sm relative px-4 py-2 rounded-md bg-primary text-background whitespace-pre-wrap break-words text-base font-serif">
					{props.message.content}
				</div>
			) : (
				<div className="w-full">
					{props.message.content ? (
						<MarkdownRenderer
							content={props.message.content}
							isStreaming={isStreaming}
						/>
					) : (
						<span className="text-muted-foreground italic text-sm font-serif">
							{isStreaming ? "Generating response..." : "No content"}
						</span>
					)}

					{isStreaming && !props.message.content && (
						<div className="mt-2 flex items-center gap-1">
							<div className="size-1.5 rounded-full bg-current opacity-75 animate-pulse" />
							<div className="size-1.5 rounded-full bg-current opacity-75 animate-pulse [animation-delay:0.2s]" />
							<div className="size-1.5 rounded-full bg-current opacity-75 animate-pulse [animation-delay:0.4s]" />
						</div>
					)}
				</div>
			)}

			{!isStreaming && (
				<div
					className={cn(
						"mt-1 flex opacity-20 group-hover:opacity-100 transition-opacity",
						{
							"justify-end": isUser,
							"justify-start": !isUser,
						},
					)}
				>
					{!isUser && (
						<>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 px-2 text-xs"
								onClick={() => setShowRegenerateDialog(true)}
							>
								<RefreshCw className="size-3" />
							</Button>
							{props.onCreateBranch && (
								<Button
									variant="ghost"
									size="icon"
									className="h-7 px-2 text-xs"
									onClick={() => props.onCreateBranch?.(props.message._id)}
								>
									<GitBranch className="size-3" />
								</Button>
							)}
						</>
					)}
					<Button
						variant="ghost"
						size="icon"
						className="h-7 px-2 text-xs text-destructive hover:text-destructive"
						onClick={handleRemove}
					>
						<Trash2 className="size-3" />
					</Button>
				</div>
			)}

			<Dialog
				open={showRegenerateDialog}
				onOpenChange={setShowRegenerateDialog}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Regenerate Response</DialogTitle>
						<DialogDescription>
							Select a mode to regenerate this response with.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<ModeSelector
							selectedModeId={selectedModeId}
							onModeSelect={setSelectedModeId}
						/>
						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => setShowRegenerateDialog(false)}
							>
								Cancel
							</Button>
							<Button onClick={handleRegenerate}>Regenerate</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
