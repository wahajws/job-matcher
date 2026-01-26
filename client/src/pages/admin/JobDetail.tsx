import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { getJob, getMatchesForJob, shortlistCandidate, rejectCandidate, getCandidate, addNote } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusChip } from '@/components/StatusChip';
import { ScoreBadge } from '@/components/ScoreBadge';
import { BreakdownBar } from '@/components/BreakdownBar';
import { JobMatrixView } from '@/components/MatrixView';
import { RightDrawer } from '@/components/RightDrawer';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable, type Column } from '@/components/DataTable';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';
import { formatDate, getCountryFromCode } from '@/utils/helpers';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import type { MatchResult, Candidate } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MatchWithCandidate extends MatchResult {
  candidate?: Candidate;
}

export default function JobDetail() {
  const [, params] = useRoute('/admin/jobs/:id');
  const jobId = params?.id || '';
  const { toast } = useToast();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [selectedMatch, setSelectedMatch] = useState<MatchWithCandidate | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [countryFilter, setCountryFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'shortlist' | 'reject';
    match: MatchWithCandidate;
  } | null>(null);
  const [noteContent, setNoteContent] = useState('');

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['/api/jobs', jobId],
    queryFn: () => getJob(jobId),
    enabled: !!jobId,
  });

  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ['/api/jobs', jobId, 'matches'],
    queryFn: async () => {
      const matchResults = await getMatchesForJob(jobId);
      const withCandidates = await Promise.all(
        matchResults.map(async (m) => ({
          ...m,
          candidate: await getCandidate(m.candidateId),
        }))
      );
      return withCandidates;
    },
    enabled: !!jobId,
  });

  const shortlistMutation = useMutation({
    mutationFn: (candidateId: string) => shortlistCandidate(jobId, candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId, 'matches'] });
      toast({ title: 'Candidate shortlisted' });
      setConfirmAction(null);
      setSelectedMatch(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (candidateId: string) => rejectCandidate(jobId, candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId, 'matches'] });
      toast({ title: 'Candidate rejected' });
      setConfirmAction(null);
      setSelectedMatch(null);
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: (candidateId: string) => addNote(candidateId, noteContent, user?.name || 'Admin'),
    onSuccess: () => {
      toast({ title: 'Note added' });
      setNoteContent('');
    },
  });

  const filteredMatches = matches?.filter((m) => {
    if (m.score < minScore) return false;
    if (countryFilter !== 'all' && m.candidate?.country !== countryFilter) return false;
    if (
      skillFilter.length > 0 &&
      !skillFilter.every((s) => m.candidate?.matrix?.skills.some((sk) => sk.name === s))
    ) {
      return false;
    }
    return true;
  });

  const uniqueCountries = Array.from(new Set(matches?.map((m) => m.candidate?.country).filter(Boolean))) as string[];

  const columns: Column<MatchWithCandidate>[] = [
    {
      key: 'score',
      header: 'Score',
      sortable: true,
      render: (row) => <ScoreBadge score={row.score} size="sm" />,
      className: 'w-20',
    },
    {
      key: 'candidate',
      header: 'Candidate',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium">{row.candidate?.name}</p>
          <p className="text-xs text-muted-foreground">{row.candidate?.email}</p>
        </div>
      ),
    },
    {
      key: 'country',
      header: 'Country',
      render: (row) => (
        <span className="text-sm">{getCountryFromCode(row.candidate?.country || '')}</span>
      ),
    },
    {
      key: 'breakdown',
      header: 'Breakdown',
      render: (row) => <BreakdownBar breakdown={row.breakdown} compact />,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <StatusChip status={row.status} />,
    },
  ];

  if (jobLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Job not found</p>
        <Link href="/admin/jobs">
          <Button variant="outline" className="mt-4">
            Back to Jobs
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/jobs">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <p className="text-muted-foreground">{job.department}</p>
        </div>
        <StatusChip status={job.status} />
      </div>

      {/* Job Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>
                {job.city}, {getCountryFromCode(job.country)}
              </span>
              <Badge variant="outline" className="ml-1 capitalize">
                {job.locationType}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Posted {formatDate(job.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{job.minYearsExperience}+ years experience</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground mr-2">Must have:</span>
            {job.mustHaveSkills.map((skill) => (
              <Badge key={skill} variant="default">
                {skill}
              </Badge>
            ))}
            {job.niceToHaveSkills.length > 0 && (
              <>
                <span className="text-xs text-muted-foreground mx-2">Nice to have:</span>
                {job.niceToHaveSkills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Job Matrix */}
      {job.matrix && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <JobMatrixView matrix={job.matrix} />
          </CardContent>
        </Card>
      )}

      {/* Ranked Candidates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base">Ranked Candidates</CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Min Score:</span>
              <div className="w-24">
                <Slider
                  value={[minScore]}
                  onValueChange={([v]) => setMinScore(v)}
                  max={100}
                  step={10}
                  data-testid="slider-min-score"
                />
              </div>
              <span className="text-xs font-medium w-6">{minScore}</span>
            </div>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-country-filter">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {uniqueCountries.map((c) => (
                  <SelectItem key={c} value={c!}>
                    {getCountryFromCode(c!)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {matchesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              data={filteredMatches || []}
              columns={columns}
              onRowClick={(row) => setSelectedMatch(row)}
              pageSize={10}
              emptyMessage="No candidates match the current filters"
            />
          )}
        </CardContent>
      </Card>

      {/* Candidate Detail Drawer */}
      <RightDrawer
        open={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        title={selectedMatch?.candidate?.name}
        description={selectedMatch?.candidate?.headline}
        className="sm:max-w-lg"
      >
        {selectedMatch && (
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-4">
              <ScoreBadge score={selectedMatch.score} size="lg" showLabel />
              <StatusChip status={selectedMatch.status} />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Score Breakdown</h4>
              <BreakdownBar breakdown={selectedMatch.breakdown} />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Match Explanation</h4>
              <p className="text-sm text-muted-foreground">{selectedMatch.explanation}</p>
            </div>

            {selectedMatch.gaps?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Gaps</h4>
                <div className="space-y-2">
                  {selectedMatch.gaps.map((gap, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 rounded-md bg-rose-50 dark:bg-rose-900/20 text-sm"
                    >
                      <Badge variant="outline" className="text-xs capitalize shrink-0">
                        {gap.severity}
                      </Badge>
                      <span>{gap.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-sm font-medium">Add Note</h4>
              <Textarea
                placeholder="Add a note about this candidate..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={2}
                data-testid="input-candidate-note"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => addNoteMutation.mutate(selectedMatch.candidateId)}
                disabled={!noteContent || addNoteMutation.isPending}
                className="gap-2"
                data-testid="button-add-candidate-note"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Add Note
              </Button>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t">
              <Button
                variant="default"
                className="gap-2 flex-1"
                onClick={() => setConfirmAction({ type: 'shortlist', match: selectedMatch })}
                disabled={selectedMatch.status === 'shortlisted'}
                data-testid="button-shortlist"
              >
                <CheckCircle className="w-4 h-4" />
                Shortlist
              </Button>
              <Button
                variant="outline"
                className="gap-2 flex-1"
                onClick={() => setConfirmAction({ type: 'reject', match: selectedMatch })}
                disabled={selectedMatch.status === 'rejected'}
                data-testid="button-reject"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </Button>
            </div>

            <Link href={`/admin/cvs/${selectedMatch.candidateId}`}>
              <Button variant="ghost" className="w-full" data-testid="link-view-profile">
                View Full Profile
              </Button>
            </Link>
          </div>
        )}
      </RightDrawer>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
        title={confirmAction?.type === 'shortlist' ? 'Shortlist Candidate?' : 'Reject Candidate?'}
        description={
          confirmAction?.type === 'shortlist'
            ? `Are you sure you want to shortlist ${confirmAction?.match.candidate?.name} for this position?`
            : `Are you sure you want to reject ${confirmAction?.match.candidate?.name} for this position?`
        }
        confirmLabel={confirmAction?.type === 'shortlist' ? 'Shortlist' : 'Reject'}
        variant={confirmAction?.type === 'reject' ? 'destructive' : 'default'}
        onConfirm={() => {
          if (confirmAction?.type === 'shortlist') {
            shortlistMutation.mutate(confirmAction.match.candidateId);
          } else if (confirmAction?.type === 'reject') {
            rejectMutation.mutate(confirmAction!.match.candidateId);
          }
        }}
      />
    </div>
  );
}
