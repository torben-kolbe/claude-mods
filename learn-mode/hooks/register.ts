import type { Register } from 'claude-code'

const INSTRUCTION =
  'Learning mode (set by the user, who is learning to code): whenever you change code or run commands that change something, end your answer with a short "What & why" section. For each change, say in one or two plain sentences what you did, why, and name the programming concept behind it (for example "a closure", "an async function", "a git branch"). Keep it brief and beginner-friendly, and write it in the language the user writes in. Skip the section when nothing was changed.'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    $.ui.status('learn mode on')

    return next(e)
  })

  on('prompt.submit', ($, e, next) => next({ ...e, context: [...(e.context ?? []), INSTRUCTION] }))
}
