const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
	throw new Error("NEXT_PUBLIC_CONVEX_URL is not defined");
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		// Construct the path manually since TypeScript doesn't like the direct access
		const actionPath = "httpActions/chat:streamChat";
		const response = await fetch(`${convexUrl}/api/http_action/${actionPath}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		// Forward the streaming response
		return new Response(response.body, {
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Transfer-Encoding": "chunked",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Error in chat API:", error);
		return new Response(
			JSON.stringify({ error: "Failed to process chat request" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}
