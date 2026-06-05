---
name: Render service repoint vs shared-repo push
description: How to update a Render service whose deploy repo was changed, without breaking other services on a shared repo.
---

# Updating a Render service that points at the wrong repo

A Render service's deploy source (repo + branch) can be changed via
`PATCH /v1/services/{id}` with `{"repo":"https://github.com/.../X","branch":"…","autoDeploy":"yes"}`
(both `repo` and `branch` are accepted top-level; returns 200). A service keeps
serving its **last successful build** until a new build replaces it — so a service
can show app A's UI while its config already points at repo B, if B never built
successfully.

**Why this matters (Nova incident):** the `nova` service (nova-sllb.onrender.com)
was the end-user front-end but its config had been repointed to the shared
`omnipost` repo (a small CLI). It kept serving a *stale* Nova build because the
omnipost build never replaced it. Fix = repoint that **single** service back to
the Nova repo/branch, set its env vars, redeploy.

**Rule — never push into a shared repo to update one service.** Several Render
services can deploy from the *same* repo+branch (e.g. `omnipost` backed nova,
depo-provera-claim-center, contentflow-ai, psyche-hub). Pushing app A's code into
that shared repo breaks every other service on it. To change what one service
runs, repoint **that service**, never the shared repo.

**Single-key env upsert (safe):** `PUT /v1/services/{id}/env-vars/{KEY}` body
`{"value":"…"}` adds/updates one var without wiping the others. Do NOT use the
bulk array `PUT /v1/services/{id}/env-vars` to add one var — it replaces the whole
set. Any env-var change or repoint with `autoDeploy:yes` can trigger a deploy, so
finish all config, then trigger one explicit `POST /deploys` and poll to `live`.
