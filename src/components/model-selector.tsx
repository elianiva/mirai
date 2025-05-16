import { useState } from "react";
import { Combobox, type Option } from "~/components/ui/combobox";
import { Label } from "~/components/ui/label";
import { useOpenRouterModels } from "~/lib/query/profile";

type ModelSelectorProps = {
	value: string;
	onChange: (value: string) => void;
	id?: string;
	name?: string;
	required?: boolean;
};

export function ModelSelector(props: ModelSelectorProps) {
	const [open, setOpen] = useState(false);
	const { data: models, isLoading, error } = useOpenRouterModels();

	// Convert models to options format for the combobox
	const options: Option[] = models
		? models.map((model) => ({
				value: model.id,
				label: model.name,
			}))
		: [];

	return (
		<div className="space-y-2">
			<Label htmlFor={props.id || "model"}>Model</Label>
			{isLoading ? (
				<div className="w-full h-10 bg-muted animate-pulse rounded-md" />
			) : error ? (
				<div className="text-sm text-destructive">
					Failed to load models. Please try again.
				</div>
			) : (
				<Combobox
					open={open}
					setOpen={setOpen}
					value={props.value}
					setValue={props.onChange}
					options={options}
					placeholder="Select a model"
					emptyMessage="No models found"
					className="w-full"
				/>
			)}
			<p className="text-xs text-muted-foreground mt-1">
				The AI model to use for this profile.
			</p>
		</div>
	);
}
