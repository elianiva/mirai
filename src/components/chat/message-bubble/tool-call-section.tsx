import { ChevronRightIcon, WrenchIcon } from "lucide-react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { useModes } from "~/lib/query/mode";
import { cn } from "~/lib/utils";
import type { ToolCall } from "~/types/message";

type ToolCallSectionProps = {
	toolCall: ToolCall;
	showToolCall?: boolean;
	onShowToolCallChange?: (show: boolean) => void;
};

export function ToolCallSection(props: ToolCallSectionProps) {
	const modes = useModes();

	const delegateTaskOutput =
		props.toolCall.name === "delegate_task"
			? (props.toolCall.output as
					| {
							selectedMode: string;
							rewrittenMessage: string;
							reasoning: string;
							originalUserMessage: string;
					  }
					| undefined)
			: undefined;

	const selectedMode =
		delegateTaskOutput?.selectedMode &&
		modes?.find((m) => m.name === delegateTaskOutput.selectedMode);

	return (
		<div className="mb-2">
			<Collapsible
				open={props.showToolCall}
				onOpenChange={props.onShowToolCallChange}
			>
				<CollapsibleTrigger className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
					<ChevronRightIcon
						className={cn("size-3 transition-transform duration-200", {
							"rotate-90": props.showToolCall,
						})}
					/>
					<WrenchIcon className="size-3" />
					<span>
						Tool: {props.toolCall.name} ({props.toolCall.status})
					</span>
				</CollapsibleTrigger>
				<CollapsibleContent className="p-3 bg-muted/30 mt-1 text-xs rounded border-l-2 border-muted overflow-hidden">
					<h5 className="font-medium text-foreground mb-1">Arguments:</h5>
					<pre className="whitespace-pre-wrap break-all text-pretty bg-background/50 p-2 rounded">
						{JSON.stringify(props.toolCall.arguments, null, 2)}
					</pre>

					{props.toolCall.name !== "delegate_task" &&
						props.toolCall.output !== undefined && (
							<>
								<h5 className="font-medium text-foreground mt-3 mb-1">
									Output:
								</h5>
								<pre className="whitespace-pre-wrap break-all text-pretty bg-background/50 p-2 rounded">
									{JSON.stringify(props.toolCall.output, null, 2) || "null"}
								</pre>
							</>
						)}

					{props.toolCall.name === "delegate_task" && delegateTaskOutput && (
						<div className="mt-4 space-y-4">
							<h4 className="flex items-center gap-1 text-sm font-serif font-medium">
								<span className="text-secondary-foreground">
									🎯 Orchestrator Decision
								</span>
							</h4>
							<div className="space-y-4">
								<div>
									<h4 className="text-sm font-medium text-foreground mb-2">
										Selected Mode:
									</h4>
									<div className="text-sm text-muted-foreground bg-background/50 p-3 rounded flex items-center gap-2">
										{selectedMode ? (
											<>
												<span className="text-base">{selectedMode.icon}</span>
												<span>{selectedMode.name}</span>
											</>
										) : (
											<span>
												{delegateTaskOutput.selectedMode || "Unknown Mode"}
											</span>
										)}
									</div>
								</div>

								<div>
									<h4 className="text-sm font-medium text-foreground mb-2">
										Original Message:
									</h4>
									<div className="text-sm text-muted-foreground bg-background/50 p-3 rounded">
										{delegateTaskOutput.originalUserMessage}
									</div>
								</div>

								{delegateTaskOutput.originalUserMessage !==
									delegateTaskOutput.rewrittenMessage && (
									<div>
										<h4 className="text-sm font-medium text-foreground mb-2">
											Rewritten Message:
										</h4>
										<div className="text-sm text-muted-foreground bg-background/50 p-3 rounded">
											{delegateTaskOutput.rewrittenMessage}
										</div>
									</div>
								)}

								{delegateTaskOutput.reasoning && (
									<div>
										<h4 className="text-sm font-medium text-foreground mb-2">
											Reasoning:
										</h4>
										<div className="text-sm text-muted-foreground bg-background/50 p-3 rounded whitespace-pre-wrap">
											{delegateTaskOutput.reasoning}
										</div>
									</div>
								)}
							</div>
						</div>
					)}
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}
