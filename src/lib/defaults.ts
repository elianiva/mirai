export const ORCHESTRATOR_MODE_ID = "orchestrator";

export const ORCHESTRATOR_MODE_CONFIG = {
	slug: "orchestrator",
	icon: "🎯",
	name: "Orchestrator",
	description: "Automatically selects the most appropriate mode for your task.",
	profileId: "", // Will use default profile
	modeDefinition:
		"An intelligent orchestrator that analyzes user queries and automatically selects the most appropriate specialized mode to handle the task. Based on the user's input, it determines whether to use General, Research, Summarizer, Grammar Checker, or other available modes for optimal results.",
	whenToUse:
		"Use this mode when you're unsure which specialized mode would be best for your task, or when you want the AI to automatically choose the optimal approach.",
	additionalInstructions:
		"First analyze the user's request to determine the most suitable mode, then respond using that mode's capabilities. Always indicate which mode was selected and why.",
};

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
	// ORCHESTRATOR_MODE_CONFIG, // TODO: revisit later
	{
		slug: "general",
		icon: "✨",
		name: "General",
		description: "Handle a wide variety of tasks and questions.",
		profileId: "",
		modeDefinition:
			"A versatile AI assistant capable of handling a wide range of tasks and providing information on various topics.",
		whenToUse:
			"Use this mode when your task doesn't fit into a specific category or for general questions.",
		additionalInstructions:
			"Make sure to answer the question in a way that is helpful and informative. If you don't know the answer, say so.",
	},
	{
		slug: "research",
		icon: "🔬",
		name: "Research",
		description: "Gather and synthesize information from various sources.",
		profileId: "",
		modeDefinition:
			"An AI specializing in information retrieval and synthesis. Capable of searching for information and providing comprehensive summaries.",
		whenToUse:
			"Use this mode when you need to research a topic, find data, or get summaries of documents.",
		additionalInstructions:
			"Specify the sources to prioritize if any. Make sure to answer the question in a way that is helpful and informative. If you don't know the answer, say so.",
	},
	{
		slug: "summarizer",
		icon: "📝",
		name: "Summarizer",
		description: "Condense text into concise summaries.",
		profileId: "",
		modeDefinition:
			"An AI skilled at summarizing text. Extracts key information and presents it concisely with clarity and accuracy.",
		whenToUse:
			"Use this mode when you have a long piece of text (document, article, conversation) that you need summarized.",
		additionalInstructions: "Make sure not to lose any information.",
	},
	{
		slug: "grammar-checker",
		icon: "✍️",
		name: "Grammar Checker",
		description: "Review and correct grammar, spelling, and punctuation.",
		profileId: "",
		modeDefinition:
			"An AI focused on linguistic analysis and correction. Identifies and suggests corrections for grammar, spelling, and punctuation errors with high precision.",
		whenToUse:
			"Use this mode when you need to proofread written content for errors.",
		additionalInstructions:
			"Provide a detailed explanation of the changes you made and why you made them.",
	},
];
