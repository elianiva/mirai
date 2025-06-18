import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "~/../convex/_generated/api";
import type { Id } from "~/../convex/_generated/dataModel";
import { MessageList } from "~/components/chat/message-list";
import { Skeleton } from "~/components/ui/skeleton";
import type { MessageMetadataUI } from "~/types/message";

export const Route = createFileRoute("/share/$sharedChatId")({
	component: SharedChatPage,
});

function SharedChatPage() {
	const { sharedChatId } = Route.useParams();
	const sharedChat = useQuery(api.shared.get, {
		id: sharedChatId as Id<"sharedChats">,
	});

	if (sharedChat === undefined) {
		return (
			<div className="flex flex-col h-screen bg-background">
				<header className="flex items-center justify-between p-4 border-b">
					<div className="flex items-center space-x-2">
						<Skeleton className="h-6 w-32" />
					</div>
				</header>
				<div className="flex-1 p-4 space-y-4">
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			</div>
		);
	}

	if (sharedChat === null) {
		return (
			<div className="flex flex-col h-screen bg-background font-serif">
				<header className="flex items-center justify-between p-4 border-b">
					<h1 className="text-lg font-semibold">Shared Chat</h1>
				</header>
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center">
						<h2 className="text-xl font-semibold mb-2">Chat not found</h2>
						<p className="text-muted-foreground">
							This shared chat may have been removed or the link is invalid.
						</p>
					</div>
				</div>
			</div>
		);
	}

	const messages = JSON.parse(sharedChat.chatSnapshot) as Array<{
		_id: Id<"messages">;
		content: string;
		role: "user" | "assistant";
		senderId: string;
		metadata?: Record<string, unknown>;
		attachmentIds?: Id<"attachments">[];
	}>;

	const messagesList = messages.map((msg) => {
		const metadata: MessageMetadataUI = {
			...msg.metadata,
			profileId: msg.metadata?.profileId as Id<"profiles"> | undefined,
			isStreaming: false,
		};

		return {
			...msg,
			attachments: [],
			metadata,
		};
	});

	return (
		<div className="flex flex-col h-screen bg-background font-serif">
			<header className="flex items-center justify-between p-4 border-b border-secondary">
				<h1 className="text-lg font-semibold">{sharedChat.title}</h1>
				<div className="text-sm text-muted-foreground">Read-only snapshot</div>
			</header>
			<div className="flex-1 min-h-0">
				<MessageList
					isImmutable
					messages={messagesList}
					userId=""
					threadId={sharedChat.threadId}
					currentBranchId={undefined}
					autoScroll={false}
					isLoading={false}
					onAutoScrollChange={() => {}}
					onCreateBranch={() => {}}
					onBranchSwitch={() => {}}
				/>
			</div>
		</div>
	);
}
