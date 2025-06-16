import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { chatHandler, regenerateHandler } from "./http/chat";
import { CORS_HEADERS } from "./http/common";
import { uploadAttachment } from "./http/files";

const http = httpRouter();

http.route({
	path: "/api/chat",
	method: "POST",
	handler: chatHandler,
});

http.route({
	path: "/api/chat",
	method: "OPTIONS",
	handler: httpAction(async () => {
		return new Response(null, {
			status: 200,
			headers: CORS_HEADERS,
		});
	}),
});

http.route({
	path: "/api/regenerate",
	method: "POST",
	handler: regenerateHandler,
});

http.route({
	path: "/api/regenerate",
	method: "OPTIONS",
	handler: httpAction(async () => {
		return new Response(null, {
			status: 200,
			headers: CORS_HEADERS,
		});
	}),
});

http.route({
	path: "/api/upload-attachment",
	method: "POST",
	handler: uploadAttachment,
});

http.route({
	path: "/api/upload-attachment",
	method: "OPTIONS",
	handler: httpAction(async () => {
		return new Response(null, {
			status: 200,
			headers: CORS_HEADERS,
		});
	}),
});

export default http;
