# D3. GitHub issues, one board, a pull request with a preview per change

- **Date:** 2026-10-15 (way of working)

Adopted the Philosophy Atlas process (`docs/WORKFLOW.md`): business-level issues on the *Lisear* board
(Ideas → Refining → Ready → In progress → In review → Done), technical discussion in pull requests, one pull request
per issue branched from `main`, a preview per pull request at `/lisear-previews/pr-N/`, and an automatic deploy when
the owner merges. Before this, changes were pushed straight to `main` and went live untested by the owner.
