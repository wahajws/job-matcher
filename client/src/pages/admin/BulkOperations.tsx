import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getBulkCandidatesSummary,
  startBulkRegenerateMatrices,
  startBulkRerunMatching,
  startBulkRegenerateAndMatch,
  getBulkJobStatus,
  cancelBulkJob,
} from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  RefreshCw,
  Brain,
  Zap,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  FileText,
  Briefcase,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface BulkJobStatus {
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
}

export default function BulkOperations() {
  const { toast } = useToast();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  // Fetch summary stats
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['/api/bulk-operations/candidates-summary'],
    queryFn: getBulkCandidatesSummary,
    refetchInterval: activeJobId ? 10000 : false,
  });

  // Poll active job status
  const { data: jobStatus, refetch: refetchJob } = useQuery({
    queryKey: ['/api/bulk-operations/status', activeJobId],
    queryFn: () => getBulkJobStatus(activeJobId!),
    enabled: !!activeJobId,
    refetchInterval: activeJobId ? 2000 : false,
  });

  // Stop polling when job is done
  useEffect(() => {
    if (jobStatus && (jobStatus.status === 'completed' || jobStatus.status === 'failed' || jobStatus.status === 'cancelled')) {
      refetchSummary();
      if (jobStatus.status === 'completed') {
        toast({
          title: 'Bulk operation completed!',
          description: `${jobStatus.succeeded} succeeded, ${jobStatus.failed} failed out of ${jobStatus.total}`,
        });
      }
    }
  }, [jobStatus?.status]);

  // Mutations
  const regenerateMatricesMutation = useMutation({
    mutationFn: () => startBulkRegenerateMatrices({ onlyMissing }),
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      toast({ title: 'Bulk matrix regeneration started' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to start operation', description: err.message, variant: 'destructive' });
    },
  });

  const rerunMatchingMutation = useMutation({
    mutationFn: () => startBulkRerunMatching(),
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      toast({ title: 'Bulk matching started' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to start operation', description: err.message, variant: 'destructive' });
    },
  });

  const regenerateAndMatchMutation = useMutation({
    mutationFn: () => startBulkRegenerateAndMatch({ onlyMissing }),
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      toast({ title: 'Bulk regenerate + match started' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to start operation', description: err.message, variant: 'destructive' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelBulkJob(activeJobId!),
    onSuccess: () => {
      toast({ title: 'Operation cancelled' });
    },
  });

  const isRunning = jobStatus?.status === 'running';
  const isAnyMutationPending = regenerateMatricesMutation.isPending || rerunMatchingMutation.isPending || regenerateAndMatchMutation.isPending;

  const progressPercent = jobStatus && jobStatus.total > 0
    ? Math.round((jobStatus.processed / jobStatus.total) * 100)
    : 0;

  const elapsed = jobStatus
    ? Math.round((Date.now() - new Date(jobStatus.startedAt).getTime()) / 1000)
    : 0;
  const eta = jobStatus && jobStatus.processed > 0 && jobStatus.total > jobStatus.processed
    ? Math.round((elapsed / jobStatus.processed) * (jobStatus.total - jobStatus.processed))
    : 0;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk Operations</h1>
        <p className="text-muted-foreground">Regenerate matrices and recalculate matches for all candidates</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <div className="text-2xl font-bold">{summaryLoading ? '...' : summary?.totalCandidates || 0}</div>
            <div className="text-xs text-muted-foreground">Total Candidates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Brain className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <div className="text-2xl font-bold">{summaryLoading ? '...' : summary?.withMatrix || 0}</div>
            <div className="text-xs text-muted-foreground">With Matrix</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-orange-500" />
            <div className="text-2xl font-bold">{summaryLoading ? '...' : summary?.withoutMatrix || 0}</div>
            <div className="text-xs text-muted-foreground">Without Matrix</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-5 h-5 mx-auto mb-1 text-purple-500" />
            <div className="text-2xl font-bold">{summaryLoading ? '...' : summary?.withCvText || 0}</div>
            <div className="text-xs text-muted-foreground">With CV Text</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Briefcase className="w-5 h-5 mx-auto mb-1 text-indigo-500" />
            <div className="text-2xl font-bold">{summaryLoading ? '...' : summary?.totalJobs || 0}</div>
            <div className="text-xs text-muted-foreground">Published Jobs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
            <div className="text-2xl font-bold">{summaryLoading ? '...' : summary?.jobsWithMatrix || 0}</div>
            <div className="text-xs text-muted-foreground">Jobs with Matrix</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Job Progress */}
      {jobStatus && (jobStatus.status === 'running' || (jobStatus.completedAt && Date.now() - new Date(jobStatus.completedAt).getTime() < 60000)) && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {jobStatus.status === 'running' && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                {jobStatus.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {jobStatus.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                {jobStatus.status === 'cancelled' && <Square className="w-5 h-5 text-orange-500" />}
                <div>
                  <CardTitle className="text-base">
                    {jobStatus.type === 'regenerate-matrices' && 'Regenerating Matrices'}
                    {jobStatus.type === 'rerun-matching' && 'Running LLM Matching'}
                    {jobStatus.type === 'regenerate-and-match' && 'Regenerate + Match (Full AI Pipeline)'}
                  </CardTitle>
                  {jobStatus.currentCandidate && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Currently processing: <span className="font-medium">{jobStatus.currentCandidate}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={
                  jobStatus.status === 'running' ? 'default' :
                  jobStatus.status === 'completed' ? 'secondary' :
                  'destructive'
                }>
                  {jobStatus.status}
                </Badge>
                {jobStatus.status === 'running' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                  >
                    <Square className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={progressPercent} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{jobStatus.processed} / {jobStatus.total} processed</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{jobStatus.succeeded} succeeded</span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-500" />
                <span>{jobStatus.failed} failed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Elapsed: {formatTime(elapsed)}</span>
              </div>
              {eta > 0 && jobStatus.status === 'running' && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>ETA: ~{formatTime(eta)}</span>
                </div>
              )}
            </div>

            {/* Errors Section */}
            {jobStatus.errors.length > 0 && (
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowErrors(!showErrors)}
                  className="text-red-500 hover:text-red-600 p-0 h-auto"
                >
                  {showErrors ? 'Hide' : 'Show'} {jobStatus.errors.length} error(s)
                </Button>
                {showErrors && (
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1 text-xs">
                    {jobStatus.errors.map((err, i) => (
                      <div key={i} className="p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                        <span className="font-medium">{err.name}</span>: {err.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="only-missing"
              checked={onlyMissing}
              onCheckedChange={setOnlyMissing}
              disabled={isRunning}
            />
            <Label htmlFor="only-missing">
              Only process candidates without existing matrix
              {summary?.withoutMatrix ? ` (${summary.withoutMatrix} candidates)` : ''}
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Operations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Regenerate Matrices Only */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-base">Regenerate Matrices</CardTitle>
            </div>
            <CardDescription>
              Re-extract skills, domains, roles from CV text using improved AI prompt.
              Does NOT run matching.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <p>• Uses latest LLM prompt for better skill extraction</p>
                <p>• Extracts implied skills (e.g., RAG → LLM + Vector DB)</p>
                <p>• Updates domains, roles, experience</p>
              </div>
              <Button
                onClick={() => regenerateMatricesMutation.mutate()}
                disabled={isRunning || isAnyMutationPending}
                className="w-full gap-2"
              >
                {regenerateMatricesMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4" />
                )}
                Regenerate All Matrices
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rerun Matching Only */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-500" />
              <CardTitle className="text-base">Rerun Matching</CardTitle>
            </div>
            <CardDescription>
              Run LLM-based matching for all candidates against all published jobs.
              Uses existing matrices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <p>• LLM evaluates each candidate-job pair</p>
                <p>• Semantic matching (GenAI ≈ LLM ≈ AI/ML)</p>
                <p>• Generates explanations and gaps</p>
              </div>
              <Button
                onClick={() => rerunMatchingMutation.mutate()}
                disabled={isRunning || isAnyMutationPending}
                className="w-full gap-2"
                variant="secondary"
              >
                {rerunMatchingMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Rerun All Matching
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Full Pipeline */}
        <Card className="relative overflow-hidden border-primary/30">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-purple-500" />
              <CardTitle className="text-base">Full AI Pipeline</CardTitle>
            </div>
            <CardDescription>
              Regenerate matrix from CV + Run LLM matching for each candidate.
              Most thorough but slowest.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <p>• Step 1: Re-extract matrix with improved AI</p>
                <p>• Step 2: LLM evaluates against all jobs</p>
                <p>• Best for fixing incorrect matches</p>
              </div>
              <Button
                onClick={() => regenerateAndMatchMutation.mutate()}
                disabled={isRunning || isAnyMutationPending}
                className="w-full gap-2"
                variant="default"
              >
                {regenerateAndMatchMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Run Full AI Pipeline
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estimation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Time Estimates</p>
              <p>• <strong>Regenerate Matrices:</strong> ~5-10 seconds per candidate ({summary?.totalCandidates || 0} candidates ≈ {formatTime((summary?.totalCandidates || 0) * 7)})</p>
              <p>• <strong>Rerun Matching:</strong> ~10-20 seconds per candidate × {summary?.totalJobs || 0} jobs ({summary?.withMatrix || 0} candidates ≈ {formatTime((summary?.withMatrix || 0) * (summary?.totalJobs || 1) * 15)})</p>
              <p>• <strong>Full Pipeline:</strong> Both steps combined per candidate</p>
              <p className="mt-2 text-xs">Actual time depends on LLM response speed. You can cancel anytime — progress is saved.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
