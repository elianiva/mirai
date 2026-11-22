interface ApiBinding {
  fetch(request: Request): Promise<Response>
}

interface Environment {
  readonly API: ApiBinding
}

/**
 * Only requests under the API prefix reach this module (see `runWorkerFirst`
 * in `alchemy.run.ts`). Every other path is served from the static assets.
 */
export default {
  fetch(request: Request, env: Environment): Promise<Response> {
    return env.API.fetch(request)
  },
}
