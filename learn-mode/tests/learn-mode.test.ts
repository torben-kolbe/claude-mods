import { expect, test } from 'claude-code/testing'

test('every prompt carries the learning instruction', async ($, on) => {
  let seen: readonly string[] = []
  on('prompt.submit', async ($, e) => {
    seen = e.context ?? []

    return { text: e.text }
  })

  await $.prompt.submit({ text: 'add a button', origin: { kind: 'composer' }, wait: false })

  expect(seen.some(c => c.includes('What & why'))).toBe(true)
})
