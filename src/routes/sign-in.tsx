import { SignInButton } from "@clerk/tanstack-react-start";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { authStateFn } from "~/lib/functions/auth";
import { userQueryOptions } from "~/lib/query/user";

export const Route = createFileRoute("/sign-in")({
	component: SignInPage,
	beforeLoad: async ({ context }) => {
		const auth = await authStateFn();
		if (auth.userId) {
			context.queryClient.setQueryData(userQueryOptions.queryKey, {
				id: auth.userId,
				token: auth.token,
			});
			throw redirect({ to: "/$threadId", params: { threadId: "new" } });
		}
	},
});

function SignInPage() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen p-4 bg-(--color-surface)">
			<div className="w-full max-w-lg text-center mb-8 space-y-4">
				<h1 className="text-8xl font-[Cinzel_Decorative] text-(--color-text) tracking-wide">
					Mirai
				</h1>
				<p className="text-(--color-text) opacity-80 font-serif text-lg leading-relaxed max-w-lg mx-auto">
					Yet another AI Chat client because{" "}
					<a
						href="https://github.com/elianiva"
						className="font-semibold text-(--color-love) hover:text-(--color-rose) transition-colors duration-200 underline decoration-(--color-love)/30 hover:decoration-(--color-rose)/50"
					>
						elianiva
					</a>{" "}
					couldn't find one that suits him.
				</p>
				<SignInButton forceRedirectUrl="/new">
					<Button variant="default" className="w-full text-base" size="lg">
						Sign In to Continue
					</Button>
				</SignInButton>
				<p className="text-center text-sm text-(--color-muted) font-serif">
					Yes this is only available in light mode and I will not add dark mode.
				</p>
			</div>
		</div>
	);
}
