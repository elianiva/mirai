import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";

export function GeneralSettings() {
	const [openRouterApiKey, setOpenRouterApiKey] = useState("");
	const [modeName, setModeName] = useState("");
	const [modeConfig, setModeConfig] = useState("");

	function handleSaveApiKey() {
		console.log("Saving OpenRouter API Key:", openRouterApiKey);
	}

	function handleAddMode() {
		console.log("Adding new mode:", { name: modeName, config: modeConfig });
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

			<h3 className="text-xl font-semibold mb-4">Add Modes</h3>
			<div className="space-y-3 border p-4 rounded-md">
				<div>
					<label
						htmlFor="mode-name"
						className="block text-sm font-medium text-foreground mb-1"
					>
						Mode Name:
					</label>
					<Input
						id="mode-name"
						type="text"
						placeholder="Enter mode name"
						value={modeName}
						onChange={(e) => setModeName(e.target.value)}
					/>
				</div>
				<div>
					<label
						htmlFor="mode-config"
						className="block text-sm font-medium text-foreground mb-1"
					>
						Mode Configuration (JSON):
					</label>
					<Textarea
						id="mode-config"
						placeholder="Enter mode configuration (JSON)"
						value={modeConfig}
						onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
							setModeConfig(e.target.value)
						}
						rows={3}
					/>
				</div>
				<Button type="button" onClick={handleAddMode}>
					Add Mode
				</Button>
			</div>
		</div>
	);
}
