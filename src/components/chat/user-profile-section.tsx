import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Settings } from "lucide-react";
import { useState } from "react";
import { SettingsDialog } from "~/components/settings-dialog";
import { useUser } from "~/lib/query/user";

export function UserProfileSection() {
	const { data: user } = useUser();
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setIsSettingsOpen(true)}
				>
					<Settings className="h-5 w-5" />
				</Button>
			</div>
			<SettingsDialog
				isOpen={isSettingsOpen}
				onOpenChange={setIsSettingsOpen}
			/>
		</>
	);
}
