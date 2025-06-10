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
import { Input } from "~/components/ui/input";
import { Trash2, Pencil } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import {
	useThreads,
	useRemoveThread,
	useRenameThread,
} from "~/lib/query/threads";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { useState } from "react";

type ChatListPanelProps = {
	threadId: Id<"threads"> | undefined;
	onThreadClick: (threadId: Id<"threads">) => void;
};

export function ChatListPanel(props: ChatListPanelProps) {
	const navigate = useNavigate();

	const threads = useThreads();
	const isLoading = threads === undefined;
	const removeThread = useRemoveThread();
	const renameThread = useRenameThread();

	const [editingThreadId, setEditingThreadId] = useState<Id<"threads"> | null>(
		null,
	);
	const [editingTitle, setEditingTitle] = useState("");

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

		navigate({ to: "/$threadId", params: { threadId: "new" } });
		toast.promise(removeThread({ id: threadId }), {
			loading: "Deleting thread...",
			success: () => {
				return "Thread deleted";
			},
			error: "Failed to delete thread",
		});
	}

	function handleDoubleClick(threadId: Id<"threads">, currentTitle: string) {
		setEditingThreadId(threadId);
		setEditingTitle(currentTitle || "New Chat");
	}

	async function handleRename(threadId: Id<"threads">, newTitle: string) {
		const finalTitle = !newTitle.trim() ? "New Chat" : newTitle.trim();

		if (!newTitle.trim()) {
			setEditingTitle("New Chat");
		}

		try {
			await renameThread.mutateAsync({ id: threadId, title: finalTitle });
			toast.success("Thread renamed successfully");
		} catch (error) {
			toast.error("Failed to rename thread");
		} finally {
			setEditingThreadId(null);
			setEditingTitle("");
		}
	}

	function handleKeyDown(e: React.KeyboardEvent, threadId: Id<"threads">) {
		if (e.key === "Enter") {
			e.preventDefault();
			handleRename(threadId, editingTitle);
		}
	}

	function handleBlur(threadId: Id<"threads">, originalTitle: string) {
		if (editingTitle !== originalTitle && editingTitle.trim()) {
			handleRename(threadId, editingTitle);
		} else {
			setEditingThreadId(null);
			setEditingTitle("");
		}
	}

	return (
		<Sidebar>
			<SidebarHeader>
				<div className="py-2">
					<h1 className="text-4xl text-center font-light font-[Cinzel_Decorative]">
						Mirai
					</h1>
				</div>
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
							<div className="flex flex-col items-center justify-center py-8 text-center text-foreground font-serif">
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
												className={cn(
													"text-left justify-start text-sm font-light",
													{
														"text-primary font-bold":
															props.threadId === thread._id,
													},
												)}
												variant="ghost"
												type="button"
												onClick={() => props.onThreadClick(thread._id)}
												onDoubleClick={() =>
													handleDoubleClick(
														thread._id,
														thread.title || "New Chat",
													)
												}
											>
												{editingThreadId === thread._id ? (
													<Input
														value={editingTitle}
														onChange={(e) => setEditingTitle(e.target.value)}
														onKeyDown={(e) => handleKeyDown(e, thread._id)}
														onBlur={() =>
															handleBlur(thread._id, thread.title || "New Chat")
														}
														className="h-6 text-sm font-light bg-transparent border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
														autoFocus
														onClick={(e) => e.stopPropagation()}
													/>
												) : (
													<span>{thread.title || "New Chat"}</span>
												)}
											</Button>
										</SidebarMenuButton>
										<div className="absolute top-1.5 right-1 flex gap-1 opacity-0 group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100 transition-opacity">
											<SidebarMenuAction
												onClick={(e) => {
													e.stopPropagation();
													handleDoubleClick(
														thread._id,
														thread.title || "New Chat",
													);
												}}
												className="relative top-0 right-0"
											>
												<Pencil className="h-4 w-4 text-muted" />
											</SidebarMenuAction>
											<SidebarMenuAction
												onClick={(e) => handleDeleteThread(thread._id, e)}
												className="relative top-0 right-0"
											>
												<Trash2 className="h-4 w-4 text-primary-foreground" />
											</SidebarMenuAction>
										</div>
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
