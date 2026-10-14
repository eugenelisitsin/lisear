# How we work

Same process as the Philosophy Atlas.

## In one picture

```
 idea ──► Issue ──► Ideas ──(you)──► Refining ──(questions settled)──► Ready ──► In progress ──► In review ──(you merge)──► Done
                    backlog          Claude asks,      Claude moves it        Claude works        PR + preview      live
                                     you answer
```

## Where things live

| What | Where |
|---|---|
| Features, bugs — **what** learners need | [Issues](https://github.com/eugenelisitsin/lisear/issues), written in plain language |
| Priorities and status | The [**Lisear** board](https://github.com/users/eugenelisitsin/projects/2) |
| **How** it is built: design, trade-offs, code review | Pull requests (each one says `Closes #N`) |
| What the app does today | `docs/REQUIREMENTS.md` |
| Lasting technical decisions | `docs/decisions/` — one file per decision (D1, D2, …) |
| This process | this file; Claude's binding summary is `CLAUDE.md` in the repo root |

### Business vs. technical
- **Issues stay business-level.** They describe what a learner should be able to do, why, and how we'll know it's
  done. Claude's comments on issues are short and non-technical: "ready to try in the preview: …",
  "question for you: …".
- **Everything technical goes into the pull request**: design notes, alternatives, implementation details,
  test results. If a design needs discussion before coding, Claude opens a *draft* pull request for it.
- **Purely technical work** (tests, refactoring, tooling) has its own issues labelled `tech`. A *Product* view
  filtered with `-label:tech is:issue` hides them.

## Deciding what gets worked on

The board's **Status** column is the single switch:

| Status | Meaning |
|---|---|
| **Ideas** | The backlog: captured, not yet wanted. New issues land here automatically (the issue forms add them to the board). Nothing happens to these. |
| **Refining** | You want it. Claude asks the questions it needs to finish the work without stopping (see below). Once they are settled, Claude rewrites the issue as a spec and moves it to **Ready**. |
| **Ready** | Specified and approved. Claude works on these, **top of the column first** — drag to reorder. |
| **In progress** | Claude is working on it (a branch and draft PR exist). |
| **In review** | A pull request with a preview is waiting for you. |
| **Done** | Merged and live. |

### Refining: how the questions work
- Claude posts **one comment** with numbered questions, each with a **suggested answer** — reply "ok", "ok except 2: …",
  or answer in your own words. Questions stay business-level (what the learner hears and does, priorities, scope).
- When everything is settled, Claude **rewrites the issue description** as the agreed spec — what the learner can do,
  how we'll know it's done (checklist), out of scope, decisions — removes `needs-decision`, and **moves the card to Ready**.
- Anything still unclear during the work comes back as a question on the issue, never as a silent guess.

- **Don't want it:** close the issue as *Not planned*. **Not now:** leave it in *Ideas* (optional `p1`/`p2`/`p3`).
- Asking Claude in a session: "work on the board" (refine everything in *Refining*, then work through *Ready*),
  "work on the next Ready issue", or "work on #12".

## Pull requests and previews
- **One branch and one pull request per issue, always branched from the current `main`** (`feat/12-replay-chord`,
  `fix/61-…`, `tech/…`). Pull requests are never stacked on each other, so they can be merged in any order.
- **Batches:** 2–4 small, related issues refined together go into **one** pull request, one commit per issue.
- **Keeping pull requests mergeable:** at the start and end of every session Claude rebases its open pull requests
  that are behind `main` or show conflicts. Say "fix conflicts on #NN" any time.
- Every open pull request is published at `https://apps.lisitsin.com/lisear-previews/pr-<number>/`; the link is
  posted on the pull request. The preview is removed when the pull request closes. Sound changes are judged by ear
  there — the pull request says what to listen for.
- Checks run on every pull request: JavaScript syntax, unit tests, build.
- **You merge** (green "Squash and merge" button). Merging to `main` deploys to https://apps.lisitsin.com/lisear/
  within a couple of minutes; learners get it the next time they open the app.

### Was it deployed?
- The merged pull request gets a comment from the bot: **✅ Live** with the time, or **❌ Deploy failed** with a link.
- Repo home page → **Deployments → production**, or the **Actions** tab → *Deploy*.

## Infrastructure notes
- Deploys use the server's `deploy` user with a Lisear-only key (forced `rrsync` into `/var/www/apps`).
  Old asset folders and closed previews are cleaned up daily by `/etc/cron.daily/lisear-prune`.
- Caddy caches everything for a year except the Lisear pages, `sw.js` and `manifest.json` (D5).
- Local development: `python3 tools/serve.py` (never caches), then http://localhost:8812/.
- `main` is not protected (convention, not an enforced rule).

## Changing this process
A change goes into one pull request that updates **this file and `CLAUDE.md` together**.
