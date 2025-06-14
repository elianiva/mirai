import { useNavigate } from "@tanstack/react-router";
import type { Id, Doc } from "convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { useMessages } from "~/lib/query/messages";
import { useModes } from "~/lib/query/mode";
import { useUser } from "~/lib/query/user";
import { useChat } from "@ai-sdk/react";
import type { Message } from "ai";
import { ChatInput } from "./chat-input";
import { useMutation, useQuery } from "convex/react";
import { api } from "~/../convex/_generated/api";
import { EmptyState } from "./empty-state";
import { MessageList } from "./message-list";
import { useOpenrouterKey } from "~/hooks/use-openrouter-key";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";

type MessageWithAttachments = Doc<"messages"> & {
	attachments?: { url: string; filename: string; contentType: string }[];
};

type Env = {
	env: {
		VITE_CONVEX_HTTP_URL: string;
	};
};

const CHAT_API_URL = `${(import.meta as unknown as Env).env.VITE_CONVEX_HTTP_URL}/api/chat`;
const NEW_THREAD_ID = "new";
const OPENROUTER_KEY_ERROR_MESSAGE =
	"OpenRouter API key is required to use OpenRouter models. Please add your API key in the account settings.";

type ChatAreaPanelProps = {
	threadId: Id<"threads">;
	onThreadClick: (threadId: Id<"threads">) => void;
	isStreaming?: boolean;
};

function validateOpenrouterKey(openrouterKey: string | null): boolean {
	return !!openrouterKey?.trim();
}

