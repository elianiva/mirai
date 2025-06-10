import { GitBranch, Circle } from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useBranches, useSwitchBranch } from "~/lib/query/chat";

type BranchTimelineProps = {
	threadId: Id<"threads">;
	currentBranchId?: string;
	onBranchSwitch?: (branchId: string) => void;
};

export function BranchTimeline(props: BranchTimelineProps) {
	const branches = useBranches(props.threadId);
	const switchBranch = useSwitchBranch();

	if (!branches || branches.length === 0) {
		return null;
	}

	async function handleBranchSwitch(branchId: string) {
		await switchBranch({
			threadId: props.threadId,
			branchId,
		});
		props.onBranchSwitch?.(branchId);
	}

	return (
		<div className="flex items-center gap-2 px-4 py-2 border-b">
			<GitBranch className="h-4 w-4 text-muted-foreground" />
			<div className="flex items-center gap-1 overflow-x-auto">
				{/* Main branch */}
				<Button
					variant={!props.currentBranchId ? "default" : "ghost"}
					size="sm"
					className="h-7 px-3 text-xs gap-1"
					onClick={() => handleBranchSwitch("")}
				>
					<Circle className="h-2 w-2" />
					Main
				</Button>

				{/* Branch indicators */}
				{branches.map((branch, index) => (
					<div key={branch.branchId} className="flex items-center">
						<div className="w-4 h-px bg-border" />
						<Button
							variant={
								props.currentBranchId === branch.branchId ? "default" : "ghost"
							}
							size="sm"
							className="h-7 px-3 text-xs gap-1"
							onClick={() => handleBranchSwitch(branch.branchId)}
						>
							<Circle className="h-2 w-2" />
							Branch {index + 1}
						</Button>
					</div>
				))}
			</div>
		</div>
	);
}
