#!/bin/bash
set -Eeuo pipefail

exec > >(tee /var/log/chargeops-web-userdata.log | logger -t chargeops-web-userdata -s 2>/dev/console) 2>&1

APP_DIR=/opt/chargeops/app
REPO_URL="${app_repo_url}"
REPO_BRANCH="${app_repo_branch}"
API_GATEWAY_URL="${api_gateway_url}"

if [ -z "$REPO_URL" ] || echo "$REPO_URL" | grep -qi "CHANGE_ME"; then
  echo "Set app_repo_url to the Git repository URL that contains the ChargeOps project."
  exit 1
fi

if command -v apt-get >/dev/null 2>&1; then
  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io git curl nginx
elif command -v dnf >/dev/null 2>&1; then
  dnf update -y
  dnf install -y docker git curl nginx
elif command -v yum >/dev/null 2>&1; then
  yum update -y
  yum install -y docker git curl nginx
else
  echo "No supported package manager found. Expected apt-get, dnf, or yum."
  exit 1
fi
systemctl enable --now docker

cat >/etc/nginx/nginx.conf <<'NGINX'
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
  worker_connections 1024;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  sendfile on;
  keepalive_timeout 65;

  server {
    listen 80 default_server;
    server_name _;

    location = /health {
      access_log off;
      add_header Content-Type text/plain;
      return 200 "ok\n";
    }

    location = /healthz {
      access_log off;
      add_header Content-Type text/plain;
      return 200 "ok\n";
    }

    location / {
      proxy_pass http://127.0.0.1:8080;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header Connection "";
    }
  }
}
NGINX

rm -f /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/chargeops-web.conf
systemctl enable nginx
nginx -t
systemctl restart nginx

rm -rf "$APP_DIR"
git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$APP_DIR"

docker rm -f chargeops-web >/dev/null 2>&1 || true
docker build -t chargeops-web:latest "$APP_DIR/ev-frontend"
docker run -d \
  --name chargeops-web \
  --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -e API_GATEWAY_URL="$API_GATEWAY_URL" \
  -e DNS_RESOLVER="169.254.169.253" \
  chargeops-web:latest
