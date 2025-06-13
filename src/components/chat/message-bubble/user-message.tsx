import type { Id } from "convex/_generated/dataModel";
import { MessageActions } from "./message-actions";
import { RegenerateDialog } from "./regenerate-dialog";

type UserMessageProps = {
	content: string;
	isStreaming?: boolean;
	onRemove: () => void;
	onCreateBranch?: () => void;
	showRegenerateDialog: boolean;
	onShowRegenerateDialog: (show: boolean) => void;
	onRegenerate: (modeId: Id<"modes">) => void;
	initialModeId?: Id<"modes">;
};

export function UserMessage(props: UserMessageProps) {
	return (
		<div className="group flex flex-col items-end w-full">
			<div className="prose prose-sm relative px-4 py-2 rounded-md bg-primary text-background whitespace-pre-wrap break-words text-base font-serif">
				{props.content}
			</div>

			{!props.isStreaming && (
				<MessageActions
					isUser={true}
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
