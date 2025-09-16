# 🚀 Complete AWS EC2 Deployment Guide for Govly

This guide will walk you through deploying your Govly frontend and backend on AWS EC2 step by step.

## 📋 Prerequisites

- AWS EC2 instance running Ubuntu 20.04+ or 22.04+
- Domain name (optional, for SSL)
- SEA-LION API key
- Supabase credentials (URL and API key)
- SSH access to your EC2 instance

## 🎯 Step-by-Step Deployment

### Step 1: Connect to Your EC2 Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### Step 2: Upload Your Code

From your local machine, upload your code to EC2:

```bash
# From your local machine
scp -r -i your-key.pem ./govly-web ubuntu@your-ec2-ip:/home/ubuntu/
```

### Step 3: Run the Complete Setup Script

On your EC2 instance:

```bash
cd /home/ubuntu/govly-web
chmod +x ../aws-setup-complete.sh
../aws-setup-complete.sh
```

### Step 4: Configure Environment Variables

```bash
# Set your environment variables
export SEA_LION_API_KEY="your_sea_lion_api_key_here"
export SUPABASE_URL="your_supabase_project_url"
export SUPABASE_KEY="your_supabase_anon_key"

# Or create .env files manually
nano backend/.env
nano frontend/.env.local
```

### Step 5: Deploy Your Application

```bash
chmod +x ../deploy-govly-aws.sh
../deploy-govly-aws.sh
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
NEXT_PUBLIC_API_URL=/api
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

## 🔍 Troubleshooting

### Common Issues

1. **Port Already in Use:**
   ```bash
   sudo lsof -i :3000
   sudo lsof -i :8000
   ```

2. **Permission Issues:**
   ```bash
   sudo chown -R $USER:$USER /home/ubuntu/govly-web
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

## 🌐 Accessing Your Application

After deployment, your application will be accessible at:

- **HTTP**: `http://your-ec2-public-ip`
- **HTTPS**: `https://your-domain.com` (if SSL is configured)

### API Endpoints

- **Frontend**: `http://your-domain.com/`
- **Backend API**: `http://your-domain.com/api/`
- **API Documentation**: `http://your-domain.com/docs`

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
   - Manual backups: `/home/ubuntu/govly-web/backup.sh`

4. **Monitor Logs:**
   ```bash
   tail -f /var/log/pm2/govly-backend.log
   tail -f /var/log/pm2/govly-frontend.log
   ```

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

