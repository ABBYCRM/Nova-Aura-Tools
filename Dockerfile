# Nova-Aura-Tools — Production Dockerfile
# Multi-stage: builds API server, serves React app + skills catalog

# ── Builder stage ──────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Install pnpm v9.15.4 globally
RUN npm install -g pnpm@9.15.4

# Copy lockfile + package manifests only (cache layer)
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY package.json ./

# Install all workspace deps (devDependencies included for build).
# No NODE_ENV=production in builder — devDeps (esbuild) are needed here.
RUN pnpm install

# Copy remaining source
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
COPY artifacts/nova/ ./artifacts/nova/
COPY scripts/ ./scripts/
COPY skills/ ./skills/

# Build the api-server.
# NODE_PATH=/app/node_modules: workspace packages are hoisted to the
# workspace root by pnpm; this lets Node find them when running from a
# subdirectory (node_modules only lives at /app/, not at /app/artifacts/api-server/).
RUN NODE_PATH=/app/node_modules pnpm --filter @workspace/api-server run build

# ── Runtime stage ───────────────────────────────────────────────────────────
FROM node:22-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV NOVA_STATIC_DIR=/app/nova-static

# Copy built API server
COPY --from=builder /app/artifacts/api-server/dist ./dist

# Copy static UI + skills catalog
COPY --from=builder /app/artifacts/nova/index.html ./nova-static/index.html
COPY --from=builder /app/artifacts/nova/skills.html ./nova-static/skills.html
COPY --from=builder /app/artifacts/nova/public ./nova-static/
COPY --from=builder /app/skills ./skills

# Copy identity files
COPY SOUL.md AGENTS.md DIRECTIVE.md IDENTITY.md USER.md \
      HEARTBEAT.md TOOLS.md TASKS.md GOVERNANCE.json ./

# Copy scripts (work-tree worker)
COPY --from=builder /app/scripts ./scripts

EXPOSE 8080

# Start: background worker + API server
CMD ["/bin/sh", "-c", \
  "node scripts/work-tree-worker.mjs & exec node --enable-source-maps ./dist/index.mjs"]
