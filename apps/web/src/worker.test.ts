import { expect, test } from 'vitest'
import worker from './worker.ts'

test('the website Worker forwards API requests through the service binding', async () => {
  const forwarded: Array<Request> = []
  const request = new Request('https://template.test/api/rpc', {
    method: 'POST',
    body: '{"method":"ping"}',
  })

  const response = await worker.fetch(request, {
    API: {
      fetch(input) {
        forwarded.push(input)
        return Promise.resolve(new Response('from the API Worker', { status: 202 }))
      },
    },
  })

  expect(forwarded).toEqual([request])
  expect(response.status).toBe(202)
  expect(await response.text()).toBe('from the API Worker')
})
