import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useAuthStore } from '@/store/auth';
import { browseJobs } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScoreBadge } from '@/components/ScoreBadge';
import { formatDate, getCountryFromCode } from '@/utils/helpers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Briefcase,
  MapPin,
  Calendar,
  X,
  Search,
  ArrowRight,
  Clock,
  Star,
  Building2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import type { Job, LocationType, SeniorityLevel } from '@/types';

const locationTypeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'onsite', label: 'Onsite' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
];

const seniorityOptions = [
  { value: 'all', label: 'All Levels' },
  { value: 'internship', label: 'Internship' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' },
];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'relevance', label: 'Best Match' },
  { value: 'deadline', label: 'Deadline Soon' },
];

export default function CandidateJobList() {
  const [search, setSearch] = useState('');
  const [locationType, setLocationType] = useState<string>('all');
  const [seniorityLevel, setSeniorityLevel] = useState<string>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['browse-jobs', search, locationType, seniorityLevel, sortBy, page],
    queryFn: () =>
      browseJobs({
        search: search || undefined,
        locationType: locationType !== 'all' ? locationType : undefined,
        seniorityLevel: seniorityLevel !== 'all' ? seniorityLevel : undefined,
        sortBy,
        page,
        limit: 12,
      }),
  });

  const jobs = data?.jobs || [];
  const pagination = data?.pagination;

  const clearFilters = () => {
    setSearch('');
    setLocationType('all');
    setSeniorityLevel('all');
    setSortBy('newest');
    setPage(1);
  };

  const hasFilters = search || locationType !== 'all' || seniorityLevel !== 'all';

  const getApplicationBadge = (status: string | null | undefined) => {
    if (!status) return null;
    const badges: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      applied: { label: 'Applied', variant: 'default' },
      screening: { label: 'Screening', variant: 'secondary' },
      interview: { label: 'Interview', variant: 'secondary' },
      offer: { label: 'Offer!', variant: 'default' },
      hired: { label: 'Hired', variant: 'default' },
      rejected: { label: 'Rejected', variant: 'destructive' },
      withdrawn: { label: 'Withdrawn', variant: 'outline' },
    };
    const badge = badges[status];
    if (!badge) return null;
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  const getDaysRemaining = (deadline: string | null | undefined) => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return null;
    if (days === 0) return 'Due today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Browse Jobs</h1>
        <p className="text-muted-foreground">
          Discover opportunities that match your skills
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by title, company, skills..."
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={locationType}
            onValueChange={(v) => {
              setLocationType(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
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
          <Select
            value={seniorityLevel}
            onValueChange={(v) => {
              setSeniorityLevel(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              {seniorityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
              <X className="w-3.5 h-3.5" />
              Clear
            </Button>
          )}
          {pagination && (
            <span className="ml-auto text-sm text-muted-foreground">
              {pagination.total} job{pagination.total !== 1 ? 's' : ''} found
            </span>
          )}
        </div>
      </div>

      {/* Job Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {hasFilters
                ? 'No jobs match the selected filters'
                : 'No published jobs available yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <Link key={job.id} href={`/candidate/jobs/${job.id}`}>
              <Card className="hover-elevate cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {job.isFeatured && (
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                        <CardTitle className="text-base truncate">{job.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {job.companyProfile?.logoUrl ? (
                          <img
                            src={job.companyProfile.logoUrl}
                            alt=""
                            className="w-4 h-4 rounded-sm object-cover"
                          />
                        ) : (
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <p className="text-sm text-muted-foreground truncate">
                          {job.companyProfile?.companyName || job.company || 'Company'}
                        </p>
                      </div>
                    </div>
                    {job.matchScore != null && <ScoreBadge score={job.matchScore} size="sm" />}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {job.city ? `${job.city}, ` : ''}
                      {getCountryFromCode(job.country)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{formatDate(job.createdAt)}</span>
                  </div>
                  {job.deadline && getDaysRemaining(job.deadline) && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{getDaysRemaining(job.deadline)}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="capitalize text-xs">
                      {job.locationType}
                    </Badge>
                    <Badge variant="secondary" className="capitalize text-xs">
                      {job.seniorityLevel}
                    </Badge>
                    {job.applicationStatus && getApplicationBadge(job.applicationStatus)}
                    {job.applicationStatus === 'applied' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto" />
                    )}
                  </div>

                  {job.mustHaveSkills && job.mustHaveSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {job.mustHaveSkills.slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-normal">
                          {skill}
                        </Badge>
                      ))}
                      {job.mustHaveSkills.length > 3 && (
                        <Badge variant="outline" className="text-xs font-normal">
                          +{job.mustHaveSkills.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
