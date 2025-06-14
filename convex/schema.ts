import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
	accountSettings: defineTable({
		name: v.string(),
		role: v.string(),
		behavior: v.string(),
	}),
	modes: defineTable({
		slug: v.string(),
		icon: v.string(),
		name: v.string(),
		description: v.string(),
		profileSelector: v.string(),
		modeDefinition: v.string(),
		whenToUse: v.string(),
		additionalInstructions: v.string(),
	}),
	profiles: defineTable({
		slug: v.string(),
		name: v.string(),
		description: v.string(),
		model: v.string(),
		temperature: v.number(),
		topP: v.number(),
		topK: v.number(),
	}),
	threads: defineTable({
		title: v.string(),
		parentId: v.optional(v.id("threads")),
	}),
	attachments: defineTable({
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
		.index("by_message", ["messageId"]),
	messages: defineTable({
		threadId: v.id("threads"),
		senderId: v.string(),
		content: v.string(),
		type: v.string(),
		metadata: v.optional(v.object({
			isStreaming: v.optional(v.boolean()),
			modeId: v.optional(v.string()),
			profileId: v.optional(v.string()),
			reasoning: v.optional(v.string()),
			modelName: v.optional(v.string()),
			finishReason: v.optional(v.string()),
		})),
		parentMessageId: v.optional(v.id("messages")),
		branchId: v.optional(v.string()),
		isActiveBranch: v.optional(v.boolean()),
		attachmentIds: v.optional(v.array(v.id("attachments"))),
	})
		.index("by_thread", ["threadId"])
		.index("by_parent", ["parentMessageId"])
		.index("by_branch", ["threadId", "branchId"]),
});

export default schema;
