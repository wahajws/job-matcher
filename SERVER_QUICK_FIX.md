# Quick Fix for Current Server Errors

## Immediate Steps to Fix

### 1. Fix Port 5000 Already in Use

```bash
# Pull latest code (includes port helper script)
git pull origin main

# Stop all PM2 processes
pm2 delete all

# Check what's using port 5000
npm run port:check

# Kill processes using port 5000 (if any found)
npm run port:kill

# Verify port is free
npm run port:check

# Verify PM2 is clean
pm2 list
```

### 2. Fix "Too Many Keys" Database Error

**Option A: Skip Migration (Quick Fix)**
```bash
# Edit .env file
nano .env

# Add or update:
AUTO_MIGRATE=false

# Restart PM2
pm2 restart asset-manager-dev
```

**Option B: Check and Fix Indexes**
```bash
# Pull latest code first
git pull origin main

# Check indexes
npm run db:fix-indexes

# This will show you what to do next
```

**Option C: Force Recreate (⚠️ Deletes Data - Development Only)**
```bash
# Only if you can lose data!
export FORCE_RECREATE_TABLES=true
npm run db:migrate
```

### 3. Restart Application Cleanly

```bash
# Make sure you're in the project directory
cd /opt/job-matcher/job-matcher

# Pull latest code (includes fixes)
git pull origin main

# Install any new dependencies
npm install

# Stop everything
pm2 delete all

# Start fresh
npm run pm2:start:dev

# Or for production
npm run pm2:start

# Save PM2 config
pm2 save
```

### 4. Verify Everything Works

```bash
# Check PM2 status
pm2 list

# Check logs
pm2 logs asset-manager-dev --lines 50

# Check if app is responding
curl http://localhost:5000
```

## Recommended: Update .env File

Add these to your `.env` file to prevent future issues:

```env
# Skip auto-migration if tables already exist
AUTO_MIGRATE=false

# Or set to skip setup entirely if database is already configured
SKIP_SETUP=true

# Port configuration
PORT=5000
HOST=0.0.0.0  # Listen on all interfaces, not just localhost
```

## If Issues Persist

1. **Check logs:**
   ```bash
   pm2 logs asset-manager-dev --err --lines 100
   ```

2. **Check database connection:**
   ```bash
   npm run db:verify
   ```

3. **See full troubleshooting guide:**
   ```bash
   cat TROUBLESHOOTING.md
   ```
