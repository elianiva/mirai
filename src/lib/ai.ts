import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
	baseURL: process.env.OPENROUTER_BASE_URL,
});

const SYSTEM_PROMPT = `
<system_info>
Date: ${new Date().toISOString()}
User: @user_name (@user_role)
Model: @model
</system_info>

<mode_definition>
@mode_definition
</mode_definition>

<ai_behavior>
@ai_behavior
</ai_behavior>

<rules>
- Prefer short and concise responses when possible.
- Follow the mode definition provided.
- Use the information in <system_info> to guide your response.
- Adapt your behavior according to the <ai_behavior> section.
- Avoid overusing emojis and em-dashes.
</rules>
`;

type PromptExtra = {
	user_name: string;
	user_role: string;
	model: string;
	mode_definition: string;
	ai_behavior: string;
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
