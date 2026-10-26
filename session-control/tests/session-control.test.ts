import { expect, mock, test } from 'claude-code/testing'

const presentation = { isFullscreen: false, columns: 120 }
const origin = { kind: 'composer' } as const

test('/sc picks model, effort and mode by number and letter', async ($, on) => {
  mock.store(on)
  const answer = await $.command.run({ command: 'sc', args: '2 6 w', origin, presentation })

  expect(JSON.stringify(answer)).toContain('Model: Opus')
  expect(JSON.stringify(answer)).toContain('Effort: high')
  expect(JSON.stringify(answer)).toContain('Git mode: Worktree')
})

test('the chosen model and effort reach the main loop request', async ($, on) => {
  mock.store(on)
  let sent: { model?: string; effort?: unknown } = {}
  on('turn.step', async function* ($, e) {
    sent = { model: e.model, effort: e.effort }

    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })

  await $.command.run({ command: 'sc', args: '3 8', origin, presentation })
  for await (const _ of $.turn.step({ turnId: 't', index: 0, model: 'claude-sonnet-5-5', messageCount: 1 })) {
    // drain
  }

  expect(sent.model).toBe('claude-fable-5-1')
  expect(sent.effort).toBe('max')
})

test('sc-effort rejects an unknown level', async ($, on) => {
  mock.store(on)
  const answer = await $.command.run({ command: 'sc-effort', args: 'ultra', origin, presentation })

  expect(JSON.stringify(answer)).toContain('Unknown effort')
})
