import { useState } from "react";
import { Combobox } from "~/components/ui/combobox";
import { useProfileOptions } from "~/lib/query/profile";
import type { Id, Doc } from "convex/_generated/dataModel";

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
			value: profile._id as string,
			label: profile.name,
			slug: profile.slug,
		})) || [];

	// Find selected profile
	const selectedProfile = profiles?.find(
		(profile: Profile) => profile._id === props.selectedProfileId,
	);

	const handleProfileChange = (value: string) => {
		props.onProfileSelect(value as Id<"profiles">);
		setOpen(false);
	};

	return (
		<Combobox
			open={open}
			setOpen={setOpen}
			value={props.selectedProfileId || ""}
			setValue={handleProfileChange}
			options={profileOptions}
			placeholder="Select profiles..."
			emptyMessage="No profiles found"
			className="w-full"
		/>
	);
}
