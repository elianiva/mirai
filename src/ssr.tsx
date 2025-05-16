import { getRouterManifest } from "@tanstack/react-start/router-manifest";
/// <reference types="vinxi/types/server" />
import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";
import { createClerkHandler } from "@clerk/tanstack-react-start/server";
import { createRouter } from "./router";

export default createClerkHandler(
	createStartHandler({
		createRouter,
		getRouterManifest,
	}),
)(defaultStreamHandler);
