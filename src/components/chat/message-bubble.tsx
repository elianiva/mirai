import type { Id } from "convex/_generated/dataModel";
import { useState } from "react";
import { useRemoveMessage } from "~/lib/query/messages";
import { MarkdownRenderer } from "./markdown-renderer";
import { MessageActions } from "./message-actions";
import { RegenerateDialog } from "./regenerate-dialog";

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

export function MessageBubble(props: MessageBubbleProps) {
	const isUser = props.message.type === "user";
	const isStreaming = props.message.metadata?.isStreaming;
	const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
	const removeMessage = useRemoveMessage();

	async function handleRemove() {
		try {
			await removeMessage({ id: props.message._id });
		} catch (error) {
			console.error("Failed to remove message:", error);
		}
	}

	function handleRegenerate(modeId: Id<"modes">) {
		props.onRegenerate(props.message._id, modeId);
		setShowRegenerateDialog(false);
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
				<MessageActions
					isUser={isUser}
					onRegenerate={() => setShowRegenerateDialog(true)}
					onCreateBranch={props.onCreateBranch ? () => props.onCreateBranch?.(props.message._id) : undefined}
					onRemove={handleRemove}
				/>
			)}

			<RegenerateDialog
				open={showRegenerateDialog}
				onOpenChange={setShowRegenerateDialog}
				onRegenerate={handleRegenerate}
				initialModeId={props.message.metadata?.modeId as Id<"modes">}
			/>
		</div>
	);
}
