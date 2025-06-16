import type { Id } from "convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { ORCHESTRATOR_MODE_CONFIG } from "~/lib/defaults";
import { ModeSelector } from "../mode-selector";

type RegenerateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onRegenerate: (modeId: Id<"modes">) => void;
	initialModeId?: Id<"modes">;
};

export function RegenerateDialog(props: RegenerateDialogProps) {
	const [selectedModeId, setSelectedModeId] = useState<Id<"modes">>(
		props.initialModeId as Id<"modes">,
	);

	function handleRegenerate() {
		if (selectedModeId) {
			props.onRegenerate(selectedModeId);
		}
	}

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Regenerate Response</DialogTitle>
					<DialogDescription>
						Select a mode to regenerate this response with.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<ModeSelector
						selectedModeId={selectedModeId}
						onModeSelect={setSelectedModeId}
						excludeSlug={ORCHESTRATOR_MODE_CONFIG.slug}
					/>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => props.onOpenChange(false)}>
							Cancel
						</Button>
						<Button onClick={handleRegenerate}>Regenerate</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
