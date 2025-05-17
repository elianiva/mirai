import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { SettingsDialog } from "~/components/settings-dialog";
import { useUser } from "~/lib/query/user";
import { SignOutButton } from "@clerk/tanstack-react-start";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";

export function UserProfileSection() {
	const { data: user } = useUser();
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

	return (
		<>
			<div className="mt-auto flex items-center justify-between border-t p-4">
				<div className="flex items-center gap-2">
					<Avatar className="border">
						<AvatarImage
							src={user?.imageUrl}
							alt={user?.firstName ?? "Username"}
						/>
						<AvatarFallback>CN</AvatarFallback>
					</Avatar>
					<span>{user?.firstName}</span>
				</div>
				<div className="flex items-center">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsSettingsOpen(true)}
					>
						<Settings className="size-5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsLogoutDialogOpen(true)}
					>
						<LogOut className="size-5 text-red-500" />
					</Button>
				</div>
			</div>
			<SettingsDialog
				isOpen={isSettingsOpen}
				onOpenChange={setIsSettingsOpen}
			/>
			<Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm Logout</DialogTitle>
						<DialogDescription>
							Are you sure you want to log out of your account?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsLogoutDialogOpen(false)}
						>
							Cancel
						</Button>
						<SignOutButton>
							<Button variant="destructive" className="text-white">
								Logout
							</Button>
						</SignOutButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
