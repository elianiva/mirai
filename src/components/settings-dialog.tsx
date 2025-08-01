import { FileCog, Layers, User } from "lucide-react";
import { useState } from "react";
import type React from "react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { AccountSettings } from "./account-settings";
import { ModesSettings } from "./modes-settings";
import { ProfileSettings } from "./profile-settings";

type SettingsDialogProps = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
};

type NavItem = {
	id: string;
	label: string;
	icon: React.ElementType;
	content: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
	{
		id: "account",
		label: "Account",
		icon: User,
		content: <AccountSettings />,
	},
	{
		id: "modes",
		label: "Modes",
		icon: Layers,
		content: <ModesSettings />,
	},
	{
		id: "profile",
		label: "Profile Settings",
		icon: FileCog,
		content: <ProfileSettings />,
	},
];

export function SettingsDialog(props: SettingsDialogProps) {
	const [activeTab, setActiveTab] = useState<string>(NAV_ITEMS[0].id);

	const activeNavItem = NAV_ITEMS.find((item) => item.id === activeTab);

	return (
		<Dialog open={props.isOpen} onOpenChange={props.onOpenChange}>
			<DialogContent className="sm:max-w-4xl h-4/5 flex flex-col p-0">
				<div className="flex flex-1 overflow-hidden">
					<nav className="w-60 bg-sidebar p-4 space-y-1 overflow-y-auto">
						{NAV_ITEMS.map((item) => (
							<Button
								key={item.id}
								variant={activeTab === item.id ? "default" : "ghost"}
								className="w-full justify-start shadow-none"
								onClick={() => setActiveTab(item.id)}
							>
								<item.icon className="mr-2 size-4" />
								{item.label}
							</Button>
						))}
					</nav>
					<div className="flex-1 p-6 overflow-y-auto">
						{activeNavItem ? activeNavItem.content : null}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
