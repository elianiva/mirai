import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
	baseURL: process.env.OPENROUTER_BASE_URL,
});

const SYSTEM_PROMPT = `
<system_info>
Date: ${new Date().toISOString()}
User: @user_name
Model: @model
</system_info>

<mode_definition>
@mode_definition
</mode_definition>

<rules>
- Prefer short and concise responses when possible.
- Follow the mode definition provided.
- Use the information in <system_info> to guide your response.
- Avoid overusing emojis and em-dashes.
</rules>
`;

type PromptExtra = {
	user_name: string;
	model: string;
	mode_definition: string;
	[key: string]: string;
};

export function buildSystemPrompt(extra: PromptExtra) {
	let prompt = SYSTEM_PROMPT;

	for (const [key, value] of Object.entries(extra)) {
		prompt = prompt.replace(`@${key}`, value);
	}

	return prompt;
}

export const getChatModel = (modelId: string) => openrouter.chat(modelId);
