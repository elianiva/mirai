import { useNavigate } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { GitBranch, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useOpenrouterKey } from "~/hooks/use-openrouter-key";
import { useCreateDetachedBranch } from "~/lib/query/chat";
import { useUser } from "~/lib/query/user";
import { cn } from "~/lib/utils";

type MessageActionsProps = {
	isUser: boolean;
	onRegenerate?: () => void;
	onCreateBranch?: () => void;
	onRemove: () => void;
	message?: { _id: Id<"messages"> };
	threadId?: Id<"threads">;
};

export function MessageActions(props: MessageActionsProps) {
	const navigate = useNavigate();
	const { data: user } = useUser();
	const { openrouterKey } = useOpenrouterKey(user?.id);
	const mutateCreateDetachedBranch = useCreateDetachedBranch();

	async function handleCreateDetachedBranch() {
		if (!props.message?._id || !openrouterKey) {
			console.error("Missing required data for detached branch creation");
			return;
		}

		try {
			const result = await mutateCreateDetachedBranch({
				parentMessageId: props.message._id,
				openrouterKey,
				useCondensedHistory: true,
			});

			if (result.threadId) {
				navigate({ to: "/$threadId", params: { threadId: result.threadId } });
			}
		} catch (error) {
			console.error("Failed to create detached branch:", error);
		}
	}

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
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 px-2 text-xs"
								>
									<GitBranch className="size-3" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								<DropdownMenuItem
									onClick={() => {
										props.onCreateBranch?.();
									}}
								>
									Use full history
								</DropdownMenuItem>
								<DropdownMenuItem onClick={handleCreateDetachedBranch}>
									Use condensed history (detached)
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
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
