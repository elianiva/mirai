import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { DefaultCatchBoundary } from "./components/DefaultCatchBoundary";
import { NotFound } from "./components/NotFound";
import { routeTree } from "./routeTree.gen";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { QueryClient } from "@tanstack/react-query";
import { ConvexProvider, ConvexReactClient } from "convex/react";

type Env = {
	env: {
		VITE_CLERK_PUBLISHABLE_KEY: string;
		VITE_CONVEX_URL: string;
	};
};

export function createRouter() {
	const CONVEX_URL = (import.meta as unknown as Env).env.VITE_CONVEX_URL;
	if (!CONVEX_URL) {
		throw new Error("VITE_CONVEX_URL is not set");
	}
	const convex = new ConvexReactClient(CONVEX_URL, {
		unsavedChangesWarning: false,
	});
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

	const router = routerWithQueryClient(
		createTanStackRouter({
			routeTree,
			defaultPreload: "intent",
			defaultErrorComponent: DefaultCatchBoundary,
			defaultNotFoundComponent: () => <NotFound />,
			scrollRestoration: true,
			context: { queryClient, convexClient: convex, convexQueryClient },
			Wrap: ({ children }) => (
				<ConvexProvider client={convex}>{children}</ConvexProvider>
			),
		}),
		queryClient,
	);

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof createRouter>;
	}
}
