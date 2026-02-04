# PM2 Deployment Guide

This guide explains how to deploy and manage the Asset Manager application using PM2 on a production server.

## Prerequisites

- Node.js (v20 or higher)
- npm or yarn
- PM2 installed globally: `npm install -g pm2`
- PostgreSQL database (if using database)
- Server with SSH access

## Installation Steps

### 1. Install PM2 Globally

```bash
npm install -g pm2
```

### 2. Clone and Setup Project

```bash
# Clone the repository
git clone https://github.com/wahajws/job-matcher.git
cd job-matcher

# Install dependencies
npm install

# Create .env file with your configuration
cp .env.example .env  # If you have an example file
# Or create .env manually with:
# DATABASE_URL=postgresql://user:password@localhost:5432/dbname
# PORT=5000
# NODE_ENV=production
# Add other required environment variables
```

### 3. Build the Application

```bash
npm run build
```

This will:
- Build the React frontend to `dist/public/`
- Bundle the Express server to `dist/index.cjs`

### 4. Start with PM2

#### Production Mode

```bash
# Start the application in production mode
npm run pm2:start

# Or directly with PM2
pm2 start ecosystem.config.cjs --env production
```

#### Development Mode (with file watching)

```bash
npm run pm2:start:dev

# Or directly
pm2 start ecosystem.config.cjs --only asset-manager-dev
```

### 5. Save PM2 Configuration

After starting your app, save the PM2 process list so it persists across server restarts:

```bash
npm run pm2:save

# Or directly
pm2 save
```

### 6. Setup PM2 Startup Script (Auto-start on server reboot)

```bash
# Generate startup script
npm run pm2:startup

# Or directly (this will output a command to run with sudo)
pm2 startup

# Follow the instructions it provides (usually requires sudo)
# Example output:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your-username --hp /home/your-username
```

After running the startup command, save the PM2 process list again:

```bash
pm2 save
```

## PM2 Management Commands

### View Status

```bash
# View all PM2 processes
pm2 list

# View detailed information
pm2 show asset-manager

# View real-time monitoring
npm run pm2:monit
# Or: pm2 monit
```

### Logs

```bash
# View logs
npm run pm2:logs

# Or directly
pm2 logs asset-manager

# View only error logs
pm2 logs asset-manager --err

# View only output logs
pm2 logs asset-manager --out

# Clear logs
pm2 flush
```

### Process Control

```bash
# Stop the application
npm run pm2:stop
# Or: pm2 stop asset-manager

# Restart the application (downtime)
npm run pm2:restart
# Or: pm2 restart asset-manager

# Reload the application (zero-downtime, graceful restart)
npm run pm2:reload
# Or: pm2 reload asset-manager

# Delete the application from PM2
npm run pm2:delete
# Or: pm2 delete asset-manager
```

### Update and Deploy

When you need to update the application:

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install new dependencies (if any)
npm install

# 3. Rebuild the application
npm run build

# 4. Reload PM2 (zero-downtime)
npm run pm2:reload

# Or restart if reload doesn't work
npm run pm2:restart
```

## Configuration

### Environment Variables

Edit `ecosystem.config.cjs` to modify:
- Port number
- Number of instances (for cluster mode)
- Memory limits
- Log file locations
- Watch settings

### Cluster Mode

To run multiple instances (load balancing), edit `ecosystem.config.cjs`:

```javascript
{
  name: 'asset-manager',
  script: './dist/index.cjs',
  instances: 'max', // or a number like 4
  exec_mode: 'cluster', // Change from 'fork' to 'cluster'
  // ... rest of config
}
```

Then restart:
```bash
pm2 restart asset-manager
```

### Memory and CPU Limits

The current configuration restarts the app if memory exceeds 1GB. You can adjust this in `ecosystem.config.cjs`:

```javascript
max_memory_restart: '2G', // Change as needed
```

## Monitoring

### PM2 Web Dashboard (Optional)

Install PM2 Plus for advanced monitoring:

```bash
pm2 link
```

Or use the free web interface at [pm2.io](https://pm2.io)

### Health Checks

Monitor your application health:

```bash
# Check if app is running
pm2 list

# Check app details
pm2 show asset-manager

# Monitor in real-time
pm2 monit
```

## Troubleshooting

### Application Won't Start

1. Check logs:
   ```bash
   pm2 logs asset-manager --err
   ```

2. Verify the build exists:
   ```bash
   ls -la dist/index.cjs
   ```

3. Test running the app directly:
   ```bash
   node dist/index.cjs
   ```

4. Check environment variables:
   ```bash
   pm2 show asset-manager
   # Look at the "env" section
   ```

### Application Keeps Restarting

1. Check error logs:
   ```bash
   pm2 logs asset-manager --err
   ```

2. Check memory usage:
   ```bash
   pm2 monit
   ```

3. Increase memory limit in `ecosystem.config.cjs` if needed

### Port Already in Use

1. Check what's using the port:
   ```bash
   # Linux
   sudo lsof -i :5000
   # Or
   sudo netstat -tulpn | grep 5000
   ```

2. Change the port in `.env` file:
   ```env
   PORT=3000
   ```

3. Restart PM2:
   ```bash
   pm2 restart asset-manager
   ```

### PM2 Not Starting on Reboot

1. Re-run the startup command:
   ```bash
   pm2 startup
   # Follow the instructions
   ```

2. Save the process list:
   ```bash
   pm2 save
   ```

## Log Files

PM2 logs are stored in the `logs/` directory:
- `logs/pm2-error.log` - Error logs
- `logs/pm2-out.log` - Output logs
- `logs/pm2-combined.log` - Combined logs

Logs are automatically rotated by PM2. To manually clear logs:
```bash
pm2 flush
```

## Security Considerations

1. **Environment Variables**:** Never commit `.env` files. Use PM2's environment variable management or a secrets manager.

2. **Firewall**: Ensure only necessary ports are open:
   ```bash
   # Example: Allow only port 5000
   sudo ufw allow 5000/tcp
   ```

3. **User Permissions**: Run PM2 as a non-root user when possible.

4. **HTTPS**: Use a reverse proxy (nginx, Apache) with SSL/TLS certificates for production.

## Reverse Proxy Setup (Nginx Example)

If you want to use Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Quick Reference

```bash
# Start
npm run pm2:start

# Stop
npm run pm2:stop

# Restart
npm run pm2:restart

# Reload (zero-downtime)
npm run pm2:reload

# View logs
npm run pm2:logs

# Monitor
npm run pm2:monit

# Save configuration
npm run pm2:save
```

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [PM2 Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/)
- [PM2 Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)
