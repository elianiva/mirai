import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Combobox } from "~/components/ui/combobox";
import { Textarea } from "~/components/ui/textarea";
import { useUpdateModeSettings } from "~/lib/query/mode";
import { useProfileOptions } from "~/lib/query/profile";
import { toast } from "sonner";
import { updateModeSettingsSchema } from "~/lib/query/mode";

/**
 * Converts a string to a URL-friendly slug
 * - Converts to lowercase
 * - Replaces spaces and non-alphanumeric characters with hyphens
 * - Removes leading/trailing hyphens
 */
function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "") // Remove non-word chars except spaces and hyphens
		.replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
		.replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

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
	mode: ModeData;
	onBack: () => void;
};

export function ModeSettings(props: ModeSettingsProps) {
	const updateModeSettingMutation = useUpdateModeSettings();
	const profileData = useProfileOptions();
	const [open, setOpen] = React.useState(false);

	// Transform profile data to match the Option[] type expected by Combobox
	const profileOptions = React.useMemo(() => {
		if (!profileData) return [];
		return profileData.map((profile) => ({
			value: profile._id,
			label: profile.name,
		}));
	}, [profileData]);

	const form = useForm({
		defaultValues: {
			slug: props.mode.slug,
			icon: props.mode.icon,
			name: props.mode.name,
			description: props.mode.description,
			profileSelector: props.mode.profileSelector,
			modeDefinition: props.mode.modeDefinition,
			whenToUse: props.mode.whenToUse,
			additionalInstructions: props.mode.additionalInstructions,
		},
		onSubmit: ({ value }) => {
			toast.promise(updateModeSettingMutation(value), {
				loading: "Saving...",
				success: "Settings saved",
				error: "Failed to save settings",
			});
		},
		validators: {
			onChange: updateModeSettingsSchema,
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
				<h3 className="text-xl font-semibold">{props.mode.name} Settings</h3>
				<p className="text-sm text-muted-foreground">
					Customize settings for the {props.mode.name} mode.
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
								placeholder="e.g., 💻 or path/to/icon.png"
							/>
							<p className="text-xs text-muted-foreground mt-1">
								Visual identifier for the mode. Can be an emoji or path to an
								image file.
							</p>
							{field.state.meta.errors && field.state.meta.errors.length > 0 ? (
								<em className="text-xs text-destructive">
									{field.state.meta.errors.join(", ")}
								</em>
							) : null}
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
								placeholder="e.g., code-mode"
							/>
							<p className="text-xs text-muted-foreground mt-1">
								Unique identifier used in URLs and API calls. Should be
								lowercase with hyphens.
							</p>
							{field.state.meta.errors && field.state.meta.errors.length > 0 ? (
								<em className="text-xs text-destructive">
									{field.state.meta.errors.join(", ")}
								</em>
							) : null}
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

									// Auto-update the slug field with a slugified version of the name
									if (nameValue) {
										const slugifiedName = slugify(nameValue);
										form.setFieldValue("slug", slugifiedName);
									}
								}}
								placeholder="e.g., Code Mode"
							/>
							<p className="text-xs text-muted-foreground mt-1">
								Display name for the mode shown in the UI and mode selector.
							</p>
							{field.state.meta.errors && field.state.meta.errors.length > 0 ? (
								<em className="text-xs text-destructive">
									{field.state.meta.errors.join(", ")}
								</em>
							) : null}
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
							<p className="text-xs text-muted-foreground mt-1">
								Brief explanation of the mode's purpose and capabilities shown
								to users.
							</p>
							{field.state.meta.errors && field.state.meta.errors.length > 0 ? (
								<em className="text-xs text-destructive">
									{field.state.meta.errors.join(", ")}
								</em>
							) : null}
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
							<Combobox
								open={open}
								setOpen={setOpen}
								value={field.state.value}
								setValue={field.handleChange}
								options={profileOptions}
								placeholder={
									profileData === undefined
										? "Loading profiles..."
										: "Select profile..."
								}
								emptyMessage={
									profileData === undefined
										? "Loading..."
										: "No profiles found."
								}
								// id={field.name} // Combobox might not need id directly
								// name={field.name} // Combobox might not need name directly
							/>
							<p className="text-xs text-muted-foreground mt-1">
								Determines which AI profile/personality to use when operating in
								this mode.
							</p>
							{field.state.meta.errors && field.state.meta.errors.length > 0 ? (
								<em className="text-xs text-destructive">
									{field.state.meta.errors.join(", ")}
								</em>
							) : null}
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
							<p className="text-xs text-muted-foreground mt-1">
								Core instructions that define how the AI should behave, respond,
								and process information in this mode.
							</p>
							{field.state.meta.errors && field.state.meta.errors.length > 0 ? (
								<em className="text-xs text-destructive">
									{field.state.meta.errors.join(", ")}
								</em>
							) : null}
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
							<p className="text-xs text-muted-foreground mt-1">
								Guidelines for users about optimal situations to use this mode
								for best results.
							</p>
							{field.state.meta.errors && field.state.meta.errors.length > 0 ? (
								<em className="text-xs text-destructive">
									{field.state.meta.errors.join(", ")}
								</em>
							) : null}
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
							<p className="text-xs text-muted-foreground mt-1">
								Supplementary directives that further refine the AI's behavior
								or provide context-specific guidance.
							</p>
							{field.state.meta.errors && field.state.meta.errors.length > 0 ? (
								<em className="text-xs text-destructive">
									{field.state.meta.errors.join(", ")}
								</em>
							) : null}
						</>
					)}
				/>
			</div>
			<div className="flex justify-between">
				<Button type="button" variant="outline" onClick={props.onBack}>
					Back
				</Button>
				<Button type="submit">Save {props.mode.name} Settings</Button>
			</div>
		</form>
	);
}
