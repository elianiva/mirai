import type { Id } from "convex/_generated/dataModel";
import { MessageActions } from "./message-actions";
import { RegenerateDialog } from "./regenerate-dialog";

type UserMessageProps = {
	content: string;
	attachments?: { url: string; filename: string; contentType: string }[];
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
				{props.attachments && props.attachments.length > 0 && (
					<div className="my-2 space-y-2">
						{props.attachments.map((attachment, index) => (
							<div key={`${attachment.url}-${index}`}>
								{attachment.contentType.startsWith("image/") ? (
									<img
										src={attachment.url}
										alt={attachment.filename}
										className="max-w-xs max-h-64 rounded object-cover"
									/>
								) : (
									<a
										href={attachment.url}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-2 px-3 py-2 bg-background/20 rounded text-sm hover:bg-background/30 transition-colors"
									>
										<span>📎</span>
										<span>{attachment.filename}</span>
									</a>
								)}
							</div>
						))}
					</div>
				)}
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
