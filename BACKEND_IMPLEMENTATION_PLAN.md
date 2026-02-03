# Backend Implementation Plan
## CV Matcher with Qwen LLM & MySQL

## Application Overview

This is a **CV Matcher** application that:
1. **Uploads CV PDFs** (admin bulk upload or candidate upload)
2. **Parses CVs using Qwen LLM** to extract structured data (Candidate Matrix)
3. **Creates Job Postings** with requirements
4. **Generates Job Matrices** using Qwen LLM
5. **Matches Candidates to Jobs** with AI-powered scoring and explanations
6. **Manages workflow** (shortlist, reject, notes, tags)

### Current State
- ✅ Frontend: Complete React app with mock API
- ✅ Types: All TypeScript types defined
- ⚠️ Backend: Minimal skeleton (routes.ts is empty)
- ⚠️ Database: PostgreSQL schema exists, needs MySQL conversion
- ⚠️ Storage: Currently in-memory (MemStorage)

---

## Database Schema (MySQL)

### Tables Needed

#### 1. `users`
- Authentication and user management
- Fields: `id`, `username`, `password`, `role` (admin/candidate), `email`, `name`, `created_at`

#### 2. `candidates`
- Candidate profiles
- Fields: `id`, `name`, `email`, `phone`, `country`, `country_code`, `headline`, `created_at`

#### 3. `cv_files`
- CV file metadata
- Fields: `id`, `candidate_id`, `filename`, `file_path` (storage path), `file_size`, `status` (uploaded/parsing/matrix_ready/failed/needs_review), `batch_tag`, `uploaded_at`, `processed_at`

#### 4. `candidate_matrices`
- Structured data extracted by Qwen from CVs
- Fields: `id`, `candidate_id`, `cv_file_id`, `skills` (JSON), `roles` (JSON), `total_years_experience`, `domains` (JSON), `education` (JSON), `languages` (JSON), `location_signals` (JSON), `confidence`, `evidence` (JSON), `generated_at`, `qwen_model_version`

#### 5. `jobs`
- Job postings
- Fields: `id`, `title`, `department`, `location_type` (onsite/hybrid/remote), `country`, `city`, `description`, `must_have_skills` (JSON), `nice_to_have_skills` (JSON), `min_years_experience`, `seniority_level`, `status` (draft/published/closed), `created_at`

#### 6. `job_matrices`
- Structured job requirements extracted by Qwen
- Fields: `id`, `job_id`, `required_skills` (JSON), `preferred_skills` (JSON), `experience_weight`, `location_weight`, `domain_weight`, `generated_at`, `qwen_model_version`

#### 7. `matches`
- Candidate-Job matching results
- Fields: `id`, `candidate_id`, `job_id`, `score` (0-100), `breakdown` (JSON: skills/experience/domain/location scores), `explanation` (text), `gaps` (JSON), `status` (pending/shortlisted/rejected), `calculated_at`

#### 8. `admin_notes`
- Admin notes on candidates
- Fields: `id`, `candidate_id`, `author_id`, `author_name`, `content`, `created_at`

#### 9. `candidate_tags`
- Tags for candidates (many-to-many)
- Fields: `id`, `candidate_id`, `tag_name`, `tag_color`, `created_at`

---

## API Endpoints Required

### Authentication
- `POST /api/auth/login` - Login (username/password)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Candidates
- `GET /api/candidates` - List candidates (with filters: status, country, search, tags, minScore)
- `GET /api/candidates/:id` - Get candidate details
- `PUT /api/candidates/:id` - Update candidate
- `POST /api/candidates/upload` - Upload CV files (multipart/form-data)
- `GET /api/candidates/:id/matrix` - Get candidate matrix
- `POST /api/candidates/:id/rerun-matching` - Re-run matching for candidate

### CV Processing
- `POST /api/cv/process/:cvFileId` - Trigger CV processing with Qwen (async)
- `GET /api/cv/status/:cvFileId` - Get CV processing status
- `GET /api/cv/:cvFileId/download` - Download CV file

