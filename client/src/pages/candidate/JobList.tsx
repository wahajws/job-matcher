import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { listJobs, getRecommendedJobs } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScoreBadge } from '@/components/ScoreBadge';
import { RightDrawer } from '@/components/RightDrawer';
import { BreakdownBar } from '@/components/BreakdownBar';
import { formatDate, getCountryFromCode } from '@/utils/helpers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Briefcase, MapPin, Calendar, X, ArrowRight } from 'lucide-react';
import type { Job, MatchResult, LocationType } from '@/types';

const locationTypeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'onsite', label: 'Onsite' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
];

const countryOptions = [
  { value: 'all', label: 'All Countries' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'IN', label: 'India' },
  { value: 'SG', label: 'Singapore' },
];

interface MatchWithJob extends MatchResult {
  job?: Job;
}

export default function CandidateJobList() {
  const [, setLocation] = useLocation();
  const [locationType, setLocationType] = useState<LocationType | 'all'>('all');
  const [country, setCountry] = useState('all');
  const [selectedJob, setSelectedJob] = useState<MatchWithJob | null>(null);

  const candidateId = 'cand-1';

  const { data: recommendedJobs, isLoading } = useQuery({
    queryKey: ['/api/candidates', candidateId, 'recommended-jobs'],
    queryFn: () => getRecommendedJobs(candidateId),
  });

  const filteredJobs = recommendedJobs?.filter((match) => {
    if (locationType !== 'all' && match.job?.locationType !== locationType) return false;
    if (country !== 'all' && match.job?.country !== country) return false;
    return true;
  });

  const clearFilters = () => {
    setLocationType('all');
    setCountry('all');
  };

  const hasFilters = locationType !== 'all' || country !== 'all';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Job Opportunities</h1>
        <p className="text-muted-foreground">Browse jobs that match your profile</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={locationType} onValueChange={(v) => setLocationType(v as LocationType | 'all')}>
          <SelectTrigger className="w-[140px]" data-testid="select-location-type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {locationTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="w-[160px]" data-testid="select-country">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            {countryOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1"
            data-testid="button-clear-filters"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Job Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredJobs?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {hasFilters
                ? 'No jobs match the selected filters'
                : 'No job matches available yet. Make sure your CV is uploaded!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs?.map((match) => (
            <Card
              key={match.id}
              className="hover-elevate cursor-pointer"
              onClick={() => setSelectedJob(match)}
              data-testid={`job-card-${match.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{match.job?.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{match.job?.department}</p>
                  </div>
                  <ScoreBadge score={match.score} size="sm" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    {match.job?.city}, {getCountryFromCode(match.job?.country || '')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(match.job?.createdAt || new Date())}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="capitalize text-xs">
                    {match.job?.locationType}
                  </Badge>
                  <Badge variant="secondary" className="capitalize text-xs">
                    {match.job?.seniorityLevel}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Job Detail Drawer */}
      <RightDrawer
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        title={selectedJob?.job?.title}
        description={selectedJob?.job?.department}
        className="sm:max-w-lg"
      >
        {selectedJob && (
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-4">
              <ScoreBadge score={selectedJob.score} size="lg" showLabel />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Why I Match</h4>
              <BreakdownBar breakdown={selectedJob.breakdown} />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Match Explanation</h4>
              <p className="text-sm text-muted-foreground">{selectedJob.explanation}</p>
            </div>

            {selectedJob.gaps?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Gaps to Address</h4>
                <div className="space-y-2">
                  {selectedJob.gaps.map((gap, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 text-sm"
                    >
                      <Badge variant="outline" className="text-xs capitalize shrink-0">
                        {gap.type}
                      </Badge>
                      <span>{gap.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <Link href={`/candidate/jobs/${selectedJob.jobId}`}>
                <Button className="w-full gap-2" data-testid="button-view-job-details">
                  View Full Details
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </RightDrawer>
    </div>
  );
}
