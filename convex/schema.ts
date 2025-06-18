import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const accountSettings = defineTable({
	name: v.string(),
	role: v.string(),
	behavior: v.string(),
});

export const modes = defineTable({
	userId: v.string(),
	slug: v.string(),
	icon: v.string(),
	name: v.string(),
	description: v.string(),
	profileId: v.string(),
	modeDefinition: v.string(),
	whenToUse: v.string(),
	additionalInstructions: v.string(),
})
	.index("by_user", ["userId"])
	.index("by_user_slug", ["userId", "slug"]);

export const profiles = defineTable({
	userId: v.string(),
	slug: v.string(),
	name: v.string(),
	description: v.string(),
	model: v.string(),
	temperature: v.number(),
	topP: v.number(),
	topK: v.number(),
})
	.index("by_user", ["userId"])
	.index("by_user_slug", ["userId", "slug"]);

export const threads = defineTable({
	title: v.string(),
	parentThreadId: v.optional(v.id("threads")),
});

export const attachments = defineTable({
	storageId: v.string(),
	filename: v.string(),
	contentType: v.string(),
	size: v.number(),
	uploadedBy: v.string(),
	uploadedAt: v.number(),
	messageId: v.optional(v.id("messages")),
})
	.index("by_uploader", ["uploadedBy"])
	.index("by_storage_id", ["storageId"])
	.index("by_message", ["messageId"]);

export const messages = defineTable({
	threadId: v.id("threads"),
	senderId: v.string(),
	content: v.string(),
	role: v.union(v.literal("user"), v.literal("assistant")),
	metadata: v.optional(
		v.object({
			isStreaming: v.optional(v.boolean()),
			modeId: v.optional(v.string()),
			profileId: v.optional(v.string()),
			reasoning: v.optional(v.string()),
			modelName: v.optional(v.string()),
			finishReason: v.optional(v.string()),
			isCondensedHistory: v.optional(v.boolean()),
			originalThreadId: v.optional(v.id("threads")),
			isPendingOrchestrator: v.optional(v.boolean()),
			isStreamingToolCalls: v.optional(v.boolean()),
			isDelegatedTask: v.optional(v.boolean()),
			originalMessage: v.optional(v.string()),
			delegationReasoning: v.optional(v.string()),
			isDelegatedExecution: v.optional(v.boolean()),
			delegationMetadata: v.optional(
				v.object({
					selectedMode: v.string(),
					rewrittenMessage: v.string(),
					reasoning: v.string(),
					originalUserMessage: v.string(),
				}),
			),
			toolCallMetadata: v.optional(
				v.array(
					v.object({
						name: v.string(),
						status: v.union(
							v.literal("streaming"),
							v.literal("success"),
							v.literal("error"),
						),
						arguments: v.any(),
						output: v.any(),
						startTime: v.optional(v.number()),
						endTime: v.optional(v.number()),
						streamingArgs: v.optional(v.string()), // For partial arguments
						toolCallId: v.optional(v.string()),
					}),
				),
			),
		}),
	),
	attachmentIds: v.optional(v.array(v.id("attachments"))),
}).index("by_thread", ["threadId"]);

const schema = defineSchema({
	accountSettings,
	modes,
	profiles,
	threads,
	attachments,
	messages,
	sharedChats: defineTable({
		threadId: v.id("threads"),
		chatSnapshot: v.string(),
	}).index("by_threadId", ["threadId"]),
});

export default schema;
