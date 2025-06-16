import type { Doc } from "convex/_generated/dataModel";
import { ChevronRight, Plus, UserX } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { useModes } from "~/lib/query/mode";
import { ModeSettings } from "./mode-form";

export type ModeData = Doc<"modes">;

export function ModesSettings() {
	const modes = useModes();

	const [selectedModeId, setSelectedModeId] = useState<string | null>(null);
	const [showAddForm, setShowAddForm] = useState(false);
	const [newMode, setNewMode] = useState<
		Omit<ModeData, "_id" | "_creationTime">
	>({
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
		setNewMode({
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
		const selectedMode = modes?.find(
			(mode: ModeData) => mode._id === selectedModeId,
		);

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

		const modeForForm = {
			id: selectedMode._id,
			slug: selectedMode.slug,
			icon: selectedMode.icon,
			name: selectedMode.name,
			description: selectedMode.description,
			profileSelector: selectedMode.profileSelector,
			modeDefinition: selectedMode.modeDefinition,
			whenToUse: selectedMode.whenToUse,
			additionalInstructions: selectedMode.additionalInstructions,
		};

		return <ModeSettings mode={modeForForm} onBack={handleBackClick} />;
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
				<div className="font-serif">
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
			{modes === undefined ? (
				<div className="flex flex-col gap-2">
					{Array.from({ length: 4 }, () => crypto.randomUUID()).map((id) => (
						<Card key={id} className="shadow-none">
							<div className="flex flex-row items-center justify-between p-3">
								<div className="flex items-center space-x-3 flex-1">
									<Skeleton className="size-12 rounded" />
									<div className="flex-1">
										<Skeleton className="h-4 w-24 mb-2" />
										<Skeleton className="h-3 w-40" />
									</div>
								</div>
								<Skeleton className="h-5 w-5" />
							</div>
						</Card>
					))}
				</div>
			) : modes.length === 0 ? (
				<Card className="flex flex-col items-center justify-center p-8 text-center">
					<CardContent className="pt-6">
						<UserX className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
						<h3 className="mt-4 text-lg font-medium">No modes available</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							You don't have any AI modes yet. Create a mode to get started or
							run the database seeding.
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="flex flex-col gap-2">
					{modes.map((mode: ModeData) => (
						<Card
							key={mode._id}
							className="cursor-pointer shadow-none hover:border-primary flex flex-row items-center justify-between p-3 font-serif"
							onClick={() => handleModeClick(mode._id)}
						>
							<div className="flex items-center space-x-3">
								<div className="size-12 text-xl rounded flex items-center justify-center bg-background">
									{mode.icon}
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
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
