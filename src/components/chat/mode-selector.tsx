import { useState } from "react";
import { Combobox } from "~/components/ui/combobox";
import { useQuery } from "convex/react";
import { api } from "~/../convex/_generated/api";
import type { Id, Doc } from "convex/_generated/dataModel";
import { ChevronDown } from "lucide-react";

type Mode = Doc<"modes">;

type ModeSelectorProps = {
	selectedModeId?: Id<"modes">;
	onModeSelect: (modeId: Id<"modes">) => void;
};

export function ModeSelector(props: ModeSelectorProps) {
	const [open, setOpen] = useState(false);
	const modes = useQuery(api.modes.getAllModes);

	// Transform modes data to match the Option[] type expected by Combobox
	const modeOptions =
		modes?.map((mode: Mode) => ({
			value: mode._id,
			label: mode.name,
			icon: mode.icon,
		})) || [];

	// Find selected mode
	const selectedMode = modes?.find(
		(mode: Mode) => mode._id === props.selectedModeId,
	);

	const handleModeChange = (value: string) => {
		props.onModeSelect(value as Id<"modes">);
		setOpen(false);
	};

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
			>
				<span className="h-2 w-2 rounded-sm bg-current" />
				<span>{selectedMode?.name || "Select mode"}</span>
				<ChevronDown className="h-3 w-3" />
			</button>

			{open && (
				<div className="absolute bottom-full left-0 z-50 mb-2 w-64">
					<Combobox
						open={open}
						setOpen={setOpen}
						value={props.selectedModeId || ""}
						setValue={handleModeChange}
						options={modeOptions}
						placeholder="Select mode..."
						emptyMessage="No modes found"
						className="w-full"
					/>
				</div>
			)}
		</div>
	);
}
