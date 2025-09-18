# Govly Cloud Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Cloud server (AWS, DigitalOcean, Google Cloud, etc.)
- Domain name (optional but recommended)

## Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://your-domain.com:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AWS Configuration (for Textract)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1

# Security
JWT_SECRET=your_jwt_secret_key
ENCRYPTION_KEY=your_encryption_key
```

## Deployment Steps

### 1. Prepare Your Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply docker group changes
```

### 2. Deploy the Application

```bash
# Clone your repository
git clone <your-repo-url>
cd Govly

# Copy environment file
cp .env.production.example .env.production
# Edit .env.production with your actual values

# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 3. Configure Reverse Proxy (Nginx)

Install Nginx:

```bash
sudo apt install nginx -y
```

Create Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring and Maintenance

### Health Checks

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

### Backup

```bash
# Backup environment file
cp .env.production .env.production.backup

# Backup any local data (if applicable)
tar -czf backup-$(date +%Y%m%d).tar.gz data/
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000 and 8000 are available
2. **Environment variables**: Double-check all required variables are set
3. **Docker permissions**: Ensure user is in docker group
4. **Memory issues**: Ensure server has at least 2GB RAM

### Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs

# View specific service logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f
```

## Security Considerations

1. **Firewall**: Configure UFW to only allow necessary ports
2. **Environment variables**: Never commit sensitive data to git
3. **Updates**: Regularly update system and Docker images
4. **Monitoring**: Set up monitoring and alerting
5. **Backups**: Regular backups of configuration and data

## Performance Optimization

1. **Resource limits**: Set appropriate CPU and memory limits
2. **Caching**: Configure Nginx caching for static assets
3. **CDN**: Consider using a CDN for static assets
4. **Database**: Optimize database queries and indexes
5. **Monitoring**: Use tools like Prometheus and Grafana
