import { useState } from "react";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { GeneralSettings } from "./general-settings";
import { AccountSettings } from "./account-settings";
import { AppearanceSettings } from "./appearance-settings";
import { AboutSettings } from "./about-settings";
import { Settings, User, Palette, Info } from "lucide-react";
import type React from "react";

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
		id: "general",
		label: "General",
		icon: Settings,
		content: <GeneralSettings />,
	},
	{
		id: "account",
		label: "Account",
		icon: User,
		content: <AccountSettings />,
	},
	{
		id: "appearance",
		label: "Appearance",
		icon: Palette,
		content: <AppearanceSettings />,
	},
	{ id: "about", label: "About", icon: Info, content: <AboutSettings /> },
];

export function SettingsDialog(props: SettingsDialogProps) {
	const [activeTab, setActiveTab] = useState<string>(NAV_ITEMS[0].id);

	const activeNavItem = NAV_ITEMS.find((item) => item.id === activeTab);

	return (
		<Dialog open={props.isOpen} onOpenChange={props.onOpenChange}>
			<DialogContent className="sm:max-w-4xl h-[calc(100vh-20rem)] flex flex-col p-0">
				<div className="flex flex-1 overflow-hidden">
					<nav className="w-56 border-r bg-muted/20 p-4 space-y-1 overflow-y-auto">
						{NAV_ITEMS.map((item) => (
							<Button
								key={item.id}
								variant={activeTab === item.id ? "default" : "ghost"}
								className="w-full justify-start shadow-none"
								onClick={() => setActiveTab(item.id)}
							>
								<item.icon className="mr-2 h-4 w-4" />
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
