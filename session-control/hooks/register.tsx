import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { ContextFill, Effort, Limit, WorkMode } from '../types'

const model = atom({ plugin: 'session-control', key: 'model' } as const, null)
const effort = atom({ plugin: 'session-control', key: 'effort' } as const, null)
const mode = atom({ plugin: 'session-control', key: 'mode' } as const, 'main')
const context = atom({ plugin: 'session-control', key: 'context' } as const, null)
const lastUsed = atom({ plugin: 'session-control', key: 'lastUsed' } as const, null)
const limits = atom({ plugin: 'session-control', key: 'limits' } as const, [])

// Sorted by strength, weakest first.
const MODELS = [
  { key: '1', label: 'Sonnet', id: 'claude-sonnet-5-5' },
  { key: '2', label: 'Opus', id: 'claude-opus-5-5' },
  { key: '3', label: 'Fable', id: 'claude-fable-5-1' },
] as const

const EFFORTS = [
  { key: '4', level: 'low' },
  { key: '5', level: 'medium' },
  { key: '6', level: 'high' },
  { key: '7', level: 'xhigh' },
  { key: '8', level: 'max' },
] as const

const MODES = [
  { key: 'm', mode: 'main', label: 'Main branch' },
  { key: 'b', mode: 'branch', label: 'New branch' },
  { key: 'w', mode: 'worktree', label: 'Worktree' },
] as const

const MODE_TEXT: Record<WorkMode, string> = {
  main:
    'Git work mode (set by the user): MAIN BRANCH. Work directly on the main branch (main/master) in the main working tree. If the repository is currently on another branch, ask before switching. Do not create new branches or worktrees unless the user asks.',
  branch:
    'Git work mode (set by the user): NEW BRANCH. Before changing any files, create a new branch with a short descriptive name from the main branch in the main working tree (git switch -c <name>) and work and commit there; skip this only if you already created a branch for this task. Do not use worktrees.',
  worktree:
    'Git work mode (set by the user): WORKTREE. Before changing any files, call EnterWorktree to create a separate git worktree on its own new branch and work there; skip this only if the session already runs in a worktree.',
}

const isEffort = (text: string): text is Effort => EFFORTS.some(e => e.level === text)

const isMode = (text: string): text is WorkMode => MODES.some(m => m.mode === text)

const shortModel = (id: string) => MODELS.find(m => id.includes(m.id))?.label ?? id

// A rate-limit window's kind as a short label: "5h", "week", or the kind itself.
function limitLabel(kind: string) {
  const k = kind.toLowerCase()
  if (/five|5h|5_hour|hour/.test(k)) {
    return '5h'
  }
  if (/seven|7d|week/.test(k)) {
    return /opus|sonnet|fable/.test(k) ? `week ${k.match(/opus|sonnet|fable/)?.[0]}` : 'week'
  }

  return kind
}

const fillColor = (percent: number) => (percent >= 85 ? 'red' : percent >= 60 ? 'yellow' : 'green')

const COMMIT = /\bgit\s+commit\b/

// In the new-branch and worktree modes, a commit on main/master needs the person's yes.
async function commitAllowed($: EngineInterface, command: string) {
  const chosen = await read($, mode)
  if (chosen === 'main' || !COMMIT.test(command)) {
    return true
  }
  const result = await $.process.run(['git', 'branch', '--show-current'], { cwd: await $.session.cwd() })
  const branch = result.stdout.trim()
  if (result.exitCode !== 0 || (branch !== 'main' && branch !== 'master')) {
    return true
  }
  const label = MODES.find(m => m.mode === chosen)?.label
  const answer = await $.ui
    .ask(`Git mode is "${label}", but Claude wants to commit directly on ${branch}. Allow it?`, {
      header: 'Git mode',
      options: ['Allow', 'Deny'],
    })
    .catch(() => 'Deny')

  return answer === 'Allow'
}

const COMMIT_DENIED =
  'session-control: the user did not allow committing on the main branch. Create a branch (or worktree) as the git work mode says, then commit there.'

async function save($: EngineInterface) {
  await $.store.set('settings', {
    model: await read($, model),
    effort: await read($, effort),
    mode: await read($, mode),
  })
}

async function setModel($: EngineInterface, id: string | null) {
  await update($, model, () => id)
  await save($)
  $.ui.toast(`Model: ${id ? shortModel(id) : 'default'}`)
}

async function setEffort($: EngineInterface, level: Effort | null) {
  await update($, effort, () => level)
  await save($)
  $.ui.toast(`Effort: ${level ?? 'default'}`)
}

async function setMode($: EngineInterface, value: WorkMode) {
  await update($, mode, () => value)
  await save($)
  $.ui.toast(`Git mode: ${MODES.find(m => m.mode === value)?.label}`)
}

