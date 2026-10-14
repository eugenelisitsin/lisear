# Working on Lisear

Ear-training PWA (recognise the chords of a progression), plain static files in `www/` — no build step for
development. Live at https://apps.lisitsin.com/lisear/. Everything outside `www/`, `tools/`, `tests/`, `docs/` and
`.github/` (Capacitor, `ios/`, npm files) is for a future iOS wrapper: ignore it.
What the app does: `docs/REQUIREMENTS.md`. The full process is in `docs/WORKFLOW.md`; these are the binding rules for Claude.

## How work flows
- Board: https://github.com/users/eugenelisitsin/projects/2 — Status: Ideas → Refining → Ready → In progress → In review → Done.
- **Ideas:** never touch. **Refining:** post ONE comment of numbered, business-level questions, each with a suggested
  answer; label `needs-decision`. When answered: rewrite the issue body as the spec (what the learner can do · done
  checklist · not included · decisions · size), remove the label, move the card to Ready, comment "Moved to Ready".
- **Ready:** work top of the column first. Move the card to In progress, then to In review when the PR is up.
- "Work on the board" = refine everything in Refining, then build everything in Ready.
- Don't ask for confirmation on Ready items; ask on the issue only if something is genuinely unclear (card back to Refining).

## Issues vs pull requests
- Issue text and comments are **business-level only** (what learners hear, see and do). Short status comments:
  "Ready to try: <preview link> — …".
- All technical detail goes in the **pull request** (template: what changes for the learner / technical notes / checks).
- Purely technical work: label `tech`.

## Pull requests
- One PR per issue, **branched from the current `main`**, never stacked on another PR. Small related issues refined
  together (size S, same area) may share one PR: one commit per issue, `Closes #A, closes #B`.
- Never push to `main` directly; the owner merges (squash). Merging deploys automatically.
- **At the start and end of every session:** rebase any open PR that is behind `main` or conflicting; keep both sides
  of any `docs/decisions/` clash (renumber if two decisions got the same number).
- Before opening a PR: `node --test tests/`, `sh tools/build.sh /tmp/lisear-dist`, and try the app in a browser via
  `python3 tools/serve.py` (http://localhost:8812/; desktop, and phone width when the layout changes). Stop the
  server and any headless browser afterwards.
- Changed behaviour updates `docs/REQUIREMENTS.md` in the same PR.
- A design decision gets a new file in `docs/decisions/` (next number). Every bug fix should add a regression test in `tests/`.
- Sound changes: the owner judges by ear in the preview — say in the PR what to listen for.

## Changing the process
When the owner changes how we work, update **`docs/WORKFLOW.md` and this file in the same PR**, and update Claude's
memory for this project, so the rules never drift apart.
