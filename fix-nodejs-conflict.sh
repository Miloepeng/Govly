#!/bin/bash

# Fix Node.js package conflict script
# Run this if you encounter the dpkg error

set -e

echo "🔧 Fixing Node.js package conflict..."

# Stop any running Node.js processes
sudo pkill -f node || true

# Remove conflicting packages
echo "🗑️ Removing conflicting Node.js packages..."
sudo apt-get remove -y nodejs npm libnode-dev || true
sudo apt-get autoremove -y
sudo apt-get autoclean

# Clean up any broken packages
sudo dpkg --configure -a
sudo apt-get -f install

# Remove NodeSource repository if it exists
sudo rm -f /etc/apt/sources.list.d/nodesource.list

# Update package list
sudo apt update

# Install Node.js 18 properly
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
echo "✅ Verifying Node.js installation..."
node --version
npm --version

echo "🎉 Node.js conflict resolved!"
echo "You can now continue with the deployment process."

