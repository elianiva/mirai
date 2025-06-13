import type { Id } from "convex/_generated/dataModel";
import { MessageActions } from "./message-actions";
import { RegenerateDialog } from "./regenerate-dialog";
import { ReasoningSection } from "./reasoning-section";
import { MessageContent } from "./message-content";

type AssistantMessageProps = {
	content: string;
	reasoning: string;
	isStreaming?: boolean;
	isStreamingReasoning?: boolean;
	showReasoning: boolean;
	onShowReasoningChange: (show: boolean) => void;
	onRemove: () => void;
	onCreateBranch?: () => void;
	showRegenerateDialog: boolean;
	onShowRegenerateDialog: (show: boolean) => void;
	onRegenerate: (modeId: Id<"modes">) => void;
	initialModeId?: Id<"modes">;
};

export function AssistantMessage(props: AssistantMessageProps) {
	const hasReasoning = props.reasoning || props.isStreamingReasoning;

	return (
		<div className="group flex flex-col items-start w-full">
			<div className="w-full">
				{hasReasoning && (
					<ReasoningSection
						reasoning={props.reasoning}
						isStreamingReasoning={props.isStreamingReasoning}
						isStreaming={props.isStreaming}
						showReasoning={props.showReasoning}
						onShowReasoningChange={props.onShowReasoningChange}
					/>
				)}

				<MessageContent
					content={props.content}
					isStreaming={props.isStreaming}
				/>
			</div>

			{!props.isStreaming && (
				<MessageActions
					isUser={false}
					onRegenerate={() => props.onShowRegenerateDialog(true)}
					onCreateBranch={props.onCreateBranch}
					onRemove={props.onRemove}
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
