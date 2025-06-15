"use client";

import * as React from "react";
import { Button } from "~/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import {
	EmojiPicker,
	EmojiPickerSearch,
	EmojiPickerContent,
	EmojiPickerFooter,
} from "~/components/ui/emoji-picker";
import { cn } from "~/lib/utils";

type EmojiPickerInputProps = {
	value?: string;
	onChange?: (emoji: string) => void;
	className?: string;
	placeholder?: string;
	disabled?: boolean;
};

export function EmojiPickerInput(props: EmojiPickerInputProps) {
	const [open, setOpen] = React.useState(false);

	function handleEmojiSelect(emoji: { emoji: string; label: string }) {
		props.onChange?.(emoji.emoji);
		setOpen(false);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className={cn("size-12 p-0 text-lg rounded", props.className)}
					disabled={props.disabled}
				>
					{props.value || props.placeholder || "🎯"}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="rounded p-2 border" align="center">
				<EmojiPicker className="h-64 w-full" onEmojiSelect={handleEmojiSelect}>
					<EmojiPickerSearch placeholder="Search emojis..." />
					<EmojiPickerContent />
					<EmojiPickerFooter />
				</EmojiPicker>
			</PopoverContent>
		</Popover>
	);
}
