# 🔧 Manual Setup Steps for AWS EC2

Since the automated scripts are having issues, here's a step-by-step manual guide:

## 📋 Prerequisites
- You're in `/home/ubuntu/Govly/govly-web`
- You have `backend/main.py` and `frontend/package.json`

## 🚀 Step-by-Step Setup

### Step 1: Install System Dependencies
```bash
sudo apt update
sudo apt install -y curl wget
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
sudo apt install -y nginx git unzip net-tools
sudo npm install -g pm2
```

### Step 2: Install Python Dependencies
```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..
```

### Step 3: Install Node.js Dependencies
```bash
cd frontend
npm install
npm run build
cd ..
```

### Step 4: Create Environment Files
```bash
# Backend environment
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

# Frontend environment
cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NODE_ENV=production
EOF
```

### Step 5: Update CORS Settings
```bash
sed -i 's/allow_origins=\[.*\]/allow_origins=["*"]/' backend/main.py
```

### Step 6: Create PM2 Configuration
```bash
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'govly-backend',
      cwd: './backend',
      script: 'python3.11',
      args: 'main.py',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/govly-backend-error.log',
      out_file: '/var/log/pm2/govly-backend-out.log',
      log_file: '/var/log/pm2/govly-backend.log'
    },
    {
      name: 'govly-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/govly-frontend-error.log',
      out_file: '/var/log/pm2/govly-frontend-out.log',
      log_file: '/var/log/pm2/govly-frontend.log'
    }
  ]
};
EOF
```

### Step 7: Setup Nginx
```bash
# Get public IP
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/)

# Create Nginx config
sudo tee /etc/nginx/sites-available/govly << EOF
server {
    listen 80;
    server_name $PUBLIC_IP _;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend docs
    location /docs {
        proxy_pass http://localhost:8000/docs;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/govly /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t
```

### Step 8: Start Services
```bash
# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Start PM2 processes
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 startup
pm2 startup
```

### Step 9: Update Environment Variables
```bash
# Set your actual credentials
export SUPABASE_URL="your-actual-supabase-url"
export SUPABASE_KEY="your-actual-supabase-key"
export SEA_LION_API_KEY="your-actual-sea-lion-key"

# Update the .env files
nano backend/.env
nano frontend/.env.local
```

### Step 10: Restart Services
```bash
pm2 restart all
```

## 🔍 Testing
```bash
# Check status
pm2 status
sudo systemctl status nginx

# Test locally
curl http://localhost:8000/health
curl http://localhost:3000

# Test publicly
curl http://$(curl -s http://checkip.amazonaws.com/)
```

## 🌐 Access Your Application
- **Main App**: `http://your-ec2-public-ip`
- **Backend API**: `http://your-ec2-public-ip/api/`
- **API Docs**: `http://your-ec2-public-ip/docs`

