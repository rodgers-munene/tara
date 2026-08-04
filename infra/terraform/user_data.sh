#!/bin/bash
set -euxo pipefail

dnf install -y git python3.12 nginx augeas-libs

systemctl enable nginx

python3.12 -m venv /opt/certbot
/opt/certbot/bin/pip install --upgrade pip --quiet
/opt/certbot/bin/pip install certbot certbot-nginx --quiet
ln -sf /opt/certbot/bin/certbot /usr/bin/certbot