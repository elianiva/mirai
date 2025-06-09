import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
} from "~/components/ui/sidebar";
import { UserProfileSection } from "./user-profile-section";
import { Button } from "~/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { useThreads } from "~/lib/query/threads";
import { useRemoveThread } from "~/lib/query/threads";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

type ChatListPanelProps = {
	threadId: Id<"threads"> | undefined;
	onThreadClick: (threadId: Id<"threads">) => void;
};

export function ChatListPanel(props: ChatListPanelProps) {
	const navigate = useNavigate();

	const threads = useThreads();
	const removeThread = useRemoveThread();
	const isLoading = threads === undefined;

	function handleNewChat() {
		navigate({
			to: "/$threadId",
			params: { threadId: "new" },
		});
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
		<Sidebar>
			<SidebarHeader>
				<Button
					onClick={handleNewChat}
					className="w-full flex items-center gap-2"
				>
					New Chat
				</Button>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel className="font-serif font-semibold text-base">
						Your Conversations
					</SidebarGroupLabel>
					<SidebarGroupContent>
						{isLoading ? (
							<SidebarMenu>
								{Array.from({ length: 5 }, (_, index) => (
									<SidebarMenuItem
										key={`loading-skeleton-${Date.now()}-${index}`}
									>
										<SidebarMenuSkeleton />
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						) : !threads || threads.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
								<p className="mb-2">No conversations yet</p>
								<p className="text-sm">Start a new chat to begin</p>
							</div>
						) : (
							<SidebarMenu>
								{threads.map((thread) => (
									<SidebarMenuItem key={thread._id}>
										<SidebarMenuButton
											asChild
											isActive={props.threadId === thread._id}
										>
											<Button
												className={cn("text-left justify-start text-sm font-light", {
													"text-primary font-bold":
														props.threadId === thread._id,
												})}
												variant="ghost"
												type="button"
												onClick={() => props.onThreadClick(thread._id)}
											>
												<span>{thread.title || "New Chat"}</span>
											</Button>
										</SidebarMenuButton>
										<SidebarMenuAction
											showOnHover
											onClick={(e) => handleDeleteThread(thread._id, e)}
										>
											<Trash2 className="h-4 w-4 text-primary-foreground" />
										</SidebarMenuAction>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						)}
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<UserProfileSection />
			</SidebarFooter>
		</Sidebar>
	);
}
