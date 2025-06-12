import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import type { Id } from "convex/_generated/dataModel";
import {
	Paperclip,
	ArrowUpIcon,
	PaperclipIcon,
	GlobeIcon,
	SquareIcon,
} from "lucide-react";
import { ModeSelector } from "./mode-selector";
import { cn } from "~/lib/utils";
import { useEffect, useState } from "react";
import { retrieveAndDecrypt } from "~/lib/utils/crypto";

type ChatInputProps = {
	message: string;
	onMessageChange: (message: string) => void;
	onSendMessage: () => void;
	onStopStreaming: () => void;
	isLoading: boolean;
	isStreaming: boolean;
	selectedModeId?: Id<"modes">;
	onModeSelect?: (modeId: Id<"modes">) => void;
	userId?: string;
};

export function ChatInput(props: ChatInputProps) {
	const [openrouterKey, setOpenrouterKey] = useState<string | null>(null);

	useEffect(() => {
		async function loadOpenrouterKey() {
			if (!props.userId) return;

			try {
				const decryptedKey = await retrieveAndDecrypt(props.userId);
				setOpenrouterKey(decryptedKey);
			} catch (error) {
				console.debug("No OpenRouter key found or failed to decrypt");
				setOpenrouterKey(null);
			}
		}

		loadOpenrouterKey();
	}, [props.userId]);

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			props.onSendMessage();
		}
	}

	const canSend =
		props.message.trim() && !props.isLoading && props.selectedModeId;

	return (
		<div className="rounded-t mx-auto max-w-4xl bg-sidebar border-4 border-secondary/50 border-b-0 transition-all duration-200">
			<Textarea
				value={props.message}
				onChange={(e) => props.onMessageChange(e.target.value)}
				placeholder="Type your message here..."
				className="font-serif placeholder:text-neutral-400 resize-none border-0 bg-transparent p-4 text-sm shadow-none focus-visible:ring-0"
				onKeyDown={handleKeyDown}
				rows={2}
			/>
			<div className="p-2">
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<div className="flex items-center gap-2">
						<ModeSelector
							selectedModeId={props.selectedModeId}
							onModeSelect={props.onModeSelect || (() => {})}
						/>
						<Button variant="outline" size="sm" className="border-none">
							<PaperclipIcon className="size-4" />
							Attach
						</Button>
					</div>
					<div
						className={cn("rounded border-2", {
							"border-foreground/50": !canSend,
							"border-foreground": canSend,
						})}
					>
						<Button
							onClick={() =>
								props.isStreaming
									? props.onStopStreaming()
									: props.onSendMessage()
							}
							disabled={!canSend && !props.isStreaming}
							size="sm"
							className="size-8 rounded p-0 border-2 border-overlay"
						>
							{props.isLoading || props.isStreaming ? (
								<SquareIcon className="size-4 fill-background" />
							) : (
								<ArrowUpIcon className="size-4" />
							)}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
