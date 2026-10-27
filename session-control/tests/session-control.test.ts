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

const BAND = {
  plugin: 'session-control',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

test('the band keys its labels on the terminal and leaves them to the desktop chip', async ($, on) => {
  mock.store(on)
  on('session.repo', () => ({ value: null }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))

  const terminal = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await terminal.find({ key: 'model-Opus' }))?.text).toBe('2 Opus')
  await terminal.unmount()

  const desktop = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await desktop.find({ key: 'model-Opus' }))?.text).toBe('Opus')
  expect((await desktop.find({ key: 'effort-high' }))?.text).toBe('high')
  await desktop.unmount()
})
