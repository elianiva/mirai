import type { Id } from "convex/_generated/dataModel";
import { MessageActions } from "./message-actions";

type UserMessageProps = {
	attachments?: { url: string; filename: string; contentType: string }[];
	isStreaming?: boolean;
	onRemove: () => void;
	onCreateBranch?: () => void;
	onRegenerate: (modeId: Id<"modes">) => void;
	message?: { _id: Id<"messages">; content: string };
	threadId?: Id<"threads">;
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
				{props.message?.content}
			</div>

			{!props.isStreaming && (
				<MessageActions
					isUser={true}
					onRegenerate={props.onRegenerate}
					onCreateBranch={props.onCreateBranch}
					onRemove={props.onRemove}
					message={props.message}
					threadId={props.threadId}
				/>
			)}
		</div>
	);
}
