import { createFileRoute } from "@tanstack/react-router";
import { authStateFn } from "~/lib/functions/auth";
import {
	ResizablePanelGroup,
	ResizablePanel,
	ResizableHandle,
} from "~/components/ui/resizable";
import { ChatListPanel } from "~/components/chat/chat-list-panel";
import { ChatAreaPanel } from "~/components/chat/chat-area-panel";
import { ModesPanel } from "~/components/chat/modes-panel";
import { userQueryOptions } from "~/lib/query/user";
export const Route = createFileRoute("/")({
	component: HomePage,
	beforeLoad: () => authStateFn(),
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

function HomePage() {
	return (
		<ResizablePanelGroup direction="horizontal" className="h-full w-full">
			<ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
				<ChatListPanel />
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize={60} minSize={30}>
				<ChatAreaPanel />
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
				<ModesPanel />
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
