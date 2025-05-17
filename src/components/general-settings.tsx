import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
	useOpenRouterApiKey,
	useSaveOpenRouterApiKey,
} from "~/lib/query/openrouter-settings";

export function GeneralSettings() {
	const [openRouterApiKey, setOpenRouterApiKey] = useState("");

	const { data: savedSettings, error: fetchError } = useOpenRouterApiKey();

	const { mutateAsync: saveApiKey, isPending: isSaving } =
		useSaveOpenRouterApiKey();

	useEffect(() => {
		if (savedSettings?.apiKey) {
			setOpenRouterApiKey(savedSettings.apiKey);
		}
	}, [savedSettings]);

	function handleSaveApiKey() {
		toast.promise(
			saveApiKey({
				apiKey: openRouterApiKey,
			}),
			{
				loading: "Saving...",
				success: "API key saved",
				error: "Failed to save API key",
			},
		);
	}

	return (
		<div>
			<h3 className="text-xl font-semibold mb-4">OpenRouter Settings</h3>
			<div className="space-y-3 border p-4 rounded-md mb-6">
				{fetchError && (
					<div className="text-red-500 mb-2">
						Error loading saved API key: {fetchError.message}
					</div>
				)}
				<div>
					<label
						htmlFor="openrouter-api-key"
						className="block text-sm font-medium text-foreground mb-1"
					>
						OpenRouter API Key:
					</label>
					<Input
						id="openrouter-api-key"
						type="password"
						placeholder="Enter your API Key"
						value={openRouterApiKey}
						onChange={(e) => setOpenRouterApiKey(e.target.value)}
					/>
				</div>
				<Button type="button" onClick={handleSaveApiKey} disabled={isSaving}>
					{isSaving ? "Saving..." : "Save API Key"}
				</Button>
			</div>
		</div>
	);
}
