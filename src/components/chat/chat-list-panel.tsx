import { ScrollArea } from "~/components/ui/scroll-area";
import { UserProfileSection } from "./user-profile-section";
import { useUser } from "~/lib/query/user";
import { Button } from "~/components/ui/button";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { useThreads } from "~/lib/query/threads";
import { useCreateThread } from "~/lib/query/threads";
import { useRemoveThread } from "~/lib/query/threads";
import { toast } from "sonner";

type ChatListPanelProps = {
	threadId: Id<"threads"> | undefined;
	onThreadClick: (threadId: Id<"threads">) => void;
};

export function ChatListPanel(props: ChatListPanelProps) {
	const navigate = useNavigate();

	const { data: user } = useUser();
	const threads = useThreads();
	const createThread = useCreateThread();
	const removeThread = useRemoveThread();
	const isLoading = threads === undefined;

	async function handleCreateThread() {
		if (!user?.id) return;

		toast.promise(
			createThread({
				title: "New Chat",
				participantIds: [user.id],
			}),
			{
				loading: "Creating thread...",
				success: (data) => {
					navigate({
						to: "/$threadId",
						params: { threadId: data.toString() },
					});
					return "Thread created";
				},
				error: "Failed to create thread",
			},
		);
	}

	async function handleDeleteThread(
		threadId: Id<"threads">,
		e: React.MouseEvent,
	) {
		e.stopPropagation();

		toast.promise(removeThread({ id: threadId }), {
			loading: "Deleting thread...",
			success: () => {
				navigate({ to: "/" });
				return "Thread deleted";
			},
			error: "Failed to delete thread",
		});
	}

	return (
		<div className="flex h-full flex-col">
			<div className="p-4">
				<Button
					onClick={handleCreateThread}
					className="w-full flex items-center gap-2"
				>
					<Plus className="h-4 w-4" />
					New Chat
				</Button>
			</div>

			<ScrollArea className="flex-grow px-4">
				<h2 className="mb-4 text-sm font-semibold text-muted-foreground">
					Your Conversations
				</h2>

				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin text-primary" />
					</div>
				) : !threads || threads.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
						<p className="mb-2">No conversations yet</p>
						<p className="text-sm">Start a new chat to begin</p>
					</div>
				) : (
					<div className="space-y-2">
						{threads.map((thread) => (
							<button
								type="button"
								key={thread._id}
								className={`group flex w-full items-center justify-between rounded-md border p-3 hover:bg-accent text-left ${
									props.threadId === thread._id ? "bg-accent" : ""
								}`}
								onClick={() => props.onThreadClick(thread._id)}
								aria-pressed={props.threadId === thread._id}
							>
								<div className="truncate">{thread.title || "New Chat"}</div>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
									onClick={(e) => handleDeleteThread(thread._id, e)}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</button>
						))}
					</div>
				)}
			</ScrollArea>

			<UserProfileSection />
		</div>
	);
}
