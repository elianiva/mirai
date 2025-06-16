import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "~/../convex/_generated/api";

// TODO: this might be better done with something that runs on the backend
//       but i like it being here for now, not sure
export function useAutoSeed() {
	const [hasSeeded, setHasSeeded] = useState(false);
	const [isSeeding, setIsSeeding] = useState(false);

	const modes = useQuery(api.modes.get, {});
	const profiles = useQuery(api.profiles.list, {});
	const seedDatabase = useMutation(api.seed.seedDatabase);

	useEffect(() => {
		async function checkAndSeed() {
			if (isSeeding || hasSeeded) return;

			if (modes === undefined || profiles === undefined) return;

			if (modes.length > 0 || profiles.length > 0) return;

			setIsSeeding(true);

			try {
				console.log("Auto-seeding database for new user...");
				await seedDatabase();
				setHasSeeded(true);
				console.log("Auto-seeding completed successfully");
			} catch (error) {
				console.error("Auto-seeding failed:", error);
				setIsSeeding(false);
			}
		}

		checkAndSeed();
	}, [modes, profiles, seedDatabase, isSeeding, hasSeeded]);

	return {
		isSeeding,
		hasSeeded,
		needsSeeding:
			modes !== undefined &&
			profiles !== undefined &&
			modes.length === 0 &&
			profiles.length === 0 &&
			!hasSeeded,
	};
}
