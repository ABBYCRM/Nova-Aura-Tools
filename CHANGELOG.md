# Changelog

All notable changes to **NOVA** (primary twin of SUPERNOVA/ABBY).

---

## 2026-07-04 — branch `2026-07-04/point-nova-at-new-supernova`

Summary:
- Point NOVA at the NEW SUPERNOVA deployment (https://supernova-ai1.onrender.com),
  replacing the old build (supernova-ekbj.onrender.com):
  - `artifacts/nova/index.html` — both "Open Super Nova" buttons.
  - `artifacts/api-server/src/routes/work-tree.ts` — `SUPERNOVA_BASE_URL` default.
  - docs/ARCHITECTURE.md + .agents/memory/twin-system-doctrine.md.
- Rebuilt the api-server bundle (dist now carries the new URL).
- Added README.md, CHANGELOG.md, AI_NOTES.md (git policy docking).

Broken / known limits:
- Server-to-server Work-Tree dispatch also needs SUPERNOVA_API_KEY (NOVA) to
  match the new SUPERNOVA service's OPENCLAW_API_KEY; the browser "Open Super
  Nova" buttons work regardless. NOVA's own redeploy is controlled by its
  Render service (separate account).

Verified: source + rebuilt dist contain only the new URL (0 old refs);
typecheck clean; new URL returns HTTP 200.
