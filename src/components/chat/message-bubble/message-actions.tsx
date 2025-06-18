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
import { ORCHESTRATOR_MODE_CONFIG } from "~/lib/defaults";
import { useCreateBranch } from "~/lib/query/chat";
import { useModes } from "~/lib/query/mode";
import { useUser } from "~/lib/query/user";
import { cn } from "~/lib/utils";

type MessageActionsProps = {
	isUser: boolean;
	onRegenerate?: (modeId: Id<"modes">) => void;
	onCreateBranch?: () => void;
	onRemove: () => void;
	messageId?: Id<"messages">;
	threadId?: Id<"threads">;
};

export function MessageActions(props: MessageActionsProps) {
	const navigate = useNavigate();
	const { data: user } = useUser();
	const { openrouterKey } = useOpenrouterKey(user?.id);
	const createBranch = useCreateBranch();
	const modes = useModes();

	const availableModes = modes?.filter(
		(mode) => mode.slug !== ORCHESTRATOR_MODE_CONFIG.slug,
	);

	async function handleCreateDetachedBranch() {
		if (!props.messageId || !openrouterKey) {
			console.error("Missing required data for detached branch creation");
			return;
		}

		try {
			const result = await createBranch({
				messageId: props.messageId,
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

	function handleRegenerateWithMode(modeId: Id<"modes">) {
		props.onRegenerate?.(modeId);
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
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 px-2 text-xs"
								>
									<RefreshCw className="size-3" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="start"
								className="border-2 border-secondary shadow-none font-serif"
							>
								{availableModes?.map((mode) => (
									<DropdownMenuItem
										key={mode._id}
										className="cursor-pointer"
										onClick={() => handleRegenerateWithMode(mode._id)}
									>
										<span className="mr-2">{mode.icon}</span>
										{mode.name}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
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
							<DropdownMenuContent
								align="start"
								className="border-2 border-secondary shadow-none font-serif"
							>
								<DropdownMenuItem
									className="cursor-pointer"
									onClick={() => {
										props.onCreateBranch?.();
									}}
								>
									Use full history
								</DropdownMenuItem>
								<DropdownMenuItem
									className="cursor-pointer"
									onClick={handleCreateDetachedBranch}
								>
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
