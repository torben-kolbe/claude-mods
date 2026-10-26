import type { EngineInterface, Register } from 'claude-code'

type Rule = { why: string; test: RegExp }

const RULES: readonly Rule[] = [
  { why: 'force push (overwrites the remote history)', test: /\bgit\s+push\b[^;&|]*\s(--force\b|--force-with-lease\b|-f\b|\+\S)/ },
  { why: 'git reset --hard (discards uncommitted changes)', test: /\bgit\s+reset\b[^;&|]*--hard\b/ },
  { why: 'git clean (deletes untracked files)', test: /\bgit\s+clean\b[^;&|]*\s-\w*f/ },
  { why: 'discards all changes in the working tree', test: /\bgit\s+(checkout|restore)\b[^;&|]*\s(--\s+)?\.(\s|$)/ },
  { why: 'deletes a branch that may not be merged', test: /\bgit\s+branch\b[^;&|]*\s-D\b/ },
  { why: 'recursive forced delete (rm -rf)', test: /\brm\s+(-\w*r\w*f\w*|-\w*f\w*r\w*|-r\s+-f|-f\s+-r|--recursive\s+--force|--force\s+--recursive)\b/ },
  { why: 'recursive forced delete (Remove-Item -Recurse -Force)', test: /\bRemove-Item\b(?=[^;&|]*-Recurse)(?=[^;&|]*-Force)/i },
]

const ENV_FILE = /(^|[\\/])\.env(\.(?!example$|sample$|template$)[\w.-]+)?$/

// The .env files a commit would carry: those already staged, and for `git add` the paths it names.
async function envFilesIn($: EngineInterface, command: string) {
  const found = new Set<string>()
  const add = command.match(/\bgit\s+add\b([^;&|]*)/)
  for (const path of add?.[1]?.split(/\s+/) ?? []) {
    if (ENV_FILE.test(path)) {
      found.add(path)
    }
  }
  if (/\bgit\s+commit\b/.test(command)) {
    const staged = await $.process.run(['git', 'diff', '--cached', '--name-only'], { cwd: await $.session.cwd() })
    const all = /\bgit\s+commit\b[^;&|]*\s-\w*a/.test(command)
      ? await $.process.run(['git', 'diff', '--name-only'], { cwd: await $.session.cwd() })
      : undefined
    for (const path of `${staged.stdout}\n${all?.stdout ?? ''}`.split('\n')) {
      if (ENV_FILE.test(path.trim())) {
        found.add(path.trim())
      }
    }
  }

  return [...found]
}

async function risks($: EngineInterface, command: string) {
  const reasons = RULES.filter(rule => rule.test.test(command)).map(rule => rule.why)
  const envFiles = await envFilesIn($, command)
  if (envFiles.length > 0) {
    reasons.push(`commits a secrets file: ${envFiles.join(', ')}`)
  }

  return reasons
}

// Asks the person; anything but "Allow" (a dismissal, no one to ask) refuses.
async function confirmed($: EngineInterface, command: string, reasons: readonly string[]) {
  const shown = command.length > 200 ? `${command.slice(0, 197)}...` : command
  const answer = await $.ui
    .ask(`git-guard: Claude wants to run \`${shown}\` — ${reasons.join('; ')}. Allow it?`, {
      header: 'git-guard',
      options: ['Allow', 'Deny'],
    })
    .catch(() => 'Deny')

  return answer === 'Allow'
}

const DENIED = 'git-guard: the user did not allow this command. Do not retry it; ask the user how to proceed.'

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const reasons = await risks($, e.command)
    if (reasons.length > 0 && !(await confirmed($, e.command, reasons))) {
      return { deny: DENIED }
    }

    return next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'git-guard could not check this command.' }))

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const reasons = await risks($, e.command)
    if (reasons.length > 0 && !(await confirmed($, e.command, reasons))) {
      return { deny: DENIED }
    }

    return next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'git-guard could not check this command.' }))
}
