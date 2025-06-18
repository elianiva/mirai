import type { Id } from "convex/_generated/dataModel";
import { memo, useEffect, useRef } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { MessageWithMetadata } from "~/types/message";
import { MessageBubble } from "./message-bubble/message-bubble";
import { MessageWithAttachments } from "./message-with-attachments";

type MessageListProps = {
	messages: MessageWithMetadata[];
	userId: string;
	threadId: Id<"threads">;
	currentBranchId?: string;
	autoScroll: boolean;
	isLoading: boolean;
	isPublic?: boolean;
	onAutoScrollChange: (autoScroll: boolean) => void;
	onCreateBranch: (parentMessageId: Id<"messages">) => void;
	onBranchSwitch: (branchId: string) => void;
};

export const MessageList = memo(
	function MessageList(props: MessageListProps) {
		const scrollAreaRef = useRef<HTMLDivElement>(null);
		const messagesEndRef = useRef<HTMLDivElement>(null);
		const prevMessageCountRef = useRef(0);
		const isInitialMount = useRef(true);

		useEffect(() => {
			const currentMessageCount = props.messages?.length || 0;
			const hasNewMessage = currentMessageCount > prevMessageCountRef.current;
			const lastMessage = props.messages?.[props.messages.length - 1];
			const isStreaming =
				lastMessage?.metadata?.isStreaming ||
				lastMessage?.metadata?.isStreamingToolCalls;

			if (
				(isInitialMount.current && currentMessageCount > 0) ||
				(hasNewMessage && props.autoScroll) ||
				(isStreaming && props.autoScroll)
			) {
				requestAnimationFrame(() => {
					const scrollContainer = scrollAreaRef.current?.querySelector(
						'[data-slot="scroll-area-viewport"]',
					) as HTMLElement | null;

					if (scrollContainer) {
						scrollContainer.scrollTop = scrollContainer.scrollHeight;
					}
				});

				if (isInitialMount.current) {
					isInitialMount.current = false;
				}
			}

			prevMessageCountRef.current = currentMessageCount;
		}, [props.messages, props.autoScroll]);

		useEffect(() => {
			const scrollContainer = scrollAreaRef.current?.querySelector(
				'[data-slot="scroll-area-viewport"]',
			) as HTMLElement | null;

			if (!scrollContainer) return;

			function handleScroll() {
				if (!scrollContainer) return;
				const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
				const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
				props.onAutoScrollChange(isAtBottom);
			}

			scrollContainer.addEventListener("scroll", handleScroll);
			return () => scrollContainer.removeEventListener("scroll", handleScroll);
		}, [props.onAutoScrollChange]);

		return (
			<ScrollArea ref={scrollAreaRef} className="h-full w-full">
				<div className="relative px-4 space-y-4 max-w-screen-md mx-auto py-4">
					{props.messages?.map((msg) => {
						return (
							<div key={msg._id}>
								{msg.attachmentIds && msg.attachmentIds.length > 0 ? (
									<MessageWithAttachments
										message={msg}
										userId={props.userId}
										threadId={props.threadId}
										currentBranchId={props.currentBranchId}
										onCreateBranch={props.onCreateBranch}
										onBranchSwitch={props.onBranchSwitch}
										isPublic={props.isPublic}
									/>
								) : (
									<MessageBubble
										message={msg}
										userId={props.userId}
										threadId={props.threadId}
										onCreateBranch={props.onCreateBranch}
										isPublic={props.isPublic}
									/>
								)}
							</div>
						);
					})}
					<div ref={messagesEndRef} className="h-4" />
				</div>
			</ScrollArea>
		);
	},
	function areEqual(prevProps, nextProps) {
		return (
			prevProps.messages === nextProps.messages &&
			prevProps.userId === nextProps.userId &&
			prevProps.threadId === nextProps.threadId &&
			prevProps.currentBranchId === nextProps.currentBranchId &&
			prevProps.autoScroll === nextProps.autoScroll &&
			prevProps.isLoading === nextProps.isLoading &&
			prevProps.isPublic === nextProps.isPublic
		);
	},
);
