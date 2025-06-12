import type { Id } from "convex/_generated/dataModel";
import { useEffect, useRef } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { BranchIndicator } from "./branch-indicator";
import { MessageBubble } from "./message-bubble";

type MessageListProps = {
	messages: Array<{
		_id: Id<"messages">;
		content: string;
		type: string;
		senderId: string;
		metadata?: {
			isStreaming?: boolean;
			modeId?: string;
			profileId?: Id<"profiles">;
			reasoning?: string;
		};
	}>;
	userId: string;
	threadId: Id<"threads">;
	currentBranchId?: string;
	autoScroll: boolean;
	onAutoScrollChange: (autoScroll: boolean) => void;
	onRegenerate: (messageId: Id<"messages">, modeId: Id<"modes">) => void;
	onCreateBranch: (parentMessageId: Id<"messages">) => void;
	onBranchSwitch: (branchId: string) => void;
};

export function MessageList(props: MessageListProps) {
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const prevMessageCountRef = useRef(0);
	const isInitialMount = useRef(true);

	useEffect(() => {
		const currentMessageCount = props.messages?.length || 0;
		const hasNewMessage = currentMessageCount > prevMessageCountRef.current;
		const lastMessage = props.messages?.[props.messages.length - 1];
		const isStreaming = lastMessage?.metadata?.isStreaming;

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
				{props.messages?.map((msg, index) => (
					<div key={msg._id}>
						<MessageBubble
							message={msg}
							userId={props.userId}
							threadId={props.threadId}
							onRegenerate={props.onRegenerate}
							onCreateBranch={props.onCreateBranch}
						/>
						{msg.type === "assistant" && index < props.messages.length - 1 && (
							<div className="ml-4 mt-1">
								<BranchIndicator
									messageId={msg._id}
									threadId={props.threadId}
									currentBranchId={props.currentBranchId}
									onBranchSwitch={props.onBranchSwitch}
								/>
							</div>
						)}
					</div>
				))}
				<div ref={messagesEndRef} className="h-4" />
			</div>
		</ScrollArea>
	);
}
