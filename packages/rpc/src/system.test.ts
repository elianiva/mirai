import { Schema } from 'effect'
import { expect, test } from 'vitest'
import { ApiError } from './errors.ts'
import { SystemStatus } from './system.ts'

test('SystemStatus decodes the public response shape', () => {
  expect(SystemStatus.make({ message: 'API connected' })).toEqual({
    message: 'API connected',
  })
})

test('ApiError round-trips through its wire representation', () => {
  const encoded = Schema.encodeSync(ApiError)(new ApiError({ message: 'Status is unavailable' }))

  expect(encoded).toEqual({ _tag: 'ApiError', message: 'Status is unavailable' })
  expect(Schema.decodeSync(ApiError)(encoded)).toBeInstanceOf(ApiError)
})
