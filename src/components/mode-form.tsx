import { useForm } from "@tanstack/react-form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { useCreateMode, useUpdateMode } from "~/lib/query/mode";
import { toast } from "sonner";
import { updateModeSettingsSchema } from "~/lib/query/mode";
import { slugify } from "~/lib/utils";
import { ProfileSelector } from "./chat/profile-selector";
import type { Id } from "convex/_generated/dataModel";

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

type ModeSettingsProps = {
	mode?: ModeData;
	onBack: () => void;
};

export function ModeSettings(props: ModeSettingsProps) {
	const createMode = useCreateMode();
	const updateMode = useUpdateMode();

	const form = useForm({
		defaultValues: {
			slug: props.mode?.slug || "",
			icon: props.mode?.icon || "",
			name: props.mode?.name || "",
			description: props.mode?.description || "",
			profileSelector: props.mode?.profileSelector || "",
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

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-4"
		>
			<div>
				<h3 className="text-xl font-semibold">
					{props.mode?.name ? props.mode.name : "New Mode"}
				</h3>
				<p className="text-sm text-muted-foreground">
					Customize settings for this mode.
				</p>
			</div>

			<div className="space-y-2">
				<form.Field
					name="icon"
					children={(field) => (
						<>
							<Label htmlFor={field.name}>Icon</Label>
							<Input
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="💻 or path/to/icon.png"
							/>
							{!field.state.meta.isValid ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors
										.map((error) => error?.message)
										.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground mt-1">
								Visual identifier for the mode. Can be an emoji or path to an
								image file.
							</p>
						</>
					)}
				/>
			</div>

			<div className="space-y-2">
				<form.Field
					name="slug"
					children={(field) => (
						<>
							<Label htmlFor={field.name}>Slug</Label>
							<Input
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="mode-name"
							/>
							{!field.state.meta.isValid ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors
										.map((error) => error?.message)
										.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground mt-1">
								Unique identifier used in URLs and API calls. Should be
								lowercase with hyphens.
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
							<Label htmlFor={field.name}>Name</Label>
							<Input
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => {
									const nameValue = e.target.value;
									field.handleChange(nameValue);

									if (nameValue) {
										const slugifiedName = slugify(nameValue);
										form.setFieldValue("slug", slugifiedName);
									}
								}}
								placeholder="Mode Name"
							/>
							{!field.state.meta.isValid ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors
										.map((error) => error?.message)
										.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground mt-1">
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
							/>
							{!field.state.meta.isValid ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors
										.map((error) => error?.message)
										.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground mt-1">
								Brief explanation of the mode's purpose and capabilities shown
								to users.
							</p>
						</>
					)}
				/>
			</div>

			<div className="space-y-2">
				<form.Field
					name="profileSelector"
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
							<p className="text-xs text-muted-foreground mt-1">
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
							/>
							{!field.state.meta.isValid ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors
										.map((error) => error?.message)
										.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground mt-1">
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
							/>
							{!field.state.meta.isValid ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors
										.map((error) => error?.message)
										.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground mt-1">
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
							/>
							{!field.state.meta.isValid ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors
										.map((error) => error?.message)
										.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground mt-1">
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
				<Button type="submit">{props.mode ? "Save" : "Create"} Mode</Button>
			</div>
		</form>
	);
}
