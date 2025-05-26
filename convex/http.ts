import { httpRouter } from "convex/server";
import { streamChat } from "./httpActions/chat";

const http = httpRouter();

// Define a route for the chat endpoint
http.route({
	path: "/api/chat",
	method: "GET",
	handler: streamChat,
});

// Export the router as the default export
export default http;
