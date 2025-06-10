import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { useState } from "react";
import { ChevronRight, Plus, UserX } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { ProfileForm } from "./profile-form";
import { useProfileOptions } from "~/lib/query/profile";
import type { Doc } from "convex/_generated/dataModel";

export type ProfileData = Doc<"profiles">;

export function ProfileSettings() {
	const allProfiles = useProfileOptions();
	const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
		null,
	);
	const [showCreateForm, setShowCreateForm] = useState(false);

	function handleProfileClick(profileId: string) {
		setSelectedProfileId(profileId);
		setShowCreateForm(false);
	}

	function handleBackClick() {
		setSelectedProfileId(null);
		setShowCreateForm(false);
	}

	function handleShowCreateForm() {
		setSelectedProfileId(null);
		setShowCreateForm(true);
	}

	if (selectedProfileId) {
		const selectedProfile = allProfiles?.find(
			(profile: ProfileData) => profile._id === selectedProfileId,
		);

		if (!selectedProfile) {
			return (
				<div className="space-y-4">
					<Button variant="outline" onClick={handleBackClick}>
						&larr; Back to Profiles
					</Button>
					<div>Error: Unknown profile selected.</div>
				</div>
			);
		}

		return <ProfileForm profile={selectedProfile} onBack={handleBackClick} />;
	}

	if (showCreateForm) {
		return <ProfileForm onBack={handleBackClick} />;
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h3 className="text-xl font-semibold">Profile Settings</h3>
					<p className="text-sm text-muted-foreground">
						Manage and customize your AI profiles.
					</p>
				</div>
				<Button
					onClick={handleShowCreateForm}
					className="flex items-center gap-1"
				>
					<Plus className="h-4 w-4" />
					Create Profile
				</Button>
			</div>

			{allProfiles === undefined ? (
				<div className="flex flex-col gap-2">
					{Array.from({ length: 3 }, () => crypto.randomUUID()).map((id) => (
						<Card key={id} className="shadow-none">
							<CardHeader className="flex flex-row items-center justify-between p-4">
								<div className="flex items-center space-x-3 flex-1">
									<div className="flex-1">
										<Skeleton className="h-4 w-32 mb-2" />
										<Skeleton className="h-3 w-48" />
									</div>
								</div>
								<Skeleton className="h-5 w-5" />
							</CardHeader>
						</Card>
					))}
				</div>
			) : allProfiles.length === 0 ? (
				<Card className="flex flex-col items-center justify-center p-8 text-center">
					<CardContent className="pt-6">
						<UserX className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
						<h3 className="mt-4 text-lg font-medium">No profiles available</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							You don't have any AI profiles yet. Create a profile to get
							started.
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="flex flex-col gap-2">
					{allProfiles.map((profile: ProfileData) => (
						<Card
							key={profile._id}
							className="cursor-pointer shadow-none hover:border-primary font-serif"
							onClick={() => handleProfileClick(profile._id)}
						>
							<CardHeader className="flex flex-row items-center justify-between p-4">
								<div className="flex items-center space-x-3">
									<div>
										<CardTitle className="text-base font-medium">
											{profile.name}
										</CardTitle>
										<CardDescription className="text-xs">
											{profile.description}
										</CardDescription>
									</div>
								</div>
								<ChevronRight className="h-5 w-5 text-muted-foreground" />
							</CardHeader>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
