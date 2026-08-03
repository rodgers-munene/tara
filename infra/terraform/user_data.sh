#!/bin/bash
set -euxo pipefail

dnf install -y git python3.12

dnf install -y 'dnf-command(copr)'
dnf copr enable -y @caddy/caddy epel-9-$(uname -m)
dnf install -y caddy

systemctl enable caddy