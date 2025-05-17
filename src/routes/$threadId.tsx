import { createFileRoute, useParams } from "@tanstack/react-router";
import { authUserFn } from "~/lib/functions/auth";
import {
	ResizablePanelGroup,
	ResizablePanel,
	ResizableHandle,
} from "~/components/ui/resizable";
import { ChatListPanel } from "~/components/chat/chat-list-panel";
import { ChatAreaPanel } from "~/components/chat/chat-area-panel";
import { ModesPanel } from "~/components/chat/modes-panel";
import { userQueryOptions } from "~/lib/query/user";
import type { Id } from "convex/_generated/dataModel";

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

	return (
		<ResizablePanelGroup direction="horizontal" className="h-full w-full">
			<ResizablePanel defaultSize={15} minSize={15} maxSize={20}>
				<ChatListPanel
					threadId={params.threadId as Id<"threads">}
					onThreadClick={(threadId) => {
						navigate({ to: "/$threadId", params: { threadId } });
					}}
				/>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize={60} minSize={30}>
				<ChatAreaPanel
					threadId={params.threadId as Id<"threads">}
					onThreadClick={(threadId) => {
						navigate({ to: "/$threadId", params: { threadId } });
					}}
				/>
			</ResizablePanel>
			<ResizableHandle withHandle />
			{/* <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
				<ModesPanel />
			</ResizablePanel> */}
		</ResizablePanelGroup>
	);
}
