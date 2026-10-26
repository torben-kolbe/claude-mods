# claude-mods

Mods for [Claude Code](https://claude.com/claude-code). Each mod installs on its own.

| Mod | What it does |
| --- | --- |
| [session-control](./session-control) | Switch model, effort and git work mode from a band above the prompt, with context and usage-limit gauges |
| [turn-notify](./turn-notify) | A desktop notification with sound when a longer Claude turn is done |
| [git-guard](./git-guard) | Asks before risky commands: force push, reset --hard, rm -rf, discarding changes, committing .env files |
| [git-status](./git-status) | Branch, uncommitted files and ahead/behind of the remote, always in the status line |
| [learn-mode](./learn-mode) | Claude explains each change briefly: what, why and the concept behind it |

## Installing a mod

At the prompt of a Claude Code session in a terminal:

```
/plugin install <mod> --marketplace torben-kolbe/claude-mods
```

Answer `Add marketplace?` with `y`, then pick the user scope with Enter. The mod is active right away and in every session after.

From a shell:

```
claude plugin install <mod> --marketplace torben-kolbe/claude-mods
```

In the desktop app: click + next to the prompt box, then Plugins, Add marketplace with `torben-kolbe/claude-mods`, then Add plugin.

## Turning mods on and off

Run `/plugin` in Claude Code: every installed mod is listed there and can be enabled or disabled on its own. From a shell: `claude plugin disable <mod>@claude-mods` and `claude plugin enable <mod>@claude-mods`.

## Updating

From a shell, fetch the latest catalog, then update each mod you use:

```
claude plugin marketplace update claude-mods
claude plugin update <mod>@claude-mods
```

Then restart Claude Code (or run `/reload-plugins`) to load the new version.

## Developing

- Each mod lives in its own folder with `.claude-plugin/plugin.json`, `hooks/` and `tests/`, and is listed in `.claude-plugin/marketplace.json`.
- **Bump `version` in the mod's `plugin.json` with every change you push**: `claude plugin update` only picks up a new version.
- `claude plugin validate <mod>` checks a mod, `claude plugin test <mod>` runs its tests.
- With this folder added as a local marketplace (`claude plugin marketplace add <path to this folder>`), installed mods are read straight from it: `/reload-plugins` loads a change, no update needed.
