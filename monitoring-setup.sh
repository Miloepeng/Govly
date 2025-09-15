#!/bin/bash

# Monitoring and Logging Setup
# Optional: Set up monitoring for your application

set -e

echo "📊 Setting up monitoring and logging..."

# Install htop and other monitoring tools
sudo apt install -y htop iotop nethogs

# Create log rotation configuration
sudo tee /etc/logrotate.d/govly << EOF
/var/log/pm2/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Create monitoring script in current directory
cat > monitor.sh << 'EOF'
#!/bin/bash

# Simple monitoring script
echo "=== Govly Application Status ==="
echo "Date: $(date)"
echo ""

echo "=== PM2 Status ==="
pm2 status
echo ""

echo "=== System Resources ==="
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1
echo ""

echo "Memory Usage:"
free -h
echo ""

echo "Disk Usage:"
df -h /
echo ""

echo "=== Application Logs (Last 10 lines) ==="
echo "Backend logs:"
pm2 logs govly-backend --lines 10 --nostream
echo ""

echo "Frontend logs:"
pm2 logs govly-frontend --lines 10 --nostream
echo ""

echo "=== Nginx Status ==="
sudo systemctl status nginx --no-pager -l
EOF

chmod +x monitor.sh

# Create backup script in current directory
cat > backup.sh << 'EOF'
#!/bin/bash

# Backup script for Govly application
BACKUP_DIR="/opt/govly/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/govly_app_$DATE.tar.gz -C /opt/govly govly-web

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 $BACKUP_DIR/pm2_config_$DATE.pm2

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.pm2" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/govly_app_$DATE.tar.gz"
EOF

chmod +x backup.sh

# Setup daily backup cron job
(crontab -l 2>/dev/null; echo "0 2 * * * $(pwd)/backup.sh") | crontab -

echo "✅ Monitoring and backup setup complete!"
echo ""
echo "📊 Monitoring commands:"
echo "   ./monitor.sh              # Check application status"
echo "   pm2 monit                # Real-time PM2 monitoring"
echo "   htop                     # System resource monitoring"
echo ""
echo "💾 Backup commands:"
echo "   ./backup.sh               # Manual backup"
echo "   Daily backups at 2 AM    # Automatic daily backups"

