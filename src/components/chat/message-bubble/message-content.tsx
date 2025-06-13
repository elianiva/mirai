import { MarkdownRenderer } from "../markdown-renderer";

type MessageContentProps = {
	content: string;
	isStreaming?: boolean;
};

export function MessageContent(props: MessageContentProps) {
	if (props.content) {
		return (
			<MarkdownRenderer
				content={props.content}
				isStreaming={props.isStreaming}
			/>
		);
	}

	if (props.isStreaming) {
		return (
			<>
				<span className="text-muted-foreground italic text-sm font-serif">
					Generating response...
				</span>
				<div className="mt-2 flex items-center gap-1">
					<div className="size-1.5 rounded-full bg-current opacity-75 animate-pulse" />
					<div className="size-1.5 rounded-full bg-current opacity-75 animate-pulse [animation-delay:0.2s]" />
					<div className="size-1.5 rounded-full bg-current opacity-75 animate-pulse [animation-delay:0.4s]" />
				</div>
			</>
		);
	}

	return (
		<span className="text-muted-foreground italic text-sm font-serif">
			No content
		</span>
	);
}
