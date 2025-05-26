import { useState } from "react";
import { Combobox } from "~/components/ui/combobox";
import { useProfileOptions } from "~/lib/query/profile";
import type { Id, Doc } from "convex/_generated/dataModel";
import { ChevronDown } from "lucide-react";

type Profile = Doc<"profiles">;

type ProfileSelectorProps = {
	selectedProfileId?: Id<"profiles">;
	onProfileSelect: (profileId: Id<"profiles">) => void;
};

export function ProfileSelector(props: ProfileSelectorProps) {
	const [open, setOpen] = useState(false);
	const profiles = useProfileOptions();

	// Transform profiles data to match the Option[] type expected by Combobox
	const profileOptions =
		profiles?.map((profile: Profile) => ({
			value: profile._id,
			label: profile.name,
			description: profile.model,
		})) || [];

	// Find selected profile
	const selectedProfile = profiles?.find(
		(profile: Profile) => profile._id === props.selectedProfileId,
	);

	const handleProfileChange = (value: string) => {
		props.onProfileSelect(value as Id<"profiles">);
		setOpen(false);
	};

	// Extract model name from full model string (e.g., "openai/gpt-4" -> "GPT 4")
	const getModelDisplayName = (model: string) => {
		const parts = model.split("/");
		const modelName = parts[parts.length - 1];
		return modelName
			.replace(/-/g, " ")
			.replace(/\b\w/g, (char) => char.toUpperCase());
	};

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
			>
				<span>
					{selectedProfile
						? `[2.00/8.00] ${getModelDisplayName(selectedProfile.model)}`
						: "Select profile"}
				</span>
				<ChevronDown className="h-3 w-3" />
			</button>

			{open && (
				<div className="absolute bottom-full right-0 z-50 mb-2 w-64">
					<Combobox
						open={open}
						setOpen={setOpen}
						value={props.selectedProfileId || ""}
						setValue={handleProfileChange}
						options={profileOptions}
						placeholder="Select profile..."
						emptyMessage="No profiles found"
						className="w-full"
					/>
				</div>
			)}
		</div>
	);
}
