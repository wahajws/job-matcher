import { delay } from '@/utils/helpers';
import {
  mockCandidates,
  mockJobs,
  mockMatches,
  getDashboardStats,
  generateNotes,
  generateCandidateMatrix,
  generateJobMatrix,
} from './mockData';
import type {
  Candidate,
  Job,
  MatchResult,
  AdminNote,
  DashboardStats,
  UploadResult,
  CvStatus,
} from '@/types';

// Simulate API latency
const API_DELAY = 300;

// In-memory state (simulates backend)
let candidates = [...mockCandidates];
let jobs = [...mockJobs];
let matches = [...mockMatches];
const notes: Record<string, AdminNote[]> = {};

// Initialize notes for all candidates
candidates.forEach((c) => {
  notes[c.id] = generateNotes(c.id);
});

// ==================== AUTH ====================
export async function login(): Promise<void> {
  await delay(API_DELAY);
}

// ==================== CANDIDATES ====================
export async function listCandidates(filters?: {
  status?: CvStatus;
  country?: string;
  search?: string;
  tags?: string[];
  minScore?: number;
}): Promise<Candidate[]> {
  await delay(API_DELAY);
  
  let result = [...candidates];
  
  if (filters?.status) {
    result = result.filter((c) => c.cvFile?.status === filters.status);
  }
  
  if (filters?.country) {
    result = result.filter((c) => c.country === filters.country);
  }
  
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower) ||
        c.matrix?.skills.some((s) => s.name.toLowerCase().includes(searchLower))
    );
  }
  
  if (filters?.tags && filters.tags.length > 0) {
    result = result.filter((c) => filters.tags!.some((t) => c.tags.includes(t)));
  }
  
  return result;
}

export async function getCandidate(id: string): Promise<Candidate | undefined> {
  await delay(API_DELAY);
  return candidates.find((c) => c.id === id);
}

export async function updateCandidate(
  id: string,
  updates: Partial<Candidate>
): Promise<Candidate> {
  await delay(API_DELAY);
  const index = candidates.findIndex((c) => c.id === id);
  if (index === -1) throw new Error('Candidate not found');
  
  candidates[index] = { ...candidates[index], ...updates };
  return candidates[index];
}

