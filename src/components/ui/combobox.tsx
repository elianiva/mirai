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
	return (
		<Popover open={props.open} onOpenChange={props.setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					// biome-ignore lint/a11y/useSemanticElements: we need this for searchable options
					role="combobox"
					aria-expanded={props.open}
					className="w-full justify-between"
				>
					{props.value
						? props.options.find((option) => option.value === props.value)
								?.label
						: props.placeholder}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className={cn("min-w-full p-0", props.className)}>
				<Command>
					<CommandInput placeholder={props.placeholder} />
					<CommandList>
						<CommandEmpty>
							{props.emptyMessage || "No options found."}
						</CommandEmpty>
						<CommandGroup>
							{props.options.map((option) => (
								<CommandItem
									key={option.value}
									value={option.value}
									onSelect={(currentValue) => {
										props.setValue(
											currentValue === props.value ? "" : currentValue,
										);
										props.setOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											props.value === option.value
												? "opacity-100"
												: "opacity-0",
										)}
									/>
									{option.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
