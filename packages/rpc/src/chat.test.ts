import { Schema } from 'effect'
import { expect, test } from 'vitest'
import { ChatFrame, ChatSubmit, SnapshotFrame } from './chat.ts'

test('a snapshot frame round-trips through its wire shape', () => {
  const frame = SnapshotFrame.make({
    type: 'snapshot',
    messages: [{ id: '1', role: 'user', text: 'Hello' }],
    live: null,
  })

  const encoded = Schema.encodeSync(ChatFrame)(frame)
  const decoded = Schema.decodeSync(ChatFrame)(encoded)

  expect(decoded).toEqual(frame)
})

test('a submit requires a client id and text', () => {
  const submit = ChatSubmit.make({
    type: 'submit',
    clientId: 'client-1',
    text: 'What is this?',
  })

  expect(submit.clientId).toBe('client-1')
})
