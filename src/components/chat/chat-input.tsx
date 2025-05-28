import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import type { Id } from "convex/_generated/dataModel";
import { Send, Paperclip, Mic } from "lucide-react";
import { ModeSelector } from "./mode-selector";
import { ProfileSelector } from "./profile-selector";

type ChatInputProps = {
	message: string;
	onMessageChange: (message: string) => void;
	onSendMessage: () => void;
	isLoading: boolean;
	selectedModeId?: Id<"modes">;
	selectedProfileId?: Id<"profiles">;
	onModeSelect?: (modeId: Id<"modes">) => void;
	onProfileSelect?: (profileId: Id<"profiles">) => void;
};

export function ChatInput(props: ChatInputProps) {
	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			props.onSendMessage();
		}
	}

	const canSend =
		props.message.trim() &&
		!props.isLoading &&
		props.selectedModeId &&
		props.selectedProfileId;

	return (
		<div className="mt-4 px-4">
			<div className="relative mx-auto max-w-4xl rounded-2xl border bg-background shadow-sm transition-all duration-200 focus-within:shadow-md">
				<div className="flex items-center gap-3 p-4">
					{/* Left Actions */}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
					>
						<Paperclip className="h-4 w-4" />
					</Button>

					{/* Text Input */}
					<div className="flex-1">
						<Textarea
							value={props.message}
							onChange={(e) => props.onMessageChange(e.target.value)}
							placeholder="Type your task here..."
							className="min-h-[20px] max-h-32 resize-none border-0 bg-transparent p-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
							onKeyDown={handleKeyDown}
						/>
					</div>

					{/* Right Actions */}
					<div className="flex items-center gap-2">
						{props.message.trim() ? (
							<Button
								type="button"
								onClick={props.onSendMessage}
								disabled={!canSend}
								size="sm"
								className="h-8 w-8 rounded-full p-0"
							>
								<Send className="h-4 w-4" />
							</Button>
						) : (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
							>
								<Mic className="h-4 w-4" />
							</Button>
						)}
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
							<ProfileSelector
								selectedProfileSlug={props.selectedProfileId}
								onProfileSelect={props.onProfileSelect || (() => {})}
							/>
						</div>
						<div className="flex items-center gap-2">
							{!props.selectedModeId && (
								<span className="text-destructive">Please select a mode</span>
							)}
							{!props.selectedProfileId && (
								<span className="text-destructive">
									Please select a profile
								</span>
							)}
							{props.isLoading && (
								<div className="flex items-center gap-1">
									<div className="h-1 w-1 rounded-full bg-current animate-pulse" />
									<div className="h-1 w-1 rounded-full bg-current animate-pulse [animation-delay:0.2s]" />
									<div className="h-1 w-1 rounded-full bg-current animate-pulse [animation-delay:0.4s]" />
									<span>Generating...</span>
								</div>
							)}
						</div>
					</div>
					<div className="mt-1 text-xs text-muted-foreground">
						(@ to add context, / to switch modes, hold shift to drag in
						files/images)
					</div>
				</div>
			</div>
		</div>
	);
}
