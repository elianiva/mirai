/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as accountSettings from "../accountSettings.js";
import type * as attachments from "../attachments.js";
import type * as chat from "../chat.js";
import type * as http_chat from "../http/chat.js";
import type * as http_common from "../http/common.js";
import type * as http_files from "../http/files.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as modes from "../modes.js";
import type * as profileOptions from "../profileOptions.js";
import type * as profiles from "../profiles.js";
import type * as seed from "../seed.js";
import type * as threads from "../threads.js";
import type * as toolCalls from "../toolCalls.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  accountSettings: typeof accountSettings;
  attachments: typeof attachments;
  chat: typeof chat;
  "http/chat": typeof http_chat;
  "http/common": typeof http_common;
  "http/files": typeof http_files;
  http: typeof http;
  messages: typeof messages;
  modes: typeof modes;
  profileOptions: typeof profileOptions;
  profiles: typeof profiles;
  seed: typeof seed;
  threads: typeof threads;
  toolCalls: typeof toolCalls;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
