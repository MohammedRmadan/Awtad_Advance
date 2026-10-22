#!/usr/bin/env bash
# Awtad BD Hub – one-time installer for an Ubuntu 22.04 / 24.04 (or Debian 12) VPS.
# Run as root from the project folder:   sudo bash deploy/linux/install.sh
# Safe to run again: it keeps an existing .env and data.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$APP_DIR"

say()  { printf '\n\033[1;35m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mXX %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root:  sudo bash deploy/linux/install.sh"
[ -f docker-compose.yml ] && [ -f Dockerfile ] || die "Run this from the extracted bdhub folder."
. /etc/os-release 2>/dev/null || true
case "${ID:-}" in ubuntu|debian) ;; *) warn "Tested on Ubuntu/Debian only (found: ${PRETTY_NAME:-unknown}). Continuing.";; esac

# ---------- 1. Base packages + Docker ----------
say "Installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl openssl ufw dnsutils >/dev/null

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  say "Installing Docker Engine (official script from get.docker.com)"
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null
docker compose version >/dev/null || die "Docker Compose plugin is missing."

# ---------- 2. Configuration (.env) ----------
PUBLIC_IP="$(curl -fsS4 --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
ADMIN_PW=""
if [ -f .env ]; then
  say "Keeping the existing .env"
else
  say "Configuration"
  echo "Server public IP: ${PUBLIC_IP}"
  echo "Enter the domain for the system (e.g. bdhub.awtad.com.sa)."
  echo "Its DNS A record must point to ${PUBLIC_IP}. Leave empty to use the IP over HTTP for now."
  read -r -p "Domain: " DOMAIN </dev/tty || DOMAIN=""
  DOMAIN="$(echo "${DOMAIN}" | tr 'A-Z' 'a-z' | sed -e 's#^https\?://##' -e 's#/.*$##' -e 's/[[:space:]]//g')"
  if [ -n "$DOMAIN" ]; then
    RESOLVED="$(dig +short A "$DOMAIN" | tail -n1 || true)"
    if [ "$RESOLVED" != "$PUBLIC_IP" ]; then
      warn "DNS for $DOMAIN points to '${RESOLVED:-nothing}', not ${PUBLIC_IP}."
      warn "HTTPS will start working automatically once the DNS record is correct."
    fi
    SITE_ADDRESS="$DOMAIN"; BASE_URL="https://$DOMAIN"
  else
    SITE_ADDRESS=":80"; BASE_URL="http://$PUBLIC_IP"
  fi
  ADMIN_PW="Awtad-$(openssl rand -hex 5)-7"
  umask 077
  sed -e "s#^BASE_URL=.*#BASE_URL=${BASE_URL}#" \
      -e "s#^SITE_ADDRESS=.*#SITE_ADDRESS=${SITE_ADDRESS}#" \
      -e "s#^POSTGRES_PASSWORD=.*#POSTGRES_PASSWORD=$(openssl rand -hex 24)#" \
      -e "s#^SESSION_SECRET=.*#SESSION_SECRET=$(openssl rand -hex 32)#" \
      -e "s#^INITIAL_ADMIN_PASSWORD=.*#INITIAL_ADMIN_PASSWORD=${ADMIN_PW}#" \
      .env.example > .env
  chmod 600 .env
  umask 022
fi
mkdir -p backups

# ---------- 3. Firewall ----------
say "Firewall: allowing SSH, HTTP, HTTPS"
ufw allow OpenSSH >/dev/null || ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw --force enable >/dev/null
# Note: ports published by Docker bypass ufw; only 80/443 are published by this stack.

# ---------- 4. Start ----------
say "Building and starting (first time takes a few minutes)"
docker compose up -d --build

say "Waiting for the application"
for i in $(seq 1 60); do
  if docker compose exec -T app wget -qO- http://127.0.0.1:8080/healthz >/dev/null 2>&1; then break; fi
  sleep 3
  [ "$i" -eq 60 ] && { docker compose logs --tail=50 app; die "The application did not start. See the log above."; }
done

say "Loading the initial data (skips records that already exist)"
docker compose exec -T app node scripts/seed.js

# ---------- 5. Management command ----------
ln -sf "$APP_DIR/deploy/linux/bdhub.sh" /usr/local/bin/bdhub
chmod +x "$APP_DIR/deploy/linux/bdhub.sh"

BASE_URL_NOW="$(grep '^BASE_URL=' .env | cut -d= -f2-)"
ADMIN_USER="$(grep '^INITIAL_ADMIN_USERNAME=' .env | cut -d= -f2-)"
echo
printf '\033[1;32m%s\033[0m\n' "==============================================================="
printf '\033[1;32m  Awtad BD Hub is running\033[0m\n'
echo   "  Address:   ${BASE_URL_NOW}"
if [ -n "$ADMIN_PW" ]; then
  echo "  Username:  ${ADMIN_USER:-admin}"
  echo "  Password:  ${ADMIN_PW}     (temporary – you must change it at first sign-in)"
  printf 'Address: %s\nUsername: %s\nTemporary password: %s\n' "$BASE_URL_NOW" "${ADMIN_USER:-admin}" "$ADMIN_PW" > /root/bdhub-first-login.txt
  chmod 600 /root/bdhub-first-login.txt
  echo "  (also saved to /root/bdhub-first-login.txt – delete it after the first sign-in)"
else
  echo "  Existing installation – sign in with your current account."
  echo "  Forgot the admin password?   bdhub reset-admin"
fi
echo   "  Manage:    bdhub status | logs | update | backup | restore | reset-admin"
printf '\033[1;32m%s\033[0m\n' "==============================================================="
