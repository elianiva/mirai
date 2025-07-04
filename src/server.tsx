import { createClerkHandler } from "@clerk/tanstack-react-start/server";
/// <reference types="vinxi/types/server" />
import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";
import { createRouter } from "./router";

export default createClerkHandler(
	createStartHandler({
		createRouter,
	}),
)(defaultStreamHandler);