export function ChatAreaPanel(props: ChatAreaPanelProps) {
	const { threadId } = props;
	const navigate = useNavigate();
	const modes = useModes();
	const { data: user } = useUser();
	const { openrouterKey } = useOpenrouterKey(user?.id);
	const messagesFromDB = useMessages(threadId);
	const createBranch = useMutation(api.chat.createBranch);
	const regenerateMessage = useMutation(api.chat.regenerateMessage);

	const [selectedModeId, setSelectedModeId] = useState<Id<"modes">>();
	const [currentBranchId, setCurrentBranchId] = useState<string>();
	const [useConvexFallback, setUseConvexFallback] = useState(false);
	const [autoScroll, setAutoScroll] = useState(true);
	const [showOpenrouterDialog, setShowOpenrouterDialog] = useState(false);
	const [attachmentIds, setAttachmentIds] = useState<string[]>([]);

	function showOpenrouterKeyError(): void {
		setShowOpenrouterDialog(true);
	}

	useEffect(() => {
		if (!selectedModeId && modes?.[0]?._id) {
			setSelectedModeId(modes[0]._id);
		}
	}, [modes, selectedModeId]);

	const initialMessages: Message[] =
		messagesFromDB?.map((msg) => ({
			id: msg._id,
			role: msg.type as "user" | "assistant",
			content: msg.content,
		})) || [];

	const isNewThread = threadId === NEW_THREAD_ID;

	const { messages, input, handleInputChange, handleSubmit, status, stop } =
		useChat({
			api: CHAT_API_URL,
			initialMessages,
			body: {
				modeId: selectedModeId,
				branchId: currentBranchId,
				parentMessageId: undefined,
				threadId: isNewThread ? undefined : threadId,
				openrouterKey,
				attachmentIds: attachmentIds,
			},
			headers: {
				Authorization: `Bearer ${user?.token}`,
			},
			id: isNewThread ? undefined : threadId,
			onError: (error) => {
				console.error("AI SDK streaming error:", error);
				setUseConvexFallback(true);
			},
		});

	// Check if any messages have attachments - if so, we should use Convex messages to get attachment data
	const hasAttachmentsInDB =
		messagesFromDB?.some(
			(msg) => msg.attachmentIds && msg.attachmentIds.length > 0,
		) || false;

	const displayMessages =
		useConvexFallback || hasAttachmentsInDB
			? messagesFromDB
			: messages.length > 0
				? messages
				: messagesFromDB;

	const currentIsLoading =
		useConvexFallback || hasAttachmentsInDB ? false : status === "streaming";

	useEffect(() => {
		if (messages.length > 0 && useConvexFallback) {
			setUseConvexFallback(false);
		}
	}, [messages.length, useConvexFallback]);

	function handleMessageChange(message: string) {
		handleInputChange({
			target: { value: message },
		} as React.ChangeEvent<HTMLInputElement>);
	}

	async function handleSendMessage() {
		if (!input.trim() || currentIsLoading || !selectedModeId) {
			return;
		}

		if (!validateOpenrouterKey(openrouterKey)) {
			showOpenrouterKeyError();
			return;
		}

		setAutoScroll(true);
		setUseConvexFallback(false);

		// Attachments are already uploaded by ChatInput component

		// Create a custom submit with attachmentIds
		const customSubmit = (e?: React.FormEvent) => {
			if (e) e.preventDefault();

			// Update the body with the attachmentIds
			const submitOptions = {
				body: {
					modeId: selectedModeId,
					branchId: currentBranchId,
					parentMessageId: undefined,
					threadId: isNewThread ? undefined : threadId,
					openrouterKey,
					attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
				},
			};

			handleSubmit(e, submitOptions);
		};

		customSubmit();

		// Clear the attachment IDs after sending
		setAttachmentIds([]);
	}

	async function handleRegenerate(
		messageId: Id<"messages">,
		modeId: Id<"modes">,
	) {
		if (isNewThread) return;

		if (!validateOpenrouterKey(openrouterKey)) {
			showOpenrouterKeyError();
			return;
		}

		try {
			setAutoScroll(true);
			setUseConvexFallback(true);
			await regenerateMessage({
				messageId,
				modeId,
				openrouterKey: openrouterKey || undefined,
			});
		} catch (error) {
			console.error("Failed to regenerate message:", error);
		}
	}

	async function handleCreateBranch(parentMessageId: Id<"messages">) {
		try {
			const result = await createBranch({
				parentMessageId,
			});

			if (result.threadId) {
				navigate({ to: "/$threadId", params: { threadId: result.threadId } });
			}
		} catch (error) {
			console.error("Failed to create branch:", error);
		}
	}

	// Transform messages to include attachment data
	const transformedMessages =
		messagesFromDB?.map((msg) => {
			const transformed = {
				...msg,
				metadata: msg.metadata
					? {
							...msg.metadata,
							profileId: msg.metadata.profileId as Id<"profiles"> | undefined,
						}
					: undefined,
			};

			// For now, we'll handle attachment fetching in the message components
			// This could be optimized by fetching all attachments at once
			return transformed;
		}) || [];

	return (
		<div className="flex flex-col h-full bg-background">
			<div className="flex-1 min-h-0">
				{!displayMessages?.length ? (
					<EmptyState userName={user?.firstName ?? undefined} />
				) : (
					<MessageList
						messages={
							useConvexFallback || hasAttachmentsInDB
								? transformedMessages.map((msg) => ({
										...msg,
										attachmentIds: msg.attachmentIds || undefined,
									}))
								: messages.map((msg) => {
										const isCurrentlyStreaming =
											status === "streaming" &&
											messages[messages.length - 1]?.id === msg.id;
										const hasReasoningParts = msg.parts?.some(
											(part) =>
												typeof part === "object" &&
												part !== null &&
												"type" in part &&
												part.type === "reasoning",
										);

										let isStreamingMessageContent = false;
										let isStreamingReasoning = false;

										if (isCurrentlyStreaming && msg.role === "assistant") {
											if (hasReasoningParts) {
												const reasoningPart = msg.parts?.find(
													(part) =>
														typeof part === "object" &&
														part !== null &&
														"type" in part &&
														part.type === "reasoning",
												);
												const hasReasoningContent =
													reasoningPart &&
													"reasoning" in reasoningPart &&
													reasoningPart.reasoning;

												if (!hasReasoningContent) {
													isStreamingReasoning = true;
												} else if (!msg.content) {
													isStreamingMessageContent = true;
												}
											} else if (!msg.content) {
												isStreamingMessageContent = true;
											}
										}

										return {
											_id: msg.id as Id<"messages">,
											content: msg.content,
											type: msg.role,
											senderId:
												msg.role === "user" ? user?.id || "" : "assistant",
											parts: msg.parts,
											metadata: {
												isStreaming: isCurrentlyStreaming,
												isStreamingMessageContent,
												isStreamingReasoning,
											},
											attachments: [],
										};
									})
						}
						userId={user?.id || ""}
						threadId={threadId}
						currentBranchId={currentBranchId}
						autoScroll={autoScroll}
						isLoading={currentIsLoading}
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
					onMessageChange={handleMessageChange}
					onSendMessage={handleSendMessage}
					onStopStreaming={stop}
					isLoading={currentIsLoading}
					isStreaming={currentIsLoading}
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
							{OPENROUTER_KEY_ERROR_MESSAGE}
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
