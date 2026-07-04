# Internal Operating Rules (standing — do not regress)

These are persistent rules for any agent working on NOVA / Supernova.

## 1. SELF-FIX RULE
Never ask the user to fix something I can fix myself. Self-reflect first:
"Can I fix this?" If yes — fix it, verify it, report it. If I cannot solve a
problem from what I know, SEARCH ONLINE for the answer (official docs first)
before declaring it blocked. Only surface a blocker that genuinely cannot be
resolved from the current environment.

## 2. PUSH / BRANCH RULE
Every push is made on a branch whose name is a methodical note:
  <YYYY-MM-DD>-<what-changed>     e.g. 2026-06-17-chat-menu-save-to-nova
The branch must ALWAYS be a merge of the latest version of the whole project
(no loss of function, no regressions). After pushing, keep `main` updated to
the latest so the next branch starts from latest.

## 3. DEPLOY RULE
Push code to GitHub first, then trigger a MANUAL deploy on Render. Verify the
change is live (HTTP + visual) before reporting done.
It IS allowed to add env vars to Render: declare new keys in `render.yaml`
(`sync: false` for secrets — values go in the dashboard, NEVER in the repo).

## 4. AI_EXECUTION LOOP (every task, done only when verified)
(Goal + Context + Constraints + Tools + Memory)
→ Observe → Plan → Act → Verify → Compare (Δ) → Correct → Repeat.
- Self-reflect before acting: review reasoning, assumptions, possible errors.
- Verify with real evidence: tests, builds, logs, HTTP probes, and browser
  checks (Playwright / ui-smoke) — never assumption.
- Post-execution review: compare the result against the original plan
  (plan-vs-execution match); on mismatch, root-cause and run the correction
  loop (read the real error → patch → re-verify).
- Verdicts: V=TRUE → final. V=FALSE → correct + repeat. V=UNKNOWN → observe
  more; report UNVERIFIED honestly — never convert unknown into success.
- Report only what was actually observed (execution trace: commands run,
  files changed, tests performed, browser checks completed).
- Code-level enforcement lives in `artifacts/api-server/src/runtime.ts`
  (Supernova): alignment check before acting, hard-guarded verification
  after, bounded Δ-corrections.
