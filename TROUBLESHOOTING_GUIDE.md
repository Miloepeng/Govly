# 🔍 Govly AWS Deployment Troubleshooting Guide

This guide helps you diagnose and fix common issues when deploying Govly on AWS EC2.

## 🚨 Common Issues and Solutions

### 1. Frontend Can't Reach Backend

**Symptoms:**
- Frontend loads but API calls fail
- CORS errors in browser console
- Network errors in browser developer tools

**Causes:**
- CORS configuration not allowing external origins
- Frontend using localhost URLs instead of relative URLs
- Nginx not properly routing API requests

**Solutions:**
```bash
# Check CORS settings
grep -n "allow_origins" backend/main.py

# Update CORS to allow all origins (temporary fix)
sed -i 's/allow_origins=\[.*\]/allow_origins=["*"]/' backend/main.py

# Check frontend environment
cat frontend/.env.local

# Update frontend to use relative URLs
echo "NEXT_PUBLIC_API_URL=/api" > frontend/.env.local

# Restart services
pm2 restart all
sudo systemctl reload nginx
```

### 2. Services Not Starting

**Symptoms:**
- PM2 shows "No process found"
- Ports not listening
- Services crash immediately

**Causes:**
- Missing dependencies
- Environment variables not set
- Port conflicts
- Permission issues

**Solutions:**
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs

# Check if ports are in use
sudo netstat -tlnp | grep -E ':(80|3000|8000)'

# Kill processes using ports
sudo fuser -k 3000/tcp
sudo fuser -k 8000/tcp

# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_KEY
echo $SEA_LION_API_KEY

# Restart services
pm2 restart all
```

### 3. Nginx Configuration Issues

**Symptoms:**
- Nginx fails to start
- 502 Bad Gateway errors
- Configuration test fails

**Causes:**
- Syntax errors in Nginx config
- Upstream services not running
- Permission issues

**Solutions:**
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check if upstream services are running
curl http://localhost:3000
curl http://localhost:8000/health

# Restart Nginx
sudo systemctl restart nginx
```

### 4. Environment Variables Not Set

**Symptoms:**
- Services start but fail to connect to external services
- Database connection errors
- API key errors

**Causes:**
- Environment variables not exported
- .env files not created
- Wrong variable names

**Solutions:**
```bash
# Check current environment variables
env | grep -E "(SUPABASE|SEA_LION)"

# Set environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_KEY="your-supabase-key"
export SEA_LION_API_KEY="your-sea-lion-key"

# Create .env files
cat > backend/.env << EOF
SEA_LION_API_KEY=${SEA_LION_API_KEY}
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_KEY=${SUPABASE_KEY}
USE_LLAMA_INDEX=true
SUPABASE_CHUNKS_TABLE=chunks
SUPABASE_FORMS_TABLE=forms
PORT=8000
ENVIRONMENT=production
EOF

# Restart services
pm2 restart all
```

### 5. Port Access Issues

**Symptoms:**
- Can't access application from browser
- Connection refused errors
- Timeout errors

**Causes:**
- Security group not configured
- Firewall blocking ports
- Services not binding to correct interfaces

**Solutions:**
```bash
# Check if ports are listening
sudo netstat -tlnp | grep -E ':(80|3000|8000)'

# Check security group (manual check in AWS console)
# Ensure these ports are open:
# - HTTP (80) from 0.0.0.0/0
# - HTTPS (443) from 0.0.0.0/0
# - Custom TCP (3000) from 0.0.0.0/0
# - Custom TCP (8000) from 0.0.0.0/0

# Check firewall
sudo ufw status

# Allow ports through firewall
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw allow 8000
```

### 6. Dependency Issues

**Symptoms:**
- Services fail to start
- Import errors
- Module not found errors

**Causes:**
- Missing Python packages
- Missing Node.js packages
- Version conflicts

**Solutions:**
```bash
# Backend dependencies
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Frontend dependencies
cd frontend
npm install
npm run build

# Check Python version
python3.11 --version

# Check Node.js version
node --version
npm --version
```

## 🔧 Diagnostic Commands

### Check Service Status
```bash
# PM2 status
pm2 status

# Nginx status
sudo systemctl status nginx

# Check running processes
ps aux | grep -E "(python|node|nginx)"
```

### Check Logs
```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# System logs
sudo journalctl -u nginx
```

### Check Network
```bash
# Check listening ports
sudo netstat -tlnp

# Test local connectivity
curl http://localhost:3000
curl http://localhost:8000/health

# Test external connectivity
curl http://$(curl -s http://checkip.amazonaws.com/)
```

### Check Environment
```bash
# Check environment variables
env | grep -E "(SUPABASE|SEA_LION|NODE_ENV)"

# Check .env files
cat backend/.env
cat frontend/.env.local

# Check file permissions
ls -la backend/.env
ls -la frontend/.env.local
```

## 🚀 Quick Fix Scripts

### Complete Reset
```bash
# Stop all services
pm2 stop all
sudo systemctl stop nginx

# Kill any remaining processes
sudo fuser -k 3000/tcp
sudo fuser -k 8000/tcp

# Restart services
pm2 start ecosystem.config.js
sudo systemctl start nginx
```

### Environment Reset
```bash
# Update environment files
cat > backend/.env << EOF
SEA_LION_API_KEY=your_sea_lion_api_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
USE_LLAMA_INDEX=true
SUPABASE_CHUNKS_TABLE=chunks
SUPABASE_FORMS_TABLE=forms
PORT=8000
ENVIRONMENT=production
EOF

cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NODE_ENV=production
EOF

# Restart services
pm2 restart all
```

## 📞 Getting Help

If you're still having issues:

1. **Check the logs first:**
   ```bash
   pm2 logs
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Run the diagnostic script:**
   ```bash
   ./diagnose-and-fix-aws.sh
   ```

3. **Check AWS Security Groups:**
   - Ensure HTTP (80) and HTTPS (443) are open
   - Ensure custom TCP ports 3000 and 8000 are open

4. **Verify environment variables:**
   - Make sure all required variables are set
   - Check that Supabase credentials are correct
   - Verify SEA-LION API key is valid

5. **Test step by step:**
   - Test backend directly: `curl http://localhost:8000/health`
   - Test frontend directly: `curl http://localhost:3000`
   - Test through Nginx: `curl http://your-ec2-ip`

## 🔍 Common Error Messages

### "No process found" (PM2)
- Services aren't running
- Run `pm2 start ecosystem.config.js`

### "502 Bad Gateway" (Nginx)
- Upstream services not running
- Check `pm2 status` and `curl http://localhost:3000`

### "CORS policy" (Browser)
- CORS not configured for your domain
- Update `allow_origins` in `backend/main.py`

### "Connection refused" (Browser)
- Security group not configured
- Check AWS Security Group settings

### "Module not found" (Python/Node)
- Dependencies not installed
- Run `pip install -r requirements.txt` and `npm install`

---

**Remember: Most issues are related to environment variables, CORS configuration, or security group settings. Check these first!**


