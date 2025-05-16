import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { DefaultCatchBoundary } from "./components/DefaultCatchBoundary";
import { NotFound } from "./components/NotFound";
import { routeTree } from "./routeTree.gen";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";

export function createRouter() {
	const CONVEX_URL = (
		import.meta as unknown as { env: { VITE_CONVEX_URL: string } }
	).env.VITE_CONVEX_URL;
	if (!CONVEX_URL) {
		throw new Error("VITE_CONVEX_URL is not set");
	}
	const convexQueryClient = new ConvexQueryClient(CONVEX_URL);

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn: convexQueryClient.hashFn(),
				queryFn: convexQueryClient.queryFn(),
			},
		},
	});
	convexQueryClient.connect(queryClient);

	const router = createTanStackRouter({
		routeTree,
		defaultPreload: "intent",
		defaultErrorComponent: DefaultCatchBoundary,
		defaultNotFoundComponent: () => <NotFound />,
		scrollRestoration: true,
		context: {
			queryClient,
		} as { queryClient: QueryClient },
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof createRouter>;
	}
	interface RouterContext {}
}
