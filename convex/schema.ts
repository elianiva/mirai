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
	}),
	messages: defineTable({
		threadId: v.id("threads"),
		senderId: v.string(),
		content: v.string(),
		type: v.string(),
		metadata: v.optional(v.any()),
		// Branching fields
		parentMessageId: v.optional(v.id("messages")),
		branchId: v.optional(v.string()),
		isActiveBranch: v.optional(v.boolean()),
	})
		.index("by_thread", ["threadId"])
		.index("by_parent", ["parentMessageId"])
		.index("by_branch", ["threadId", "branchId"]),
});

export default schema;
