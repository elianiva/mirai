import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function GeneralSettings() {
	const [openRouterApiKey, setOpenRouterApiKey] = useState("");

	function handleSaveApiKey() {
		console.log("Saving OpenRouter API Key:", openRouterApiKey);
	}

	return (
		<div>
			<h3 className="text-xl font-semibold mb-4">OpenRouter Settings</h3>
			<div className="space-y-3 border p-4 rounded-md mb-6">
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
				<Button type="button" onClick={handleSaveApiKey}>
					Save API Key
				</Button>
			</div>
		</div>
	);
}
