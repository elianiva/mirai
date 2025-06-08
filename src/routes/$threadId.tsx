import { createFileRoute, Link } from "@tanstack/react-router";
import { authUserFn } from "~/lib/functions/auth";
import { Collapsible, CollapsibleContent } from "~/components/ui/collapsible";
import { ChatListPanel } from "~/components/chat/chat-list-panel";
import { ChatAreaPanel } from "~/components/chat/chat-area-panel";
import { userQueryOptions } from "~/lib/query/user";
import type { Id } from "convex/_generated/dataModel";
import { Authenticated, Unauthenticated } from "convex/react";
import { Button } from "~/components/ui/button";
import { useState } from "react";
import { Menu } from "lucide-react";

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
	const [leftPanelOpen, setLeftPanelOpen] = useState(true);
	const [rightPanelOpen, setRightPanelOpen] = useState(true);

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
				<div className="flex h-full w-full">
					<Collapsible
						open={leftPanelOpen}
						onOpenChange={setLeftPanelOpen}
						className="h-full"
					>
						<CollapsibleContent className="h-full data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-300">
							<div className="w-80 h-full border-r">
								<ChatListPanel
									threadId={params.threadId as Id<"threads">}
									onThreadClick={(threadId) => {
										navigate({ to: "/$threadId", params: { threadId } });
									}}
									onToggleCollapse={() => setLeftPanelOpen(false)}
								/>
							</div>
						</CollapsibleContent>
						{!leftPanelOpen && (
							<div className="h-full w-12 border-r bg-background flex items-start justify-center pt-3">
								<Button
									onClick={() => setLeftPanelOpen(true)}
									variant="secondary"
									size="sm"
									className="h-10 w-10 p-0"
								>
									<Menu className="h-4 w-4" />
								</Button>
							</div>
						)}
					</Collapsible>

					<div className="flex-1 h-full">
						<ChatAreaPanel
							threadId={params.threadId === "new" ? "new" as Id<"threads"> : params.threadId as Id<"threads">}
							onThreadClick={(threadId) => {
								navigate({ to: "/$threadId", params: { threadId } });
							}}
						/>
					</div>
				</div>
			</Authenticated>
		</>
	);
}
