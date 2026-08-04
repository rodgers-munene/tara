#!/bin/bash
# Run as root on the Tara EC2 instance (sudo bash deploy.sh) to (re)deploy the backend.
set -euo pipefail

PROJECT_NAME="tara"
REGION="eu-west-1"
REPO_URL="https://github.com/rodgers-munene/tara.git"
APP_DIR="/opt/tara"
BACKEND_DIR="$APP_DIR/backend"
VENV_DIR="$BACKEND_DIR/.venv"
ENV_FILE="$BACKEND_DIR/.env"

if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --depth 1 origin main
  git -C "$APP_DIR" reset --hard origin/main
else
  git clone --depth 1 "$REPO_URL" "$APP_DIR"
fi

aws ssm get-parameters-by-path \
  --region "$REGION" \
  --path "/$PROJECT_NAME/" \
  --with-decryption \
  --query "Parameters[*].[Name,Value]" \
  --output text \
  | while IFS=$'\t' read -r name value; do
      echo "$(basename "$name")=$value"
    done > "$ENV_FILE"
chmod 600 "$ENV_FILE"

python3.12 -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --upgrade pip --quiet
"$VENV_DIR/bin/pip" install -r "$BACKEND_DIR/requirements.txt" --quiet

cp "$APP_DIR/infra/systemd/tara-backend.service" /etc/systemd/system/tara-backend.service
systemctl daemon-reload
systemctl enable tara-backend
systemctl restart tara-backend

cp "$APP_DIR/infra/systemd/certbot-renew.service" /etc/systemd/system/certbot-renew.service
cp "$APP_DIR/infra/systemd/certbot-renew.timer" /etc/systemd/system/certbot-renew.timer
systemctl daemon-reload
systemctl enable --now certbot-renew.timer

if [ ! -d "/etc/letsencrypt/live/api.tara.ekshop.store" ]; then
  cp "$APP_DIR/infra/nginx/tara.conf" /etc/nginx/conf.d/tara.conf
fi
nginx -t && systemctl reload nginx 2>/dev/null || systemctl restart nginx


echo "Deploy complete."
