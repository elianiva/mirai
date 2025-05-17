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
import type * as messages from "../messages.js";
import type * as modes from "../modes.js";
import type * as openrouterSettings from "../openrouterSettings.js";
import type * as profileOptions from "../profileOptions.js";
import type * as profiles from "../profiles.js";
import type * as threads from "../threads.js";

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
  messages: typeof messages;
  modes: typeof modes;
  openrouterSettings: typeof openrouterSettings;
  profileOptions: typeof profileOptions;
  profiles: typeof profiles;
  threads: typeof threads;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
