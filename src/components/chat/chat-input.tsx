import type { Id } from "convex/_generated/dataModel";
import { ArrowUpIcon, PaperclipIcon, SquareIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { useUploadFiles } from "~/lib/query/attachments";
import { cn } from "~/lib/utils";
import { ModeSelector } from "./mode-selector";
import { Textarea } from "../ui/textarea";

type ChatInputProps = {
	onSendMessage: (message: string) => void;
	onStopStreaming: () => void;
	isLoading: boolean;
	isStreaming: boolean;
	selectedModeId?: Id<"modes">;
	onModeSelect?: (modeId: Id<"modes">) => void;
	onAttachFiles: (attachmentIds: Id<"attachments">[]) => void;
};

export function ChatInput(props: ChatInputProps) {
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [filePreviews, setFilePreviews] = useState<
		{ file: File; preview?: string }[]
	>([]);
	const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const messageTextareaRef = useRef<HTMLTextAreaElement>(null);
	const { mutateAsync: uploadFilesAsync, isPending: isUploadingFiles } =
		useUploadFiles();

	function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(event.target.files || []);
		if (files.length === 0) return;

		const validFiles: File[] = [];
		for (const file of files) {
			const maxSize = 5 * 1024 * 1024;
			if (file.size > maxSize) {
				toast.error(
					`File "${file.name}" is too large. File size must be less than 5MB.`,
				);
				continue;
			}
			validFiles.push(file);
		}

		if (validFiles.length === 0) {
			return;
		}

		setSelectedFiles((prev) => [...prev, ...validFiles]);

		const newPreviews: { file: File; preview?: string }[] = [];
		for (const file of validFiles) {
			if (file.type.startsWith("image/")) {
				const reader = new FileReader();
				reader.onload = (e) => {
					const result = e.target?.result as string;
					setFilePreviews((prev) => {
						const updated = [...prev];
						const index = updated.findIndex((p) => p.file === file);
						if (index >= 0) {
							updated[index] = { file, preview: result };
						} else {
							updated.push({ file, preview: result });
						}
						return updated;
					});
				};
				reader.readAsDataURL(file);
				newPreviews.push({ file });
			} else {
				newPreviews.push({ file });
			}
		}

		setFilePreviews((prev) => [...prev, ...newPreviews]);
	}

	function clearAttachments() {
		setSelectedFiles([]);
		setFilePreviews([]);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}

	function removeFile(fileToRemove: File) {
		setSelectedFiles((prev) => prev.filter((f) => f !== fileToRemove));
		setFilePreviews((prev) => prev.filter((p) => p.file !== fileToRemove));
	}

	function handleAttachClick() {
		fileInputRef.current?.click();
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	}

	async function handleSendMessage() {
		const messageToSend = messageTextareaRef.current?.value || "";

		if (!messageToSend.trim()) {
			return;
		}

		if (selectedFiles.length > 0) {
			try {
				const attachmentIds = await uploadFilesAsync(selectedFiles);
				console.log("attachmentIds", attachmentIds);
				props.onAttachFiles(attachmentIds);
			} catch {
				toast.error("Error uploading files. Please try again.");
				return;
			}
		}

		props.onSendMessage(messageToSend);
		if (messageTextareaRef.current) {
			messageTextareaRef.current.value = "";
		}

		clearAttachments();
	}

	const canSend =
		(messageTextareaRef.current?.value.trim() || "") &&
		!props.isLoading &&
		!isUploadingFiles &&
		props.selectedModeId;

	return (
		<div className="rounded-t mx-auto max-w-4xl bg-sidebar border-4 border-secondary/50 border-b-0 transition-all duration-200">
			{filePreviews.length > 0 && (
				<div className="p-2 border-b border-secondary/50 flex flex-wrap gap-2">
					{filePreviews.map((filePreview, index) => (
						<div
							key={`${filePreview.file.name}-${index}`}
							className="flex items-center gap-2 bg-background rounded p-1"
						>
							{filePreview.preview ? (
								<Dialog
									open={isImageDialogOpen}
									onOpenChange={setIsImageDialogOpen}
								>
									<DialogTrigger asChild>
										<img
											src={filePreview.preview}
											alt="Attached file preview"
											className="size-8 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
										/>
									</DialogTrigger>
									<DialogContent className="max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] p-0">
										<img
											src={filePreview.preview}
											alt="Full size preview"
											className="w-full h-full object-contain aspect-auto"
										/>
									</DialogContent>
								</Dialog>
							) : (
								<div className="size-8 rounded bg-secondary flex items-center justify-center">
									<PaperclipIcon className="size-4" />
								</div>
							)}
							<span className="text-sm text-muted-foreground max-w-32 truncate">
								{filePreview.file.name}
							</span>
							<Button
								variant="ghost"
								size="sm"
								className="size-6 p-0 hover:bg-destructive/20"
								onClick={() => removeFile(filePreview.file)}
							>
								<XIcon className="size-4" />
							</Button>
						</div>
					))}
				</div>
			)}
			<Textarea
				ref={messageTextareaRef}
				placeholder="Type your message here..."
				className="font-serif placeholder:text-neutral-400 resize-none border-0 bg-transparent p-4 text-sm shadow-none focus-visible:ring-0 w-full"
				onKeyDown={handleKeyDown}
				rows={2}
			/>
			<div className="p-2">
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<div className="flex items-center gap-2">
						<ModeSelector
							selectedModeId={props.selectedModeId}
							onModeSelect={props.onModeSelect || (() => {})}
						/>
						<div className="flex items-center gap-2">
							<input
								ref={fileInputRef}
								type="file"
								multiple
								onChange={handleFileSelect}
								className="hidden"
							/>
							<Button
								variant="outline"
								size="sm"
								className="border-none"
								onClick={handleAttachClick}
								disabled={isUploadingFiles}
							>
								<PaperclipIcon className="size-4" />
								{isUploadingFiles ? "Uploading..." : "Attach"}
							</Button>
						</div>
					</div>
					<div
						className={cn("rounded border-2", {
							"border-foreground/50": !canSend,
							"border-foreground": canSend,
						})}
					>
						<Button
							onClick={() =>
								props.isStreaming
									? props.onStopStreaming()
									: handleSendMessage()
							}
							disabled={!canSend && !props.isStreaming}
							size="sm"
							className="size-8 rounded p-0 border-2 border-overlay"
						>
							{props.isLoading || props.isStreaming || isUploadingFiles ? (
								<SquareIcon className="size-4 fill-background" />
							) : (
								<ArrowUpIcon className="size-4" />
							)}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
