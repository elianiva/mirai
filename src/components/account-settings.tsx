import { useForm } from "@tanstack/react-form";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { useOpenrouterKey } from "~/hooks/use-openrouter-key";
import {
	useAccountSettings,
	useUpdateAccountSettings,
} from "~/lib/query/account-settings";
import { useUser } from "~/lib/query/user";

export function AccountSettings() {
	const { data: user } = useUser();
	const accountSettings = useAccountSettings();
	const updateAccountSettings = useUpdateAccountSettings();
	const { openrouterKey, setOpenrouterKey, isLoading } = useOpenrouterKey(user?.id);

	const form = useForm({
		defaultValues: {
			name: accountSettings?.name ?? user?.firstName ?? "",
			role: accountSettings?.role ?? "",
			behavior: accountSettings?.behavior ?? "",
			openrouterKey: openrouterKey ?? "",
		},
		onSubmit: async ({ value }) => {
			if (!value.openrouterKey || value.openrouterKey.trim() === "") {
				toast.error("OpenRouter API key is required");
				return;
			}

			await setOpenrouterKey(value.openrouterKey as string);

			toast.promise(
				updateAccountSettings({
					name: value.name,
					role: value.role,
					behavior: value.behavior,
				}),
				{
					loading: "Saving...",
					success: "Account settings saved",
					error: "Failed to save account settings",
				},
			);
		},
	});

	// Sync form field when openrouterKey changes from React Query
	useEffect(() => {
		if (openrouterKey !== null) {
			form.setFieldValue("openrouterKey", openrouterKey);
		}
	}, [openrouterKey, form]);

	if (accountSettings === undefined || isLoading) {
		return (
			<div className="space-y-4 font-serif">
				<div>
					<h3 className="text-xl font-semibold">Account Settings</h3>
					<p className="text-sm text-muted-foreground">
						Manage your account details here.
					</p>
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-3 w-64" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-3 w-72" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-56" />
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-3 w-80" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-3 w-96" />
				</div>
				<Skeleton className="h-10 w-32" />
			</div>
		);
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="space-y-4 font-serif"
		>
			<div>
				<h3 className="text-xl font-semibold">Account Settings</h3>
				<p className="text-sm text-muted-foreground">
					Manage your account details here.
				</p>
			</div>
			<div className="space-y-2">
				<form.Field
					name="name"
					children={(field) => (
						<>
							<Label htmlFor={field.name}>What the AI should call you</Label>
							<Input
								id={field.name}
								name={field.name}
								value={field.state.value as string}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
							{field.state.meta.errors.length > 0 ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground">
								Enter how you'd like the AI to address you.
							</p>
						</>
					)}
				/>
			</div>
			<div className="space-y-2">
				<form.Field
					name="role"
					children={(field) => (
						<>
							<Label htmlFor={field.name}>What you do</Label>
							<Input
								id={field.name}
								name={field.name}
								value={field.state.value as string}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="e.g., Software Engineer, Designer, Student"
							/>
							{field.state.meta.errors.length > 0 ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground">
								Let the AI know your role or profession for more tailored
								interactions.
							</p>
						</>
					)}
				/>
			</div>
			<div className="space-y-2">
				<form.Field
					name="behavior"
					children={(field) => (
						<>
							<Label htmlFor={field.name}>
								General AI Behaviour (Global Instruction)
							</Label>
							<Textarea
								id={field.name}
								name={field.name}
								value={field.state.value as string}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="e.g., Be concise and to the point. Prefer examples in Python."
								rows={5}
							/>
							{field.state.meta.errors.length > 0 ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground">
								Provide a global instruction for how the AI should generally
								behave.
							</p>
						</>
					)}
				/>
			</div>
			<div className="space-y-2">
				<form.Field
					name="openrouterKey"
					validators={{
						onChange: ({ value }) => {
							if (!value || value.trim() === "") {
								return "OpenRouter API key is required to use OpenRouter models";
							}
							if (!value.startsWith("sk-or-")) {
								return "OpenRouter API key should start with 'sk-or-'";
							}
							return undefined;
						},
					}}
					children={(field) => (
						<>
							<Label htmlFor={field.name}>OpenRouter Key (Required)</Label>
							<Input
								id={field.name}
								name={field.name}
								type="password"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => {
									field.handleChange(e.target.value);
								}}
								placeholder="sk-or-..."
								required
							/>
							{field.state.meta.errors.length > 0 ? (
								<em className="text-xs text-destructive my-0">
									{field.state.meta.errors.join(", ")}
								</em>
							) : null}
							<p className="text-xs text-muted-foreground">
								Your OpenRouter API key is required to use OpenRouter models.
								Stored encrypted in your browser.
							</p>
						</>
					)}
				/>
			</div>
			<Button type="submit">Save Changes</Button>
		</form>
	);
}
