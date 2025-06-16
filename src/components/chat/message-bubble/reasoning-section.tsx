import { ChevronRightIcon, LoaderIcon } from "lucide-react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { cn } from "~/lib/utils";
import { MarkdownRenderer } from "../markdown-renderer";

type ReasoningSectionProps = {
	reasoning: string;
	isStreamingReasoning?: boolean;
	showReasoning: boolean;
	onShowReasoningChange: (show: boolean) => void;
};

export function ReasoningSection(props: ReasoningSectionProps) {
	return (
		<div className="mb-4">
			<Collapsible
				open={props.showReasoning}
				onOpenChange={props.onShowReasoningChange}
			>
				<CollapsibleTrigger className="flex items-center gap-1 text-sm font-serif font-medium">
					{props.isStreamingReasoning ? (
						<LoaderIcon className="size-4 animate-spin" />
					) : (
						<ChevronRightIcon
							className={cn("size-4 transition-transform duration-200", {
								"rotate-90": props.showReasoning,
							})}
						/>
					)}
					<span>Reasoning</span>
				</CollapsibleTrigger>
				<CollapsibleContent className="p-4 bg-sidebar mt-2 text-sm data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
					{props.reasoning ? (
						<MarkdownRenderer
							content={props.reasoning}
							isStreaming={props.isStreamingReasoning}
						/>
					) : props.isStreamingReasoning ? (
						<div className="flex items-center gap-2 text-muted-foreground">
							<LoaderIcon className="size-3 animate-spin" />
							<span className="text-xs">Generating reasoning...</span>
						</div>
					) : null}
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}
