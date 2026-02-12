import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useAuthStore } from '@/store/auth';
import { getCompanyProfile, getCompanyStats, getCompanyJobs } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusChip } from '@/components/StatusChip';
import { ScoreBadge } from '@/components/ScoreBadge';
import { formatDate } from '@/utils/helpers';
import {
  Briefcase,
  ArrowRight,
  Plus,
  Building2,
  Users,
  TrendingUp,
  UserCheck,
  FileText,
  Calendar,
  User,
} from 'lucide-react';

export default function CompanyDashboard() {
  const { user } = useAuthStore();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['company-profile'],
    queryFn: getCompanyProfile,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['company-stats'],
    queryFn: getCompanyStats,
  });

  const { data: jobsRaw, isLoading: jobsLoading } = useQuery({
    queryKey: ['company-jobs'],
    queryFn: () => getCompanyJobs(),
  });

  const jobs = Array.isArray(jobsRaw) ? jobsRaw : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome, {profile?.companyName || user?.name}
          </h1>
          <p className="text-muted-foreground">Manage your recruitment pipeline</p>
        </div>
        <Link href="/company/jobs/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Post New Job
          </Button>
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            {statsLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Active Jobs</p>
                  <p className="text-2xl font-bold mt-1">{stats?.activeJobs || 0}</p>
                </div>
                <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                  <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            {statsLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Applications</p>
                  <p className="text-2xl font-bold mt-1">{stats?.totalApplications || 0}</p>
                </div>
                <div className="p-2 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            {statsLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold mt-1">{stats?.shortlisted || 0}</p>
                </div>
                <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900/30">
                  <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            {statsLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Hired</p>
                  <p className="text-2xl font-bold mt-1">{stats?.hired || 0}</p>
                </div>
                <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                  <UserCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications */}
      {stats?.recentApplications && stats.recentApplications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Recent Applications</CardTitle>
            <CardDescription>Latest candidates who applied to your jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentApplications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center gap-3 p-3 rounded-md border"
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {app.candidate?.photoUrl ? (
                      <img
                        src={app.candidate.photoUrl}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {app.candidate?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Applied to <strong>{app.job?.title}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {app.matchScore != null && <ScoreBadge score={app.matchScore} size="sm" />}
                    <Badge variant="outline" className="capitalize text-xs">
                      {app.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(app.appliedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Jobs List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-base font-medium">Your Jobs</CardTitle>
            <CardDescription>Jobs you've posted</CardDescription>
          </div>
          <Link href="/company/jobs">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View all <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="font-medium">No jobs posted yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first job posting to start recruiting.
              </p>
              <Link href="/company/jobs/new">
                <Button className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Post a Job
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 5).map((job) => (
                <Link key={job.id} href={`/company/jobs/${job.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-md border hover-elevate cursor-pointer">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted text-muted-foreground">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.department} · {job.city || job.country}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(job.applicationCount != null && job.applicationCount > 0) && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText className="w-3 h-3" />
                          {job.applicationCount}
                        </div>
                      )}
                      <Badge variant="outline" className="capitalize text-xs">
                        {job.seniorityLevel}
                      </Badge>
                      <StatusChip status={job.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Setup Prompt (if profile incomplete) */}
      {!profileLoading && (!profile?.industry || !profile?.description) && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Complete your company profile</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add your industry, description, and logo to attract better candidates.
                </p>
              </div>
              <Link href="/company/profile">
                <Button variant="outline" className="gap-2">
                  Set Up <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
