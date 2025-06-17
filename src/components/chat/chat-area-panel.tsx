import { useChat } from "@ai-sdk/react";
import { useNavigate } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { useOpenrouterKey } from "~/hooks/use-openrouter-key";
import { useCreateBranch } from "~/lib/query/chat";
import { useMessages, useRegenerateMessage } from "~/lib/query/messages";
import { useModes } from "~/lib/query/mode";
import { useCreateThread } from "~/lib/query/threads";
import { useUser } from "~/lib/query/user";
import { NEW_THREAD_ID } from "~/types/message";
import { ChatInput } from "./chat-input";
import { EmptyState } from "./empty-state";
import { MessageList } from "./message-list";

// @ts-expect-error - import.meta.env is not typed
const CHAT_API_URL = `${import.meta.env.VITE_CONVEX_HTTP_URL}/api/chat`;

type ChatAreaPanelProps = {
	threadId: Id<"threads">;
	onThreadClick: (threadId: Id<"threads">) => void;
	isStreaming?: boolean;
};

export function ChatAreaPanel(props: ChatAreaPanelProps) {
	const { threadId } = props;
	const navigate = useNavigate();
	const modes = useModes();
	const { data: user } = useUser();
	const { openrouterKey } = useOpenrouterKey(user?.id);
	const messagesFromDB = useMessages(threadId);
	const createBranch = useCreateBranch();
	const regenerateMessage = useRegenerateMessage();
	const createThread = useCreateThread();

	const isNewThread = threadId === NEW_THREAD_ID;

	const [selectedModeId, setSelectedModeId] = useState<Id<"modes">>();
	const [currentBranchId, setCurrentBranchId] = useState<string>();
	const [autoScroll, setAutoScroll] = useState(true);
	const [showOpenrouterDialog, setShowOpenrouterDialog] = useState(false);
	const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
	const [actualThreadId, setActualThreadId] = useState(
		isNewThread ? undefined : threadId,
	);

	const initialMessages = useMemo(
		() =>
			messagesFromDB?.map((msg) => ({
				id: msg._id,
				role: msg.role,
				content: msg.content,
			})) || [],
		[messagesFromDB],
	);

	const { messages, input, handleInputChange, handleSubmit, status, stop } =
		useChat({
			api: CHAT_API_URL,
			initialMessages,
			body: {
				modeId: selectedModeId,
				branchId: currentBranchId,
				parentMessageId: undefined,
				threadId: actualThreadId,
				openrouterKey,
				attachmentIds,
			},
			headers: {
				Authorization: `Bearer ${user?.token}`,
			},
			id: actualThreadId,
			onError: (error) => console.error("AI SDK streaming error:", error),
		});

	const isStreaming = status === "streaming";
	const displayMessages = messages.length > 0 ? messages : messagesFromDB;

	const checkOpenrouterKey = useCallback(() => {
		if (!openrouterKey?.trim()) {
			setShowOpenrouterDialog(true);
			return false;
		}
		return true;
	}, [openrouterKey]);

	const messagesList = useMemo(() => {
		if (messages.length === 0) {
			return (
				messagesFromDB?.map((msg) => ({
					...msg,
					attachmentIds: msg.attachmentIds || undefined,
					metadata: msg.metadata
						? {
								...msg.metadata,
								profileId: msg.metadata.profileId as Id<"profiles"> | undefined,
							}
						: undefined,
				})) ?? []
			);
		}

		return messages.map((msg) => {
			const isLastMessage = messages[messages.length - 1]?.id === msg.id;
			const isCurrentlyStreaming = isStreaming && isLastMessage;
			const msgData = msg.data as Record<string, unknown> | undefined;

			const reasoningPart = msg.parts?.find(
				(part) => part.type === "reasoning",
			);
			const hasReasoningContent =
				reasoningPart &&
				"reasoning" in reasoningPart &&
				reasoningPart.reasoning;

			const streamingStatus =
				!isCurrentlyStreaming || msg.role !== "assistant"
					? { isStreamingMessageContent: false, isStreamingReasoning: false }
					: reasoningPart && !hasReasoningContent
						? { isStreamingMessageContent: false, isStreamingReasoning: true }
						: {
								isStreamingMessageContent: !msg.content,
								isStreamingReasoning: false,
							};

			return {
				...msg,
				_id: msg.id as Id<"messages">,
				content: msg.content,
				role:
					msg.role === "user" || msg.role === "assistant"
						? msg.role
						: "assistant",
				senderId: msg.role === "user" ? user?.id || "" : "assistant",
				parts: msg.parts,
				attachmentIds: Array.isArray(msgData?.attachmentIds)
					? (msgData.attachmentIds as Id<"attachments">[])
					: undefined,
				metadata: {
					...(msgData?.metadata && typeof msgData.metadata === "object"
						? msgData.metadata
						: {}),
					isStreaming: isCurrentlyStreaming,
					...streamingStatus,
				},
				attachments: [],
			};
		});
	}, [messagesFromDB, messages, isStreaming, user?.id]);

	async function handleSendMessage() {
		if (
			!input.trim() ||
			isStreaming ||
			!selectedModeId ||
			!checkOpenrouterKey()
		) {
			return;
		}

		if (isNewThread) {
			try {
				const newThreadId = await createThread({ title: "New conversation" });
				setActualThreadId(newThreadId);
				navigate({ to: "/$threadId", params: { threadId: newThreadId } });
			} catch (error) {
				console.error("Failed to create thread:", error);
				return;
			}
		}

		setAutoScroll(true);
		handleSubmit();
		setAttachmentIds([]);
	}

	async function handleRegenerate(
		messageId: Id<"messages">,
		modeId: Id<"modes">,
	) {
		if (isNewThread || !checkOpenrouterKey()) return;

		try {
			setAutoScroll(true);
			await regenerateMessage({
				messageId,
				modeId,
				openrouterKey: openrouterKey || undefined,
			});
		} catch (error) {
			console.error("Failed to regenerate message:", error);
		}
	}

	async function handleCreateBranch(messageId: Id<"messages">) {
		try {
			const result = await createBranch({
				messageId,
				useCondensedHistory: false,
				openrouterKey: openrouterKey || "",
			});
			if (result.threadId) {
				navigate({ to: "/$threadId", params: { threadId: result.threadId } });
			}
		} catch (error) {
			console.error("Failed to create branch:", error);
		}
	}

	useEffect(() => {
		if (!selectedModeId && modes?.[0]?._id) {
			setSelectedModeId(modes[0]._id);
		}
	}, [modes, selectedModeId]);

	useEffect(() => {
		setActualThreadId(isNewThread ? undefined : threadId);
	}, [threadId, isNewThread]);

	return (
		<div className="flex flex-col h-full bg-background">
			<div className="flex-1 min-h-0">
				{!displayMessages?.length ? (
					<EmptyState userName={user?.firstName ?? undefined} />
				) : (
					<MessageList
						messages={messagesList}
						userId={user?.id || ""}
						threadId={threadId}
						currentBranchId={currentBranchId}
						autoScroll={autoScroll}
						isLoading={isStreaming && messages.length > 0}
						onAutoScrollChange={setAutoScroll}
						onRegenerate={handleRegenerate}
						onCreateBranch={handleCreateBranch}
						onBranchSwitch={setCurrentBranchId}
					/>
				)}
			</div>
			<div className="flex-shrink-0">
				<ChatInput
					message={input}
					onMessageChange={(message) =>
						handleInputChange({
							target: { value: message },
						} as React.ChangeEvent<HTMLInputElement>)
					}
					onSendMessage={handleSendMessage}
					onStopStreaming={stop}
					isLoading={isStreaming && messages.length > 0}
					isStreaming={isStreaming && messages.length > 0}
					selectedModeId={selectedModeId}
					onModeSelect={setSelectedModeId}
					onAttachFiles={setAttachmentIds}
				/>
			</div>

			<Dialog
				open={showOpenrouterDialog}
				onOpenChange={setShowOpenrouterDialog}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>OpenRouter API Key Required</DialogTitle>
						<DialogDescription>
							OpenRouter API key is required to use OpenRouter models. Please
							add your API key in the account settings.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button onClick={() => setShowOpenrouterDialog(false)}>OK</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
