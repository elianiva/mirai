import { useQuery, useQueryClient } from "@tanstack/react-query";
import { encryptAndStore, retrieveAndDecrypt } from "~/lib/utils/crypto";

const openRouterKeyQueryKey = (userId: string | undefined) => [
	"openrouterKey",
	userId,
];

export function useOpenrouterKey(userId: string | undefined) {
	const queryClient = useQueryClient();

	const { data: openrouterKey, isLoading } = useQuery({
		queryKey: openRouterKeyQueryKey(userId),
		queryFn: async () => {
			if (!userId) {
				return null;
			}
			try {
				const key = await retrieveAndDecrypt(userId);
				return key;
			} catch (error) {
				console.debug("No OpenRouter key found or failed to decrypt", error);
				return null;
			}
		},
		enabled: !!userId,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: Number.POSITIVE_INFINITY,
	});

	async function setOpenrouterKey(newKey: string) {
		if (!userId) {
			return;
		}
		await encryptAndStore(userId, newKey);
		queryClient.setQueryData(openRouterKeyQueryKey(userId), newKey);
	}

	return {
		openrouterKey: openrouterKey ?? null,
		setOpenrouterKey,
		isLoading,
	};
}
