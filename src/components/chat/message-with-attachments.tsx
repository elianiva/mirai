import { useQuery } from "convex/react";
import { api } from "~/../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { MessageBubble } from "./message-bubble";
import type { MessageWithMetadata } from "./message-bubble/message-types";

type MessageWithAttachmentsProps = {
	message: MessageWithMetadata & {
		attachmentIds?: Id<"attachments">[];
	};
	userId: string;
	threadId: Id<"threads">;
	currentBranchId?: string;
	onRegenerate: (messageId: Id<"messages">, modeId: Id<"modes">) => void;
	onCreateBranch: (parentMessageId: Id<"messages">) => void;
	onBranchSwitch: (branchId: string) => void;
};

export function MessageWithAttachments(props: MessageWithAttachmentsProps) {
	const attachmentData = useQuery(
		api.attachments.getAttachmentData,
		props.message.attachmentIds && props.message.attachmentIds.length > 0
			? { attachmentIds: props.message.attachmentIds }
			: "skip",
	);

	const messageWithAttachments: MessageWithMetadata = {
		...props.message,
		attachments:
			attachmentData
				?.filter(
					(
						attachment,
					): attachment is {
						url: string;
						filename: string;
						contentType: string;
						size: number;
					} => attachment !== null && attachment.url !== null,
				)
				.map((attachment) => ({
					url: attachment.url,
					filename: attachment.filename,
					contentType: attachment.contentType,
				})) || undefined,
	};

	return (
		<MessageBubble
			message={messageWithAttachments}
			userId={props.userId}
			threadId={props.threadId}
			onRegenerate={props.onRegenerate}
			onCreateBranch={props.onCreateBranch}
		/>
	);
}
