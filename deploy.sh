#!/bin/bash
set -e

cd /opt/oshicart

echo "==> Pulling latest changes..."
git pull origin master

echo "==> Rebuilding app container..."
docker compose -f docker-compose.prod.yml build app --no-cache

echo "==> Restarting app..."
docker compose -f docker-compose.prod.yml up -d

echo "==> Waiting for app to start..."
sleep 5

echo "==> Checking app health..."
docker compose -f docker-compose.prod.yml logs app --tail 5

echo "==> Deploy complete!"
# Auto-deploy configured
