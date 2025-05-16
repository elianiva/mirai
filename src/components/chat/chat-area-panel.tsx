import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";

export function ChatAreaPanel() {
	return (
		<div className="flex h-full flex-col p-4">
			<ScrollArea className="flex-grow">
				<h2 className="mb-4 text-lg font-semibold">Chat Area</h2>
				{/* Placeholder for messages */}
				{Array.from({ length: 10 }).map((_, i) => (
					<div
						key={`message-item-${i}`}
						className={`mb-2 rounded-lg p-3 ${
							i % 2 === 0
								? "bg-muted self-start"
								: "bg-primary text-primary-foreground self-end"
						} max-w-[70%]`}
					>
						Message {i + 1}
					</div>
				))}
			</ScrollArea>
			<div className="mt-4 flex gap-2 border-t pt-4">
				<input
					type="text"
					placeholder="Type a message..."
					className="flex-grow rounded-md border p-2"
				/>
				<Button>Send</Button>
			</div>
		</div>
	);
}
