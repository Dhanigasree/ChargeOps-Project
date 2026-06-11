#!/bin/bash
set -Eeuo pipefail

exec > >(tee /var/log/chargeops-app-userdata.log | logger -t chargeops-app-userdata -s 2>/dev/console) 2>&1

APP_DIR=/opt/chargeops/app
REPO_URL="${app_repo_url}"
REPO_BRANCH="${app_repo_branch}"

if [ -z "$REPO_URL" ] || echo "$REPO_URL" | grep -qi "CHANGE_ME"; then
  echo "Set app_repo_url to the Git repository URL that contains the ChargeOps project."
  exit 1
fi

if command -v apt-get >/dev/null 2>&1; then
  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io git curl
  curl -fsSL "https://s3.${aws_region}.amazonaws.com/amazon-ssm-${aws_region}/latest/debian_amd64/amazon-ssm-agent.deb" -o /tmp/amazon-ssm-agent.deb || true
  dpkg -i /tmp/amazon-ssm-agent.deb || true
  systemctl enable --now amazon-ssm-agent || snap start amazon-ssm-agent || true
elif command -v dnf >/dev/null 2>&1; then
  dnf update -y
  dnf install -y docker git curl
  systemctl enable --now amazon-ssm-agent || true
elif command -v yum >/dev/null 2>&1; then
  yum update -y
  yum install -y docker git curl
  systemctl enable --now amazon-ssm-agent || true
else
  echo "No supported package manager found. Expected apt-get, dnf, or yum."
  exit 1
fi
systemctl enable --now docker

if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

docker compose version >/dev/null 2>&1 || {
  curl -fsSL "https://github.com/docker/compose/releases/download/v2.27.1/docker-compose-linux-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
  mkdir -p /usr/local/lib/docker/cli-plugins
  ln -sf /usr/local/bin/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose
}

rm -rf "$APP_DIR"
git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$APP_DIR"

cat >"$APP_DIR/ev-backend/.env" <<ENV
API_GATEWAY_PORT=8000
NODE_ENV=production
JWT_SECRET=${jwt_secret}
JWT_EXPIRES_IN=7d
INTERNAL_SERVICE_API_KEY=${internal_service_api_key}
ALLOWED_ORIGINS=${allowed_origins}
AUTO_SEED_STATIONS=true
STRIPE_SECRET_KEY=${stripe_secret_key}
STRIPE_CURRENCY=usd
FRONTEND_APP_URL=${frontend_app_url}
ENV

cat >"$APP_DIR/ev-backend/docker-compose.aws.yml" <<COMPOSE
services:
  api-gateway:
    depends_on: []
  auth-service:
    depends_on: []
    environment:
      MONGODB_URI: mongodb://${mongodb_root_username}:${mongodb_root_password}@${mongodb_private_ip}:27017/ev-auth-service?authSource=admin
  user-service:
    depends_on: []
    environment:
      MONGODB_URI: mongodb://${mongodb_root_username}:${mongodb_root_password}@${mongodb_private_ip}:27017/ev-user-service?authSource=admin
  station-service:
    depends_on: []
    environment:
      MONGODB_URI: mongodb://${mongodb_root_username}:${mongodb_root_password}@${mongodb_private_ip}:27017/ev-station-service?authSource=admin
  booking-service:
    depends_on: []
    environment:
      MONGODB_URI: mongodb://${mongodb_root_username}:${mongodb_root_password}@${mongodb_private_ip}:27017/ev-booking-service?authSource=admin
  payment-service:
    depends_on:
      - booking-service
    environment:
      MONGODB_URI: mongodb://${mongodb_root_username}:${mongodb_root_password}@${mongodb_private_ip}:27017/ev-payment-service?authSource=admin
  review-service:
    depends_on: []
    environment:
      MONGODB_URI: mongodb://${mongodb_root_username}:${mongodb_root_password}@${mongodb_private_ip}:27017/ev-review-service?authSource=admin
  admin-service:
    depends_on:
      - user-service
      - station-service
      - booking-service
      - payment-service
    environment:
      MONGODB_URI: mongodb://${mongodb_root_username}:${mongodb_root_password}@${mongodb_private_ip}:27017/ev-admin-service?authSource=admin
COMPOSE

cd "$APP_DIR/ev-backend"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.aws.yml"
SERVICES="auth-service api-gateway user-service station-service booking-service payment-service review-service admin-service"

for service in $SERVICES; do
  echo "Starting $service"
  COMPOSE_PARALLEL_LIMIT=1 docker compose $COMPOSE_FILES up -d --build "$service" || {
    echo "Failed to start $service; continuing so other services can come up."
    docker compose $COMPOSE_FILES logs "$service" || true
  }
done

docker compose $COMPOSE_FILES ps
