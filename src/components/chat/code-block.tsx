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
	themes: ["github-dark", "github-light"],
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
	const [theme, setTheme] = useState<"github-dark" | "github-light">(
		"github-dark",
	);
	const [highlightedHtml, setHighlightedHtml] = useState<string>("");
	const [loadingState, setLoadingState] = useState<{
		isLoading: boolean;
		error: string | null;
	}>({ isLoading: false, error: null });

	const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isMountedRef = useRef(true);

	const { code, lang: rawLanguage } = extractCodeFromBlock(blockMatch.output);
	const language = normalizeLanguage(rawLanguage);

	useEffect(() => {
		const isDark = document.documentElement.classList.contains("dark");
		setTheme(isDark ? "github-dark" : "github-light");

		const observer = new MutationObserver(() => {
			const isDark = document.documentElement.classList.contains("dark");
			setTheme(isDark ? "github-dark" : "github-light");
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});

		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
			if (loadingTimeoutRef.current) {
				clearTimeout(loadingTimeoutRef.current);
			}
		};
	}, []);

	const highlightCode = useCallback(
		async (codeToHighlight: string, lang: string, currentTheme: string) => {
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
					theme: currentTheme,
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
				const html = await highlightCode(code, "text", theme);
				if (!cancelled && html) {
					setHighlightedHtml(html);
				}
				return;
			}

			if (loadedLanguages.has(language)) {
				const html = await highlightCode(code, language, theme);
				if (!cancelled && html) {
					setHighlightedHtml(html);
				}
				return;
			}

			setLoadingState({ isLoading: true, error: null });

			loadingTimeoutRef.current = setTimeout(() => {
				if (!cancelled) {
					setLoadingState({
						isLoading: false,
						error: "Language loading timed out",
					});
				}
			}, 5000);

			try {
				const success = await loadLanguageIfNeeded(language);

				if (loadingTimeoutRef.current) {
					clearTimeout(loadingTimeoutRef.current);
				}

				if (!cancelled) {
					if (success) {
						const html = await highlightCode(code, language, theme);
						if (html) {
							setHighlightedHtml(html);
							setLoadingState({ isLoading: false, error: null });
						}
					} else {
						const html = await highlightCode(code, "text", theme);
						if (html) {
							setHighlightedHtml(html);
						}
						setLoadingState({
							isLoading: false,
							error: `Failed to load ${language} syntax highlighting`,
						});
					}
				}
			} catch (error) {
				if (loadingTimeoutRef.current) {
					clearTimeout(loadingTimeoutRef.current);
				}

				if (!cancelled) {
					const html = await highlightCode(code, "text", theme);
					if (html) {
						setHighlightedHtml(html);
					}
					setLoadingState({
						isLoading: false,
						error: `Error loading ${language}: ${error}`,
					});
				}
			}
		};

		loadAndHighlight();

		return () => {
			cancelled = true;
		};
	}, [code, language, theme, highlightCode]);

	const handleCopy = useCallback(async () => {
		if (!code) return;

		try {
			await navigator.clipboard.writeText(code);
		} catch (error) {
			console.error("Failed to copy code:", error);
		}
	}, [code]);

	if (loadingState.isLoading) {
		return (
			<div className="relative my-3 overflow-hidden rounded-lg border">
				<div className="flex items-center justify-between bg-muted px-4 py-2 border-b">
					<span className="text-sm text-muted-foreground">
						{rawLanguage} (loading syntax highlighting...)
					</span>
				</div>
				<pre className="overflow-x-auto p-4 bg-muted/30">
					<code className="text-sm font-mono">{code}</code>
				</pre>
			</div>
		);
	}

	return (
		<div className="relative my-3 group overflow-hidden rounded-lg border">
			<div className="flex items-center justify-between bg-muted px-4 py-2 border-b">
				<span className="text-sm text-muted-foreground">
					{rawLanguage}
					{loadingState.error && ` - ${loadingState.error}`}
					{!isLanguageSupported(language) &&
						language !== "text" &&
						" (unsupported)"}
				</span>
				{code && (
					<button
						type="button"
						onClick={handleCopy}
						className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-background/80 text-xs"
						aria-label="Copy code to clipboard"
					>
						Copy
					</button>
				)}
			</div>
			<div className="text-sm p-4">
				{highlightedHtml ? (
					<div
						className="overflow-x-auto [&>pre]:!rounded-none [&>pre]:!m-0"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: Required for syntax highlighting
						dangerouslySetInnerHTML={{ __html: highlightedHtml }}
					/>
				) : (
					<pre className="overflow-x-auto p-4 bg-muted/30">
						<code className="text-sm font-mono">{code}</code>
					</pre>
				)}
			</div>
		</div>
	);
}
