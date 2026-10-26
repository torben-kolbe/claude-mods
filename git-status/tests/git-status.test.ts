import { expect, test } from 'claude-code/testing'

import { describe } from '../hooks/register'

test('reads branch, changes and ahead/behind', async () => {
  const porcelain = ['# branch.oid abc', '# branch.head feature/x', '# branch.upstream origin/feature/x', '# branch.ab +2 -1', '1 .M N... 100644 100644 100644 a b src/a.ts', '? new.txt'].join('\n')

  expect(describe(porcelain)).toBe('git: feature/x · 2 changed · ↑2 ↓1')
})

test('a clean branch with no upstream', async () => {
  expect(describe('# branch.oid abc\n# branch.head main\n')).toBe('git: main · clean · not pushed')
})
