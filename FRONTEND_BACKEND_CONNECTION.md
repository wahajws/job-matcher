# Frontend-Backend Connection Guide

## ✅ Frontend is Now Connected to Backend!

The frontend has been updated to use the real backend API instead of mock data.

## What Changed

### 1. Created API Client (`client/src/lib/apiClient.ts`)
- Handles all HTTP requests to the backend
- Automatically includes JWT tokens from localStorage
- Supports GET, POST, PUT, DELETE, and file uploads

### 2. Updated API Functions (`client/src/api/index.ts`)
- Replaced all mock functions with real API calls
- All functions now call the backend endpoints
- Maintains the same function signatures (no frontend changes needed)

### 3. Updated Auth Store (`client/src/store/auth.ts`)
- Added `loginWithCredentials()` for real authentication
- Kept mock `login()` for demo mode
- Added proper logout that clears tokens

## API Endpoints Mapping

| Frontend Function | Backend Endpoint |
|------------------|------------------|
| `login()` | `POST /api/auth/login` |
| `logout()` | `POST /api/auth/logout` |
| `getCurrentUser()` | `GET /api/auth/me` |
| `listCandidates()` | `GET /api/candidates` |
| `getCandidate()` | `GET /api/candidates/:id` |
| `updateCandidate()` | `PUT /api/candidates/:id` |
| `uploadCvs()` | `POST /api/candidates/upload` |
| `listJobs()` | `GET /api/jobs` |
| `getJob()` | `GET /api/jobs/:id` |
| `createJob()` | `POST /api/jobs` |
| `updateJob()` | `PUT /api/jobs/:id` |
| `deleteJob()` | `DELETE /api/jobs/:id` |
| `getMatchesForJob()` | `GET /api/matches/job/:jobId` |
| `getMatchesForCandidate()` | `GET /api/matches/candidate/:candidateId` |
| `calculateMatches()` | `POST /api/matches/job/:jobId/calculate` |
| `shortlistCandidate()` | `POST /api/matches/:matchId/shortlist` |
| `rejectCandidate()` | `POST /api/matches/:matchId/reject` |
| `getNotes()` | `GET /api/candidates/:candidateId/notes` |
| `addNote()` | `POST /api/candidates/:candidateId/notes` |
| `getAdminDashboardStats()` | `GET /api/dashboard/stats` |
| `getRecentUploads()` | `GET /api/dashboard/recent-uploads` |
| `getRecentJobs()` | `GET /api/dashboard/recent-jobs` |

## Configuration

### API Base URL

The frontend uses `/api` as the base URL by default (relative URLs work since frontend and backend are on the same port).

To use a different backend URL, set in `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### Authentication

1. **Login**: Call `login(username, password)` from the API
2. **Token Storage**: JWT tokens are automatically stored in localStorage
3. **Auto-include**: All API requests automatically include the token in the `Authorization` header

## Testing the Connection

1. **Start the backend:**
   ```bash
   npm run dev
   ```

2. **The frontend is already running** (served by Vite on the same port)

3. **Test an API call:**
   - Open browser DevTools → Network tab
   - Navigate to any page (e.g., `/admin/dashboard`)
   - You should see API requests to `/api/*` endpoints

## Current Status

✅ **Frontend API functions** - All connected to backend  
✅ **CORS** - Configured for localhost  
✅ **Authentication** - JWT token support  
✅ **File Uploads** - Multipart form data support  
⚠️ **Login Page** - Still uses mock auth (can be updated to use real API)

## Next Steps (Optional)

To use real authentication on the login page:

1. Update `client/src/pages/Login.tsx` to call `loginWithCredentials()` instead of mock `login()`
2. Add username/password fields instead of name/email/role selector
3. Handle authentication errors properly

For now, the mock login still works for demo purposes, but all other API calls use the real backend!
