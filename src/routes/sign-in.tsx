import { createFileRoute } from "@tanstack/react-router";
import { SignInButton } from "@clerk/tanstack-react-start";
import { Button } from "~/components/ui/button";
import { authUserFn } from "~/lib/functions/auth";

export const Route = createFileRoute("/sign-in")({
	component: SignInComponent,
	beforeLoad: () => authUserFn(),
});

function SignInComponent() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen p-4">
			<div className="w-full max-w-md">
				<div className="text-center mb-6">
					<h3 className="text-4xl font-semibold">Mirai</h3>
					<p className="text-muted-foreground">
						Yet another AI Chat client because{" "}
						<a href="https://github.com/elianiva" className="text-blue-500">
							elianiva
						</a>{" "}
						couldn't find one that suits him.
					</p>
				</div>
				<SignInButton forceRedirectUrl="/new">
					<Button className="w-full">Sign In</Button>
				</SignInButton>
			</div>
		</div>
	);
}
