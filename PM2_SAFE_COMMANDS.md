# PM2 Safe Commands - Working with Multiple Apps

If you have multiple applications running on PM2, you need to be careful not to affect other apps when managing this one.

## Check What's Running

```bash
# List all PM2 processes
pm2 list

# You'll see output like:
# ┌─────┬──────────────────┬─────────────┬─────────┬─────────┬──────────┐
# │ id  │ name             │ mode        │ ↺       │ status  │ cpu      │
# ├─────┼──────────────────┼─────────────┼─────────┼─────────┼──────────┤
# │ 0   │ other-app        │ fork        │ 0       │ online  │ 0%       │
# │ 1   │ asset-manager    │ fork        │ 5       │ errored │ 0%       │
# │ 2   │ asset-manager-dev│ fork        │ 3       │ online  │ 0%       │
# └─────┴──────────────────┴─────────────┴─────────┴─────────┴──────────┘
```

## Safe Commands (Only Affects This App)

### Stop This App Only
```bash
# Stop by name (recommended)
pm2 stop asset-manager
pm2 stop asset-manager-dev

# Or stop by ID
pm2 stop 1
pm2 stop 2
```

### Delete This App Only
```bash
# Delete by name (recommended)
pm2 delete asset-manager
pm2 delete asset-manager-dev

# Or delete by ID
pm2 delete 1
pm2 delete 2
```

### Restart This App Only
```bash
# Restart by name
pm2 restart asset-manager
pm2 restart asset-manager-dev

# Or restart by ID
pm2 restart 1
```

### View Logs for This App Only
```bash
# View logs by name
pm2 logs asset-manager
pm2 logs asset-manager-dev

# Or by ID
pm2 logs 1
```

## Dangerous Commands (Affects ALL Apps)

⚠️ **Only use these if you have NO other apps on PM2:**

```bash
# These will stop/delete ALL PM2 processes
pm2 stop all      # ⚠️ Stops everything
pm2 delete all    # ⚠️ Deletes everything
pm2 restart all   # ⚠️ Restarts everything
```

## Recommended Workflow

### When Starting Fresh
```bash
# 1. Check what's running
pm2 list

# 2. Stop only this app
pm2 stop asset-manager-dev
pm2 stop asset-manager

# 3. Delete only this app (if needed)
pm2 delete asset-manager-dev
pm2 delete asset-manager

# 4. Start this app
npm run pm2:start:dev
```

### When Fixing Port Conflicts
```bash
# 1. Check PM2 status
pm2 list

# 2. Stop only this app's processes
pm2 stop asset-manager-dev
pm2 stop asset-manager

# 3. Check port usage
npm run port:check

# 4. Kill processes on port (if needed)
npm run port:kill

# 5. Delete this app's PM2 processes
pm2 delete asset-manager-dev
pm2 delete asset-manager

# 6. Start fresh
npm run pm2:start:dev
```

### When Updating This App
```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies (if needed)
npm install

# 3. Rebuild (if needed)
npm run build

# 4. Reload this app only (zero-downtime)
pm2 reload asset-manager-dev

# Or restart (with brief downtime)
pm2 restart asset-manager-dev
```

## Finding Your App's Processes

```bash
# List all processes
pm2 list

# Filter by name
pm2 list | grep asset-manager

# Show detailed info
pm2 show asset-manager-dev
pm2 show asset-manager
```

## Saving PM2 Configuration

After making changes, save the PM2 process list:

```bash
# This saves the current PM2 process list
# It will save ALL processes, not just this app
pm2 save
```

**Note:** `pm2 save` saves all PM2 processes. This is fine to use even with multiple apps.

## Summary

✅ **Safe to use:**
- `pm2 stop <name>` or `pm2 stop <id>`
- `pm2 delete <name>` or `pm2 delete <id>`
- `pm2 restart <name>` or `pm2 restart <id>`
- `pm2 logs <name>` or `pm2 logs <id>`
- `pm2 list`
- `pm2 save`

⚠️ **Use with caution (affects all apps):**
- `pm2 stop all`
- `pm2 delete all`
- `pm2 restart all`
