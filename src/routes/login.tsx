import { createFileRoute, redirect } from "@tanstack/react-router";
import { auth } from "../libs/auth";
import { Button } from "~/components/ui/button";
import { authClient } from "~/libs/auth-client";

export const Route = createFileRoute("/login")({
	beforeLoad: async ({ location }) => {
		const sessionData = await auth.api.getSession({
			headers: new Headers(),
		});

		if (sessionData?.user) {
			throw redirect({
				to: "/authenticated",
				search: {
					redirectFrom: location.href,
				},
			});
		}
		return {};
	},
	component: LoginComponent,
});

function LoginComponent() {
	const handleGoogleSignIn = async () => {
		try {
			await authClient.signIn.social({ provider: "google" });
		} catch (error) {
			console.error("Google Sign-In Error:", error);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center min-h-screen p-4">
			<div className="text-center">
				<h3 className="text-2xl font-semibold mb-2">Login Page</h3>
				<p className="mb-6 text-muted-foreground">
					Please sign in to continue.
				</p>
				<Button
					onClick={handleGoogleSignIn}
					className="w-full max-w-xs"
					variant="outline"
				>
					Sign in with Google
				</Button>
			</div>
		</div>
	);
}