// Applies one choice by its number or letter (or its name); the answer for the transcript.
async function choose($: EngineInterface, raw: string) {
  const arg = raw.trim().toLowerCase()
  const m = MODELS.find(x => x.key === arg || x.label.toLowerCase() === arg)
  if (m) {
    await setModel($, m.id)

    return `Model: ${m.label}`
  }
  const ef = EFFORTS.find(x => x.key === arg || x.level === arg)
  if (ef) {
    await setEffort($, ef.level)

    return `Effort: ${ef.level}`
  }
  const mo = MODES.find(x => x.key === arg || x.mode === arg)
  if (mo) {
    await setMode($, mo.mode)

    return `Git mode: ${mo.label}`
  }
  if (arg === '0' || arg === 'default') {
    await setModel($, null)
    await setEffort($, null)

    return 'Model and effort: default'
  }

  return `Unknown: "${arg}"`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const saved = (await $.store.get('settings')) as
      | { model?: string | null; effort?: Effort | null; mode?: string }
      | undefined
    if (saved) {
      const known = MODELS.some(m => m.id === saved.model)
      await update($, model, () => (known ? saved.model ?? null : null))
      await update($, effort, () => saved.effort ?? null)
      await update($, mode, () => (saved.mode && isMode(saved.mode) ? saved.mode : 'main'))
    }

    await $.command.register({
      name: 'sc',
      description: 'Pick by key: 1-3 model, 4-8 effort, m/b/w git mode, 0 defaults (several: /sc 2 6 b)',
      argumentHint: '<key> [key ...]',
    })
    await $.command.register({
      name: 'sc-model',
      description: 'Switch the model (sonnet, opus, fable, default)',
      argumentHint: '<sonnet|opus|fable|default>',
    })
    await $.command.register({
      name: 'sc-effort',
      description: 'Switch the effort (low, medium, high, xhigh, max, default)',
      argumentHint: '<low|medium|high|xhigh|max|default>',
    })
    await $.command.register({
      name: 'sc-mode',
      description: 'Git work mode: main (main branch), branch (new branch), worktree',
      argumentHint: '<main|branch|worktree>',
    })

    const { context: fill } = await $.session.usage()
    await update($, context, () => toFill(fill))

    return next(e)
  })

  on('command.run', { command: 'sc' }, async ($, e) => {
    const parts = e.args.split(/[\s,]+/).filter(Boolean)
    if (parts.length === 0) {
      return { text: 'Usage: /sc <key> [key ...]  (1-3 model, 4-8 effort, m/b/w git mode, 0 defaults)' }
    }
    const lines: string[] = []
    for (const part of parts) {
      lines.push(await choose($, part))
    }

    return { text: lines.join('\n') }
  })

  on('command.run', { command: 'sc-model' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'default' || arg === '') {
      await setModel($, null)

      return { text: 'Model: session default.' }
    }
    const found = MODELS.find(m => m.label.toLowerCase() === arg || m.id === arg)
    if (!found) {
      return { text: `Unknown model "${arg}". Allowed: sonnet, opus, fable, default.` }
    }
    await setModel($, found.id)

    return { text: `Model: ${found.label} (${found.id}).` }
  })

  on('command.run', { command: 'sc-effort' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'default' || arg === '') {
      await setEffort($, null)

      return { text: 'Effort: model default.' }
    }
    if (!isEffort(arg)) {
      return { text: `Unknown effort "${arg}". Allowed: ${EFFORTS.map(x => x.level).join(', ')}, default.` }
    }
    await setEffort($, arg)

    return { text: `Effort: ${arg}.` }
  })

  on('command.run', { command: 'sc-mode' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (!isMode(arg)) {
      return { text: 'Allowed: main, branch or worktree.' }
    }
    await setMode($, arg)

    return { text: `Git mode: ${MODES.find(m => m.mode === arg)?.label}.` }
  })

  // The built-in /model and /effort win over the mod's choice: the last change counts.
  on('command.run', { command: 'model' }, async ($, e, next) => {
    await update($, model, () => null)
    await save($)

    return next(e)
  })

  on('command.run', { command: 'effort' }, async ($, e, next) => {
    await update($, effort, () => null)
    await save($)

    return next(e)
  })

  // Applies the chosen model and effort to every request of the main loop.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) {
      return yield* next(e)
    }
    const chosenModel = await read($, model)
    const chosenEffort = await read($, effort)
    const sent = {
      ...e,
      ...(chosenModel ? { model: chosenModel } : {}),
      ...(chosenEffort ? { effort: chosenEffort } : {}),
    }
    await update($, lastUsed, () => ({
      model: sent.model,
      effort: sent.effort === undefined ? undefined : String(sent.effort),
    }))

    return yield* next(sent)
  })

  on('prompt.submit', async ($, e, next) => {
    if ((await $.session.repo()) === null) {
      return next(e)
    }
    const text = MODE_TEXT[await read($, mode)]

    return next({ ...e, context: [...(e.context ?? []), text] })
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) =>
    (await commitAllowed($, e.command)) ? next(e) : { deny: COMMIT_DENIED },
  ).catch(($, e, next) => (next.called ? next(e) : { deny: 'session-control could not check this commit.' }))

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) =>
    (await commitAllowed($, e.command)) ? next(e) : { deny: COMMIT_DENIED },
  ).catch(($, e, next) => (next.called ? next(e) : { deny: 'session-control could not check this commit.' }))

  on('session.measure', async ($, e, next) => {
    const fill = toFill(e.context)
    await update($, context, () => fill)
    const windows: Limit[] = e.rateLimits.map(r => ({ label: limitLabel(r.kind), percent: Math.round(r.percentUsed) }))
    await update($, limits, () => windows)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const { Box, Button, Text } = $.ui.resolve(e)
    const chosenModel = await read($, model)
    const chosenEffort = await read($, effort)
    const chosenMode = await read($, mode)
    const fill = await read($, context)
    const used = await read($, lastUsed)
    const windows = await read($, limits)
    const repo = await $.session.repo()
    const activeModel = chosenModel ?? (await $.session.model())
    const barWidth = Math.max(10, Math.min(30, e.props.bodyColumns - 50))
    // The terminal draws a Button as `[ label ]`, so the key goes into the label. A graphical
    // surface (desktop, VS Code) draws a native button with its own hotkey chip, taller than a
    // line of text: there the key would show twice and the rows need room between them.
    const isTerminal = e.surface === 'terminal'
    const labelOf = (key: string, text: string) => (isTerminal ? `${key} ${text}` : text)
    const heading = (text: string) => (
      <Box width={8} flexShrink={0}>
        <Text dimColor>{text}</Text>
      </Box>
    )

    return (
      <Box flexDirection="column" rowGap={isTerminal ? 0 : 'sm'}>
        <Box flexWrap="wrap" alignItems="center">
          {heading('Model')}
          {MODELS.map(m => (
            <Button
              key={`model-${m.label}`}
              label={labelOf(m.key, m.label)}
              hotkey={m.key}
              variant={activeModel.includes(m.id) || activeModel.toLowerCase() === m.label.toLowerCase() ? 'primary' : undefined}
              onPress={() => setModel($, m.id)}
            />
          ))}
          <Text dimColor>{chosenModel ? '' : '  (default)'}</Text>
        </Box>
        <Box flexWrap="wrap" alignItems="center">
          {heading('Effort')}
          {EFFORTS.map(x => (
            <Button
              key={`effort-${x.level}`}
              label={labelOf(x.key, x.level)}
              hotkey={x.key}
              variant={chosenEffort === x.level ? 'primary' : undefined}
              onPress={() => setEffort($, x.level)}
            />
          ))}
          <Text dimColor>{chosenEffort ? '' : '  (default)'}</Text>
        </Box>
        <Box flexWrap="wrap" alignItems="center">
          {heading('Git')}
          {repo === null ? (
            <Text dimColor>no git repository – mode inactive</Text>
          ) : (
            MODES.map(x => (
              <Button
                key={`mode-${x.mode}`}
                label={labelOf(x.key, x.label)}
                hotkey={x.key}
                variant={chosenMode === x.mode ? 'primary' : undefined}
                onPress={() => setMode($, x.mode)}
              />
            ))
          )}
        </Box>
        <Box flexWrap="wrap" alignItems="center">
          {heading('Context')}
          {contextBar(Text, fill, barWidth, isTerminal)}
          {used && (
            <Text dimColor>
              {'   '}last request: {shortModel(used.model)}
              {used.effort ? ` · ${used.effort}` : ''}
            </Text>
          )}
        </Box>
        {windows.length > 0 && (
          <Box flexWrap="wrap" alignItems="center">
            {heading('Limits')}
            {windows.map((w, i) => (
              <Text>
                {i > 0 ? <Text dimColor> · </Text> : ''}
                <Text dimColor>{w.label} </Text>
                <Text color={fillColor(w.percent)}>{w.percent}%</Text>
              </Text>
            ))}
          </Box>
        )}
      </Box>
    )
  })
}

function toFill(c: { percent?: number; tokens?: number; window: number }): ContextFill {
  return { percent: c.percent, tokens: c.tokens, window: c.window }
}

function kilo(n: number) {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`
}

function contextBar(
  Text: ReturnType<EngineInterface['ui']['resolve']>['Text'],
  fill: ContextFill | null,
  width: number,
  isTerminal: boolean,
) {
  if (!fill || fill.percent === undefined) {
    return <Text dimColor>– no response yet</Text>
  }
  const filled = Math.min(width, Math.round((fill.percent / 100) * width))
  const color = fillColor(fill.percent)
  // A desktop font draws `░` as a noisy dot pattern; a dimmed full block reads as a plain track.
  const track = isTerminal ? '░' : '█'

  return (
    <Text>
      <Text color={color}>{'█'.repeat(filled)}</Text>
      <Text dimColor>{track.repeat(width - filled)}</Text>
      <Text color={color}> {fill.percent}%</Text>
      <Text dimColor> ({kilo(fill.tokens ?? 0)}/{kilo(fill.window)})</Text>
    </Text>
  )
}
