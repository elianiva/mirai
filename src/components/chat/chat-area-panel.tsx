import { useNavigate } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { useState } from "react";
import {
	useMessages,
	useRegenerateMessage,
	useSendMessage,
} from "~/lib/query/messages";
import { useModes } from "~/lib/query/mode";
import { useUser } from "~/lib/query/user";
import { useChat } from "~/lib/hooks/use-chat";
import { ChatInput } from "./chat-input";
import { BranchTimeline } from "./branch-timeline";
import { useMutation } from "convex/react";
import { api } from "~/../convex/_generated/api";
import { EmptyState } from "./empty-state";
import { MessageList } from "./message-list";
import { retrieveAndDecrypt } from "~/lib/utils/crypto";

type ChatAreaPanelProps = {
	threadId: Id<"threads">;
	onThreadClick: (threadId: Id<"threads">) => void;
	isStreaming?: boolean;
	onStopStreaming: () => void;
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
	const [autoScroll, setAutoScroll] = useState(true);

	const { data: user } = useUser();
	const { stopStreaming } = useChat({
		modeId: selectedModeId,
		threadId: threadId !== "new" ? threadId : undefined,
		branchId: currentBranchId,
	});

	const sendMessage = useSendMessage();
	const messages = useMessages(threadId);
	const regenerateMessage = useRegenerateMessage();
	const createBranch = useMutation(api.chat.createBranch);

	async function handleSendMessage(openrouterKey?: string) {
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
				openrouterKey,
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
			let openrouterKey: string | null = null;
			if (user?.id) {
				try {
					openrouterKey = await retrieveAndDecrypt(user.id);
				} catch (error) {
					console.debug("No OpenRouter key found or failed to decrypt");
				}
			}

			await regenerateMessage({
				messageId: messageId,
				modeId: modeId,
				openrouterKey: openrouterKey || undefined,
			});
		} catch (error) {
			console.error("Failed to regenerate message:", error);
		} finally {
			setIsLoading(false);
		}
	}

	async function handleCreateBranch(parentMessageId: Id<"messages">) {
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
	}

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
					<MessageList
						messages={messages}
						userId={user?.id || ""}
						threadId={threadId}
						currentBranchId={currentBranchId}
						autoScroll={autoScroll}
						onAutoScrollChange={setAutoScroll}
						onRegenerate={handleRegenerate}
						onCreateBranch={handleCreateBranch}
						onBranchSwitch={setCurrentBranchId}
					/>
				)}
			</div>
			<div className="flex-shrink-0">
				<ChatInput
					message={message}
					onMessageChange={setMessage}
					onSendMessage={handleSendMessage}
					onStopStreaming={stopStreaming}
					isLoading={isLoading}
					isStreaming={props.isStreaming ?? false}
					selectedModeId={selectedModeId}
					onModeSelect={setSelectedModeId}
					userId={user?.id}
				/>
			</div>
		</div>
	);
}
