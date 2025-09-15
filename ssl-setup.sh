#!/bin/bash

# SSL Certificate Setup with Let's Encrypt
# Run this if you have a domain name

set -e

echo "🔒 Setting up SSL certificate..."

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get your domain name
read -p "Enter your domain name (e.g., govly.yourdomain.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain name is required for SSL setup"
    exit 1
fi

# Update Nginx configuration with domain
sudo sed -i "s/your-domain.com/$DOMAIN/g" /etc/nginx/sites-available/govly

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Obtain SSL certificate
echo "🔐 Obtaining SSL certificate for $DOMAIN..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Setup automatic renewal
echo "⏰ Setting up automatic certificate renewal..."
sudo crontab -l 2>/dev/null | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | sudo crontab -

echo "✅ SSL setup complete!"
echo "🌐 Your application is now accessible at:"
echo "   https://$DOMAIN"
echo ""
echo "🔄 Certificate will auto-renew every 90 days"

