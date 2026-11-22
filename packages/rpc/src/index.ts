export { ApiError } from './errors.ts'
export { API_PREFIX, RPC_PATH } from './paths.ts'
export { SystemRpc, SystemStatus } from './system.ts'

import { SystemRpc } from './system.ts'

/** The complete wire contract served by the API Worker. */
export class Api extends SystemRpc {}
