import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { useState } from "react";
import { ChevronRight, Loader2, Plus, UserX } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ProfileForm } from "./profile-form";
import type { Doc } from "convex/_generated/dataModel";
import { useProfileOptions } from "~/lib/query/profile";

export type ProfileData = Doc<"profiles">;

export function ProfileSettings() {
	const { data: profiles } = useProfileOptions();
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

	// Find selected profile if ID is set
	const selectedProfile = selectedProfileId
		? profiles?.find((profile) => profile._id === selectedProfileId)
		: undefined;

	return (
		<>
			{selectedProfileId ? (
				!selectedProfile ? (
					<div className="space-y-4">
						<Button variant="outline" onClick={handleBackClick}>
							&larr; Back to Profiles
						</Button>
						<div>Error: Profile not found or still loading.</div>
					</div>
				) : (
					<ProfileForm profile={selectedProfile} onBack={handleBackClick} />
				)
			) : showCreateForm ? (
				<ProfileForm onBack={handleBackClick} />
			) : (
				<div className="space-y-6">
					{/* Header section with title and create button */}
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

					{/* Content section with conditional rendering using ternary operators */}
					{profiles === undefined ? (
						<div className="flex items-center justify-center p-8">
							<div className="flex flex-col items-center gap-2">
								<Loader2 className="h-8 w-8 animate-spin text-primary" />
								<p className="text-sm text-muted-foreground">
									Loading profiles...
								</p>
							</div>
						</div>
					) : profiles.length === 0 ? (
						<Card className="flex flex-col items-center justify-center p-8 text-center">
							<CardContent className="pt-6">
								<UserX className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
								<h3 className="mt-4 text-lg font-medium">
									No profiles available
								</h3>
								<p className="mt-2 text-sm text-muted-foreground">
									You don't have any AI profiles yet. Create a profile to get
									started.
								</p>
							</CardContent>
						</Card>
					) : (
						<div className="flex flex-col gap-2">
							{profiles.map((profile) => (
								<Card
									key={profile._id}
									className="cursor-pointer shadow-none hover:border-primary"
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
			)}
		</>
	);
}
