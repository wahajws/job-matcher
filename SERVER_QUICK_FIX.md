# Quick Fix for Current Server Errors

## Immediate Steps to Fix

### 1. Fix Port 5000 Already in Use

```bash
# Pull latest code (includes port helper script)
git pull origin main

# ⚠️ IMPORTANT: Check what PM2 processes are running first
pm2 list

# Stop ONLY this app (safer - won't affect other apps)
pm2 delete asset-manager-dev
pm2 delete asset-manager

# ⚠️ Only use "pm2 delete all" if you have NO other apps on PM2

# Check what's using port 5000
npm run port:check

# Kill processes using port 5000 (if any found)
npm run port:kill

# Verify port is free
npm run port:check

# Verify PM2 status
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

# Check what's running
pm2 list

# Stop ONLY this app (won't affect other apps)
pm2 delete asset-manager-dev
pm2 delete asset-manager

# ⚠️ Only use "pm2 delete all" if you have NO other apps

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

## ⚠️ Important: Multiple Apps on PM2

If you have other applications running on PM2, **DO NOT** use `pm2 delete all` as it will stop all your apps.

**Safe commands (only affects this app):**
```bash
pm2 stop asset-manager-dev
pm2 stop asset-manager
pm2 delete asset-manager-dev
pm2 delete asset-manager
```

**See `PM2_SAFE_COMMANDS.md` for detailed guide on working with multiple apps.**

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

4. **See safe PM2 commands guide:**
   ```bash
   cat PM2_SAFE_COMMANDS.md
   ```
