import { httpAction } from "../_generated/server";
import { api } from "../_generated/api";
import { CORS_HEADERS } from "./common";

const MAX_SIZE = 5 * 1024 * 1024;

export const uploadAttachment = httpAction(async (ctx, req) => {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: CORS_HEADERS,
		});
	}

	try {
		const formData = await req.formData();
		const file = formData.get("file") as File;
		const filename = formData.get("filename") as string;

		if (!file) {
			return new Response(JSON.stringify({ error: "No file provided" }), {
				status: 400,
				headers: CORS_HEADERS,
			});
		}

		if (file.size > MAX_SIZE) {
			return new Response(
				JSON.stringify({ error: "File size must be less than 5MB" }),
				{
					status: 400,
					headers: CORS_HEADERS,
				},
			);
		}

		const storageId = await ctx.storage.store(file);

		const result = await ctx.runMutation(api.attachments.uploadAttachment, {
			storageId,
			filename: filename || file.name,
			contentType: file.type,
			size: file.size,
		});

		return new Response(
			JSON.stringify({ storageId, attachmentId: result.attachmentId }),
			{
				status: 200,
				headers: CORS_HEADERS,
			},
		);
	} catch (error) {
		console.error("Attachment upload error:", error);
		return new Response(
			JSON.stringify({ error: "Failed to upload attachment" }),
			{
				status: 500,
				headers: CORS_HEADERS,
			},
		);
	}
});
