import { expect, test } from 'claude-code/testing'

const run = (command: string) => ({ tool: 'Bash' as const, command })

test('a force push is refused when nobody allows it', async ($, on) => {
  let ran = false
  on('tool.call', { tool: 'Bash' }, async () => {
    ran = true

    return { result: { stdout: '', stderr: '' } } as never
  })
  on('process.run', async () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))

  await $.tool.call(run('git push --force origin main')).catch(() => undefined)

  expect(ran).toBe(false)
})

test('a harmless command runs untouched', async ($, on) => {
  let ran = false
  on('tool.call', { tool: 'Bash' }, async () => {
    ran = true

    return { result: { stdout: '', stderr: '' } } as never
  })
  on('process.run', async () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))

  await $.tool.call(run('git status'))

  expect(ran).toBe(true)
})
