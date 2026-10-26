import { expect, mock, test } from 'claude-code/testing'

const turn = (durationMs: number) => ({
  turnId: 't',
  durationMs,
  isAborted: false,
  reason: 'answer' as const,
  answer: '## Fixed the login bug\nMore details.',
})

test('a long turn notifies with its first line, a short one does not', async ($, on) => {
  mock.env(on, { OS: 'Linux' })
  const sent: string[] = []
  on('ui.notify', async ($, e) => {
    sent.push(e.text)

    return { value: { isSent: true, channel: 'terminal_bell' } } as never
  })
  on('turn.complete', async () => ({ text: '' }))

  await $.turn.complete(turn(5000))
  expect(sent).toEqual([])

  await $.turn.complete(turn(60000))
  expect(sent).toEqual(['Fixed the login bug'])
})
