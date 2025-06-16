import type { Doc, Id } from "convex/_generated/dataModel";
import { useState } from "react";
import { Combobox } from "~/components/ui/combobox";
import { useModes } from "~/lib/query/mode";

type Mode = Doc<"modes">;

type ModeSelectorProps = {
	selectedModeId?: Id<"modes">;
	onModeSelect: (modeId: Id<"modes">) => void;
};

export function ModeSelector(props: ModeSelectorProps) {
	const [open, setOpen] = useState(false);
	const modes = useModes();

	const modeOptions =
		modes?.map((mode: Mode) => ({
			value: mode._id,
			label: mode.name,
			icon: mode.icon,
		})) || [];

	const handleModeChange = (value: string) => {
		props.onModeSelect(value as Id<"modes">);
		setOpen(false);
	};

	return (
		<Combobox
			open={open}
			setOpen={setOpen}
			value={props.selectedModeId || ""}
			setValue={handleModeChange}
			options={modeOptions}
			placeholder="Select mode..."
			emptyMessage="No modes found"
			className="w-full"
			triggerClassName="bg-background"
			size="sm"
		/>
	);
}
