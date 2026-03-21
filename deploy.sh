#!/bin/bash
set -euo pipefail

# ============================================================
# Weat - EC2 Deploy Script
# Usage: ./deploy.sh [setup|deploy|ssl|logs|restart]
# ============================================================

DOMAIN="weat.compsci.studio"
EMAIL="admin@compsci.studio"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[Weat]${NC} $1"; }
warn() { echo -e "${YELLOW}[Weat]${NC} $1"; }
error() { echo -e "${RED}[Weat]${NC} $1"; }

# ─── Setup: Install Docker, Docker Compose, Certbot ────────
cmd_setup() {
  log "Installing Docker and dependencies..."

  # Update system
  sudo apt-get update -y
  sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

  # Install Docker
  if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    log "Docker installed. You may need to log out and back in."
  else
    log "Docker already installed."
  fi

  # Install Docker Compose plugin
  if ! docker compose version &> /dev/null; then
    sudo apt-get install -y docker-compose-plugin
  fi

  # Install Certbot
  if ! command -v certbot &> /dev/null; then
    sudo apt-get install -y certbot
  fi

  # Create certbot webroot
  sudo mkdir -p /var/www/certbot

  log "Setup complete!"
  warn "Next steps:"
  echo "  1. Copy .env file with your credentials"
  echo "  2. Run: ./deploy.sh ssl"
  echo "  3. Run: ./deploy.sh deploy"
}

# ─── SSL: Get Let's Encrypt certificate ────────────────────
cmd_ssl() {
  log "Obtaining SSL certificate for ${DOMAIN}..."

  # Stop nginx if running
  docker compose -f docker-compose.prod.yml stop nginx 2>/dev/null || true

  # Get certificate
  sudo certbot certonly \
    --standalone \
    --preferred-challenges http \
    -d "${DOMAIN}" \
    --email "${EMAIL}" \
    --agree-tos \
    --non-interactive

  log "SSL certificate obtained!"

  # Setup auto-renewal
  (sudo crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'docker compose -f ${PROJECT_DIR}/docker-compose.prod.yml restart nginx'") | sudo crontab -

  log "Auto-renewal cron job added."
}

# ─── Deploy: Build and start all services ──────────────────
cmd_deploy() {
  cd "${PROJECT_DIR}"

  # Check .env exists
  if [ ! -f .env ]; then
    error ".env file not found! Copy env.example.md values to .env first."
    exit 1
  fi

  log "Building and deploying Weat..."

  # Pull latest images
  docker compose -f docker-compose.prod.yml pull db nginx

  # Build app image
  docker compose -f docker-compose.prod.yml build app

  # Start all services
  docker compose -f docker-compose.prod.yml up -d

  log "Waiting for services to start..."
  sleep 10

  # Check health
  if docker compose -f docker-compose.prod.yml ps | grep -q "healthy"; then
    log "Weat is running at https://${DOMAIN}"
  else
    warn "Services are starting, check logs with: ./deploy.sh logs"
  fi
}

# ─── Logs: Show service logs ───────────────────────────────
cmd_logs() {
  cd "${PROJECT_DIR}"
  docker compose -f docker-compose.prod.yml logs -f --tail=100 "${2:-}"
}

# ─── Restart: Restart all services ─────────────────────────
cmd_restart() {
  cd "${PROJECT_DIR}"
  log "Restarting services..."
  docker compose -f docker-compose.prod.yml restart
  log "Services restarted."
}

# ─── Stop: Stop all services ──────────────────────────────
cmd_stop() {
  cd "${PROJECT_DIR}"
  log "Stopping services..."
  docker compose -f docker-compose.prod.yml down
  log "Services stopped."
}

# ─── Main ──────────────────────────────────────────────────
case "${1:-help}" in
  setup)   cmd_setup ;;
  ssl)     cmd_ssl ;;
  deploy)  cmd_deploy ;;
  logs)    cmd_logs "$@" ;;
  restart) cmd_restart ;;
  stop)    cmd_stop ;;
  *)
    echo "Usage: ./deploy.sh [setup|ssl|deploy|logs|restart|stop]"
    echo ""
    echo "Commands:"
    echo "  setup   - Install Docker, Docker Compose, Certbot"
    echo "  ssl     - Get Let's Encrypt SSL certificate"
    echo "  deploy  - Build and start all services"
    echo "  logs    - Show service logs (optional: service name)"
    echo "  restart - Restart all services"
    echo "  stop    - Stop all services"
    ;;
esac
