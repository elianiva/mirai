import type { Id } from "convex/_generated/dataModel";
import { MessageActions } from "./message-actions";
import { MessageContent } from "./message-content";
import { ReasoningSection } from "./reasoning-section";
import { RegenerateDialog } from "./regenerate-dialog";

type AssistantMessageProps = {
	content: string;
	reasoning: string;
	isStreamingMessageContent?: boolean;
	isStreamingReasoning?: boolean;
	showReasoning: boolean;
	onShowReasoningChange: (show: boolean) => void;
	onRemove: () => void;
	onCreateBranch?: () => void;
	showRegenerateDialog: boolean;
	onShowRegenerateDialog: (show: boolean) => void;
	onRegenerate: (modeId: Id<"modes">) => void;
	initialModeId?: Id<"modes">;
	message?: { _id: Id<"messages"> };
	threadId?: Id<"threads">;
};

export function AssistantMessage(props: AssistantMessageProps) {
	const hasReasoning = props.reasoning || props.isStreamingReasoning;
	const isAnyStreaming =
		props.isStreamingMessageContent || props.isStreamingReasoning;

	return (
		<div className="group flex flex-col items-start w-full">
			<div className="w-full">
				{hasReasoning && (
					<ReasoningSection
						reasoning={props.reasoning}
						isStreamingReasoning={props.isStreamingReasoning}
						showReasoning={props.showReasoning}
						onShowReasoningChange={props.onShowReasoningChange}
					/>
				)}

				<MessageContent
					content={props.content}
					isStreaming={props.isStreamingMessageContent}
				/>
			</div>

			{!isAnyStreaming && (
				<MessageActions
					isUser={false}
					onRegenerate={() => props.onShowRegenerateDialog(true)}
					onCreateBranch={props.onCreateBranch}
					onRemove={props.onRemove}
					message={props.message}
					threadId={props.threadId}
				/>
			)}

			<RegenerateDialog
				open={props.showRegenerateDialog}
				onOpenChange={props.onShowRegenerateDialog}
				onRegenerate={props.onRegenerate}
				initialModeId={props.initialModeId}
			/>
		</div>
	);
}
