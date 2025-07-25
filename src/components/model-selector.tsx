import { Brain } from "lucide-react";
import { useState } from "react";
import { Combobox } from "~/components/ui/combobox";
import { Label } from "~/components/ui/label";
import { useOpenRouterModels } from "~/lib/query/profile";
import { cn } from "~/lib/utils";

type ModelSelectorProps = {
	value: string;
	onChange: (value: string) => void;
	id?: string;
	name?: string;
	required?: boolean;
};

export function ModelSelector(props: ModelSelectorProps) {
	const [open, setOpen] = useState(false);
	const { data: models = [], isLoading, error } = useOpenRouterModels();

	const handleModelChange = (value: string) => {
		props.onChange(value);
	};

	const modelsWithIcons = models.map((model) => ({
		...model,
		slug: model.value,
		icon: model.value.includes(":thinking") ? (
			<Brain className="size-4" />
		) : undefined,
	}));

	return (
		<div className="space-y-2 w-full">
			<Label htmlFor={props.id || "model"}>
				Model {props.required && <span className="text-destructive">*</span>}
			</Label>
			{isLoading ? (
				<div className="w-full h-10 bg-secondary animate-pulse rounded-md" />
			) : error ? (
				<div className="text-sm text-destructive">
					Failed to load models. Please try again.
				</div>
			) : (
				<Combobox
					open={open}
					setOpen={setOpen}
					value={props.value}
					setValue={handleModelChange}
					options={modelsWithIcons}
					placeholder="Select a model"
					emptyMessage="No models found"
					matchTriggerWidth
					className={cn(
						"w-full",
						props.required && !props.value && "border-destructive",
					)}
				/>
			)}
			<p className="text-xs text-muted-foreground mt-1 font-serif">
				The AI model to use for this profile.
			</p>
		</div>
	);
}
