import { GitBranch, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

type MessageActionsProps = {
	isUser: boolean;
	onRegenerate?: () => void;
	onCreateBranch?: () => void;
	onRemove: () => void;
};

export function MessageActions(props: MessageActionsProps) {
	return (
		<div
			className={cn(
				"mt-1 flex opacity-20 group-hover:opacity-100 transition-opacity",
				{
					"justify-end": props.isUser,
					"justify-start": !props.isUser,
				},
			)}
		>
			{!props.isUser && (
				<>
					{props.onRegenerate && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 px-2 text-xs"
							onClick={props.onRegenerate}
						>
							<RefreshCw className="size-3" />
						</Button>
					)}
					{props.onCreateBranch && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 px-2 text-xs"
							onClick={props.onCreateBranch}
						>
							<GitBranch className="size-3" />
						</Button>
					)}
				</>
			)}
			<Button
				variant="ghost"
				size="icon"
				className="h-7 px-2 text-xs text-destructive hover:text-destructive"
				onClick={props.onRemove}
			>
				<Trash2 className="size-3" />
			</Button>
		</div>
	);
}
