import { apiGet, apiPost, apiPut, apiDelete, apiUpload, setAuthToken } from '@/lib/apiClient';
import type {
  Candidate,
  Job,
  MatchResult,
  AdminNote,
  DashboardStats,
  UploadResult,
  CvStatus,
  User,
  JobReport,
} from '@/types';

// ==================== AUTH ====================
export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  const response = await apiPost<{ token: string; user: User }>('/auth/login', { username, password });
  if (response.token) {
    setAuthToken(response.token);
  }
  return response;
}

export async function logout(): Promise<void> {
  await apiPost('/auth/logout');
  setAuthToken(null);
}

export async function getCurrentUser(): Promise<User> {
  return apiGet<User>('/auth/me');
}

// ==================== CANDIDATES ====================
export async function listCandidates(filters?: {
  status?: CvStatus;
  country?: string;
  search?: string;
  tags?: string[];
  minScore?: number;
  sortBy?: string;
}): Promise<Candidate[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.country) params.append('country', filters.country);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.tags) filters.tags.forEach(tag => params.append('tags', tag));
  if (filters?.minScore) params.append('minScore', filters.minScore.toString());
  if (filters?.sortBy) params.append('sortBy', filters.sortBy);

  const query = params.toString();
  return apiGet<Candidate[]>(`/candidates${query ? `?${query}` : ''}`);
}

export async function getCandidate(id: string): Promise<Candidate> {
  return apiGet<Candidate>(`/candidates/${id}`);
}

export async function updateCandidate(
  id: string,
  updates: Partial<Candidate>
): Promise<Candidate> {
  return apiPut<Candidate>(`/candidates/${id}`, updates);
}

export async function deleteCandidate(id: string): Promise<void> {
  await apiDelete(`/candidates/${id}`);
}

export async function uploadCvs(
  files: File[],
  batchTag?: string
): Promise<UploadResult> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  if (batchTag) {
    formData.append('batchTag', batchTag);
  }

  return apiUpload<UploadResult>('/candidates/upload', formData);
}

export async function getCandidateMatrix(candidateId: string) {
  return apiGet(`/candidates/${candidateId}/matrix`);
}

export async function rerunMatching(candidateId: string, regenerateMatrix: boolean = false): Promise<void> {
  await apiPost(`/candidates/${candidateId}/rerun-matching`, { regenerateMatrix });
}

// ==================== JOBS ====================
export async function listJobs(filters?: {
  status?: string;
  locationType?: string;
  country?: string;
}): Promise<Job[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.locationType) params.append('locationType', filters.locationType);
  if (filters?.country) params.append('country', filters.country);

  const query = params.toString();
  return apiGet<Job[]>(`/jobs${query ? `?${query}` : ''}`);
}

export async function getJob(id: string): Promise<Job> {
  return apiGet<Job>(`/jobs/${id}`);
}

export async function createJob(
  jobData: Omit<Job, 'id' | 'createdAt' | 'matrix'>
): Promise<Job> {
  return apiPost<Job>('/jobs', jobData);
}

export async function createJobFromUrl(
  url: string,
  status: 'draft' | 'published' = 'draft'
): Promise<Job> {
  return apiPost<Job>('/jobs/from-url', { url, status });
}

export async function createJobFromPdf(
  pdfFile: File,
  status: 'draft' | 'published' = 'draft'
): Promise<Job> {
  const formData = new FormData();
  formData.append('pdf', pdfFile);
  formData.append('status', status);
  return apiUpload<Job>('/jobs/from-pdf', formData);
}

export async function updateJob(id: string, updates: Partial<Job>): Promise<Job> {
  return apiPut<Job>(`/jobs/${id}`, updates);
}

export async function deleteJob(id: string): Promise<void> {
  await apiDelete(`/jobs/${id}`);
}

export async function getJobMatrix(jobId: string) {
  return apiGet(`/jobs/${jobId}/matrix`);
}

export async function generateJobMatrix(jobId: string): Promise<void> {
  await apiPost(`/jobs/${jobId}/generate-matrix`);
}

// ==================== REPORTS ====================
export async function generateJobReport(jobId: string): Promise<JobReport> {
  return apiPost<JobReport>(`/jobs/${jobId}/generate-report`);
}

