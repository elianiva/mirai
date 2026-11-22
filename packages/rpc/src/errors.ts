import { Schema } from 'effect'

/**
 * Declared failure shared by the API contract. A handler returns it with
 * `Effect.fail(new ApiError({ message }))`, and the client receives the decoded
 * instance, so callers match on `_tag` instead of parsing strings.
 */
export class ApiError extends Schema.TaggedError<ApiError, { readonly brand: unique symbol }>()(
  'ApiError',
  {
    message: Schema.String,
  },
) {}
