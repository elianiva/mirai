import { AsyncData } from 'foldkit'
import { expect, test } from 'vitest'
import { statusQuery } from './query-example.ts'

test('the reference Query starts empty before its first request', () => {
  const status = statusQuery.read(statusQuery.init())

  expect(
    AsyncData.matchData(status, {
      onEmpty: () => 'empty',
      onFailure: () => 'failure',
      onData: () => 'data',
    }),
  ).toBe('empty')
})
