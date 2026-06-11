#!/bin/bash
set -Eeuo pipefail

exec > >(tee /var/log/chargeops-mongodb-userdata.log | logger -t chargeops-mongodb-userdata -s 2>/dev/console) 2>&1

if command -v apt-get >/dev/null 2>&1; then
  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io
elif command -v dnf >/dev/null 2>&1; then
  dnf update -y
  dnf install -y docker
elif command -v yum >/dev/null 2>&1; then
  yum update -y
  yum install -y docker
else
  echo "No supported package manager found. Expected apt-get, dnf, or yum."
  exit 1
fi
systemctl enable --now docker

mkdir -p /opt/chargeops/mongodb
cat >/opt/chargeops/mongodb/docker-compose.yml <<'COMPOSE'
services:
  mongodb:
    image: mongo:7
    container_name: chargeops-mongodb
    restart: unless-stopped
    command: ["mongod", "--bind_ip_all"]
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: "${mongodb_root_username}"
      MONGO_INITDB_ROOT_PASSWORD: "${mongodb_root_password}"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
COMPOSE

docker compose version >/dev/null 2>&1 || {
  curl -fsSL "https://github.com/docker/compose/releases/download/v2.27.1/docker-compose-linux-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
  mkdir -p /usr/local/lib/docker/cli-plugins
  ln -sf /usr/local/bin/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose
}

cd /opt/chargeops/mongodb
docker compose up -d
