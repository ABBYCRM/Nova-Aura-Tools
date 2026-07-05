# NOVA — Primary Personal Assistant (twin of SUPERNOVA/ABBY)

NOVA is the primary personal AI assistant + Work-Tree planner half of a twin
system. Its secondary is **SUPERNOVA / ABBY** (the multi-agent swarm).

- **Live (NOVA):** https://nova-sszi.onrender.com
- **Live (SUPERNOVA twin):** https://supernova-ai1.onrender.com
- **Architecture:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Layout (pnpm workspace)

```
artifacts/nova         Frontend — vanilla SPA (index.html + public/assets/bob.js)
artifacts/api-server   Express API: openai-proxy, voice, knowledge, work-tree
lib/*                  Shared libraries (db, api-spec, api-zod, api-client)
```

## Twin link

NOVA reaches SUPERNOVA via `SUPERNOVA_BASE_URL` (default
`https://supernova-ai1.onrender.com`) for Work-Tree goal dispatch, and the
frontend "Open Super Nova" button links to the same URL. Server-to-server
calls authenticate with `SUPERNOVA_API_KEY` (paired with SUPERNOVA's
`OPENCLAW_API_KEY`).

## Develop

```bash
pnpm install
pnpm run typecheck
pnpm --filter @workspace/api-server run build
```

Package manager is **pnpm** only. Secrets live in the deploy dashboard, never
in the repo.
