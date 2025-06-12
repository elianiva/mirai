import type { ProfileData } from "./profile-settings";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Slider } from "~/components/ui/slider";
import type { Id } from "convex/_generated/dataModel";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { useCreateProfile, useUpdateProfile } from "~/lib/query/profile";
import { ModelSelector } from "~/components/model-selector";
import { cn, slugify } from "~/lib/utils";
import { profileFormSchema } from "~/lib/query/profile";

type ProfileFormProps = {
	profile?: ProfileData;
	onBack: () => void;
};

export function ProfileForm(props: ProfileFormProps) {
	const createProfile = useCreateProfile();
	const updateProfile = useUpdateProfile();

	const form = useForm({
		defaultValues: {
			slug: props.profile?.slug ?? "",
			name: props.profile?.name ?? "",
			description: props.profile?.description ?? "",
			model: props.profile?.model ?? "",
			temperature: props.profile?.temperature ?? 0.5,
			topP: props.profile?.topP ?? 0.5,
			topK: props.profile?.topK ?? 50,
		},
		validators: {
			onChange: profileFormSchema,
		},
		onSubmit: ({ value }) => {
			const savePromise = async () => {
				if (props.profile?._id) {
					await updateProfile({
						id: props.profile._id as Id<"profiles">,
						...value,
					});
				} else {
					await createProfile(value);
				}
				return true;
			};

			toast.promise(savePromise(), {
				loading: "Saving profile...",
				success: () => {
					props.onBack();
					return "Profile saved successfully!";
				},
				error: (err) => {
					console.error("Failed to save profile:", err);
					return "Failed to save profile";
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
					{props.profile?.name ? props.profile.name : "New Profile"}
				</h3>
				<p className="text-sm text-muted-foreground">
					Customize settings for this profile.
				</p>
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
								className={cn({
									"border-destructive": field.state.meta.errors?.length,
								})}
								required
								placeholder="balanced, creative, precise"
							/>
							{!field.state.meta.isValid ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors
										.map((error) => error?.message)
										.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground mt-1">
								A unique identifier for this profile (lowercase, no spaces).
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

									if (nameValue) {
										const slugifiedName = slugify(nameValue);
										form.setFieldValue("slug", slugifiedName);
									}
								}}
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
							<p className="text-xs text-muted-foreground mt-1">
								A unique name to identify this profile.
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
							/>
							<p className="text-xs text-muted-foreground mt-1">
								Optional details about this profile's purpose or configuration.
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
					name="model"
					children={(field) => (
						<>
							<ModelSelector
								id={field.name}
								name={field.name}
								value={field.state.value}
								onChange={(value) => field.handleChange(value)}
								required
							/>
							{!field.state.meta.isValid ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors
										.map((error) => error?.message)
										.join(", ")}
								</em>
							) : null}
						</>
					)}
				/>
			</div>
			<div className="space-y-2">
				<form.Field
					name="temperature"
					children={(field) => (
						<>
							<div className="flex justify-between items-center">
								<Label htmlFor={field.name}>
									Temperature: {field.state.value.toFixed(2)}
								</Label>
							</div>
							<Slider
								id={field.name}
								name={field.name}
								min={0}
								max={1}
								step={0.01}
								value={[field.state.value]}
								onValueChange={(value) => field.handleChange(value[0])}
							/>
							<p className="text-xs text-muted-foreground">
								Controls randomness in responses. Higher values (0.7-1.0)
								produce more creative outputs, while lower values (0.1-0.5) make
								responses more focused and deterministic.
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
					name="topP"
					children={(field) => (
						<>
							<div className="flex justify-between items-center">
								<Label htmlFor={field.name}>
									Top P: {field.state.value.toFixed(2)}
								</Label>
							</div>
							<Slider
								id={field.name}
								name={field.name}
								min={0}
								max={1}
								step={0.01}
								value={[field.state.value]}
								onValueChange={(value) => field.handleChange(value[0])}
							/>
							<p className="text-xs text-muted-foreground">
								Nucleus sampling parameter. The model considers tokens
								comprising the top P probability mass (0.0-1.0). Lower values
								make output more focused, higher values allow more variety.
							</p>
							{!field.state.meta.isValid ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors
										.map((error) => error?.message)
										.join(", ")}
								</em>
							) : null}
						</>
					)}
				/>
			</div>
			<div className="space-y-2">
				<form.Field
					name="topK"
					children={(field) => (
						<>
							<div className="flex justify-between items-center">
								<Label htmlFor={field.name}>Top K: {field.state.value}</Label>
							</div>
							<Slider
								id={field.name}
								name={field.name}
								min={1}
								max={100}
								step={1}
								value={[field.state.value]}
								onValueChange={(value) => field.handleChange(value[0])}
							/>
							<p className="text-xs text-muted-foreground">
								Limits token selection to the top K most likely tokens. Higher
								values (40-50) allow more diversity, while lower values produce
								more focused responses.
							</p>
							{!field.state.meta.isValid ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors
										.map((error) => error?.message)
										.join(", ")}
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
				<Button type="submit">
					{props.profile ? "Save" : "Create"} Profile
				</Button>
			</div>
		</form>
	);
}
