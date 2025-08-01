import { useNavigate } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { GitFork, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
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
import {
	useRemoveThread,
	useRenameThread,
	useThreads,
} from "~/lib/query/threads";
import { cn } from "~/lib/utils";
import { UserProfileSection } from "./user-profile-section";

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
			await renameThread({ id: threadId, title: finalTitle });
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
				<SidebarGroup className="gap-2 mt-2">
					<SidebarGroupLabel className="font-serif">
						<div className="w-full flex flex-col gap-1">
							<h2 className="leading-none font-semibold text-base">
								Your Conversations
							</h2>
							<small className="block text-xs text-muted-foreground text-left font-light">
								Double click the title to edit
							</small>
						</div>
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
									<SidebarMenuItem
										key={thread._id}
										className="hover:bg-background rounded"
									>
										<SidebarMenuButton
											asChild
											isActive={props.threadId === thread._id}
											className="cursor-pointer"
										>
											<Button
												className={cn(
													"text-left justify-start text-sm font-light text-neutral-500",
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
													<span className="flex items-center">
														{thread.parentThreadId && (
															<GitFork className="h-4 w-4 mr-2" />
														)}
														{thread.title || "New Chat"}
													</span>
												)}
											</Button>
										</SidebarMenuButton>
										<div className="absolute top-1.5 right-1 flex gap-1 opacity-0 translate-x-4 group-hover/menu-item:opacity-100 group-hover/menu-item:translate-x-0 group-focus-within/menu-item:opacity-100 group-focus-within/menu-item:translate-x-0 transition-all">
											<SidebarMenuAction
												onClick={(e) => handleDeleteThread(thread._id, e)}
												className="relative top-0 right-0 cursor-pointer"
											>
												<Trash2 className="size-4 text-primary-foreground" />
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
