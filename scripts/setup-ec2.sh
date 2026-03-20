#!/bin/bash
# ── Weat EC2 Initial Setup ──────────────────────────────
# Run this ONCE on a fresh Ubuntu 22.04/24.04 EC2 instance
# Usage: bash scripts/setup-ec2.sh

set -e

echo "=== Weat EC2 Setup ==="
echo ""

# ── Install Docker ────────────────────────────────────────
echo "[1/4] Installing Docker..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
echo "  OK"

# ── Add user to docker group ─────────────────────────────
echo "[2/4] Configuring Docker..."
sudo usermod -aG docker $USER
echo "  OK"

# ── Install Git ──────────────────────────────────────────
echo "[3/4] Installing Git..."
sudo apt-get install -y git
echo "  OK"

# ── Open firewall ────────────────────────────────────────
echo "[4/4] Configuring firewall..."
sudo ufw allow 22/tcp 2>/dev/null || true
sudo ufw allow 80/tcp 2>/dev/null || true
sudo ufw allow 443/tcp 2>/dev/null || true
echo "  OK"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "IMPORTANT: Log out and log back in for Docker group to take effect."
echo ""
echo "Next steps:"
echo "  1. git clone https://github.com/Sura3607/Weat.git"
echo "  2. cd Weat"
echo "  3. cp .env.production .env"
echo "  4. nano .env  # Fill in your values"
echo "  5. bash scripts/deploy-ec2.sh"
