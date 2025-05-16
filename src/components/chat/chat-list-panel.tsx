import { ScrollArea } from "~/components/ui/scroll-area";
import { UserProfileSection } from "./user-profile-section"; // Will be created next

export function ChatListPanel() {
	return (
		<div className="flex h-full flex-col">
			<ScrollArea className="flex-grow p-4">
				<h2 className="mb-4 text-lg font-semibold">Chats</h2>
				{/* Placeholder for chat list items */}
				{Array.from({ length: 4 }).map((_, i) => (
					<div
						key={`chat-item-${i}`}
						className="mb-2 rounded-md border p-3 hover:bg-accent"
					>
						Chat Item {i + 1}
					</div>
				))}
			</ScrollArea>
			<UserProfileSection />
		</div>
	);
}
