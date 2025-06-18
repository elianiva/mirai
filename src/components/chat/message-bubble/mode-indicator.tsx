import type { Id } from "convex/_generated/dataModel";
import { useModeById } from "~/lib/query/mode";
import { cn } from "~/lib/utils";

type ModeIndicatorProps = {
	modeId?: string;
	className?: string;
};

export function ModeIndicator(props: ModeIndicatorProps) {
	const mode = useModeById(props.modeId as Id<"modes">);

	return (
		<div
			className={cn(
				"inline-flex items-center gap-1 px-2 py-1 text-xs bg-sidebar rounded font-serif",
				props.className,
			)}
		>
			<span className="text-sm">{mode?.icon}</span>
			<span>
				Generated with <strong>{mode?.name}</strong> Mode
			</span>
		</div>
	);
}
