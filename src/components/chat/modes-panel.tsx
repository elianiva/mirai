import { ScrollArea } from "~/components/ui/scroll-area";
import { useQuery } from "convex/react";
import { api } from "~/../convex/_generated/api";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import type { Id, Doc } from "convex/_generated/dataModel";

// Define the Mode type
type Mode = Doc<"modes">;

type ModesPanelProps = {
  onModeSelect?: (modeId: Id<"modes">) => void;
};

export function ModesPanel(props: ModesPanelProps) {
	const params = useParams({ from: "/$threadId" });
	const threadId = params.threadId as Id<"threads"> | undefined;

	const modes = useQuery(api.modes.getAllModes);
	const [selectedModeId, setSelectedModeId] = useState<Id<"modes">>();

	// Handle mode selection
	function handleModeSelect(mode: Mode) {
		setSelectedModeId(mode._id);
		props.onModeSelect?.(mode._id);
	}

	return (
		<div className="flex h-full flex-col p-4">
			<ScrollArea className="flex-grow">
				<h2 className="mb-4 text-lg font-semibold">Modes</h2>

				{!modes ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin text-primary" />
					</div>
				) : (
					<div className="space-y-2">
						{modes.map((mode: Mode) => (
							<button
								type="button"
								key={mode._id}
								className={`flex w-full items-center gap-3 rounded-md border p-3 text-left hover:bg-accent ${
									selectedModeId === mode._id ? "bg-accent" : ""
								}`}
								onClick={() => handleModeSelect(mode)}
								aria-pressed={selectedModeId === mode._id}
							>
								<div className="flex h-8 w-8 items-center justify-center rounded-full border">
									<span className="text-lg">{mode.icon}</span>
								</div>
								<div>
									<div className="font-medium">{mode.name}</div>
									<div className="text-xs text-muted-foreground">
										{mode.description}
									</div>
								</div>
							</button>
						))}
					</div>
				)}

				<div className="mt-6">
					<h3 className="mb-2 text-sm font-medium">About Selected Mode</h3>
					{modes && selectedModeId && (
						<div className="rounded-md border p-3 text-sm">
							<p className="mb-2 font-medium">When to use:</p>
							<p className="mb-4 text-muted-foreground">
								{modes.find((m: Mode) => m._id === selectedModeId)
									?.whenToUse || "Use this mode for general conversations."}
							</p>

							<p className="mb-2 font-medium">How it works:</p>
							<p className="text-muted-foreground">
								{modes.find((m: Mode) => m._id === selectedModeId)
									?.modeDefinition ||
									"This mode provides general assistance for a variety of tasks."}
							</p>
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
