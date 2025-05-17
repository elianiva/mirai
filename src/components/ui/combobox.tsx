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
};

export function Combobox(props: ComboboxProps) {
	const [searchQuery, setSearchQuery] = React.useState("");

	// Filter options based on search query
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
					variant="outline"
					// biome-ignore lint/a11y/useSemanticElements: we need this for searchable options
					role="combobox"
					aria-expanded={props.open}
					className={cn(
						"w-full justify-between",
						!props.value && "text-muted-foreground",
					)}
				>
					{props.value
						? props.options.find((option) => option.value === props.value)
								?.label || props.value
						: props.placeholder}
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
					<CommandList>
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
										// Don't clear the value if it's the same option
										props.setValue(currentValue);
										props.setOpen(false);
										setSearchQuery(""); // Clear search when an option is selected
									}}
								>
									<span>{option.label}</span>
									<span className="text-xs text-muted-foreground">
										{option.value}
									</span>
									{option.value === props.value && (
										<Check className="ml-auto h-4 w-4 shrink-0 opacity-100" />
									)}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
