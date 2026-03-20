# ── Backend Dockerfile ────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Development stage (uses tsx for hot-reload)
FROM base AS dev
EXPOSE 4000
CMD ["npx", "tsx", "watch", "src/index.ts"]

# Production build stage
FROM base AS build
RUN npx tsc

# Production stage
FROM node:22-alpine AS prod
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/db ./db
EXPOSE 4000
CMD ["node", "dist/index.js"]
