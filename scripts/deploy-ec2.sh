#!/bin/bash
# ── Weat EC2 Deploy Script ───────────────────────────────
# Usage: bash scripts/deploy-ec2.sh
#
# Prerequisites:
#   1. EC2 instance with Docker + Docker Compose installed
#   2. Security Group: open ports 80, 443, 22
#   3. SSH key configured
#   4. .env file configured (copy from .env.production)

set -e

echo "=== Weat EC2 Deployment ==="
echo ""

# ── Step 1: Check prerequisites ──────────────────────────
echo "[1/6] Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker not installed"; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "ERROR: Docker Compose not installed"; exit 1; }

if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Copy from .env.production and fill in values."
  echo "  cp .env.production .env"
  echo "  nano .env"
  exit 1
fi

echo "  OK"

# ── Step 2: Pull latest code ─────────────────────────────
echo "[2/6] Pulling latest code..."
git pull origin main 2>/dev/null || echo "  (skipped - not a git repo or no remote)"
echo "  OK"

# ── Step 3: Build containers ─────────────────────────────
echo "[3/6] Building containers (this may take a few minutes)..."
docker compose -f docker-compose.prod.yml build --no-cache
echo "  OK"

# ── Step 4: Start infrastructure ─────────────────────────
echo "[4/6] Starting infrastructure (postgres, redis)..."
docker compose -f docker-compose.prod.yml up -d postgres redis
echo "  Waiting for databases to be healthy..."
sleep 10
echo "  OK"

# ── Step 5: Run migrations ───────────────────────────────
echo "[5/6] Running database migrations..."
docker compose -f docker-compose.prod.yml run --rm backend npx tsx src/db/migrate.ts
echo "  Running seed data..."
docker compose -f docker-compose.prod.yml run --rm backend npx tsx src/db/seed.ts || echo "  (seed skipped - may already exist)"
echo "  OK"

# ── Step 6: Start all services ───────────────────────────
echo "[6/6] Starting all services..."
docker compose -f docker-compose.prod.yml up -d
echo "  OK"

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Services:"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "Access:"
echo "  Frontend: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_EC2_IP')"
echo "  API:      http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_EC2_IP')/api/v1/health"
echo ""
echo "Logs: docker compose -f docker-compose.prod.yml logs -f"
echo "Stop: docker compose -f docker-compose.prod.yml down"
