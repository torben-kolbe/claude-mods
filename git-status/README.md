# git-status

Shows the git state of the session's folder in the status line under the prompt:

```
git: feature/login · 3 changed · ↑1 ↓0
```

Branch, number of changed or untracked files, and commits ahead/behind the remote (`not pushed` when the branch has no upstream). Refreshes after each turn, after Claude runs a git command, and every 30 seconds. Hidden outside a git repository.
