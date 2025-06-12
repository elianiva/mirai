import { useEffect, useState, useRef, useCallback } from "react";
import type { BlockMatch } from "@llm-ui/react";
import {
	findCompleteCodeBlock,
	findPartialCodeBlock,
	codeBlockLookBack,
} from "@llm-ui/code";
import {
	createHighlighter,
	type Highlighter,
	type BundledLanguage,
	bundledLanguages,
} from "shiki";
import { Button } from "../ui/button";
import { CopyIcon } from "lucide-react";

const ESSENTIAL_LANGS: BundledLanguage[] = [
	"javascript",
	"typescript",
	"tsx",
	"jsx",
	"json",
	"html",
	"css",
	"python",
	"bash",
	"markdown",
];

const LANGUAGE_ALIASES: Record<string, string> = {
	js: "javascript",
	ts: "typescript",
	py: "python",
	sh: "bash",
	shell: "bash",
	zsh: "bash",
	yml: "yaml",
	dockerfile: "docker",
	makefile: "make",
	"c++": "cpp",
	"c#": "csharp",
	"objective-c": "objc",
	md: "markdown",
	tex: "latex",
	plain: "text",
	plaintext: "text",
};

const ALL_BUNDLED_LANGS = Object.keys(bundledLanguages) as BundledLanguage[];

let highlighterInstance: Highlighter | null = null;
const loadedLanguages = new Set<string>(ESSENTIAL_LANGS);
const loadingLanguages = new Map<string, Promise<void>>();

const highlighterPromise = createHighlighter({
	themes: ["rose-pine-dawn"],
	langs: ESSENTIAL_LANGS,
}).then((h) => {
	highlighterInstance = h;
	return h;
});

function normalizeLanguage(lang: string): string {
	const normalized = lang.toLowerCase().trim();
	return LANGUAGE_ALIASES[normalized] || normalized;
}

function isLanguageSupported(lang: string): boolean {
	const normalized = normalizeLanguage(lang);
	return ALL_BUNDLED_LANGS.includes(normalized as BundledLanguage);
}

async function loadLanguageIfNeeded(lang: string): Promise<boolean> {
	const normalized = normalizeLanguage(lang);

	if (loadedLanguages.has(normalized)) {
		return true;
	}

	if (loadingLanguages.has(normalized)) {
		await loadingLanguages.get(normalized);
		return loadedLanguages.has(normalized);
	}

	if (!highlighterInstance) {
		await highlighterPromise;
	}

	if (!highlighterInstance) {
		console.error("Highlighter instance not available");
		return false;
	}

	if (!isLanguageSupported(normalized)) {
		console.warn(`Language not supported: ${lang} (normalized: ${normalized})`);
		return false;
	}

	const loadingPromise = (async () => {
		try {
			if (highlighterInstance) {
				await highlighterInstance.loadLanguage(normalized as BundledLanguage);
			}
			loadedLanguages.add(normalized);
			console.log(`Successfully loaded language: ${normalized}`);
		} catch (error) {
			console.error(`Failed to load language: ${normalized}`, error);
			throw error;
		} finally {
			loadingLanguages.delete(normalized);
		}
	})();

	loadingLanguages.set(normalized, loadingPromise);

	try {
		await loadingPromise;
		return true;
	} catch {
		return false;
	}
}

function extractCodeFromBlock(markdownBlock: string): {
	code: string;
	lang: string;
} {
	const match = markdownBlock.match(/^```(\w*)\n?([\s\S]*?)```$/);
	if (match) {
		return {
			lang: match[1] || "text",
			code: match[2] || "",
		};
	}
	return {
		lang: "text",
		code: markdownBlock,
	};
}

export const codeBlock = {
	findCompleteMatch: findCompleteCodeBlock(),
	findPartialMatch: findPartialCodeBlock(),
	lookBack: codeBlockLookBack(),
	component: CodeBlockComponent,
};

function CodeBlockComponent({ blockMatch }: { blockMatch: BlockMatch }) {
	const [highlightedHtml, setHighlightedHtml] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const isMountedRef = useRef(true);

	const { code, lang: rawLanguage } = extractCodeFromBlock(blockMatch.output);
	const language = normalizeLanguage(rawLanguage);

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	const highlightCode = useCallback(
		async (codeToHighlight: string, lang: string) => {
			await highlighterPromise;

			if (!highlighterInstance || !isMountedRef.current) {
				return "";
			}

			try {
				const loadedLangs = highlighterInstance.getLoadedLanguages();
				const langToUse = loadedLangs.includes(lang as BundledLanguage)
					? lang
					: "text";

				const html = highlighterInstance.codeToHtml(codeToHighlight, {
					lang: langToUse,
					theme: "rose-pine-dawn",
				});

				return html;
			} catch (error) {
				console.error("Error highlighting code:", error);
				return "";
			}
		},
		[],
	);

	useEffect(() => {
		let cancelled = false;

		const loadAndHighlight = async () => {
			if (!code) return;

			if (language === "text" || !isLanguageSupported(language)) {
				const html = await highlightCode(code, "text");
				if (!cancelled && html) {
					setHighlightedHtml(html);
				}
				return;
			}

			if (loadedLanguages.has(language)) {
				const html = await highlightCode(code, language);
				if (!cancelled && html) {
					setHighlightedHtml(html);
				}
				return;
			}

			setIsLoading(true);

			try {
				const success = await loadLanguageIfNeeded(language);
				const langToUse = success ? language : "text";
				const html = await highlightCode(code, langToUse);

				if (!cancelled && html) {
					setHighlightedHtml(html);
				}
			} catch (error) {
				console.error(`Error loading ${language}:`, error);
				const html = await highlightCode(code, "text");
				if (!cancelled && html) {
					setHighlightedHtml(html);
				}
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		};

		loadAndHighlight();

		return () => {
			cancelled = true;
		};
	}, [code, language, highlightCode]);

	const handleCopy = useCallback(async () => {
		if (!code) return;

		try {
			await navigator.clipboard.writeText(code);
		} catch (error) {
			console.error("Failed to copy code:", error);
		}
	}, [code]);

	const getHeaderText = () => {
		if (isLoading) {
			return `${rawLanguage} (loading syntax highlighting...)`;
		}
		return rawLanguage;
	};

	const shouldShowHighlighted = highlightedHtml && !isLoading;

	return (
		<div className="relative my-3 group overflow-hidden rounded-lg">
			<div className="flex items-center justify-between bg-muted p-2">
				<span
					className={`text-sm leading-none uppercase font-bold ${
						isLoading ? "text-muted-foreground" : "text-background"
					}`}
				>
					{getHeaderText()}
				</span>
				{code && !isLoading && (
					<Button
						type="button"
						onClick={handleCopy}
						size="icon"
						aria-label="Copy code to clipboard"
					>
						<CopyIcon className="size-2" />
					</Button>
				)}
			</div>
			<div className="text-sm p-2 bg-sidebar font-mono">
				{shouldShowHighlighted ? (
					<div
						className="overflow-x-auto [&>pre]:!rounded-none [&>pre]:!m-0"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: Required for syntax highlighting
						dangerouslySetInnerHTML={{ __html: highlightedHtml }}
					/>
				) : (
					<pre className="overflow-x-auto p-2 bg-secondary/30">
						<code className="text-sm font-mono">{code}</code>
					</pre>
				)}
			</div>
		</div>
	);
}
