#!/bin/bash
set -Eeuo pipefail

exec > >(tee /var/log/chargeops-db-userdata.log | logger -t chargeops-db-userdata -s 2>/dev/console) 2>&1

if command -v apt-get >/dev/null 2>&1; then
  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io
  apt-get install -y curl
  curl -fsSL "https://s3.${aws_region}.amazonaws.com/amazon-ssm-${aws_region}/latest/debian_amd64/amazon-ssm-agent.deb" -o /tmp/amazon-ssm-agent.deb || true
  dpkg -i /tmp/amazon-ssm-agent.deb || true
  systemctl enable --now amazon-ssm-agent || snap start amazon-ssm-agent || true
elif command -v dnf >/dev/null 2>&1; then
  dnf update -y
  dnf install -y docker
  systemctl enable --now amazon-ssm-agent || true
elif command -v yum >/dev/null 2>&1; then
  yum update -y
  yum install -y docker
  systemctl enable --now amazon-ssm-agent || true
else
  echo "No supported package manager found. Expected apt-get, dnf, or yum."
  exit 1
fi
systemctl enable --now docker

docker rm -f chargeops-mongodb >/dev/null 2>&1 || true
docker volume create chargeops_mongo_data >/dev/null
docker run -d \
  --name chargeops-mongodb \
  --restart unless-stopped \
  -p 27017:27017 \
  -v chargeops_mongo_data:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME="${mongodb_root_username}" \
  -e MONGO_INITDB_ROOT_PASSWORD="${mongodb_root_password}" \
  mongo:7
