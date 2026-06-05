---
name: Nova push & deploy workflow
description: Robert's branch-naming + Render repoint rule for shipping Nova to production.
---

# Nova push & deploy workflow

**Rule (Robert, authoritative):** every push goes to a branch whose name encodes
the date and what changed (e.g. `FINAL-BUILD-06/052026`). That branch must always
contain the full latest project with no loss of function.

**Render coupling:** the live Render `Nova-` service deploys from whatever single
branch is configured on the service. `replit-sync` was renamed to a dated
`FINAL-BUILD-*` branch. So when a new dated branch becomes canonical you MUST
repoint Render: `PATCH /v1/services/{id}` with `{"branch":"<dated-branch>"}`, then
trigger a deploy and poll to `live`. A missing/stale configured branch silently
stops autoDeploy (the push lands on GitHub but prod never updates).

**Why:** after a branch rename, Render was found still pointed at a stale/unrelated
branch while the old name no longer existed — prod would never have reflected new
pushes until the service's branch was repointed.

**How to apply:** on each ship — push HEAD to the dated branch (token-in-URL form,
redact the token), repoint Render's branch if it changed, deploy, verify `live`,
then confirm the live site.

**Self-sufficiency directive (Robert):** never ask him to fix what can be fixed
here. Self-reflect ("can I fix this?") and if so, do it.
