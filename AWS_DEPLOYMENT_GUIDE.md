# 🚀 AWS EC2 Deployment Guide for Govly

This guide will help you deploy your Govly application on AWS EC2 with production-ready configuration.

## 📋 Prerequisites

- AWS EC2 instance running Ubuntu 20.04+ or 22.04+
- Domain name (optional, for SSL)
- SEA-LION API key
- Supabase credentials (URL and API key)

## 🎯 Deployment Steps

### Step 1: Initial Server Setup

1. **Connect to your EC2 instance:**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-public-ip
   ```

2. **Run the initial setup script:**
   ```bash
   chmod +x aws-deploy.sh
   ./aws-deploy.sh
   ```

### Step 2: Copy Application Files

Copy your application files to the EC2 instance:

```bash
# From your local machine
scp -r -i your-key.pem ./govly-web ubuntu@your-ec2-ip:/opt/govly/
```

### Step 3: Configure Environment Variables

Set your environment variables on the EC2 instance:

```bash
# On your EC2 instance
export SEA_LION_API_KEY="your_sea_lion_api_key_here"
export SUPABASE_URL="your_supabase_project_url"
export SUPABASE_KEY="your_supabase_anon_key"
```

### Step 4: Setup Production Environment

```bash
chmod +x setup-production.sh
./setup-production.sh
```

### Step 5: Deploy Application

```bash
chmod +x deploy-app.sh
./deploy-app.sh
```

### Step 6: Setup SSL (Optional - if you have a domain)

```bash
chmod +x ssl-setup.sh
./ssl-setup.sh
```

### Step 7: Setup Monitoring (Optional)

```bash
chmod +x monitoring-setup.sh
./monitoring-setup.sh
```

## 🔧 Configuration Details

### Environment Variables Required

**Backend (.env):**
```bash
SEA_LION_API_KEY=your_sea_lion_api_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
USE_LLAMA_INDEX=true
SUPABASE_CHUNKS_TABLE=chunks
SUPABASE_FORMS_TABLE=forms
PORT=8000
ENVIRONMENT=production
```

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NODE_ENV=production
```

### Port Configuration

- **Frontend**: Port 3000 (internal)
- **Backend**: Port 8000 (internal)
- **Nginx**: Port 80 (HTTP) and 443 (HTTPS)

### Security Groups

Ensure your EC2 security group allows:
- HTTP (80) from 0.0.0.0/0
- HTTPS (443) from 0.0.0.0/0
- SSH (22) from your IP
- Custom TCP (3000) from 0.0.0.0/0 (for testing)
- Custom TCP (8000) from 0.0.0.0/0 (for testing)

## 🚀 Application Management

### PM2 Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs

# Restart applications
pm2 restart all

# Stop applications
pm2 stop all

# Monitor in real-time
pm2 monit
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

### Monitoring Commands

```bash
# Check application status
/opt/govly/monitor.sh

# Manual backup
/opt/govly/backup.sh

# System monitoring
htop
```

## 🔍 Troubleshooting

### Common Issues

1. **Port Already in Use:**
   ```bash
   sudo lsof -i :3000
   sudo lsof -i :8000
   ```

2. **Permission Issues:**
   ```bash
   sudo chown -R $USER:$USER /opt/govly
   ```

3. **PM2 Not Starting:**
   ```bash
   pm2 logs
   pm2 restart all
   ```

4. **Nginx Configuration Error:**
   ```bash
   sudo nginx -t
   sudo tail -f /var/log/nginx/error.log
   ```

### Log Locations

- **PM2 Logs**: `/var/log/pm2/`
- **Nginx Logs**: `/var/log/nginx/`
- **System Logs**: `/var/log/syslog`

## 📊 Performance Optimization

### EC2 Instance Recommendations

- **Minimum**: t3.medium (2 vCPU, 4GB RAM)
- **Recommended**: t3.large (2 vCPU, 8GB RAM)
- **High Traffic**: t3.xlarge (4 vCPU, 16GB RAM)

### Application Optimization

1. **Enable Gzip Compression** (already configured in Nginx)
2. **Use PM2 Cluster Mode** for multiple instances
3. **Implement Redis** for session storage
4. **Use CloudFront** for CDN

## 🔒 Security Best Practices

1. **Keep System Updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Configure Firewall:**
   ```bash
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   ```

3. **Regular Backups:**
   - Daily automated backups are configured
   - Manual backups: `/opt/govly/backup.sh`

4. **Monitor Logs:**
   ```bash
   tail -f /var/log/pm2/govly-backend.log
   tail -f /var/log/pm2/govly-frontend.log
   ```

## 🌐 Accessing Your Application

After deployment, your application will be accessible at:

- **HTTP**: `http://your-ec2-public-ip`
- **HTTPS**: `https://your-domain.com` (if SSL is configured)

### API Endpoints

- **Frontend**: `http://your-domain.com/`
- **Backend API**: `http://your-domain.com/api/`
- **API Documentation**: `http://your-domain.com/docs`

## 📈 Scaling Considerations

### Horizontal Scaling

1. **Load Balancer**: Use AWS Application Load Balancer
2. **Multiple Instances**: Deploy on multiple EC2 instances
3. **Auto Scaling**: Configure Auto Scaling Groups

### Vertical Scaling

1. **Increase Instance Size**: Upgrade to larger EC2 instances
2. **Optimize Code**: Profile and optimize application performance
3. **Database Optimization**: Use RDS for PostgreSQL

## 🆘 Support Commands

```bash
# Quick health check
curl -f http://localhost:3000 && echo "Frontend OK" || echo "Frontend Error"
curl -f http://localhost:8000/health && echo "Backend OK" || echo "Backend Error"

# Check all services
sudo systemctl status nginx
pm2 status
sudo systemctl status supervisor

# View recent logs
pm2 logs --lines 50
sudo tail -50 /var/log/nginx/error.log
```

## 📞 Getting Help

If you encounter issues:

1. Check the logs: `pm2 logs`
2. Verify environment variables are set correctly
3. Ensure all ports are accessible
4. Check Nginx configuration: `sudo nginx -t`
5. Verify PM2 processes: `pm2 status`

---

**🎉 Congratulations! Your Govly application should now be running in production on AWS EC2!**

