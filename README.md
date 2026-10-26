# claude-mods

Mods for [Claude Code](https://claude.com/claude-code). Each mod installs on its own.

| Mod | What it does |
| --- | --- |
| [session-control](./session-control) | Switch model, effort and git work mode from a band above the prompt, with a context window gauge |

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
