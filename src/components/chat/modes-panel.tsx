import { ScrollArea } from "~/components/ui/scroll-area";

export function ModesPanel() {
	return (
		<div className="flex h-full flex-col p-4">
			<ScrollArea className="flex-grow">
				<h2 className="mb-4 text-lg font-semibold">Modes</h2>
				{/* Placeholder for mode list items */}
				{Array.from({ length: 8 }).map((_, i) => (
					<div
						key={`mode-item-${i}`}
						className="mb-2 rounded-md border p-3 hover:bg-accent"
					>
						Mode {i + 1}
					</div>
				))}
			</ScrollArea>
		</div>
	);
}
