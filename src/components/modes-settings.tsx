import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ModeSettings } from "./mode-form"; // Import the new unified component

// Define a more detailed type for mode data, matching ModeSettings props
type ModeData = {
	id: string;
	icon: string;
	name: string;
	description: string;
	profileSelector: string; // Placeholder for dropdown
	modeDefinition: string;
	whenToUse: string;
	additionalInstructions: string;
};

const MODES_DATA: ModeData[] = [
	{
		id: "general",
		icon: "✨",
		name: "General",
		description: "Handle a wide variety of tasks and questions.",
		profileSelector: "", // Placeholder
		modeDefinition:
			"You are Roo, a versatile AI assistant capable of handling a wide range of tasks and providing information on various topics.",
		whenToUse:
			"Use this mode when your task doesn't fit into a specific category or for general questions.",
		additionalInstructions: "",
	},
	{
		id: "research",
		icon: "🔬",
		name: "Research",
		description: "Gather and synthesize information from various sources.",
		profileSelector: "", // Placeholder
		modeDefinition:
			"You are Roo, an AI specializing in information retrieval and synthesis. You can search for information and provide summaries.",
		whenToUse:
			"Use this mode when you need to research a topic, find data, or get summaries of documents.",
		additionalInstructions: "Specify the sources to prioritize if any.",
	},
	{
		id: "summarizer",
		icon: "📝",
		name: "Summarizer",
		description: "Condense text into concise summaries.",
		profileSelector: "", // Placeholder
		modeDefinition:
			"You are Roo, an AI skilled at summarizing text. You can extract key information and present it concisely.",
		whenToUse:
			"Use this mode when you have a long piece of text (document, article, conversation) that you need summarized.",
		additionalInstructions:
			"Specify the desired length or level of detail for the summary.",
	},
	{
		id: "grammar-checker",
		icon: "✍️",
		name: "Grammar Checker",
		description: "Review and correct grammar, spelling, and punctuation.",
		profileSelector: "", // Placeholder
		modeDefinition:
			"You are Roo, an AI focused on linguistic analysis and correction. You can identify and suggest corrections for grammar, spelling, and punctuation errors.",
		whenToUse:
			"Use this mode when you need to proofread written content for errors.",
		additionalInstructions:
			"Specify the language and any specific style guidelines.",
	},
];

export function ModesSettings() {
	const [selectedModeId, setSelectedModeId] = useState<string | null>(null);

	function handleModeClick(modeId: string) {
		setSelectedModeId(modeId);
	}

	function handleBackClick() {
		setSelectedModeId(null);
	}

	if (selectedModeId) {
		const selectedMode = MODES_DATA.find((mode) => mode.id === selectedModeId);

		if (!selectedMode) {
			return (
				<div className="space-y-4">
					<Button variant="outline" onClick={handleBackClick}>
						&larr; Back to Modes
					</Button>
					<div>Error: Unknown mode selected.</div>
				</div>
			);
		}

		return <ModeSettings mode={selectedMode} onBack={handleBackClick} />;
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-xl font-semibold">Modes Settings</h3>
				<p className="text-sm text-muted-foreground">
					Customize the behavior and capabilities of different AI modes.
				</p>
			</div>
			<div className="flex flex-col gap-2">
				{MODES_DATA.map((mode) => (
					<Card
						key={mode.id}
						className="cursor-pointer shadow-none hover:border-primary"
						onClick={() => handleModeClick(mode.id)}
					>
						<CardHeader className="flex flex-row items-center justify-between p-4">
							<div className="flex items-center space-x-3">
								<div className="w-10 h-10 rounded-full border flex items-center justify-center">
									<span className="text-xl">{mode.icon}</span>
								</div>
								<div>
									<CardTitle className="text-base font-medium">
										{mode.name}
									</CardTitle>
									<CardDescription className="text-xs">
										{mode.description} {/* This uses the list description */}
									</CardDescription>
								</div>
							</div>
							<ChevronRight className="h-5 w-5 text-muted-foreground" />
						</CardHeader>
						{/* CardContent can be removed if description is moved to header or not needed separately */}
						{/* <CardContent>
							<CardDescription>{mode.description}</CardDescription>
						</CardContent> */}
					</Card>
				))}
			</div>
		</div>
	);
}
