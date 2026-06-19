#!/bin/bash

# Oracle Cloud Deployment Setup Script
# Run this on your Oracle Cloud Ubuntu instance after SSH login

set -e

echo "🚀 Starting Oracle Cloud Deployment Setup..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Update System
echo -e "${YELLOW}[1/8] Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Step 2: Install Node.js
echo -e "${YELLOW}[2/8] Installing Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Step 3: Install PostgreSQL
echo -e "${YELLOW}[3/8] Installing PostgreSQL...${NC}"
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
echo -e "${YELLOW}[4/8] Creating PostgreSQL database 'joe'...${NC}"
sudo -u postgres createdb joe 2>/dev/null || echo "Database 'joe' already exists"

# Step 4: Install Git
echo -e "${YELLOW}[5/8] Installing Git...${NC}"
sudo apt install -y git

# Step 5: Clone Repository
echo -e "${YELLOW}[6/8] Cloning repository...${NC}"
if [ ! -d "$HOME/app/joe-main" ]; then
    mkdir -p $HOME/app
    cd $HOME/app
    read -p "Enter your GitHub repo URL (https://github.com/...): " REPO_URL
    git clone $REPO_URL joe-main
else
    echo "Repository already cloned at $HOME/app/joe-main"
fi

cd $HOME/app/joe-main

# Step 6: Install Node Dependencies
echo -e "${YELLOW}[7/8] Installing Node.js dependencies...${NC}"
npm install

# Step 7: Install PM2 Globally
echo -e "${YELLOW}[8/8] Installing PM2...${NC}"
sudo npm install -g pm2

# Setup Complete
echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Create .env file with your database URL:"
echo "   cat > ~/.env-joe <<EOF"
echo "   DATABASE_URL=\"postgresql://postgres:PASSWORD@localhost:5432/joe\""
echo "   NODE_ENV=\"production\""
echo "   PORT=3000"
echo "   EOF"
echo ""
echo "2. Initialize database schema:"
echo "   cd $HOME/app/joe-main"
echo "   DATABASE_URL=\"postgresql://postgres:PASSWORD@localhost:5432/joe\" npx drizzle-kit push"
echo ""
echo "3. Build the application:"
echo "   npm run build"
echo ""
echo "4. Create PM2 config (ecosystem.config.cjs):"
echo "   cat > ~/app/joe-main/ecosystem.config.cjs <<'PMEOF'"
echo "module.exports = {"
echo "  apps: [{"
echo "    name: 'joe-app',"
echo "    script: './dist/index.js',"
echo "    instances: 1,"
echo "    env: {"
echo "      NODE_ENV: 'production',"
echo "      DATABASE_URL: 'postgresql://postgres:PASSWORD@localhost:5432/joe',"
echo "      PORT: 3000"
echo "    }"
echo "  }]"
echo "};"
echo "PMEOF"
echo ""
echo "5. Start the app with PM2:"
echo "   pm2 start ecosystem.config.cjs"
echo "   pm2 startup"
echo "   pm2 save"
echo ""
echo "6. Configure firewall in Oracle Cloud console:"
echo "   - Open port 3000 for Node.js"
echo "   - Optionally open ports 80/443 for Nginx reverse proxy"
echo ""
echo "📚 For detailed instructions, see: ORACLE_CLOUD_DEPLOYMENT.md"
echo ""