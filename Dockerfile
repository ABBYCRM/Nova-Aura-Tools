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
# Explicitly unset NODE_ENV to prevent any accidental production-mode behavior.
ENV NODE_ENV=development
RUN pnpm install

# Copy remaining source
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
COPY artifacts/nova/ ./artifacts/nova/
COPY scripts/ ./scripts/
COPY skills/ ./skills/

# Debug: list node_modules contents to verify packages
RUN echo "=== node_modules/ root ===" && ls /app/node_modules/ | head -20 && \
    echo "=== .pnpm contents ===" && ls /app/node_modules/.pnpm/ | grep "^esbuild@" | head -5 && \
    echo "=== esbuild symlink check ===" && ls -la /app/node_modules/esbuild 2>/dev/null || echo "NO esbuild symlink at root"

# Build the api-server.
# cd /app: pnpm's virtual store (.pnpm/) is at the workspace root (/app/).
# Running from /app means Node can resolve packages from the virtual store.
RUN cd /app && node ./artifacts/api-server/build.mjs

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
