import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { Authenticated, Unauthenticated } from "convex/react";
import { ChatAreaPanel } from "~/components/chat/chat-area-panel";
import { ChatListPanel } from "~/components/chat/chat-list-panel";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "~/components/ui/sidebar";
import { useAutoSeed } from "~/hooks/use-auto-seed";
import { useMessages } from "~/lib/query/messages";
import { useThread } from "~/lib/query/threads";
import { userQueryOptions } from "~/lib/query/user";
import { useCallback } from "react"; // Add this import
import { Button } from "~/components/ui/button";
import { ShareChatDialog } from "~/components/chat/share-chat-dialog";
import { ShareIcon } from "lucide-react";
import { authUserFn } from "~/lib/functions/auth";

export const Route = createFileRoute("/$threadId")({
	component: ThreadPage,
	beforeLoad: async ({ context }) => {
		const userData = await authUserFn();
		if (!userData?.id) {
			throw redirect({ to: "/sign-in" });
		}
		context.queryClient.setQueryData(userQueryOptions.queryKey, {
			id: userData.id,
			email: userData.email,
			firstName: userData.firstName,
			lastName: userData.lastName,
			imageUrl: userData.imageUrl,
			token: userData.token,
		});
	},
});

export function ThreadPage() {
	const params = Route.useParams();
	const navigate = Route.useNavigate();
	const threadId =
		params.threadId === "new"
			? ("new" as Id<"threads">)
			: (params.threadId as Id<"threads">);
	const thread = useThread(threadId);
	const parentThreadId = thread?.parentThreadId;
	const parentThread = useThread(parentThreadId ?? "new");
	const messages = useMessages(threadId);
	const isStreaming =
		messages?.some((msg) => msg.metadata?.isStreaming) ?? false;

	useAutoSeed();

	const handleThreadClick = useCallback(
		(threadId: Id<"threads">) => {
			navigate({ to: "/$threadId", params: { threadId } });
		},
		[navigate],
	);

	return (
		<>
			<Unauthenticated>
				<div className="flex h-full w-full flex-col items-center justify-center gap-4">
					<h1 className="text-4xl font-bold text-slate-600">Unauthenticated</h1>
					<p className="text-slate-500">
						You are not authenticated to access this page. Please{" "}
						<Link to="/sign-in" className="text-pink-500">
							sign in
						</Link>{" "}
						to continue.
					</p>
				</div>
			</Unauthenticated>
			<Authenticated>
				<SidebarProvider className="h-full">
					<ChatListPanel
						threadId={threadId}
						onThreadClick={handleThreadClick}
					/>
					<SidebarInset className="relative flex flex-col h-full">
						<header className="z-10 absolute top-0 left-0 right-0 flex h-14 shrink-0 items-center gap-2 px-4 bg-background">
							<SidebarTrigger />
							<Breadcrumb className="text-lg font-semibold font-serif">
								<BreadcrumbList>
									{thread?.parentThreadId ? (
										parentThread ? (
											<>
												<BreadcrumbItem>
													<BreadcrumbLink asChild>
														<Link
															to="/$threadId"
															params={{ threadId: parentThread._id }}
														>
															{parentThread.title || "Untitled"}
														</Link>
													</BreadcrumbLink>
												</BreadcrumbItem>
												<BreadcrumbSeparator />
												<BreadcrumbItem>
													<BreadcrumbPage>
														{thread.title || "New Chat"}
													</BreadcrumbPage>
												</BreadcrumbItem>
											</>
										) : (
											// Parent thread is loading or failed to load
											<>
												<BreadcrumbItem>
													<BreadcrumbPage className="text-muted-foreground">
														Loading parent...
													</BreadcrumbPage>
												</BreadcrumbItem>
												<BreadcrumbSeparator />
												<BreadcrumbItem>
													<BreadcrumbPage>
														{thread.title || "New Chat"}
													</BreadcrumbPage>
												</BreadcrumbItem>
											</>
										)
									) : (
										<BreadcrumbItem>
											<BreadcrumbPage>
												{thread?.title || "New Chat"}
											</BreadcrumbPage>
										</BreadcrumbItem>
									)}
								</BreadcrumbList>
							</Breadcrumb>
							<div className="ml-auto">
								{threadId !== "new" && (
									<ShareChatDialog threadId={threadId}>
										<Button variant="ghost">
											Share
											<ShareIcon className="w-4 h-4" />
										</Button>
									</ShareChatDialog>
								)}
							</div>
						</header>
						<div className="flex flex-1 flex-col min-h-0 mt-14">
							<ChatAreaPanel
								threadId={threadId}
								isStreaming={isStreaming}
								onThreadClick={handleThreadClick}
							/>
						</div>
					</SidebarInset>
				</SidebarProvider>
			</Authenticated>
		</>
	);
}
