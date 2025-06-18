import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/../convex/_generated/api";
import type { Id } from "~/../convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { Check, Copy, Globe, RefreshCw, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ShareChatDialogProps = {
	threadId: Id<"threads">;
	children: React.ReactNode;
};

export function ShareChatDialog(props: ShareChatDialogProps) {
	const sharedChat = useQuery(api.shared.getByThreadId, {
		threadId: props.threadId,
	});
	const share = useAction(api.shared.share);
	const remove = useAction(api.shared.remove);
	const [isCopied, setIsCopied] = useState(false);

	function handleShare() {
		toast.promise(share({ threadId: props.threadId }), {
			success: "Chat shared successfully",
			error: "Failed to share chat",
		});
	}

	function handleUpdate() {
		toast.promise(share({ threadId: props.threadId }), {
			success: "Snapshot updated successfully",
			error: "Failed to update snapshot",
		});
	}

	function handleRemove() {
		if (sharedChat) {
			toast.promise(remove({ threadId: props.threadId }), {
				success: "Share removed successfully",
				error: "Failed to remove share",
			});
		}
	}

	return (
		<Dialog>
			<DialogTrigger asChild>{props.children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="font-serif">Share Chat</DialogTitle>
				</DialogHeader>
				{sharedChat === undefined && (
					<div className="space-y-4">
						<Skeleton className="h-10 w-full" />
						<div className="flex justify-between">
							<Skeleton className="h-10 w-36" />
							<Skeleton className="h-10 w-36" />
						</div>
					</div>
				)}
				{sharedChat === null && (
					<div className="font-serif">
						<DialogDescription className="mb-4">
							Generate a public link to share a snapshot of this conversation.
						</DialogDescription>
						<Button onClick={handleShare} className="w-full">
							<Globe className="h-4 w-4" />
							Share to Web
						</Button>
					</div>
				)}

				{sharedChat && (
					<div>
						<DialogDescription className="mb-4">
							Anyone with the link can view a snapshot of this chat.
						</DialogDescription>
						<div className="flex items-center space-x-2">
							<Input
								value={`${window.location.origin}/share/${sharedChat._id}`}
								readOnly
							/>
							<Button
								size="icon"
								onClick={() => {
									navigator.clipboard.writeText(
										`${window.location.origin}/share/${sharedChat._id}`,
									);
									setIsCopied(true);
									toast.success("Link copied to clipboard");
									setTimeout(() => setIsCopied(false), 2000);
								}}
							>
								{isCopied ? (
									<Check className="h-4 w-4" />
								) : (
									<Copy className="h-4 w-4" />
								)}
							</Button>
						</div>
						<div className="mt-4 flex justify-between">
							<Button variant="destructive" onClick={handleRemove}>
								<Trash className="h-4 w-4" />
								Remove Share
							</Button>
							<Button onClick={handleUpdate}>
								<RefreshCw className="h-4 w-4" />
								Update Snapshot
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
