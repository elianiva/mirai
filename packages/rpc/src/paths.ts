/**
 * Path prefix served by the API Worker. The website Worker forwards this
 * prefix to the API through its service binding, so `alchemy.run.ts` derives
 * its `runWorkerFirst` rule from this value.
 */
export const API_PREFIX = '/api'

export const RPC_PATH = `${API_PREFIX}/rpc`
