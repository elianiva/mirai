import { ScrollArea } from "~/components/ui/scroll-area";
import { useQuery } from "convex/react";
import { api } from "~/../convex/_generated/api";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import type { Id, Doc } from "convex/_generated/dataModel";

// Define the Mode type
type Mode = Doc<"modes">;

export function ModesPanel() {
	const params = useParams({ from: "/$threadId" });
	const threadId = params.threadId as Id<"threads"> | undefined;

	const modes = useQuery(api.modes.getAllModes);
	const [selectedModeId, setSelectedModeId] = useState<string>("general");

	// Handle mode selection
	function handleModeSelect(modeId: string) {
		setSelectedModeId(modeId);
		// In a real implementation, you would update the thread's mode
		// or store the selected mode in state for the next message
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
									selectedModeId === mode.slug ? "bg-accent" : ""
								}`}
								onClick={() => handleModeSelect(mode.slug)}
								aria-pressed={selectedModeId === mode.slug}
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
								{modes.find((m: Mode) => m.slug === selectedModeId)
									?.whenToUse || "Use this mode for general conversations."}
							</p>

							<p className="mb-2 font-medium">How it works:</p>
							<p className="text-muted-foreground">
								{modes.find((m: Mode) => m.slug === selectedModeId)
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
