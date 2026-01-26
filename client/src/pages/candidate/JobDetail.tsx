import { useQuery } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { getJob, getMatchesForCandidate } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScoreBadge } from '@/components/ScoreBadge';
import { BreakdownBar } from '@/components/BreakdownBar';
import { useToast } from '@/hooks/use-toast';
import { formatDate, getCountryFromCode } from '@/utils/helpers';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Briefcase,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export default function CandidateJobDetail() {
  const [, params] = useRoute('/candidate/jobs/:id');
  const jobId = params?.id || '';
  const { toast } = useToast();
  const candidateId = 'cand-1';

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['/api/jobs', jobId],
    queryFn: () => getJob(jobId),
    enabled: !!jobId,
  });

  const { data: matches } = useQuery({
    queryKey: ['/api/candidates', candidateId, 'matches'],
    queryFn: () => getMatchesForCandidate(candidateId),
    enabled: !!candidateId,
  });

  const myMatch = matches?.find((m) => m.jobId === jobId);

  const handleApply = () => {
    toast({
      title: 'Application Submitted',
      description: 'Your application has been sent to the recruiter. (Demo)',
    });
  };

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
        <Link href="/candidate/jobs">
          <Button variant="outline" className="mt-4">
            Back to Jobs
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/candidate/jobs">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <p className="text-muted-foreground">{job.department}</p>
        </div>
      </div>

      {/* Match Score Card */}
      {myMatch && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-center gap-4">
                <ScoreBadge score={myMatch.score} size="lg" showLabel />
              </div>
              <div className="flex-1">
                <BreakdownBar breakdown={myMatch.breakdown} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
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
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <span className="capitalize">{job.seniorityLevel} level</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {job.description.split('\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Must-Have Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {job.mustHaveSkills.map((skill) => (
                <Badge key={skill} variant="default">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {job.niceToHaveSkills.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Nice-to-Have Skills
              </h4>
              <div className="flex flex-wrap gap-2">
                {job.niceToHaveSkills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gaps */}
      {myMatch?.gaps && myMatch.gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Areas to Improve</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myMatch.gaps.map((gap, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-md bg-amber-50 dark:bg-amber-900/20"
                >
                  <Badge
                    variant="outline"
                    className="capitalize shrink-0"
                  >
                    {gap.severity}
                  </Badge>
                  <span className="text-sm">{gap.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Apply Button */}
      <div className="flex gap-3">
        <Button
          size="lg"
          onClick={handleApply}
          className="flex-1"
          data-testid="button-apply"
        >
          Apply Now
        </Button>
        <Link href="/candidate/jobs">
          <Button size="lg" variant="outline">
            Back to Jobs
          </Button>
        </Link>
      </div>
    </div>
  );
}
