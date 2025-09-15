#!/bin/bash

# AWS EC2 Deployment Script for Govly
# Run this script on your EC2 instance

set -e

echo "🚀 Starting Govly AWS Deployment..."

# Update system
sudo apt update && sudo apt upgrade -y

# Remove existing Node.js packages to avoid conflicts
sudo apt-get remove -y nodejs npm libnode-dev
sudo apt-get autoremove -y
sudo apt-get autoclean

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.11 and pip
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Install system dependencies
sudo apt install -y nginx supervisor git curl wget unzip

# Install PM2 globally
sudo npm install -g pm2

echo "✅ System setup complete!"
echo "📋 Next steps:"
echo "1. Make sure you're in your govly-web directory"
echo "2. Run: ./setup-production.sh"
echo "3. Run: ./deploy-app.sh"
echo ""
echo "💡 Note: Run these scripts from your govly-web directory!"
