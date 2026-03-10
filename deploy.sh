#!/bin/bash
set -e

echo "============================================"
echo "  OshiCart — Production Deployment"
echo "============================================"

# ─── Step 1: System updates & Docker ─────────────
echo ""
echo ">>> Step 1: Ensuring Docker is ready..."
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

if ! docker compose version &> /dev/null; then
    echo "ERROR: docker compose not found. Install Docker Compose v2."
    exit 1
fi

echo "Docker is ready."

# ─── Step 2: Create project directory ────────────
PROJECT_DIR=/opt/oshicart
echo ""
echo ">>> Step 2: Setting up $PROJECT_DIR..."
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# ─── Step 3: Clone or pull the repo ─────────────
if [ -d ".git" ]; then
    echo "Pulling latest code..."
    git pull origin main
else
    echo "Cloning repository..."
    git clone https://github.com/wazabi007-collab/CartChat-NA.git .
fi

# ─── Step 4: Create production env file ──────────
if [ ! -f ".env.production" ]; then
    echo ""
    echo ">>> Step 4: Creating production environment file..."
    cat > .env.production << 'ENVEOF'
POSTGRES_PASSWORD=3c220c9e06a1f953b1fb2eef0790f0446b867f78a13991ddbac0a2964d91f025
JWT_SECRET=e3f4d3237df2e2b1e1cb373d111d2027f352989ae59b86c66787069558fbfb86
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzczMTU3NjAwLCJleHAiOjIwODg1MTc2MDB9.5fgjCN-TFB6CTGDr1JRtLiBC8pFRlf7BmYO_u4wqPAg
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzMxNTc2MDAsImV4cCI6MjA4ODUxNzYwMH0.UyouoE4c23rZlk--gfy-9e9hh9wyDyn4_WIhbTEjE8Q
TWILIO_ACCOUNT_SID=test
TWILIO_AUTH_TOKEN=test
TWILIO_MESSAGE_SERVICE_SID=test
ENVEOF
    echo "Production env file created."
    echo "NOTE: Twilio credentials are set to 'test'. Update with real credentials when ready for production SMS."
else
    echo ">>> Step 4: .env.production already exists, skipping."
fi

# ─── Step 5: Open firewall ports ─────────────────
echo ""
echo ">>> Step 5: Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp 2>/dev/null || true
    ufw allow 443/tcp 2>/dev/null || true
    ufw allow 22/tcp 2>/dev/null || true
    echo "Firewall configured (ports 80, 443, 22)."
else
    echo "UFW not found, skipping firewall config."
fi

# ─── Step 6: Deploy ─────────────────────────────
echo ""
echo ">>> Step 6: Building and starting services..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

echo ""
echo ">>> Waiting for services to start..."
sleep 30

# ─── Step 7: Check status ───────────────────────
echo ""
echo ">>> Step 7: Service status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "============================================"
echo "  OshiCart deployment complete!"
echo ""
echo "  URL: https://oshicart.octovianexus.com"
echo ""
echo "  IMPORTANT: Make sure you have an A record"
echo "  pointing oshicart.octovianexus.com to this"
echo "  server's IP address. Caddy will auto-provision"
echo "  the SSL certificate once DNS resolves."
echo "============================================"