### Jobs
- `GET /api/jobs` - List jobs (with filters: status, locationType, country)
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Create job
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job
- `GET /api/jobs/:id/matrix` - Get job matrix
- `POST /api/jobs/:id/generate-matrix` - Generate job matrix with Qwen

### Matches
- `GET /api/matches/job/:jobId` - Get matches for a job
- `GET /api/matches/candidate/:candidateId` - Get matches for a candidate
- `POST /api/matches/job/:jobId/calculate` - Calculate matches for a job (async)
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

---

## Qwen LLM Integration Points

### 1. CV Parsing & Matrix Generation
**Endpoint**: `POST /api/cv/process/:cvFileId`

**Process**:
1. Extract text from PDF using PDF parser (pdf-parse or similar)
2. Send CV text to Qwen API with structured prompt
3. Qwen extracts:
   - Skills (name, level, years of experience)
   - Roles (job titles)
   - Total years of experience
   - Domains (industries)
   - Education (degree, institution, year)
   - Languages (language, proficiency)
   - Location signals (current country, willing to relocate, preferred locations)
   - Evidence (text snippets with category and source)
   - Confidence score

**Qwen Prompt Example**:
```
You are a CV parsing expert. Extract structured information from this CV:

[CV TEXT HERE]

Return a JSON object with this structure:
{
  "skills": [{"name": "JavaScript", "level": "advanced", "yearsOfExperience": 5}],
  "roles": ["Software Engineer", "Tech Lead"],
  "totalYearsExperience": 8,
  "domains": ["FinTech", "SaaS"],
  "education": [{"degree": "BSc Computer Science", "institution": "MIT", "year": 2015}],
  "languages": [{"language": "English", "proficiency": "Native"}],
  "locationSignals": {
    "currentCountry": "US",
    "willingToRelocate": true,
    "preferredLocations": ["US", "UK"]
  },
  "evidence": [
    {"text": "Led team of 5 engineers...", "category": "Leadership", "source": "Work Experience"}
  ],
  "confidence": 85
}
```

### 2. Job Matrix Generation
**Endpoint**: `POST /api/jobs/:id/generate-matrix`

**Process**:
1. Take job description, must-have skills, nice-to-have skills
2. Send to Qwen to extract structured requirements
3. Qwen returns:
   - Required skills with weights
   - Preferred skills with weights
   - Experience weight
   - Location weight
   - Domain weight

**Qwen Prompt Example**:
```
Analyze this job posting and extract structured requirements:

Title: [JOB TITLE]
Description: [JOB DESCRIPTION]
Must-have skills: [SKILLS]
Nice-to-have skills: [SKILLS]

Return a JSON object:
{
  "requiredSkills": [{"skill": "JavaScript", "weight": 85}],
  "preferredSkills": [{"skill": "TypeScript", "weight": 60}],
  "experienceWeight": 20,
  "locationWeight": 15,
  "domainWeight": 10
}
```

### 3. Matching Algorithm
**Endpoint**: `POST /api/matches/job/:jobId/calculate`

**Process**:
1. Get all candidates with `matrix_ready` status
2. Get job matrix
3. For each candidate:
   - Compare candidate matrix with job matrix
   - Calculate scores:
     - **Skills Score**: Match required/preferred skills with candidate skills (weighted)
     - **Experience Score**: Compare total years vs min years required
     - **Domain Score**: Match candidate domains with job domain
     - **Location Score**: Check location compatibility
   - Generate explanation using Qwen
   - Identify gaps using Qwen
   - Store match result

**Qwen Prompt for Explanation**:
```
Candidate Profile:
[SKILLS, EXPERIENCE, DOMAINS, LOCATION]

Job Requirements:
[REQUIRED SKILLS, EXPERIENCE, DOMAINS, LOCATION]

Match Score: [SCORE]

Generate a natural language explanation (2-3 sentences) of why this candidate matches (or doesn't match) this job. Also identify any gaps (missing skills, insufficient experience, etc.).
```

