import { expect, test } from 'vitest'
import { init, Message, update } from './main.ts'

test('the starter app updates its model through a message', () => {
  const initial = init()
  const result = update(initial.model, Message.ClickedContinue())

  expect(result.model.ready).toBe(true)
})
