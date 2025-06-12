import { createOpenRouter } from "@openrouter/ai-sdk-provider";

function createOpenRouterInstance(apiKey?: string) {
	return createOpenRouter({
		apiKey: apiKey || "",
		baseURL: "https://openrouter.ai/api/v1",
	});
}

const SYSTEM_PROMPT = `
<system_info>
Today is ${new Date().toISOString()}
You are currently interacting with @user_name
You are an LLM model called @model
</system_info>

<mode_definition>
@mode_definition
</mode_definition>

<ai_behavior>
@ai_behavior
</ai_behavior>

<rules>
- Prefer concise responses when possible.
- Follow the mode definition provided.
- Always use the information in <system_info> to guide your response.
- Adapt your behavior according to the <ai_behavior> section.
- Avoid overusing emojis and em-dashes.
</rules>
`;

type PromptExtra = {
	user_name: string;
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

export const getChatModel = (modelId: string, apiKey?: string) => {
	const openrouter = createOpenRouterInstance(apiKey);
	return openrouter.chat(modelId);
};
