# ─── Stage 1: Build ────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy dependency files first for layer caching
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build frontend + backend
ARG VITE_APP_ID=weat
ARG VITE_APP_TITLE=Weat
ARG VITE_GOOGLE_MAPS_API_KEY=""
ARG VITE_OAUTH_PORTAL_URL=""
ARG VITE_APP_LOGO=""

RUN pnpm run build

# ─── Stage 2: Production ──────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy dependency files
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/shared ./shared

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/trpc/auth.me || exit 1

# Expose port (will be set by env or default 3000)
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]
