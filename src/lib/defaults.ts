export const DEFAULT_PROFILES = [
	{
		name: "Balanced",
		slug: "balanced",
		description: "A well-balanced profile suitable for most conversations",
		model: "google/gemini-2.5-flash-preview-05-20",
		temperature: 0.7,
		topP: 0.9,
		topK: 40,
	},
	{
		name: "Creative",
		slug: "creative",
		description: "Higher creativity for brainstorming and creative tasks",
		model: "google/gemini-2.5-flash-preview-05-20",
		temperature: 0.9,
		topP: 0.95,
		topK: 50,
	},
	{
		name: "Precise",
		slug: "precise",
		description: "Lower temperature for factual and analytical tasks",
		model: "google/gemini-2.5-flash-preview-05-20",
		temperature: 0.3,
		topP: 0.8,
		topK: 30,
	},
];

export const DEFAULT_MODES = [
	{
		slug: "general",
		icon: "✨",
		name: "General",
		description: "Handle a wide variety of tasks and questions.",
		profileSelector: "",
		modeDefinition:
			"A versatile AI assistant capable of handling a wide range of tasks and providing information on various topics.",
		whenToUse:
			"Use this mode when your task doesn't fit into a specific category or for general questions.",
		additionalInstructions: "",
	},
	{
		slug: "research",
		icon: "🔬",
		name: "Research",
		description: "Gather and synthesize information from various sources.",
		profileSelector: "",
		modeDefinition:
			"An AI specializing in information retrieval and synthesis. Capable of searching for information and providing comprehensive summaries.",
		whenToUse:
			"Use this mode when you need to research a topic, find data, or get summaries of documents.",
		additionalInstructions: "Specify the sources to prioritize if any.",
	},
	{
		slug: "summarizer",
		icon: "📝",
		name: "Summarizer",
		description: "Condense text into concise summaries.",
		profileSelector: "",
		modeDefinition:
			"An AI skilled at summarizing text. Extracts key information and presents it concisely with clarity and accuracy.",
		whenToUse:
			"Use this mode when you have a long piece of text (document, article, conversation) that you need summarized.",
		additionalInstructions:
			"Specify the desired length or level of detail for the summary.",
	},
	{
		slug: "grammar-checker",
		icon: "✍️",
		name: "Grammar Checker",
		description: "Review and correct grammar, spelling, and punctuation.",
		profileSelector: "",
		modeDefinition:
			"An AI focused on linguistic analysis and correction. Identifies and suggests corrections for grammar, spelling, and punctuation errors with high precision.",
		whenToUse:
			"Use this mode when you need to proofread written content for errors.",
		additionalInstructions:
			"Specify the language and any specific style guidelines.",
	},
];
