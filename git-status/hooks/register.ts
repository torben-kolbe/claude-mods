import type { EngineInterface, Register } from 'claude-code'

// Reads `git status --porcelain=v2 --branch` into one status line, or undefined outside a repository.
export function describe(porcelain: string) {
  let branch = '?'
  let ahead = 0
  let behind = 0
  let hasUpstream = false
  let changed = 0
  for (const line of porcelain.split('\n')) {
    if (line.startsWith('# branch.head ')) {
      branch = line.slice('# branch.head '.length).trim()
    } else if (line.startsWith('# branch.ab ')) {
      const [a, b] = line.slice('# branch.ab '.length).trim().split(' ')
      ahead = Math.abs(Number(a))
      behind = Math.abs(Number(b))
      hasUpstream = true
    } else if (line && !line.startsWith('#')) {
      changed += 1
    }
  }
  // The surface already heads the line with the mod's name, so no "git:" prefix; arrows only when
  // there is something to push or pull, to keep the line short in the desktop's footer.
  const parts = [branch === '(detached)' ? 'detached HEAD' : branch]
  parts.push(changed === 0 ? 'clean' : `${changed} changed`)
  if (!hasUpstream) {
    parts.push('not pushed')
  } else if (ahead > 0 || behind > 0) {
    parts.push(`↑${ahead} ↓${behind}`)
  }

  return parts.join(' · ')
}

async function refresh($: EngineInterface) {
  const result = await $.process
    .run(['git', 'status', '--porcelain=v2', '--branch'], { cwd: await $.session.cwd(), timeoutMs: 10000 })
    .catch(() => undefined)
  $.ui.status(result && result.exitCode === 0 ? describe(result.stdout) : undefined)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await refresh($)
    // Catches what changes outside Claude too (a commit or checkout in another terminal).
    $.clock.every(30000, () => refresh($))

    return started
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId === undefined) {
      await refresh($)
    }

    return done
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (/\bgit\b/.test(e.command)) {
      await refresh($)
    }

    return ran
  })
}
