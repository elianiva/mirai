import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "~/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";

export type Option = {
	value: string;
	label: string;
	slug?: string;
};

type ComboboxProps = {
	open: boolean;
	setOpen: (open: boolean) => void;
	value: string;
	setValue: (value: string) => void;
	options: Option[];
	placeholder?: string;
	emptyMessage?: string;
	className?: string;
	triggerClassName?: string;
	size?: "sm" | "lg" | "default" | "icon" | null;
};

export function Combobox(props: ComboboxProps) {
	const [searchQuery, setSearchQuery] = React.useState("");

	const filteredOptions = React.useMemo(() => {
		if (!searchQuery) return props.options;

		return props.options.filter((option) => {
			const matchesLabel = option.label
				.toLowerCase()
				.includes(searchQuery.toLowerCase());
			const matchesValue = option.value
				.toLowerCase()
				.includes(searchQuery.toLowerCase());
			return matchesLabel || matchesValue;
		});
	}, [props.options, searchQuery]);

	return (
		<Popover open={props.open} onOpenChange={props.setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="secondary"
					size={props.size}
					// biome-ignore lint/a11y/useSemanticElements: we need this for searchable options
					role="combobox"
					aria-expanded={props.open}
					className={cn(
						"w-full justify-between border-none",
						props.triggerClassName,
						{
							"text-muted-foreground": !props.value,
							"text-foreground": props.value,
						},
					)}
				>
					<span className="truncate">
						{props.value
							? props.options.find((option) => option.value === props.value)
									?.label || props.value
							: props.placeholder}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className={cn("popover-content-full p-0", props.className)}
			>
				<Command className="w-full">
					<CommandInput
						placeholder={props.placeholder}
						value={searchQuery}
						onValueChange={setSearchQuery}
					/>
					<CommandList className="max-h-72 overflow-y-auto">
						<CommandEmpty>
							{props.emptyMessage || "No options found."}
						</CommandEmpty>
						<CommandGroup>
							{filteredOptions.map((option) => (
								<CommandItem
									className="flex items-center justify-between gap-2"
									key={option.value}
									value={option.value}
									onSelect={(currentValue) => {
										props.setValue(currentValue);
										props.setOpen(false);
										setSearchQuery("");
									}}
								>
									{option.value === props.value ? (
										<Check className="size-4 shrink-0" />
									) : (
										<div className="size-4 shrink-0" />
									)}
									<span className="truncate flex-1">{option.label}</span>
									<span className="text-xs text-muted-foreground truncate text-right">
										{option.slug || option.value}
									</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
