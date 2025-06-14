import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const uploadAttachment = mutation({
	args: {
		storageId: v.string(),
		filename: v.string(),
		contentType: v.string(),
		size: v.number(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		// Create an entry in the attachments table
		const attachmentId = await ctx.db.insert("attachments", {
			storageId: args.storageId,
			filename: args.filename,
			contentType: args.contentType,
			size: args.size,
			uploadedBy: identity.subject,
			uploadedAt: Date.now(),
		});

		return { attachmentId, storageId: args.storageId };
	},
});

export const getAttachmentData = query({
	args: {
		attachmentIds: v.array(v.id("attachments")),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const attachments = await Promise.all(
			args.attachmentIds.map(async (attachmentId) => {
				const attachment = await ctx.db.get(attachmentId);
				if (!attachment) {
					return null;
				}

				const url = await ctx.storage.getUrl(attachment.storageId);
				return {
					url,
					filename: attachment.filename,
					contentType: attachment.contentType,
					size: attachment.size,
				};
			})
		);

		return attachments.filter(Boolean);
	},
});

export const getAttachmentUrl = query({
	args: {
		storageId: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		return await ctx.storage.getUrl(args.storageId);
	},
});

export const deleteAttachment = mutation({
	args: {
		storageId: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		await ctx.storage.delete(args.storageId);
	},
});