export async function uploadCvs(
  files: File[],
  batchTag?: string
): Promise<UploadResult> {
  await delay(1500);
  
  const existingFilenames = new Set(candidates.map((c) => c.cvFile?.filename));
  const result: UploadResult = {
    successful: 0,
    failed: 0,
    duplicates: 0,
    files: [],
  };
  
  for (const file of files) {
    if (existingFilenames.has(file.name)) {
      result.duplicates++;
      result.files.push({
        filename: file.name,
        progress: 100,
        status: 'duplicate',
        error: 'File already exists',
      });
    } else if (Math.random() > 0.9) {
      result.failed++;
      result.files.push({
        filename: file.name,
        progress: 100,
        status: 'failed',
        error: 'Invalid PDF format',
      });
    } else {
      result.successful++;
      result.files.push({
        filename: file.name,
        progress: 100,
        status: 'success',
      });
      
      // Create new candidate
      const id = `cand-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const nameParts = file.name.replace('.pdf', '').replace(/_/g, ' ').split(' ');
      const name = nameParts.slice(0, 2).join(' ');
      
      candidates.push({
        id,
        name,
        email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
        phone: '+1' + Math.floor(Math.random() * 9000000000 + 1000000000),
        country: 'US',
        countryCode: 'US',
        cvFile: {
          id: `cv-${id}`,
          candidateId: id,
          filename: file.name,
          uploadedAt: new Date(),
          status: 'uploaded',
          batchTag,
          fileSize: file.size,
        },
        createdAt: new Date(),
        tags: [],
      });
      
      // Simulate processing pipeline
      setTimeout(() => {
        const cand = candidates.find((c) => c.id === id);
        if (cand?.cvFile) {
          cand.cvFile.status = 'parsing';
        }
      }, 2000);
      
      setTimeout(() => {
        const cand = candidates.find((c) => c.id === id);
        if (cand?.cvFile) {
          cand.cvFile.status = 'matrix_ready';
          cand.matrix = generateCandidateMatrix(id);
        }
      }, 5000);
    }
  }
  
  return result;
}

// ==================== JOBS ====================
export async function listJobs(filters?: {
  status?: string;
  locationType?: string;
  country?: string;
}): Promise<Job[]> {
  await delay(API_DELAY);
  
  let result = [...jobs];
  
  if (filters?.status) {
    result = result.filter((j) => j.status === filters.status);
  }
  
  if (filters?.locationType) {
    result = result.filter((j) => j.locationType === filters.locationType);
  }
  
  if (filters?.country) {
    result = result.filter((j) => j.country === filters.country);
  }
  
  return result;
}

export async function getJob(id: string): Promise<Job | undefined> {
  await delay(API_DELAY);
  return jobs.find((j) => j.id === id);
}

export async function createJob(
  jobData: Omit<Job, 'id' | 'createdAt' | 'matrix'>
): Promise<Job> {
  await delay(API_DELAY);
  
  const id = `job-${Date.now()}`;
  const job: Job = {
    ...jobData,
    id,
    createdAt: new Date(),
    matrix: jobData.status === 'published' ? generateJobMatrix(id) : undefined,
  };
  
  jobs.push(job);
  return job;
}

export async function updateJob(id: string, updates: Partial<Job>): Promise<Job> {
  await delay(API_DELAY);
  const index = jobs.findIndex((j) => j.id === id);
  if (index === -1) throw new Error('Job not found');
  
  jobs[index] = { ...jobs[index], ...updates };
  
  // Generate matrix if publishing
  if (updates.status === 'published' && !jobs[index].matrix) {
    jobs[index].matrix = generateJobMatrix(id);
  }
  
  return jobs[index];
}

// ==================== MATCHES ====================
export async function getMatchesForJob(jobId: string): Promise<MatchResult[]> {
  await delay(API_DELAY);
  return matches.filter((m) => m.jobId === jobId).sort((a, b) => b.score - a.score);
}

export async function getMatchesForCandidate(candidateId: string): Promise<
  (MatchResult & { job?: Job })[]
> {
  await delay(API_DELAY);
  return matches
    .filter((m) => m.candidateId === candidateId)
    .map((m) => ({
      ...m,
      job: jobs.find((j) => j.id === m.jobId),
    }))
    .sort((a, b) => b.score - a.score);
}

export async function shortlistCandidate(
  jobId: string,
  candidateId: string
): Promise<MatchResult> {
  await delay(API_DELAY);
  const match = matches.find(
    (m) => m.jobId === jobId && m.candidateId === candidateId
  );
  if (!match) throw new Error('Match not found');
  
  match.status = 'shortlisted';
  return match;
}

export async function rejectCandidate(
  jobId: string,
  candidateId: string
): Promise<MatchResult> {
  await delay(API_DELAY);
  const match = matches.find(
    (m) => m.jobId === jobId && m.candidateId === candidateId
  );
  if (!match) throw new Error('Match not found');
  
  match.status = 'rejected';
  return match;
}

// ==================== NOTES ====================
export async function getNotes(candidateId: string): Promise<AdminNote[]> {
  await delay(API_DELAY);
  return notes[candidateId] || [];
}

export async function addNote(
  candidateId: string,
  content: string,
  authorName: string
): Promise<AdminNote> {
  await delay(API_DELAY);
  
  const note: AdminNote = {
    id: `note-${Date.now()}`,
    candidateId,
    authorId: 'current-user',
    authorName,
    content,
    createdAt: new Date(),
  };
  
  if (!notes[candidateId]) {
    notes[candidateId] = [];
  }
  notes[candidateId].unshift(note);
  
  return note;
}

// ==================== DASHBOARD ====================
export async function getAdminDashboardStats(): Promise<DashboardStats> {
  await delay(API_DELAY);
  return getDashboardStats();
}

export async function getRecentUploads(): Promise<Candidate[]> {
  await delay(API_DELAY);
  return [...candidates]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
}

export async function getRecentJobs(): Promise<Job[]> {
  await delay(API_DELAY);
  return [...jobs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
}

// ==================== CANDIDATE-FACING ====================
export async function getRecommendedJobs(candidateId: string): Promise<
  (MatchResult & { job?: Job })[]
> {
  await delay(API_DELAY);
  return matches
    .filter((m) => m.candidateId === candidateId)
    .map((m) => ({
      ...m,
      job: jobs.find((j) => j.id === m.jobId),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export async function rerunMatching(candidateId: string): Promise<void> {
  await delay(1000);
  // Simulate re-running matches with slightly different scores
  matches = matches.map((m) => {
    if (m.candidateId === candidateId) {
      return {
        ...m,
        score: Math.min(100, Math.max(0, m.score + Math.floor(Math.random() * 10 - 5))),
        calculatedAt: new Date(),
      };
    }
    return m;
  });
}
