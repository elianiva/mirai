import { useEffect, useState } from "react";
import { retrieveAndDecrypt, encryptAndStore } from "~/lib/utils/crypto";

export function useOpenrouterKey(userId: string | undefined) {
	const [openrouterKey, setOpenrouterKey] = useState<string | null>(null);

	useEffect(() => {
		async function loadOpenrouterKey() {
			if (!userId) return;

			try {
				const decryptedKey = await retrieveAndDecrypt(userId);
				setOpenrouterKey(decryptedKey);
			} catch (error) {
				console.debug("No OpenRouter key found or failed to decrypt");
				setOpenrouterKey(null);
			}
		}

		loadOpenrouterKey();
	}, [userId]);

	async function setOpenrouterKeyEncrypted(newKey: string) {
		await encryptAndStore(userId || "", newKey);
		setOpenrouterKey(newKey);
	}

	return { openrouterKey, setOpenrouterKey: setOpenrouterKeyEncrypted };
}