---

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express 5
- **Database**: MySQL (using `mysql2` or `drizzle-orm` with MySQL dialect)
- **ORM**: Drizzle ORM (convert from PostgreSQL to MySQL)
- **File Upload**: `multer` for handling multipart/form-data
- **PDF Parsing**: `pdf-parse` or `pdfjs-dist`
- **LLM Integration**: Alibaba Qwen API (via HTTP client like `axios`)

### Qwen API Integration
- **SDK**: Use Qwen API (check Alibaba Cloud documentation)
- **Authentication**: API key or token
- **Model**: Qwen 2.5 or latest version
- **Format**: JSON mode for structured outputs

### File Storage
- **Local Storage**: Store PDFs in `uploads/cvs/` directory
- **Alternative**: Use cloud storage (S3, OSS) for production

---

## Implementation Steps

### Phase 1: Database Setup
1. ✅ Convert Drizzle schema from PostgreSQL to MySQL
2. ✅ Create MySQL database connection
3. ✅ Set up migrations with Drizzle Kit
4. ✅ Update storage.ts to use MySQL instead of MemStorage

### Phase 2: Basic CRUD APIs
1. ✅ Authentication endpoints
2. ✅ Candidate CRUD
3. ✅ Job CRUD
4. ✅ File upload handling

### Phase 3: Qwen Integration
1. ✅ Set up Qwen API client
2. ✅ PDF text extraction utility
3. ✅ CV Matrix generation endpoint
4. ✅ Job Matrix generation endpoint
5. ✅ Matching algorithm with Qwen explanations

### Phase 4: Advanced Features
1. ✅ Match calculation endpoints
2. ✅ Admin notes
3. ✅ Tags management
4. ✅ Dashboard stats

### Phase 5: Background Jobs (Optional)
1. ✅ Queue system for CV processing (Bull/BullMQ)
2. ✅ Async job processing
3. ✅ WebSocket for real-time status updates

---

## Environment Variables Needed

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/cv_matcher

# Server
PORT=5000
NODE_ENV=development

# Qwen API
QWEN_API_KEY=your_qwen_api_key
QWEN_API_URL=https://api.alibaba.com/qwen/v1/chat/completions
QWEN_MODEL=qwen-2.5-72b-instruct

# File Storage
UPLOAD_DIR=./uploads/cvs
MAX_FILE_SIZE=10485760  # 10MB

# Session
SESSION_SECRET=your_secret_key
```

---

## Key Files to Create/Modify

### New Files
- `server/db/mysql.ts` - MySQL connection
- `server/db/schema.ts` - MySQL schema (convert from shared/schema.ts)
- `server/services/qwen.ts` - Qwen API client
- `server/services/pdfParser.ts` - PDF text extraction
- `server/services/matching.ts` - Matching algorithm
- `server/middleware/upload.ts` - Multer configuration
- `server/routes/auth.ts` - Authentication routes
- `server/routes/candidates.ts` - Candidate routes
- `server/routes/jobs.ts` - Job routes
- `server/routes/matches.ts` - Match routes
- `server/routes/cv.ts` - CV processing routes
- `server/routes/dashboard.ts` - Dashboard routes

### Modified Files
- `server/routes.ts` - Register all routes
- `server/storage.ts` - Replace MemStorage with MySQL storage
- `shared/schema.ts` - Keep for types, but create MySQL-specific schema
- `drizzle.config.ts` - Update for MySQL
- `package.json` - Add dependencies (mysql2, multer, pdf-parse, axios, etc.)

---

## Dependencies to Add

```json
{
  "dependencies": {
    "mysql2": "^3.6.0",
    "multer": "^1.4.5-lts.1",
    "pdf-parse": "^1.1.1",
    "axios": "^1.6.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/multer": "^1.4.11",
    "@types/pdf-parse": "^1.1.4",
    "@types/bcrypt": "^5.0.2"
  }
}
```

---

## Next Steps

1. **Review this plan** and confirm requirements
2. **Set up MySQL database** locally or remotely
3. **Get Qwen API credentials** from Alibaba Cloud
4. **Start implementation** following the phases above

Would you like me to start implementing any specific phase?
