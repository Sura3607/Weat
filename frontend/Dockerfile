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
CMD ["npx", "next", "dev", "-H", "0.0.0.0"]

# Production build stage
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
# Accept build-time env vars for Next.js public runtime config
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_APP_NAME=Weat
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
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
CMD ["npx", "next", "start", "-H", "0.0.0.0"]
