import { GitBranch } from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { Button } from "~/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { useMutation, useQuery } from "convex/react";
import { api } from "~/../convex/_generated/api";
import { cn } from "~/lib/utils";

type BranchIndicatorProps = {
	messageId: Id<"messages">;
	threadId: Id<"threads">;
	currentBranchId?: string;
	onBranchSwitch?: (branchId: string) => void;
};

export function BranchIndicator(props: BranchIndicatorProps) {
	const branches = useQuery(api.chat.getBranches, { threadId: props.threadId });
	const switchBranch = useMutation(api.chat.switchBranch);

	// Find branches that start from this message
	const messageBranches = branches?.filter(
		(branch: any) => branch.parentMessageId === props.messageId
	);

	if (!messageBranches || messageBranches.length === 0) {
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
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-6 px-2 text-xs gap-1"
				>
					<GitBranch className="h-3 w-3" />
					{messageBranches.length + 1} branches
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80">
				<div className="space-y-2">
					<h4 className="font-medium text-sm">Conversation Branches</h4>
					<div className="space-y-1">
						{/* Main branch */}
						<button
							type="button"
							onClick={() => handleBranchSwitch("")}
							className={cn(
								"w-full text-left p-2 rounded-md hover:bg-accent text-sm",
								!props.currentBranchId && "bg-accent"
							)}
						>
							<div className="font-medium">Main branch</div>
							<div className="text-xs text-muted-foreground">
								Original conversation
							</div>
						</button>

						{/* Alternative branches */}
						{messageBranches.map((branch: any) => (
							<button
								type="button"
								key={branch.branchId}
								onClick={() => handleBranchSwitch(branch.branchId)}
								className={cn(
									"w-full text-left p-2 rounded-md hover:bg-accent text-sm",
									props.currentBranchId === branch.branchId && "bg-accent"
								)}
							>
								<div className="font-medium">
									{branch.firstMessage.content.slice(0, 50)}
									{branch.firstMessage.content.length > 50 ? "..." : ""}
								</div>
								<div className="text-xs text-muted-foreground">
									{branch.messageCount} messages
								</div>
							</button>
						))}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
