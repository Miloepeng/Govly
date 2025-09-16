# 🔧 Direct Fix Commands

If the scripts keep resetting to placeholder values, use these direct commands:

## Method 1: Direct File Editing

```bash
# Edit backend .env directly
nano backend/.env

# Edit frontend .env.local directly  
nano frontend/.env.local
```

## Method 2: Direct Command Line (Replace with your actual values)

```bash
# Replace these with your actual Supabase credentials
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SEA_LION_KEY="your-sea-lion-key"

# Create backend .env
cat > backend/.env << 'EOF'
SEA_LION_API_KEY=your-sea-lion-key
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
USE_LLAMA_INDEX=true
SUPABASE_CHUNKS_TABLE=chunks
SUPABASE_FORMS_TABLE=forms
PORT=8000
ENVIRONMENT=production
EOF

# Create frontend .env.local
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
EOF
```

## Method 3: Using echo commands

```bash
# Backend .env
echo "SEA_LION_API_KEY=your-sea-lion-key" > backend/.env
echo "SUPABASE_URL=https://your-project-id.supabase.co" >> backend/.env
echo "SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." >> backend/.env
echo "USE_LLAMA_INDEX=true" >> backend/.env
echo "SUPABASE_CHUNKS_TABLE=chunks" >> backend/.env
echo "SUPABASE_FORMS_TABLE=forms" >> backend/.env
echo "PORT=8000" >> backend/.env
echo "ENVIRONMENT=production" >> backend/.env

# Frontend .env.local
echo "NEXT_PUBLIC_API_URL=/api" > frontend/.env.local
echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co" >> frontend/.env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." >> frontend/.env.local
echo "NODE_ENV=production" >> frontend/.env.local
```

## Method 4: Check what's happening

```bash
# Check current files
echo "Backend .env:"
cat backend/.env
echo ""
echo "Frontend .env.local:"
cat frontend/.env.local

# Check if variables are set
echo "Environment variables:"
echo "SUPABASE_URL: $SUPABASE_URL"
echo "SUPABASE_KEY: $SUPABASE_KEY"
echo "SEA_LION_API_KEY: $SEA_LION_API_KEY"
```

## After fixing, restart services:

```bash
# Rebuild frontend
cd frontend
npm run build
cd ..

# Restart services
pm2 restart all

# Check status
pm2 status
pm2 logs --lines 10
```


