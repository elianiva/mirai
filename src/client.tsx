import * as Sentry from "@sentry/react";
import { StartClient } from "@tanstack/react-start";
/// <reference types="vinxi/types/client" />
import { hydrateRoot } from "react-dom/client";
import { createRouter } from "./router";

Sentry.init({
	dsn: process.env.VITE_SENTRY_DSN,
});

const router = createRouter();

hydrateRoot(document, <StartClient router={router} />);
