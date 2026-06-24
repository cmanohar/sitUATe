# Situate collector — Fastify ingest service with pluggable storage.
#
# better-sqlite3 is a native addon, so the builder stage needs a C++ toolchain to
# compile it; the runtime stage carries only the built node_modules + dist.
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Toolchain for better-sqlite3's native build (node-gyp: python3 + make + g++).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Monorepo install: copy the workspace manifests core/server depend on.
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
RUN npm ci --workspace @situate/core --workspace @situate/server --include-workspace-root

COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY packages/server packages/server
RUN npm run build -w @situate/core && npm run build -w @situate/server

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    SITUATE_STORE=sqlite \
    SITUATE_STORAGE_DIR=/data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/core/package.json ./packages/core/
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/server/package.json ./packages/server/

VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "packages/server/dist/main.js"]
