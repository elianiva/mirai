import { expect, test } from 'vitest'
import type { ChatFrame } from '@mirai/rpc'
import { init, Message, update } from './main.ts'

test('a snapshot replaces the transcript and marks the socket connected', () => {
  const initial = init()
  const frame: ChatFrame = {
    type: 'snapshot',
    messages: [{ id: '1', role: 'user', text: 'Hello' }],
    live: null,
  }

  const result = update(initial.model, Message.GotFrame({ frame }))

  expect(result.model.messages).toEqual(frame.messages)
  expect(result.model.connected).toBe(true)
  expect(result.model.status).toBe('idle')
})

test('submitting adds a local message and sends it', () => {
  const initial = init()
  const model = { ...initial.model, activeThreadId: 'thread-1', draft: 'Hello' }

  const result = update(model, Message.Submitted())

  expect(result.model.messages).toHaveLength(1)
  expect(result.model.messages[0]?.text).toBe('Hello')
  expect(result.model.messages[0]?.id.startsWith('local-')).toBe(true)
  expect(result.model.draft).toBe('')
  expect(result.commands).toHaveLength(1)
})
