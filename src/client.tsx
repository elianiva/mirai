/// <reference types="vinxi/types/client" />
import { hydrateRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { StartClient } from "@tanstack/react-start";
import { createRouter } from "./router";

Sentry.init({
	dsn: process.env.VITE_SENTRY_DSN,
});

const router = createRouter();

hydrateRoot(document, <StartClient router={router} />);
