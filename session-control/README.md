# session-control

A band above the Claude Code prompt to switch model, effort and git work mode, and to see how full the context window and your usage limits are.

```
Model   [ 1 Sonnet ] [ 2 Opus ] [ 3 Fable ]
Effort  [ 4 low ] [ 5 medium ] [ 6 high ] [ 7 xhigh ] [ 8 max ]
Git     [ m Main branch ] [ b New branch ] [ w Worktree ]
Context ███████░░░░░░░ 42% (84k/200k)   last request: Opus · high
Limits  5h 23% · week 41%
```

## Install

```
/plugin install session-control --marketplace torben-kolbe/claude-mods
```

## Usage

- **Alt+X** (or Ctrl+X, then Tab, depending on the terminal) focuses the band; press the key shown next to a choice. Esc returns to the prompt. In the desktop app, click a choice; the key shows as a chip on the button.
- Or by command: `/sc 2 6 b` picks Opus, high effort and a new branch; `/sc 0` resets model and effort to the defaults.
- One at a time: `/sc-model`, `/sc-effort`, `/sc-mode`.
- Claude Code's own `/model` and `/effort` reset the mod's choice: the last change wins.
- The model and effort apply to the main session; subagents keep their own.
- **Git modes** (only passed to Claude inside a git repository):
  - *Main branch*: work directly on main/master.
  - *New branch*: create a new branch from main and work there.
  - *Worktree*: create a separate git worktree on its own branch.
- The context gauge turns yellow at 60 % and red at 85 %.
- **Limits** shows how much of your plan's usage windows (5 hours, week) is used, once Claude Code reports them (subscriptions only).
- In the *New branch* and *Worktree* modes, a commit directly on main/master asks you first.
- Choices are saved and carry over to new sessions.
