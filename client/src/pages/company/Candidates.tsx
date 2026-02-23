import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import {
  getCompanyMatchedCandidates,
  getCompanyJobs,
  getMatchesForJob,
  createConversation,
} from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScoreBadge } from '@/components/ScoreBadge';
import { BreakdownBar } from '@/components/BreakdownBar';
import { useToast } from '@/hooks/use-toast';
import { getCountryFromCode } from '@/utils/helpers';
import {
  Users,
  Search,
  MapPin,
  Briefcase,
  MessageSquare,
  User,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GraduationCap,
  Calendar,
  Globe,
  Loader2,
  Send,
  Eye,
} from 'lucide-react';

interface MatchedCandidate {
  id: string;
  candidateId: string;
  jobId: string;
  score: number;
  breakdown: any;
  explanation: string;
  status: string;
  applicationStatus: string | null;
  candidate: {
    id: string;
    userId: string;
    name: string;
    email: string;
    headline: string;
    photoUrl: string;
    country: string;
    countryCode: string;
    skills: { name: string; level: string; yearsOfExperience: number }[];
    roles: string[];
    totalYearsExperience: number;
    domains: string[];
  } | null;
  job: {
    id: string;
    title: string;
    department: string;
    city: string;
    country: string;
  } | null;
}

export default function CompanyCandidates() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messageDialog, setMessageDialog] = useState<{
    open: boolean;
    candidateUserId: string;
    candidateName: string;
    jobId?: string;
    jobTitle?: string;
  }>({ open: false, candidateUserId: '', candidateName: '' });
  const [messageText, setMessageText] = useState('');

  // Fetch all company jobs
  const { data: jobsRaw } = useQuery({
    queryKey: ['company-jobs'],
    queryFn: () => getCompanyJobs(),
  });
  const jobs = Array.isArray(jobsRaw) ? jobsRaw : [];

  // Fetch matched candidates across all jobs
  const { data: allMatches, isLoading } = useQuery({
    queryKey: ['company-matched-candidates'],
    queryFn: getCompanyMatchedCandidates,
  });

  // Fetch matches for specific job (when filtering)
  const { data: jobMatches } = useQuery({
    queryKey: ['matches-for-job', selectedJobId],
    queryFn: () => getMatchesForJob(selectedJobId),
    enabled: selectedJobId !== 'all',
  });

  // Determine which matches to show
  let matches: MatchedCandidate[] = [];
  if (selectedJobId === 'all') {
    matches = (allMatches || []) as MatchedCandidate[];
  } else {
    // Use jobMatches with job info from the selected job
    const selectedJob = jobs.find((j) => j.id === selectedJobId);
    matches = ((jobMatches || []) as any[]).map((m) => ({
      ...m,
      job: selectedJob ? {
        id: selectedJob.id,
        title: selectedJob.title,
        department: selectedJob.department,
        city: selectedJob.city || '',
        country: selectedJob.country || '',
      } : null,
    }));
  }

  // Search filter
  const filtered = matches.filter((m) => {
    if (!m.candidate) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.candidate.name?.toLowerCase().includes(term) ||
      m.candidate.headline?.toLowerCase().includes(term) ||
      m.candidate.skills?.some((s) => s.name.toLowerCase().includes(term)) ||
      m.candidate.domains?.some((d) => d.toLowerCase().includes(term)) ||
      m.job?.title?.toLowerCase().includes(term)
    );
  });

  // Deduplicate by candidate — show best match per candidate
  const uniqueCandidates = new Map<string, MatchedCandidate>();
  for (const m of filtered) {
    if (!m.candidate) continue;
    const key = selectedJobId === 'all' ? m.candidate.id : `${m.candidate.id}:${m.jobId}`;
    const existing = uniqueCandidates.get(key);
    if (!existing || m.score > existing.score) {
      uniqueCandidates.set(key, m);
    }
  }
  const displayMatches = Array.from(uniqueCandidates.values()).sort((a, b) => b.score - a.score);

  // Message mutation
  const messageMutation = useMutation({
    mutationFn: () =>
      createConversation({
        candidateUserId: messageDialog.candidateUserId,
        jobId: messageDialog.jobId,
        message: messageText.trim(),
      }),
    onSuccess: (data) => {
      toast({ title: 'Message sent!', description: `Conversation started with ${messageDialog.candidateName}` });
      setMessageDialog({ open: false, candidateUserId: '', candidateName: '' });
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      // Navigate to messages
      setLocation('/messages');
    },
    onError: (err: any) => {
      toast({ title: 'Failed to send', description: err.message, variant: 'destructive' });
    },
  });

  const getApplicationBadge = (status: string | null) => {
    if (!status) return null;
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      applied: 'default',
      screening: 'secondary',
      interview: 'secondary',
      offer: 'default',
      hired: 'default',
      rejected: 'destructive',
      withdrawn: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize text-xs">
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Matched Candidates
        </h1>
        <p className="text-muted-foreground mt-1">
          AI-matched candidates for your job postings. Review profiles and reach out directly.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, skill, domain…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filter by job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobs
                  .filter((j) => j.status === 'published')
                  .map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{displayMatches.length} candidate{displayMatches.length !== 1 ? 's' : ''} found</span>
        {selectedJobId !== 'all' && (
          <Badge variant="outline" className="text-xs">
            Filtered: {jobs.find((j) => j.id === selectedJobId)?.title}
          </Badge>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && displayMatches.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No matched candidates yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {jobs.length === 0
                ? 'Post a job first, and AI will match relevant candidates automatically.'
                : 'Candidates will appear here as they upload CVs and get matched to your jobs.'}
            </p>
            {jobs.length === 0 && (
              <Link href="/company/jobs/new">
                <Button className="mt-4">Post a Job</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Candidate Cards */}
      <div className="space-y-3">
        {displayMatches.map((match) => {
          const c = match.candidate!;
          const isExpanded = expandedId === match.id;

          return (
            <Card key={match.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Main row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : match.id)}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {c.photoUrl ? (
                      <img src={c.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{c.name}</p>
                      {match.applicationStatus && getApplicationBadge(match.applicationStatus)}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {c.headline || c.roles?.[0] || 'Candidate'}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {c.country && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {getCountryFromCode(c.countryCode || c.country)}
                        </span>
                      )}
                      {c.totalYearsExperience > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" />
                          {c.totalYearsExperience} yrs exp
                        </span>
                      )}
                      {match.job && (
                        <span className="flex items-center gap-0.5">
                          <Briefcase className="w-3 h-3" />
                          {match.job.title}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <ScoreBadge score={match.score} size="md" />
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMessageDialog({
                            open: true,
                            candidateUserId: c.userId,
                            candidateName: c.name,
                            jobId: match.jobId,
                            jobTitle: match.job?.title,
                          });
                        }}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Message
                      </Button>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t px-4 py-4 bg-muted/10 space-y-4">
                    {/* Match breakdown */}
                    {match.breakdown && (
                      <div>
                        <p className="text-sm font-medium mb-2">Match Breakdown</p>
                        <BreakdownBar breakdown={match.breakdown} />
                      </div>
                    )}

                    {/* Explanation */}
                    {match.explanation && (
                      <p className="text-sm text-muted-foreground">{match.explanation}</p>
                    )}

                    {/* Skills */}
                    {c.skills && c.skills.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1.5">Top Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {c.skills.map((s, i) => (
                            <Badge
                              key={i}
                              variant={s.level === 'advanced' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {s.name}
                              {s.yearsOfExperience > 0 && (
                                <span className="ml-1 opacity-70">{s.yearsOfExperience}y</span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Domains */}
                    {c.domains && c.domains.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1.5">Domains</p>
                        <div className="flex flex-wrap gap-1.5">
                          {c.domains.map((d, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {d}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Links */}
                    <div className="flex flex-wrap gap-2">
                      {c.linkedinUrl && (
                        <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1 text-xs">
                            <Globe className="w-3 h-3" /> LinkedIn <ExternalLink className="w-3 h-3" />
                          </Button>
                        </a>
                      )}
                      {c.githubUrl && (
                        <a href={c.githubUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1 text-xs">
                            <Globe className="w-3 h-3" /> GitHub <ExternalLink className="w-3 h-3" />
                          </Button>
                        </a>
                      )}
                      {c.portfolioUrl && (
                        <a href={c.portfolioUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1 text-xs">
                            <Globe className="w-3 h-3" /> Portfolio <ExternalLink className="w-3 h-3" />
                          </Button>
                        </a>
                      )}
                      <Link href={`/company/candidates/${c.id}?job=${match.jobId}`}>
                        <Button variant="default" size="sm" className="gap-1 text-xs">
                          <Eye className="w-3.5 h-3.5" /> View Full Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Message Dialog */}
      <Dialog
        open={messageDialog.open}
        onOpenChange={(open) => {
          setMessageDialog((prev) => ({ ...prev, open }));
          if (!open) setMessageText('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message {messageDialog.candidateName}</DialogTitle>
            <DialogDescription>
              {messageDialog.jobTitle
                ? `Regarding: ${messageDialog.jobTitle}`
                : 'Start a conversation with this candidate'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Hi! We reviewed your profile and think you'd be a great fit…"
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMessageDialog((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button
              onClick={() => messageMutation.mutate()}
              disabled={messageMutation.isPending || !messageText.trim()}
              className="gap-2"
            >
              {messageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
