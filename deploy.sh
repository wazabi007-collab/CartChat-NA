#!/bin/bash
set -e

cd /opt/oshicart

echo "==> Pulling latest changes..."
git pull origin master

echo "==> Rebuilding app container..."
docker compose build app --no-cache

echo "==> Restarting app..."
docker compose up -d app

echo "==> Waiting for app to start..."
sleep 5

echo "==> Checking app health..."
docker compose logs app --tail 5

echo "==> Deploy complete!"
