import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { auth } from "../libs/auth";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { authClient } from "~/libs/auth-client";

export const Route = createFileRoute("/authenticated")({
	beforeLoad: async ({ location }) => {
		const sessionData = await auth.api.getSession({
			headers: new Headers(),
		});

		if (!sessionData?.user) {
			throw redirect({
				to: "/login",
				search: {
					redirectFrom: location.href,
				},
			});
		}
		return {
			user: sessionData.user as {
				id: string;
				email?: string | null;
				name?: string | null;
				picture?: string | null;
			},
		};
	},
	validateSearch: z.object({
		redirectFrom: z.string().optional(),
	}),
	component: AuthenticatedComponent,
});

function AuthenticatedComponent() {
	const { user } = Route.useRouteContext();
	const router = useRouter();

	const handleSignOut = async () => {
		try {
			await authClient.signOut();
			router.invalidate();
		} catch (error) {
			console.error("Sign Out Error:", error);
		}
	};

	const userName = user?.name || user?.email?.split("@")[0] || "User";
	const userEmail = user?.email || "No email provided";
	const userInitials = (
		user?.name?.[0] ||
		user?.email?.[0] ||
		"U"
	).toUpperCase();

	return (
		<div className="flex items-center justify-center min-h-screen bg-background p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="flex justify-center mb-4">
						<Avatar className="h-24 w-24">
							<AvatarImage src={user?.picture ?? undefined} alt={userName} />
							<AvatarFallback>{userInitials}</AvatarFallback>
						</Avatar>
					</div>
					<CardTitle className="text-2xl">{userName}</CardTitle>
					<CardDescription>{userEmail}</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground text-center">
						You have successfully logged in.
					</p>
					{/* Display more user details if needed */}
					{/* <pre className="mt-4 p-2 bg-muted rounded text-xs">
						{JSON.stringify(user, null, 2)}
					</pre> */}
				</CardContent>
				<CardFooter className="flex justify-center">
					<Button variant="destructive" onClick={handleSignOut}>
						Sign Out
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
