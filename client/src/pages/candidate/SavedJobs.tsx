import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSavedJobs, unsaveJob } from '@/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bookmark,
  BookmarkX,
  MapPin,
  Building2,
  Briefcase,
  ExternalLink,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { SavedJobEntry } from '@/types';

const LOCATION_TYPE_LABELS: Record<string, string> = {
  remote: 'Remote',
  onsite: 'On-site',
  hybrid: 'Hybrid',
};

export default function CandidateSavedJobs() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: savedJobs = [], isLoading } = useQuery({
    queryKey: ['saved-jobs'],
    queryFn: getSavedJobs,
  });

  const unsaveMutation = useMutation({
    mutationFn: (jobId: string) => unsaveJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
      toast({ title: 'Job removed', description: 'Job has been removed from your saved list.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to remove job.', variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Saved Jobs</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-5 w-40 mb-3" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const list: SavedJobEntry[] = Array.isArray(savedJobs) ? savedJobs : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Saved Jobs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {list.length} {list.length === 1 ? 'job' : 'jobs'} saved
          </p>
        </div>
        <Button variant="outline" onClick={() => setLocation('/candidate/jobs')}>
          <Briefcase className="w-4 h-4 mr-2" />
          Browse Jobs
        </Button>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Bookmark className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No saved jobs yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Browse available jobs and save the ones you're interested in. They'll appear here for easy access.
            </p>
            <Button className="mt-4" onClick={() => setLocation('/candidate/jobs')}>
              Browse Jobs
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((entry) => {
            const job = entry.job;
            if (!job) return null;
            return (
              <Card key={entry.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-2">
                      <h3
                        className="font-semibold text-sm truncate cursor-pointer hover:text-primary transition-colors"
                        onClick={() => setLocation(`/candidate/jobs/${job.id}`)}
                      >
                        {job.title}
                      </h3>
                      {job.companyProfile && (
                        <div className="flex items-center gap-1.5 mt-1">
                          {job.companyProfile.logoUrl ? (
                            <img
                              src={job.companyProfile.logoUrl}
                              alt={job.companyProfile.companyName}
                              className="w-4 h-4 rounded object-cover"
                            />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground truncate">
                            {job.companyProfile.companyName}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => unsaveMutation.mutate(job.id)}
                      disabled={unsaveMutation.isPending}
                      title="Remove from saved"
                    >
                      <BookmarkX className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {job.locationType && (
                      <Badge variant="secondary" className="text-[10px] px-1.5">
                        <MapPin className="w-3 h-3 mr-0.5" />
                        {LOCATION_TYPE_LABELS[job.locationType] || job.locationType}
                      </Badge>
                    )}
                    {job.city && (
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {job.city}{job.country ? `, ${job.country}` : ''}
                      </Badge>
                    )}
                    {job.seniorityLevel && (
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {job.seniorityLevel}
                      </Badge>
                    )}
                  </div>

                  {job.matchScore != null && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Match Score</span>
                        <span className="font-medium text-foreground">{job.matchScore}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${job.matchScore}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-[10px] text-muted-foreground">
                      Saved {format(new Date(entry.savedAt), 'MMM d, yyyy')}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setLocation(`/candidate/jobs/${job.id}`)}
                    >
                      View
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