export async function getJobReport(jobId: string): Promise<JobReport> {
  return apiGet<JobReport>(`/jobs/${jobId}/report`);
}

export async function deleteJobReport(jobId: string): Promise<void> {
  await apiDelete(`/jobs/${jobId}/report`);
}

// ==================== MATCHES ====================
export async function getMatchesForJob(jobId: string): Promise<MatchResult[]> {
  return apiGet<MatchResult[]>(`/matches/job/${jobId}`);
}

export async function getMatchesForCandidate(candidateId: string): Promise<
  (MatchResult & { job?: Job })[]
> {
  return apiGet<(MatchResult & { job?: Job })[]>(`/matches/candidate/${candidateId}`);
}

export async function calculateMatches(jobId: string): Promise<void> {
  await apiPost(`/matches/job/${jobId}/calculate`);
}

export async function shortlistCandidate(
  matchId: string
): Promise<MatchResult> {
  return apiPost<MatchResult>(`/matches/${matchId}/shortlist`);
}

export async function rejectCandidate(
  matchId: string
): Promise<MatchResult> {
  return apiPost<MatchResult>(`/matches/${matchId}/reject`);
}

// ==================== NOTES ====================
export async function getNotes(candidateId: string): Promise<AdminNote[]> {
  return apiGet<AdminNote[]>(`/candidates/${candidateId}/notes`);
}

export async function addNote(
  candidateId: string,
  content: string,
  authorName: string
): Promise<AdminNote> {
  return apiPost<AdminNote>(`/candidates/${candidateId}/notes`, { content, authorName });
}

// ==================== TAGS ====================
export async function getCandidateTags(candidateId: string) {
  return apiGet(`/candidates/${candidateId}/tags`);
}

export async function addCandidateTag(candidateId: string, name: string, color?: string) {
  return apiPost(`/candidates/${candidateId}/tags`, { name, color });
}

export async function deleteCandidateTag(candidateId: string, tagId: string) {
  await apiDelete(`/candidates/${candidateId}/tags/${tagId}`);
}

// ==================== DASHBOARD ====================
export async function getAdminDashboardStats(): Promise<DashboardStats> {
  return apiGet<DashboardStats>('/dashboard/stats');
}

export async function getRecentUploads(): Promise<Candidate[]> {
  return apiGet<Candidate[]>('/dashboard/recent-uploads');
}

export async function getRecentJobs(): Promise<Job[]> {
  return apiGet<Job[]>('/dashboard/recent-jobs');
}

// ==================== BULK OPERATIONS ====================
export async function getBulkCandidatesSummary() {
  return apiGet<{
    totalCandidates: number;
    withMatrix: number;
    withoutMatrix: number;
    withCvText: number;
    totalJobs: number;
    jobsWithMatrix: number;
  }>('/bulk-operations/candidates-summary');
}

export async function startBulkRegenerateMatrices(options?: { candidateIds?: string[]; onlyMissing?: boolean }) {
  return apiPost<{ jobId: string; message: string }>('/bulk-operations/regenerate-matrices', options || {});
}

export async function startBulkRerunMatching(options?: { candidateIds?: string[] }) {
  return apiPost<{ jobId: string; message: string }>('/bulk-operations/rerun-matching', options || {});
}

export async function startBulkRegenerateAndMatch(options?: { candidateIds?: string[]; onlyMissing?: boolean }) {
  return apiPost<{ jobId: string; message: string }>('/bulk-operations/regenerate-and-match', options || {});
}

export async function getBulkJobStatus(jobId: string) {
  return apiGet<{
    id: string;
    type: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
    errors: { candidateId: string; name: string; error: string }[];
    startedAt: string;
    completedAt?: string;
    currentCandidate?: string;
  }>(`/bulk-operations/status/${jobId}`);
}

export async function getAllBulkJobs() {
  return apiGet<any[]>('/bulk-operations/status');
}

export async function cancelBulkJob(jobId: string) {
  return apiPost(`/bulk-operations/cancel/${jobId}`);
}

// ==================== CANDIDATE-FACING ====================
export async function getRecommendedJobs(candidateId: string): Promise<
  (MatchResult & { job?: Job })[]
> {
  return getMatchesForCandidate(candidateId);
}
