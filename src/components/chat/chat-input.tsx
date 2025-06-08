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
		<div className="mt-4 px-4">
			<div className="relative mx-auto max-w-4xl rounded-2xl border bg-background shadow-sm transition-all duration-200 focus-within:shadow-md">
				<div className="flex items-center gap-3 p-4">
					<div className="flex-1">
						<Textarea
							value={props.message}
							onChange={(e) => props.onMessageChange(e.target.value)}
							placeholder="Type your message here..."
							className="placeholder:text-neutral-400 resize-none border-0 bg-transparent p-2 text-sm shadow-none focus-visible:ring-0"
							onKeyDown={handleKeyDown}
							rows={3}
						/>
					</div>
				</div>

				{/* Bottom Section with Mode Display and Helper Text */}
				<div className="border-t bg-muted/30 px-4 py-2">
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<div className="flex items-center gap-2">
							<ModeSelector
								selectedModeId={props.selectedModeId}
								onModeSelect={props.onModeSelect || (() => {})}
							/>
							<Button variant="outline" size="sm">
								<GlobeIcon className="size-4" />
								Search
							</Button>
							<Button variant="outline" size="sm">
								<PaperclipIcon className="size-4" />
								Attach
							</Button>
						</div>
						<div
							className={cn("rounded-full border-2", {
								"border-primary/50": !canSend,
								"border-primary": canSend,
							})}
						>
							<Button
								onClick={props.onSendMessage}
								disabled={!canSend}
								size="sm"
								className="size-8 rounded-full p-0 border-2 border-white"
							>
								<ArrowUpIcon className="size-4" />
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
