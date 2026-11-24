# bw-pos (Digisales POS)

Next.js PWA point of sale, live at budgetwearpos.digerp.com. It talks to JamiiDairy v2's `process.php` (Web POS tps
such as `fetchPOSPermsFromERP`, `roles`, carts, shifts). Repo owner: `georgedigi`.

## Git and GitHub (every session)

- Commit, push and open the PR **as the last thing in a session**, once all the work is done and checked, not
  after each change.
- **One PR per session**, covering every task done in it, from a branch (`<name>/<topic>`) cut from current `origin/main`.
- **No AI traces on GitHub**: no `Co-Authored-By: Claude`, no "Generated with Claude Code" or similar, in commits,
  PR titles / bodies or docs.
- Flow: PR -> merge into `main` (the default branch) -> deploy with
  `bash <(git show origin/main:scripts/deploy_main.sh)` (`--status` / `--dry-run` first, report, then the real
  deploy only after the user says yes; options: `--help`). Merge and deploy only when the user asks.
