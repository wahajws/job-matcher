# Backend Setup Guide

This guide will help you set up and run the CV Matcher backend.

## Prerequisites

- Node.js v20 or higher
- MySQL 8.0 or higher
- Qwen API key (from Alibaba Cloud)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Environment Variables

Copy `.env.example` to `.env` and configure all settings:

```bash
cp .env.example .env
```

### Required Variables

```env
# Database Configuration
DATABASE_URL=mysql://user:password@localhost:3306/cv_matcher
# OR use individual variables:
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=cv_matcher

# Qwen API
QWEN_API_KEY=your_qwen_api_key_here

# Authentication
JWT_SECRET=your_jwt_secret_key_here
# OR
SESSION_SECRET=your_session_secret_key_here
```

### Optional Setup Control Variables

Control what runs automatically:

```env
# Auto-setup control (defaults shown)
AUTO_CREATE_DB=true          # Auto-create database if missing (default: true)
AUTO_MIGRATE=true            # Auto-run migrations on startup (default: true)
AUTO_SEED=false             # Auto-seed database on startup (default: false)
SKIP_SETUP=false            # Skip all setup steps (default: false)

# Seeding configuration (only if AUTO_SEED=true)
SEED_ENABLED=true           # Enable seeding
SEED_USERS=1                # Number of users to seed
SEED_JOBS=5                 # Number of jobs to seed
SEED_CANDIDATES=10          # Number of candidates to seed
```

### Other Optional Variables

```env
PORT=5000                   # Server port (default: 5000)
UPLOAD_DIR=./uploads/cvs    # Directory for uploaded CVs
MAX_FILE_SIZE=10485760      # Max file size in bytes (10MB)
```

## Step 3: Automated Setup & Start

**Everything is now managed through your `.env` file!**

### Quick Start (Recommended)

Simply run:

```bash
npm run dev
```

This will automatically:
1. ✅ Create database if it doesn't exist (if `AUTO_CREATE_DB=true`)
2. ✅ Run migrations to create tables (if `AUTO_MIGRATE=true`)
3. ✅ Seed database with sample data (if `AUTO_SEED=true`)
4. ✅ Start the development server

### Manual Control

If you prefer to run steps manually:

```bash
# 1. Create database (if AUTO_CREATE_DB=false)
npm run db:create

# 2. Run migrations (if AUTO_MIGRATE=false)
npm run db:migrate

# 3. Seed database (if AUTO_SEED=false)
npm run db:seed

# 4. Start server
npm run dev
```

### Run Setup Only (Without Starting Server)

```bash
npm run setup
```

This runs all setup steps (create DB, migrate, seed) but doesn't start the server.

## Environment Variable Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTO_CREATE_DB` | `true` | Automatically create database if missing |
| `AUTO_MIGRATE` | `true` | Automatically run migrations on startup |
| `AUTO_SEED` | `false` | Automatically seed database on startup |
| `SKIP_SETUP` | `false` | Skip all automated setup steps |
| `SEED_ENABLED` | `false` | Enable database seeding |
| `SEED_USERS` | `1` | Number of users to seed |
| `SEED_JOBS` | `5` | Number of jobs to seed |
| `SEED_CANDIDATES` | `10` | Number of candidates to seed |

## Database Tables Created

The migrations will create these tables:
- users
- candidates
- cv_files
- candidate_matrices
- jobs
- job_matrices
- matches
- admin_notes
- candidate_tags

## Seeded Data (if AUTO_SEED=true)

- 1 admin user (username: `admin`, password: `admin123`)
- Sample candidates with CV files and matrices
- Sample jobs with job matrices

## API Endpoints

All endpoints are prefixed with `/api`:

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Candidates
- `GET /api/candidates` - List candidates (filters: status, country, search, tags, minScore)
- `GET /api/candidates/:id` - Get candidate details
- `PUT /api/candidates/:id` - Update candidate
- `POST /api/candidates/upload` - Upload CV files (multipart/form-data)
- `GET /api/candidates/:id/matrix` - Get candidate matrix
- `POST /api/candidates/:id/rerun-matching` - Re-run matching

### CV Processing
- `POST /api/cv/process/:cvFileId` - Trigger CV processing (async)
- `GET /api/cv/status/:cvFileId` - Get CV processing status
- `GET /api/cv/:cvFileId/download` - Download CV file

### Jobs
- `GET /api/jobs` - List jobs (filters: status, locationType, country)
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Create job
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job
- `GET /api/jobs/:id/matrix` - Get job matrix
- `POST /api/jobs/:id/generate-matrix` - Generate job matrix with Qwen

### Matches
- `GET /api/matches/job/:jobId` - Get matches for a job
- `GET /api/matches/candidate/:candidateId` - Get matches for a candidate
- `POST /api/matches/job/:jobId/calculate` - Calculate matches (async)
- `POST /api/matches/:matchId/shortlist` - Shortlist candidate
- `POST /api/matches/:matchId/reject` - Reject candidate

### Admin Notes
- `GET /api/candidates/:candidateId/notes` - Get notes for candidate
- `POST /api/candidates/:candidateId/notes` - Add note

### Tags
- `GET /api/candidates/:candidateId/tags` - Get candidate tags
- `POST /api/candidates/:candidateId/tags` - Add tag
- `DELETE /api/candidates/:candidateId/tags/:tagId` - Remove tag

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/recent-uploads` - Get recent CV uploads
- `GET /api/dashboard/recent-jobs` - Get recent jobs

## Example API Calls

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Upload CV

```bash
curl -X POST http://localhost:5000/api/candidates/upload \
  -F "files=@/path/to/cv.pdf" \
  -F "batchTag=Jan 2026 Batch"
```

### Create Job

```bash
curl -X POST http://localhost:5000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Senior Software Engineer",
    "department": "Engineering",
    "locationType": "remote",
    "country": "US",
    "city": "San Francisco",
    "description": "We are looking for...",
    "mustHaveSkills": ["JavaScript", "TypeScript"],
    "niceToHaveSkills": ["React"],
    "minYearsExperience": 5,
    "seniorityLevel": "senior",
    "status": "published"
  }'
```

### Calculate Matches

```bash
curl -X POST http://localhost:5000/api/matches/job/JOB_ID/calculate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Database Connection Issues

- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database exists: `CREATE DATABASE cv_matcher;`

### Qwen API Issues

- Verify `QWEN_API_KEY` is set correctly
- Check API URL is correct for your region
- Ensure you have API credits/quota

### File Upload Issues

- Ensure `UPLOAD_DIR` directory exists and is writable
- Check `MAX_FILE_SIZE` is sufficient
- Verify files are PDF format

### Migration Issues

- If tables already exist, migrations will not overwrite them
- To reset: drop database and recreate, then run migrations
- Check Sequelize logs for specific errors

## Development Notes

- The backend uses Sequelize ORM with MySQL
- CV processing is asynchronous (status updates via `/api/cv/status/:cvFileId`)
- Match calculation is asynchronous (triggers background processing)
- All responses match frontend TypeScript types exactly
- JWT tokens expire after 7 days (configurable)

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET` and `SESSION_SECRET`
3. Configure proper database connection pooling
4. Set up file storage (consider cloud storage for production)
5. Enable HTTPS
6. Set up proper logging and monitoring
7. Configure CORS if frontend is on different domain
