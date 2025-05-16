import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ModeSettings } from "./mode-form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

type ModeData = {
	id: string;
	slug: string;
	icon: string;
	name: string;
	description: string;
	profileSelector: string;
	modeDefinition: string;
	whenToUse: string;
	additionalInstructions: string;
};

const MODES_DATA: ModeData[] = [
	{
		id: "general",
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
		id: "research",
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
		id: "summarizer",
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
		id: "grammar-checker",
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

export function ModesSettings() {
	const [selectedModeId, setSelectedModeId] = useState<string | null>(null);
	const [showAddForm, setShowAddForm] = useState(false);
	const [newMode, setNewMode] = useState<ModeData>({
		id: "",
		slug: "",
		icon: "",
		name: "",
		description: "",
		profileSelector: "",
		modeDefinition: "",
		whenToUse: "",
		additionalInstructions: "",
	});

	function handleModeClick(modeId: string) {
		setSelectedModeId(modeId);
		setShowAddForm(false);
	}

	function handleBackClick() {
		setSelectedModeId(null);
		setShowAddForm(false);
	}

	function handleShowAddForm() {
		setSelectedModeId(null);
		setShowAddForm(true);
	}

	function handleInputChange(
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) {
		const { name, value } = e.target;
		setNewMode((prev) => ({
			...prev,
			[name]: value,
		}));
	}

	function handleAddModeSubmit(e: React.FormEvent) {
		e.preventDefault();
		console.log("New mode data:", newMode);
		// Reset form after submission
		setNewMode({
			id: "",
			slug: "",
			icon: "",
			name: "",
			description: "",
			profileSelector: "",
			modeDefinition: "",
			whenToUse: "",
			additionalInstructions: "",
		});
		setShowAddForm(false);
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

	if (showAddForm) {
		return (
			<div className="space-y-4">
				<Button variant="outline" onClick={handleBackClick}>
					&larr; Back to Modes
				</Button>

				<form onSubmit={handleAddModeSubmit} className="space-y-4">
					<div>
						<h3 className="text-xl font-semibold">Add New Mode</h3>
						<p className="text-sm text-muted-foreground">
							Create a new AI mode with custom behavior and capabilities.
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="id">ID</Label>
						<Input
							id="id"
							name="id"
							value={newMode.id}
							onChange={handleInputChange}
							placeholder="e.g., code-mode"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="slug">Slug</Label>
						<Input
							id="slug"
							name="slug"
							value={newMode.slug}
							onChange={handleInputChange}
							placeholder="e.g., code-mode"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="icon">Icon</Label>
						<Input
							id="icon"
							name="icon"
							value={newMode.icon}
							onChange={handleInputChange}
							placeholder="e.g., 💻 or path/to/icon.png"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							name="name"
							value={newMode.name}
							onChange={handleInputChange}
							placeholder="e.g., Code Mode"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							name="description"
							value={newMode.description}
							onChange={handleInputChange}
							placeholder="A summary of what this mode does."
							rows={3}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="profileSelector">Profile Selector</Label>
						<Input
							id="profileSelector"
							name="profileSelector"
							value={newMode.profileSelector}
							onChange={handleInputChange}
							placeholder="Profile selector for this mode"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="modeDefinition">Mode Definition</Label>
						<Textarea
							id="modeDefinition"
							name="modeDefinition"
							value={newMode.modeDefinition}
							onChange={handleInputChange}
							placeholder="Detailed instructions for the AI in this mode."
							rows={5}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="whenToUse">When to Use</Label>
						<Textarea
							id="whenToUse"
							name="whenToUse"
							value={newMode.whenToUse}
							onChange={handleInputChange}
							placeholder="Describe scenarios where this mode is most effective."
							rows={3}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="additionalInstructions">
							Additional Instructions
						</Label>
						<Textarea
							id="additionalInstructions"
							name="additionalInstructions"
							value={newMode.additionalInstructions}
							onChange={handleInputChange}
							placeholder="Any other specific guidelines or context for this mode."
							rows={3}
						/>
					</div>

					<div className="flex justify-between">
						<Button type="button" variant="outline" onClick={handleBackClick}>
							Cancel
						</Button>
						<Button type="submit">Add Mode</Button>
					</div>
				</form>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h3 className="text-xl font-semibold">Modes Settings</h3>
					<p className="text-sm text-muted-foreground">
						Customize the behavior and capabilities of different AI modes.
					</p>
				</div>
				<Button onClick={handleShowAddForm} className="flex items-center gap-1">
					<Plus className="h-4 w-4" />
					Add Mode
				</Button>
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
										{mode.description}
									</CardDescription>
								</div>
							</div>
							<ChevronRight className="h-5 w-5 text-muted-foreground" />
						</CardHeader>
					</Card>
				))}
			</div>
		</div>
	);
}
