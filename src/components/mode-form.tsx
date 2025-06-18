import { useForm } from "@tanstack/react-form";
import type { Id } from "convex/_generated/dataModel";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { EmojiPickerInput } from "~/components/ui/emoji-picker-input";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { ORCHESTRATOR_MODE_CONFIG } from "~/lib/defaults";
import {
	useCreateMode,
	useDeleteMode,
	useResetOrchestrator,
	useUpdateMode,
} from "~/lib/query/mode";
import { updateModeSettingsSchema } from "~/lib/query/mode";
import { cn, slugify } from "~/lib/utils";
import { ProfileSelector } from "./chat/profile-selector";

type ModeData = {
	id: string;
	slug: string;
	icon: string;
	name: string;
	description: string;
	profileId: string;
	modeDefinition: string;
	whenToUse: string;
	additionalInstructions: string;
};

type ModeSettingsProps = {
	mode?: ModeData;
	onBack: () => void;
};

export function ModeSettings(props: ModeSettingsProps) {
	const createMode = useCreateMode();
	const updateMode = useUpdateMode();
	const deleteMode = useDeleteMode();
	const resetOrchestrator = useResetOrchestrator();

	const isOrchestratorMode = props.mode?.slug === ORCHESTRATOR_MODE_CONFIG.slug;

	const form = useForm({
		defaultValues: {
			slug: props.mode?.slug || "",
			icon: props.mode?.icon || "",
			name: props.mode?.name || "",
			description: props.mode?.description || "",
			profileId: props.mode?.profileId || "",
			modeDefinition: props.mode?.modeDefinition || "",
			whenToUse: props.mode?.whenToUse || "",
			additionalInstructions: props.mode?.additionalInstructions || "",
		},
		validators: {
			onChange: updateModeSettingsSchema,
		},
		onSubmit: ({ value }) => {
			const savePromise = async () => {
				if (props.mode?.id) {
					await updateMode({
						id: props.mode.id as Id<"modes">,
						...value,
					});
				} else {
					await createMode(value);
				}
				return true;
			};

			toast.promise(savePromise(), {
				loading: "Saving mode...",
				success: () => {
					props.onBack();
					return "Mode saved successfully!";
				},
				error: (err) => {
					console.error("Failed to save mode:", err);
					return "Failed to save mode";
				},
			});
		},
	});

	const handleReset = () => {
		const resetPromise = async () => {
			const result = await resetOrchestrator();
			form.setFieldValue("slug", ORCHESTRATOR_MODE_CONFIG.slug);
			form.setFieldValue("icon", ORCHESTRATOR_MODE_CONFIG.icon);
			form.setFieldValue("name", ORCHESTRATOR_MODE_CONFIG.name);
			form.setFieldValue("description", ORCHESTRATOR_MODE_CONFIG.description);
			form.setFieldValue(
				"modeDefinition",
				ORCHESTRATOR_MODE_CONFIG.modeDefinition,
			);
			form.setFieldValue("whenToUse", ORCHESTRATOR_MODE_CONFIG.whenToUse);
			form.setFieldValue(
				"additionalInstructions",
				ORCHESTRATOR_MODE_CONFIG.additionalInstructions,
			);
			if (result.data?.profileId) {
				form.setFieldValue("profileId", result.data.profileId);
			}
			return true;
		};

		toast.promise(resetPromise(), {
			loading: "Resetting orchestrator mode...",
			success: "Orchestrator mode reset to defaults successfully!",
			error: (err) => {
				console.error("Failed to reset orchestrator mode:", err);
				return "Failed to reset orchestrator mode";
			},
		});
	};

	const handleDelete = async () => {
		if (!props.mode?.id) return;

		const deletePromise = async () => {
			if (!props.mode?.id) return;
			await deleteMode({ id: props.mode.id as Id<"modes"> });
			props.onBack();
			return true;
		};

		toast.promise(deletePromise(), {
			loading: "Deleting mode...",
			success: "Mode deleted successfully!",
			error: (err) => {
				console.error("Failed to delete mode:", err);
				return "Failed to delete mode";
			},
		});
	};

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-4"
		>
			<div className="font-serif">
				<h3 className="text-xl font-semibold">
					{props.mode?.name ? props.mode.name : "New Mode"}
					{isOrchestratorMode && (
						<span className="ml-2 text-sm font-normal text-muted-foreground">
							(System Mode)
						</span>
					)}
				</h3>
				<p className="text-sm text-muted-foreground">
					Customize settings for this mode.
					{isOrchestratorMode && (
						<span className="block mt-1 text-xs">
							This is a system mode that cannot be deleted. You can modify it or
							reset it to defaults.
						</span>
					)}
				</p>
			</div>

			<div className="space-y-2">
				<form.Field
					name="icon"
					children={(field) => (
						<div className="flex flex-col gap-2 justify-center items-center">
							<Label htmlFor={field.name}>Icon</Label>
							<EmojiPickerInput
								value={field.state.value}
								onChange={field.handleChange}
								placeholder="❓"
							/>
							{!field.state.meta.isValid ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors
										.map((error) => error?.message)
										.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground mt-1 font-serif">
								Click the button to open the emoji picker.
							</p>
						</div>
					)}
				/>
			</div>

			<div className="space-y-2">
				<form.Field
					name="slug"
					children={(field) => (
						<>
							<Label htmlFor={field.name}>
								Slug <span className="text-destructive">*</span>
							</Label>
							<Input
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="mode-name"
								className={cn({
									"border-destructive": field.state.meta.errors?.length,
								})}
								required
								disabled={isOrchestratorMode}
							/>
							{!field.state.meta.isValid ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors
										.map((error) => error?.message)
										.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground mt-1 font-serif">
								Unique identifier used in URLs and API calls. Should be
								lowercase with hyphens.
								{isOrchestratorMode && " (Read-only for system modes)"}
							</p>
						</>
					)}
				/>
			</div>

			<div className="space-y-2">
				<form.Field
					name="name"
					children={(field) => (
						<>
							<Label htmlFor={field.name}>
								Name <span className="text-destructive">*</span>
							</Label>
							<Input
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => {
									const nameValue = e.target.value;
									field.handleChange(nameValue);

									if (nameValue && !isOrchestratorMode) {
										const slugifiedName = slugify(nameValue);
										form.setFieldValue("slug", slugifiedName);
									}
								}}
								placeholder="Mode Name"
								className={cn({
									"border-destructive": field.state.meta.errors?.length,
								})}
								required
							/>
							{!field.state.meta.isValid ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors
										.map((error) => error?.message)
										.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground mt-1 font-serif">
								Display name for the mode shown in the UI and mode selector.
							</p>
						</>
					)}
				/>
			</div>

			<div className="space-y-2">
				<form.Field
					name="description"
					children={(field) => (
						<>
							<Label htmlFor={field.name}>Description</Label>
							<Textarea
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="A summary of what this mode does."
								rows={3}
								className={cn({
									"border-destructive": field.state.meta.errors?.length,
								})}
							/>
							{field.state.meta.errors && field.state.meta.errors.length > 0 ? (
								<em className="text-xs text-destructive">
									{field.state.meta.errors.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground mt-1 font-serif">
								Brief explanation of the mode's purpose and capabilities shown
								to users.
							</p>
						</>
					)}
				/>
			</div>

			<div className="space-y-2">
				<form.Field
					name="profileId"
					children={(field) => (
						<>
							<Label htmlFor={field.name}>Profile Selector</Label>
							<ProfileSelector
								selectedProfileId={field.state.value as Id<"profiles">}
								onProfileSelect={field.handleChange}
							/>
							{!field.state.meta.isValid ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors
										.map((error) => error?.message)
										.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground mt-1 font-serif">
								Determines which AI profile/personality to use when operating in
								this mode.
							</p>
						</>
					)}
				/>
			</div>

			<div className="space-y-2">
				<form.Field
					name="modeDefinition"
					children={(field) => (
						<>
							<Label htmlFor={field.name}>Mode Definition</Label>
							<Textarea
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Detailed instructions for the AI in this mode."
								rows={5}
								className={cn({
									"border-destructive": field.state.meta.errors?.length,
								})}
							/>
							{field.state.meta.errors && field.state.meta.errors.length > 0 ? (
								<em className="text-xs text-destructive">
									{field.state.meta.errors.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground mt-1 font-serif">
								Core instructions that define how the AI should behave, respond,
								and process information in this mode.
							</p>
						</>
					)}
				/>
			</div>

			<div className="space-y-2">
				<form.Field
					name="whenToUse"
					children={(field) => (
						<>
							<Label htmlFor={field.name}>When to Use</Label>
							<Textarea
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Describe scenarios where this mode is most effective."
								rows={3}
								className={cn({
									"border-destructive": field.state.meta.errors?.length,
								})}
							/>
							{field.state.meta.errors && field.state.meta.errors.length > 0 ? (
								<em className="text-xs text-destructive">
									{field.state.meta.errors.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground mt-1 font-serif">
								Guidelines for users about optimal situations to use this mode
								for best results.
							</p>
						</>
					)}
				/>
			</div>

			<div className="space-y-2">
				<form.Field
					name="additionalInstructions"
					children={(field) => (
						<>
							<Label htmlFor={field.name}>Additional Instructions</Label>
							<Textarea
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Any other specific guidelines or context for this mode."
								rows={3}
								className={cn({
									"border-destructive": field.state.meta.errors?.length,
								})}
							/>
							{field.state.meta.errors && field.state.meta.errors.length > 0 ? (
								<em className="text-xs text-destructive">
									{field.state.meta.errors.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground mt-1 font-serif">
								Supplementary directives that further refine the AI's behavior
								or provide context-specific guidance.
							</p>
						</>
					)}
				/>
			</div>
			<div className="flex justify-between">
				<Button type="button" variant="outline" onClick={props.onBack}>
					Back
				</Button>
				<div className="flex gap-2">
					{props.mode && !isOrchestratorMode && (
						<Button type="button" variant="destructive" onClick={handleDelete}>
							Delete
						</Button>
					)}
					{isOrchestratorMode && (
						<Button
							type="button"
							variant="secondary"
							onClick={handleReset}
							className="flex items-center gap-1"
						>
							<RotateCcw className="h-4 w-4" />
							Reset to Defaults
						</Button>
					)}
					<Button type="submit">{props.mode ? "Save" : "Create"} Mode</Button>
				</div>
			</div>
		</form>
	);
}
