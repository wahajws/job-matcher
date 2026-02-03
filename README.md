# Asset Manager - CV Matcher

A full-stack TypeScript application for AI-powered CV and job matching.

## Prerequisites

- **Node.js** (v20 or higher recommended)
- **PostgreSQL** (for database - optional, currently using in-memory storage)
- **npm** (comes with Node.js)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables (Optional)

The project currently uses in-memory storage, but if you want to use PostgreSQL:

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
PORT=5000
```

**Note:** The application will run without a database connection since it's currently using in-memory storage (`MemStorage`).

### 3. Run the Development Server

**Windows (PowerShell):**
```powershell
npm run dev
```

**Windows (CMD):**
```cmd
npm run dev
```

**Linux/Mac:**
```bash
npm run dev
```

The server will start on **http://localhost:5000**

- Frontend: React app with Vite HMR (Hot Module Replacement)
- Backend: Express server with API routes
- Both are served on the same port (5000)

### 4. Access the Application

Open your browser and navigate to:
- **http://localhost:5000**

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (creates `dist/` folder)
- `npm run start` - Run production build (requires `npm run build` first)
- `npm run check` - Type check TypeScript code
- `npm run db:push` - Push database schema changes (requires `DATABASE_URL`)

## Project Structure

```
├── client/          # React frontend application
│   └── src/
│       ├── components/  # UI components
│       ├── pages/       # Route pages (admin, candidate)
│       ├── api/         # Mock API layer
│       └── store/       # Zustand state management
├── server/          # Express backend
│   ├── index.ts     # Server entry point
│   ├── routes.ts    # API routes
│   └── storage.ts   # Data storage layer
├── shared/          # Shared code between client/server
│   └── schema.ts    # Database schema (Drizzle ORM)
└── script/          # Build scripts
```

## Features

- **Role-based Access**: Admin and Candidate roles
- **CV Upload**: Drag-and-drop file upload
- **Job Matching**: AI-powered matching with scoring
- **Dark Mode**: Theme toggle with persistence
- **Responsive Design**: Works on desktop and mobile

## Troubleshooting

### Port Already in Use

If port 5000 is already in use, set a different port:

**Windows PowerShell:**
```powershell
$env:PORT=3000; npm run dev
```

**Windows CMD:**
```cmd
set PORT=3000 && npm run dev
```

**Linux/Mac:**
```bash
PORT=3000 npm run dev
```

### Database Connection Issues

If you see database errors but want to use in-memory storage, the current implementation uses `MemStorage` which doesn't require a database. The `DATABASE_URL` is only needed if you plan to use PostgreSQL.

## Development Notes

- The frontend uses a **mock API layer** (`client/src/api/`) that simulates backend responses
- Authentication is currently **simulated** using role switcher (stored in localStorage)
- The server serves both the API (`/api/*`) and the React app on the same port
- Vite provides hot module replacement for fast development

## Production Build

To build for production:

```bash
npm run build
```

Then start the production server:

**Windows (PowerShell):**
```powershell
$env:NODE_ENV="production"; npm run start
```

**Windows (CMD):**
```cmd
set NODE_ENV=production && npm run start
```

**Linux/Mac:**
```bash
NODE_ENV=production npm run start
```

This will:
1. Build the React frontend to `dist/public/`
2. Bundle the Express server to `dist/index.cjs`
3. Start the production server
