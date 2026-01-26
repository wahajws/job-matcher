import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { getAdminDashboardStats, getRecentUploads, getRecentJobs } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusChip } from '@/components/StatusChip';
import { formatDate } from '@/utils/helpers';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Briefcase,
  Sparkles,
  ArrowRight,
  Upload,
} from 'lucide-react';

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: getAdminDashboardStats,
  });

  const { data: recentUploads, isLoading: uploadsLoading } = useQuery({
    queryKey: ['/api/admin/recent-uploads'],
    queryFn: getRecentUploads,
  });

  const { data: recentJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['/api/admin/recent-jobs'],
    queryFn: getRecentJobs,
  });

  const kpiCards = [
    {
      title: 'Total CVs',
      value: stats?.totalCvs || 0,
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Processed',
      value: stats?.processedCvs || 0,
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      title: 'Needs Review',
      value: stats?.needsReviewCvs || 0,
      icon: AlertCircle,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      title: 'Active Jobs',
      value: stats?.totalJobs || 0,
      icon: Briefcase,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'Matches Generated',
      value: stats?.matchesGenerated || 0,
      icon: Sparkles,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's an overview of your recruitment pipeline.</p>
        </div>
        <Link href="/admin/cvs/upload">
          <Button className="gap-2" data-testid="button-upload-cvs">
            <Upload className="w-4 h-4" />
            Upload CVs
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-4">
              {statsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{kpi.title}</p>
                    <p className="text-2xl font-bold mt-1">{kpi.value.toLocaleString()}</p>
                  </div>
                  <div className={`p-2 rounded-md ${kpi.bg}`}>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Uploads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
            <CardTitle className="text-base font-medium">Recent Uploads</CardTitle>
            <Link href="/admin/cvs">
              <Button variant="ghost" size="sm" className="gap-1 text-xs" data-testid="link-view-all-cvs">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {uploadsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            ) : recentUploads?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent uploads</p>
            ) : (
              <div className="space-y-3">
                {recentUploads?.map((candidate) => (
                  <Link key={candidate.id} href={`/admin/cvs/${candidate.id}`}>
                    <div
                      className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                      data-testid={`recent-upload-${candidate.id}`}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted text-muted-foreground">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{candidate.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
                      </div>
                      <StatusChip status={candidate.cvFile?.status || 'uploaded'} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
            <CardTitle className="text-base font-medium">Recent Jobs</CardTitle>
            <Link href="/admin/jobs">
              <Button variant="ghost" size="sm" className="gap-1 text-xs" data-testid="link-view-all-jobs">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : recentJobs?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No jobs created yet</p>
            ) : (
              <div className="space-y-3">
                {recentJobs?.map((job) => (
                  <Link key={job.id} href={`/admin/jobs/${job.id}`}>
                    <div
                      className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                      data-testid={`recent-job-${job.id}`}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted text-muted-foreground">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.department} · {job.city}, {job.country}
                        </p>
                      </div>
                      <StatusChip status={job.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
