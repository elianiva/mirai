import { markdownLookBack } from "@llm-ui/markdown";
import { type BlockMatch, useLLMOutput, throttleBasic } from "@llm-ui/react";
import katex from "katex";
import { CopyIcon } from "lucide-react";
import { memo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { codeBlock } from "./code-block";
import "katex/dist/katex.min.css";

type MarkdownRendererProps = {
	content: string;
	isStreaming?: boolean;
};

const throttle = throttleBasic({
	adjustPercentage: 0.35,
	readAheadChars: 10,
	targetBufferChars: 9,
});

export const MarkdownRenderer = memo(function MarkdownRenderer(
	props: MarkdownRendererProps,
) {
	const { blockMatches } = useLLMOutput({
		llmOutput: props.content,
		blocks: [codeBlock],
		fallbackBlock: {
			component: MarkdownComponent,
			lookBack: markdownLookBack(),
		},
		isStreamFinished: true,
		throttle,
	});

	return (
		<div className="prose prose-sm max-w-none font-serif text-(--color-text)">
			{blockMatches.map((blockMatch) => {
				const Component = blockMatch.block.component;
				return (
					<Component
						key={`${blockMatch.startIndex}-${blockMatch.endIndex}`}
						blockMatch={blockMatch}
					/>
				);
			})}
		</div>
	);
});

function MarkdownComponent({ blockMatch }: { blockMatch: BlockMatch }) {
	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm, remarkMath]}
			rehypePlugins={[rehypeKatex]}
			components={{
				p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
				h1: ({ children }) => (
					<h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">
						{children}
					</h1>
				),
				h2: ({ children }) => (
					<h2 className="text-xl font-semibold mb-3 mt-5 first:mt-0">
						{children}
					</h2>
				),
				h3: ({ children }) => (
					<h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0">
						{children}
					</h3>
				),
				ul: ({ children }) => (
					<ul className="list-disc list-outside mb-3 space-y-1">{children}</ul>
				),
				ol: ({ children }) => (
					<ol className="list-decimal list-outside mb-3 space-y-1">
						{children}
					</ol>
				),
				li: ({ children }) => <li className="ml-4">{children}</li>,
				blockquote: ({ children }) => (
					<blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-3">
						{children}
					</blockquote>
				),
				code: ({ className, children }) => {
					const match = /language-(\w+)/.exec(className || "");
					const isInline = !match;

					if (isInline) {
						return (
							<code className="px-1.5 py-0.5 rounded text-primary bg-secondary/50 text-sm font-mono">
								{children}
							</code>
						);
					}

					return (
						<div className="relative my-3 group">
							<pre className="overflow-x-auto rounded-lg bg-secondary/50 p-4">
								<code className="text-sm font-mono">{children}</code>
							</pre>
							<button
								type="button"
								onClick={() => {
									const text = children?.toString() || "";
									navigator.clipboard.writeText(text);
								}}
								className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded bg-background/80 hover:bg-background text-xs"
							>
								<CopyIcon className="size-3" />
							</button>
						</div>
					);
				},
				a: ({ href, children }) => (
					<a
						href={href}
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary underline hover:no-underline"
					>
						{children}
					</a>
				),
				table: ({ children }) => (
					<div className="overflow-x-auto my-3">
						<table className="min-w-full divide-y divide-secondary">
							{children}
						</table>
					</div>
				),
				thead: ({ children }) => (
					<thead className="bg-secondary">{children}</thead>
				),
				tbody: ({ children }) => (
					<tbody className="divide-y divide-secondary">{children}</tbody>
				),
				tr: ({ children }) => <tr>{children}</tr>,
				th: ({ children }) => (
					<th className="px-4 py-2 text-left text-sm font-semibold">
						{children}
					</th>
				),
				td: ({ children }) => <td className="px-4 py-2 text-sm">{children}</td>,
				hr: () => <hr className="my-4 border-border" />,
				strong: ({ children }) => (
					<strong className="font-semibold">{children}</strong>
				),
				em: ({ children }) => <em className="italic">{children}</em>,
				span: ({ className, children, ...props }) => {
					if (className === "math math-inline") {
						try {
							const html = katex.renderToString(children as string, {
								throwOnError: false,
								displayMode: false,
							});
							// biome-ignore lint/security/noDangerouslySetInnerHtml: latex is safe
							return <span dangerouslySetInnerHTML={{ __html: html }} />;
						} catch {
							return <span>{children}</span>;
						}
					}
					return (
						<span className={className} {...props}>
							{children}
						</span>
					);
				},
				div: ({ className, children, ...props }) => {
					if (className === "math math-display") {
						try {
							const html = katex.renderToString(children as string, {
								throwOnError: false,
								displayMode: true,
							});
							return (
								<div
									className="my-3"
									// biome-ignore lint/security/noDangerouslySetInnerHtml: latex is safe
									dangerouslySetInnerHTML={{ __html: html }}
								/>
							);
						} catch {
							return <div className="my-3">{children}</div>;
						}
					}
					return (
						<div className={className} {...props}>
							{children}
						</div>
					);
				},
			}}
		>
			{blockMatch.output}
		</ReactMarkdown>
	);
}
