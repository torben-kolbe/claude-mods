# session-control

A band above the Claude Code prompt to switch model, effort and git work mode, and to see how full the context window is.

```
Model   [ 1 Sonnet ] [ 2 Opus ] [ 3 Fable ]
Effort  [ 4 low ] [ 5 medium ] [ 6 high ] [ 7 xhigh ] [ 8 max ]
Git     [ m Main branch ] [ b New branch ] [ w Worktree ]
Context ███████░░░░░░░ 42% (84k/200k)   last request: Opus · high
```

## Install

```
/plugin install session-control --marketplace torben-kolbe/claude-mods
```

## Usage

- **Alt+X** (or Ctrl+X, then Tab, depending on the terminal) focuses the band; press the key shown next to a choice. Esc returns to the prompt.
- Or by command: `/sc 2 6 b` picks Opus, high effort and a new branch; `/sc 0` resets model and effort to the defaults.
- One at a time: `/sc-model`, `/sc-effort`, `/sc-mode`.
- Claude Code's own `/model` and `/effort` reset the mod's choice: the last change wins.
- The model and effort apply to the main session; subagents keep their own.
- **Git modes** (only passed to Claude inside a git repository):
  - *Main branch*: work directly on main/master.
  - *New branch*: create a new branch from main and work there.
  - *Worktree*: create a separate git worktree on its own branch.
- The context gauge turns yellow at 60 % and red at 85 %, and also shows in the status line.
- Choices are saved and carry over to new sessions.
