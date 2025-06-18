import type { Id } from "convex/_generated/dataModel";
import type { MessageMetadataUI, ToolCallMetadata } from "~/types/message";
import { MessageActions } from "./message-actions";
import { MessageContent } from "./message-content";
import { ModeIndicator } from "./mode-indicator";
import { ReasoningSection } from "./reasoning-section";
import { ToolCallSection } from "./tool-call-section";

type AssistantMessageProps = {
	reasoning: string;
	isStreaming?: boolean;
	showReasoning: boolean;
	onShowReasoningChange: (show: boolean) => void;
	onRemove: () => void;
	onCreateBranch?: () => void;
	onRegenerate: (modeId: Id<"modes">) => void;
	message?: {
		_id: Id<"messages">;
		content: string;
		metadata?: MessageMetadataUI;
	};
	threadId?: Id<"threads">;
	showToolCall?: boolean;
	onShowToolCallChange?: (show: boolean) => void;
};

export function AssistantMessage(props: AssistantMessageProps) {
	const hasReasoning = props.reasoning && props.reasoning.length > 0;

	const modeId = props.message?.metadata?.modeId;
	const toolCallMetadata: ToolCallMetadata | undefined =
		props.message?.metadata?.toolCallMetadata;
	const isPendingOrchestrator = props.message?.metadata?.isPendingOrchestrator;

	return (
		<div className="group flex flex-col items-start w-full">
			<div className="w-full">
				{toolCallMetadata && toolCallMetadata.length > 0 && (
					<div>
						{toolCallMetadata.map((toolCall, index) => (
							<ToolCallSection
								key={`${toolCall.name}-${index}`}
								toolCall={toolCall}
								showToolCall={props.showToolCall}
								onShowToolCallChange={props.onShowToolCallChange}
							/>
						))}
					</div>
				)}

				{hasReasoning && (
					<ReasoningSection
						reasoning={props.reasoning}
						isStreaming={props.isStreaming}
						showReasoning={props.showReasoning}
						onShowReasoningChange={props.onShowReasoningChange}
					/>
				)}

				<MessageContent
					content={props.message?.content ?? ""}
					isStreaming={props.isStreaming}
					isPendingOrchestrator={isPendingOrchestrator}
				/>

				{modeId && (
					<div className="mt-2">
						<ModeIndicator modeId={modeId} />
					</div>
				)}
			</div>

			{!props.isStreaming && (
				<MessageActions
					isUser={false}
					onRegenerate={props.onRegenerate}
					onCreateBranch={props.onCreateBranch}
					onRemove={props.onRemove}
					messageId={props.message?._id}
					threadId={props.threadId}
				/>
			)}
		</div>
	);
}
