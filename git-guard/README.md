# git-guard

Asks you before Claude runs a risky command (Bash or PowerShell). Deny, or dismiss the question, and the command does not run.

It asks for:

- `git push --force` / `-f` / `--force-with-lease`
- `git reset --hard`
- `git clean -f…`
- `git checkout .` / `git restore .` (discards all changes)
- `git branch -D`
- `rm -rf` and `Remove-Item -Recurse -Force`
- `git add` or `git commit` that would commit a `.env` file (`.env.example`, `.env.sample` and `.env.template` are fine)
