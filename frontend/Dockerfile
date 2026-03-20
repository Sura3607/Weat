# ── Frontend Dockerfile ───────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Development stage (uses next dev with hot-reload)
FROM base AS dev
EXPOSE 3000
ENV NEXT_TELEMETRY_DISABLED=1
CMD ["npx", "next", "dev"]

# Production build stage
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx next build

# Production stage
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.js ./
EXPOSE 3000
CMD ["npx", "next", "start"]
