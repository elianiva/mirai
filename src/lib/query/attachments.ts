import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useUser } from "./user";
import type { Id } from "convex/_generated/dataModel";

// @ts-expect-error - import.meta.env is not typed
const CONVEX_HTTP_URL = import.meta.env.VITE_CONVEX_HTTP_URL as string;

export const uploadFilesSchema = z.object({
	files: z.array(z.instanceof(File)),
	token: z.string(),
});

export type UploadFilesVariables = z.infer<typeof uploadFilesSchema>;

async function uploadFiles({
	files,
	token,
}: UploadFilesVariables): Promise<Id<"attachments">[]> {
	const attachmentIds: Id<"attachments">[] = [];

	for (const file of files) {
		const formData = new FormData();
		formData.append("file", file);
		formData.append("filename", file.name);

		const uploadUrl = `${CONVEX_HTTP_URL}/api/upload-attachment`;
		const uploadResponse = await fetch(uploadUrl, {
			method: "POST",
			body: formData,
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!uploadResponse.ok) {
			throw new Error(`Failed to upload file: ${file.name}`);
		}

		const result = await uploadResponse.json();
		attachmentIds.push(result.attachmentId as Id<"attachments">);
	}

	return attachmentIds;
}

export function useUploadFiles() {
	const { data: user } = useUser();

	return useMutation({
		mutationFn: (files: File[]) =>
			uploadFiles({ files, token: user?.token ?? "" }),
		onError: (error: Error) => {
			console.log({ error });
			console.error("Error uploading files:", error);
		},
	});
}
