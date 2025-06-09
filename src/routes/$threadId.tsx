import { createFileRoute, Link } from "@tanstack/react-router";
import { authUserFn } from "~/lib/functions/auth";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "~/components/ui/sidebar";
import { ChatListPanel } from "~/components/chat/chat-list-panel";
import { ChatAreaPanel } from "~/components/chat/chat-area-panel";
import { userQueryOptions } from "~/lib/query/user";
import { useThread } from "~/lib/query/threads";
import type { Id } from "convex/_generated/dataModel";
import { Authenticated, Unauthenticated } from "convex/react";

export const Route = createFileRoute("/$threadId")({
	component: ThreadPage,
	beforeLoad: () => authUserFn(),
	loader: async ({ context }) => {
		context.queryClient.setQueryData(userQueryOptions.queryKey, {
			id: context.id,
			email: context.email,
			firstName: context.firstName,
			lastName: context.lastName,
			imageUrl: context.imageUrl,
		});
	},
});

export function ThreadPage() {
	const params = Route.useParams();
	const navigate = Route.useNavigate();
	const threadId = params.threadId === "new"
		? ("new" as Id<"threads">)
		: (params.threadId as Id<"threads">);
	const thread = useThread(threadId);

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
						onThreadClick={(threadId) => {
							navigate({ to: "/$threadId", params: { threadId } });
						}}
					/>
					<SidebarInset className="flex flex-col h-full">
						<header className="flex h-14 shrink-0 items-center gap-2 px-4">
							<SidebarTrigger className="-ml-1" />
							<h1 className="text-lg font-semibold font-serif">
								{thread?.title || "New Chat"}
							</h1>
						</header>
						<div className="flex flex-1 flex-col min-h-0">
							<ChatAreaPanel
								threadId={threadId}
								onThreadClick={(threadId) => {
									navigate({ to: "/$threadId", params: { threadId } });
								}}
							/>
						</div>
					</SidebarInset>
				</SidebarProvider>
			</Authenticated>
		</>
	);
}
