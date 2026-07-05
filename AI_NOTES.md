# AI_NOTES

Working notes for AI agents/contributors. Newest first.

---

## 2026-07-04 — Repoint NOVA → new SUPERNOVA URL

- **Model:** claude-opus-4-8 (Claude Code).
- **Objective:** Make NOVA call the new SUPERNOVA build
  (https://supernova-ai1.onrender.com), not the old one
  (supernova-ekbj.onrender.com).
- **Changed:** both frontend "Open Super Nova" buttons (index.html), the
  `SUPERNOVA_BASE_URL` default in work-tree.ts, ARCHITECTURE.md, and the
  twin-system-doctrine memory. Rebuilt the api-server dist.
- **Why:** the old SUPERNOVA build is superseded by the freshly deployed
  supernova-ai1 service.
- **Risks / next steps:** the programmatic Work-Tree dispatch (server→server)
  also needs `SUPERNOVA_API_KEY` on NOVA to equal the new SUPERNOVA service's
  `OPENCLAW_API_KEY`. The browser buttons need no key. NOVA's live redeploy is
  controlled by its own Render service (not the ABBY-AI team account used for
  the SUPERNOVA deploy), so a redeploy of NOVA is required for the server
  default to take effect in production.
- **Verified:** 0 old-URL refs remain in source or rebuilt dist; typecheck
  clean; new URL HTTP 200.
