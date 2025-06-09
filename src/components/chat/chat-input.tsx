import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import type { Id } from "convex/_generated/dataModel";
import { Paperclip, ArrowUpIcon, PaperclipIcon, GlobeIcon } from "lucide-react";
import { ModeSelector } from "./mode-selector";
import { cn } from "~/lib/utils";

type ChatInputProps = {
	message: string;
	onMessageChange: (message: string) => void;
	onSendMessage: () => void;
	isLoading: boolean;
	selectedModeId?: Id<"modes">;
	onModeSelect?: (modeId: Id<"modes">) => void;
};

export function ChatInput(props: ChatInputProps) {
	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			props.onSendMessage();
		}
	}

	const canSend =
		props.message.trim() && !props.isLoading && props.selectedModeId;

	return (
		<div className="relative mx-auto max-w-4xl bg-sidebar border-4 border-secondary/50 border-b-0 transition-all duration-200">
			<Textarea
				value={props.message}
				onChange={(e) => props.onMessageChange(e.target.value)}
				placeholder="Type your message here..."
				className="rounded-lg font-serif placeholder:text-neutral-400 resize-none border-0 bg-transparent p-4 text-sm shadow-none focus-visible:ring-0"
				onKeyDown={handleKeyDown}
				rows={3}
			/>
			<div className="p-2">
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<div className="flex items-center gap-2">
						<ModeSelector
							selectedModeId={props.selectedModeId}
							onModeSelect={props.onModeSelect || (() => {})}
						/>
						<Button variant="outline" size="sm" className="border-none">
							<GlobeIcon className="size-4" />
							Search
						</Button>
						<Button variant="outline" size="sm" className="border-none">
							<PaperclipIcon className="size-4" />
							Attach
						</Button>
					</div>
					<div
						className={cn("rounded-none border-2", {
							"border-foreground/50": !canSend,
							"border-foreground": canSend,
						})}
					>
						<Button
							onClick={props.onSendMessage}
							disabled={!canSend}
							size="sm"
							className="size-8 rounded-none p-0 border-2 border-overlay"
						>
							<ArrowUpIcon className="size-4" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
