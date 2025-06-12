import { useNavigate } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { useMessages } from "~/lib/query/messages";
import { useModes } from "~/lib/query/mode";
import { useUser } from "~/lib/query/user";
import { useChat } from "@ai-sdk/react";
import type { Message } from "ai";
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

	const [autoScroll, setAutoScroll] = useState(true);
	const [openrouterKey, setOpenrouterKey] = useState<string | null>(null);

	const { data: user } = useUser();
	const messagesFromDB = useMessages(threadId);
	const createBranch = useMutation(api.chat.createBranch);

	// Load OpenRouter key
	useEffect(() => {
		async function loadOpenrouterKey() {
			if (!user?.id) return;

			try {
				const decryptedKey = await retrieveAndDecrypt(user.id);
				setOpenrouterKey(decryptedKey);
			} catch (error) {
				console.debug("No OpenRouter key found or failed to decrypt");
				setOpenrouterKey(null);
			}
		}

		loadOpenrouterKey();
	}, [user?.id]);

	// Convert DB messages to AI SDK format
	const initialMessages: Message[] = messagesFromDB?.map((msg) => ({
		id: msg._id,
		role: msg.type as "user" | "assistant",
		content: msg.content,
	})) || [];

	// Use AI SDK's useChat hook
	const {
		messages,
		input,
		handleInputChange,
		handleSubmit,
		isLoading,
		reload,
		stop,
	} = useChat({
		api: `${import.meta.env.VITE_CONVEX_URL}/api/chat`,
		initialMessages,
		body: {
			modeId: selectedModeId,
			branchId: currentBranchId,
			threadId: threadId !== "new" ? threadId : undefined,
			openrouterKey,
		},
		id: threadId === "new" ? undefined : threadId,
	});

	// Wrapper function to handle input change with string parameter
	const handleMessageChange = (message: string) => {
		handleInputChange({ target: { value: message } } as React.ChangeEvent<HTMLInputElement>);
	};

	async function handleSendMessage() {
		if (!input.trim() || isLoading || !selectedModeId) {
			return;
		}

		if (!openrouterKey || openrouterKey.trim() === "") {
			alert("OpenRouter API key is required to use OpenRouter models. Please add your API key in the account settings.");
			return;
		}

		setAutoScroll(true);
		
		// The useChat hook will handle the submission
		handleSubmit();
	}

	async function handleRegenerate(
		messageId: Id<"messages">,
		modeId: Id<"modes">,
	) {
		if (!threadId || threadId === "new") return;

		if (!openrouterKey || openrouterKey.trim() === "") {
			alert("OpenRouter API key is required to use OpenRouter models. Please add your API key in the account settings.");
			return;
		}

		setAutoScroll(true);
		
		// Use the reload function from useChat hook
		reload();
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
						messages={messagesFromDB?.map(msg => ({
							...msg,
							metadata: msg.metadata ? {
								...msg.metadata,
								profileId: msg.metadata.profileId as Id<"profiles"> | undefined
							} : undefined
						})) || []}
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
					message={input}
					onMessageChange={handleMessageChange}
					onSendMessage={handleSendMessage}
					onStopStreaming={stop}
					isLoading={isLoading}
					isStreaming={isLoading}
					selectedModeId={selectedModeId}
					onModeSelect={setSelectedModeId}
					userId={user?.id}
				/>
			</div>
		</div>
	);
}
