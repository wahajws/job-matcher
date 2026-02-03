# Quick Setup Summary

## Everything is Managed by `.env` File!

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure `.env` File

Copy `.env.example` to `.env` and set these variables:

**Required:**
```env
DATABASE_URL=mysql://user:password@localhost:3306/cv_matcher
QWEN_API_KEY=your_key_here
JWT_SECRET=your_secret_here
```

**Optional (with defaults):**
```env
AUTO_CREATE_DB=true    # Auto-create database (default: true)
AUTO_MIGRATE=true      # Auto-run migrations (default: true)
AUTO_SEED=false        # Auto-seed database (default: false)
SEED_ENABLED=true      # Enable seeding (only if AUTO_SEED=true)
SEED_USERS=1
SEED_JOBS=5
SEED_CANDIDATES=10
```

### 3. Start Server

```bash
npm run dev
```

**That's it!** The server will automatically:
- ✅ Create database (if `AUTO_CREATE_DB=true`)
- ✅ Run migrations (if `AUTO_MIGRATE=true`)
- ✅ Seed data (if `AUTO_SEED=true` and `SEED_ENABLED=true`)
- ✅ Start the server

### Manual Commands (if needed)

```bash
npm run db:create   # Create database manually
npm run db:migrate  # Run migrations manually
npm run db:seed     # Seed database manually
npm run setup       # Run all setup steps without starting server
```

See `BACKEND_SETUP.md` for detailed documentation.
