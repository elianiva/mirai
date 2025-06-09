import { useForm } from "@tanstack/react-form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import {
	useAccountSettings,
	useUpdateAccountSettings,
} from "~/lib/query/account-settings";
import { updateAccountSettingsSchema } from "~/lib/functions/account-settings";
import { useUser } from "~/lib/query/user";
import { toast } from "sonner";

export function AccountSettings() {
	const { data: user } = useUser();
	const accountSettings = useAccountSettings();
	const updateAccountSettings = useUpdateAccountSettings();

	const form = useForm({
		defaultValues: {
			name: accountSettings?.name ?? user?.firstName ?? "",
			role: accountSettings?.role ?? "",
			behavior: accountSettings?.behavior ?? "",
		},
		onSubmit: ({ value }) => {
			toast.promise(updateAccountSettings(value), {
				loading: "Saving...",
				success: "Account settings saved",
				error: "Failed to save account settings",
			});
		},
		validators: {
			onChange: updateAccountSettingsSchema,
		},
	});

	return (
		<form onSubmit={form.handleSubmit} className="space-y-4 font-serif">
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
							<p className="text-xs text-muted-foreground">
								Enter how you'd like the AI to address you.
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
							<p className="text-xs text-muted-foreground">
								Let the AI know your role or profession for more tailored
								interactions.
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
							<p className="text-xs text-muted-foreground">
								Provide a global instruction for how the AI should generally
								behave.
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
			<Button type="submit">Save Changes</Button>
		</form>
	);
}
