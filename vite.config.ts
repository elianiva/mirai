import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [
		tsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
		tanstackStart({
			target: "vercel",
		}),
	],
	ssr: {
		noExternal: ["@clerk/tanstack-react-start", "@clerk/backend"],
	},
});
