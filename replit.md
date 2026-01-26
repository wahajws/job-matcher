# CV Matcher - AI-Powered Job Matching Platform

## Overview

CV Matcher is a web application that enables AI-powered matching between candidate CVs and job postings. The platform supports two user roles (Admin and Candidate) and provides features for CV upload, parsing, matrix generation (simulated via Qwen AI), and intelligent job matching with scoring and explanations.

The application is built as a full-stack TypeScript project with a React frontend and Express backend, designed to run immediately on Replit without additional configuration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: Zustand with localStorage persistence for auth/theme state
- **Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **API Design**: RESTful endpoints prefixed with `/api`
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod with drizzle-zod integration
- **Session Management**: Express session with connect-pg-simple for PostgreSQL session storage

### Project Structure
```
├── client/           # Frontend React application
│   └── src/
│       ├── components/   # UI components (shared + shadcn/ui)
│       ├── pages/        # Route page components (admin/*, candidate/*)
│       ├── store/        # Zustand state stores
│       ├── api/          # Mock API layer with simulated data
│       ├── types/        # TypeScript type definitions
│       └── utils/        # Helper functions
├── server/           # Backend Express application
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route registration
│   ├── storage.ts    # Data access layer interface
│   └── vite.ts       # Vite dev server integration
├── shared/           # Shared code between client/server
│   └── schema.ts     # Drizzle database schema
└── migrations/       # Drizzle database migrations
```

### Authentication Pattern
- Simulated authentication using role switcher (no real auth backend)
- Roles stored in Zustand and persisted to localStorage
- Two roles: Admin and Candidate with distinct route access

### Data Flow
- Mock API layer simulates backend responses with configurable latency
- In-memory state management for candidates, jobs, and matches
- Matrix generation simulates AI-extracted CV data (Qwen)

### Key Design Decisions

1. **Mock API Layer**: The frontend includes a complete mock API (`client/src/api/`) that simulates backend behavior, allowing frontend development without a real backend.

2. **Shared Schema**: Database schema defined in `shared/schema.ts` is accessible to both frontend and backend, ensuring type consistency.

3. **Component Architecture**: Uses shadcn/ui pattern where components are copied into the project (not imported from npm), allowing full customization.

4. **Path Aliases**: TypeScript path aliases (`@/`, `@shared/`) configured for clean imports across the codebase.

## External Dependencies

### Database
- **PostgreSQL**: Primary database (configured via `DATABASE_URL` environment variable)
- **Drizzle ORM**: Type-safe database queries with automatic schema migrations via `drizzle-kit push`

### UI Framework
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### State & Data
- **Zustand**: Lightweight state management
- **TanStack Query**: Async state management and caching
- **Zod**: Runtime schema validation

### Build & Development
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **TSX**: TypeScript execution for development

### File Handling
- **react-dropzone**: Drag-and-drop file upload interface
- **Multer**: Server-side file upload handling (available but not fully implemented)

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay for development
- **@replit/vite-plugin-cartographer**: Development tooling
- **@replit/vite-plugin-dev-banner**: Development banner display

## Recent Changes (January 2026)

### Frontend Implementation Complete
- Created comprehensive TypeScript type system for all entities (Candidates, Jobs, Matches, Matrices)
- Implemented complete mock API layer with realistic seeded data generation
- Built all Admin pages: Dashboard, CV List, CV Upload, CV Detail, Job List, Job New, Job Detail, Settings
- Built all Candidate pages: Dashboard, Profile, Job List, Job Detail
- Created reusable components: DataTable, ScoreBadge, StatusChip, BreakdownBar, MatrixView, FileDropzone, RightDrawer, ConfirmDialog
- Implemented role-based routing with ProtectedRoute, AdminRoute, and CandidateRoute guards
- Added dark mode toggle with persistent theme storage
- Configured professional blue/teal enterprise design theme with custom CSS variables

### Features Implemented
- CV upload with drag-and-drop support and batch upload
- AI-simulated matrix generation for CVs (Qwen model simulation)
- Job posting with must-have and nice-to-have skill requirements
- Intelligent matching with score breakdown visualization
- Candidate shortlisting and rejection with admin notes
- Responsive design for desktop and mobile devices