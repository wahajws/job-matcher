import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import {
  getCompanyJob,
  getApplicationsForJob,
  updateApplicationStatus,
  updateCompanyJob,
} from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusChip } from '@/components/StatusChip';
import { ScoreBadge } from '@/components/ScoreBadge';
import { useToast } from '@/hooks/use-toast';
import { formatDate, getCountryFromCode } from '@/utils/helpers';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Briefcase,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  UserCheck,
  UserX,
  User,
  ChevronRight,
  Columns3,
} from 'lucide-react';
import type { Application, ApplicationStatus } from '@/types';

const applicationStatusOptions = [
  { value: 'all', label: 'All' },
  { value: 'applied', label: 'Applied' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
];

const sortOptions = [
  { value: 'date', label: 'Newest First' },
  { value: 'score', label: 'Best Score' },
];

const statusFlow: ApplicationStatus[] = ['applied', 'screening', 'interview', 'offer', 'hired'];

const statusColors: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  screening: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  interview: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  offer: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  hired: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function CompanyJobDetail() {
  const [, params] = useRoute('/company/jobs/:id');
  const jobId = params?.id || '';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [appStatusFilter, setAppStatusFilter] = useState('all');
  const [appSort, setAppSort] = useState('date');
  const [statusAction, setStatusAction] = useState<{ app: Application; newStatus: ApplicationStatus } | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['company-job', jobId],
    queryFn: () => getCompanyJob(jobId),
    enabled: !!jobId,
  });

  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ['job-applications', jobId, appStatusFilter, appSort],
    queryFn: () =>
      getApplicationsForJob(jobId, {
        status: appStatusFilter !== 'all' ? appStatusFilter : undefined,
        sortBy: appSort,
      }),
    enabled: !!jobId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      updateApplicationStatus(id, status),
    onSuccess: () => {
      toast({ title: 'Status Updated' });
      setStatusAction(null);
      queryClient.invalidateQueries({ queryKey: ['job-applications', jobId] });
      queryClient.invalidateQueries({ queryKey: ['company-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['company-stats'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const toggleJobStatus = useMutation({
    mutationFn: (newStatus: string) => updateCompanyJob(jobId, { status: newStatus as any }),
    onSuccess: () => {
      toast({ title: 'Job status updated' });
      queryClient.invalidateQueries({ queryKey: ['company-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['company-jobs'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  if (jobLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Job not found</p>
        <Link href="/company/jobs">
          <Button variant="outline" className="mt-4">Back to Jobs</Button>
        </Link>
      </div>
    );
  }

  const getNextStatus = (currentStatus: ApplicationStatus): ApplicationStatus | null => {
    const idx = statusFlow.indexOf(currentStatus);
    if (idx >= 0 && idx < statusFlow.length - 1) return statusFlow[idx + 1];
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/company/jobs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <StatusChip status={job.status} />
          </div>
          <p className="text-muted-foreground">{job.department}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/company/jobs/${jobId}/pipeline`}>
            <Button variant="outline" className="gap-2">
              <Columns3 className="w-4 h-4" />
              Pipeline View
            </Button>
          </Link>
          {job.status === 'draft' && (
            <Button onClick={() => toggleJobStatus.mutate('published')} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Publish
            </Button>
          )}
          {job.status === 'published' && (
            <Button variant="outline" onClick={() => toggleJobStatus.mutate('closed')} className="gap-2">
              <XCircle className="w-4 h-4" />
              Close Job
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{job.totalApplications || 0}</p>
            <p className="text-xs text-muted-foreground">Total Applications</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{job.statusCounts?.applied || 0}</p>
            <p className="text-xs text-muted-foreground">New</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {(job.statusCounts?.screening || 0) + (job.statusCounts?.interview || 0)}
            </p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {(job.statusCounts?.offer || 0) + (job.statusCounts?.hired || 0)}
            </p>
            <p className="text-xs text-muted-foreground">Offers/Hired</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{job.statusCounts?.rejected || 0}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">
            Applications ({job.totalApplications || 0})
          </TabsTrigger>
          <TabsTrigger value="details">Job Details</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          {/* Application Filters */}
          <div className="flex items-center gap-3 pt-2">
            <Select value={appStatusFilter} onValueChange={setAppStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {applicationStatusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={appSort} onValueChange={setAppSort}>
              <SelectTrigger className="w-[140px]">
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
          </div>

          {/* Applications List */}
          {appsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : !applications || applications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {appStatusFilter !== 'all'
                    ? `No ${appStatusFilter} applications`
                    : 'No applications yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => {
                const nextStatus = getNextStatus(app.status as ApplicationStatus);
                return (
                  <Card key={app.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          {app.candidate?.photoUrl ? (
                            <img
                              src={app.candidate.photoUrl}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>

                        {/* Candidate info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3
                                className="font-medium cursor-pointer hover:text-primary"
                                onClick={() => setSelectedApp(app)}
                              >
                                {app.candidate?.name || 'Unknown'}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {app.candidate?.headline || app.candidate?.email}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {app.matchScore != null && (
                                <ScoreBadge score={app.matchScore} size="sm" />
                              )}
                              <Badge className={`${statusColors[app.status] || ''}`}>
                                {app.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {app.candidate?.country && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {app.candidate.country}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Applied {formatDate(app.appliedAt)}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => setSelectedApp(app)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Button>
                            {nextStatus && (
                              <Button
                                size="sm"
                                className="gap-1"
                                onClick={() =>
                                  setStatusAction({ app, newStatus: nextStatus })
                                }
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Move to {nextStatus}
                              </Button>
                            )}
                            {app.status !== 'rejected' && app.status !== 'hired' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive gap-1"
                                onClick={() =>
                                  setStatusAction({ app, newStatus: 'rejected' })
                                }
                              >
                                <UserX className="w-3.5 h-3.5" />
                                Reject
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="details" className="space-y-4 pt-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{job.city ? `${job.city}, ` : ''}{getCountryFromCode(job.country)}</span>
                  <Badge variant="outline" className="capitalize ml-1">{job.locationType}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <span className="capitalize">{job.seniorityLevel} level</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{job.minYearsExperience}+ years experience</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Posted {formatDate(job.createdAt)}</span>
                </div>
                {job.deadline && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <Clock className="w-4 h-4" />
                    <span>Deadline: {formatDate(job.deadline)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {job.description}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">Must-Have</p>
                <div className="flex flex-wrap gap-2">
                  {job.mustHaveSkills?.map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                </div>
              </div>
              {job.niceToHaveSkills && job.niceToHaveSkills.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Nice-to-Have</p>
                  <div className="flex flex-wrap gap-2">
                    {job.niceToHaveSkills.map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Application Detail Drawer / Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedApp?.candidate?.name}</DialogTitle>
            <DialogDescription>{selectedApp?.candidate?.headline || selectedApp?.candidate?.email}</DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <Badge className={statusColors[selectedApp.status] || ''}>
                  {selectedApp.status}
                </Badge>
                {selectedApp.matchScore != null && (
                  <ScoreBadge score={selectedApp.matchScore} size="sm" showLabel />
                )}
                <span className="text-sm text-muted-foreground ml-auto">
                  Applied {formatDate(selectedApp.appliedAt)}
                </span>
              </div>

              {selectedApp.candidate && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {selectedApp.candidate.email && (
                    <div><span className="text-muted-foreground">Email:</span> {selectedApp.candidate.email}</div>
                  )}
                  {selectedApp.candidate.phone && (
                    <div><span className="text-muted-foreground">Phone:</span> {selectedApp.candidate.phone}</div>
                  )}
                  {selectedApp.candidate.country && (
                    <div><span className="text-muted-foreground">Country:</span> {selectedApp.candidate.country}</div>
                  )}
                </div>
              )}

              {selectedApp.coverLetter && (
                <div>
                  <p className="text-sm font-medium mb-1">Cover Letter</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-md">
                    {selectedApp.coverLetter}
                  </p>
                </div>
              )}

              {selectedApp.matchExplanation && (
                <div>
                  <p className="text-sm font-medium mb-1">AI Match Analysis</p>
                  <p className="text-sm text-muted-foreground">{selectedApp.matchExplanation}</p>
                </div>
              )}

              {selectedApp.matchGaps && selectedApp.matchGaps.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Gaps</p>
                  <div className="space-y-1">
                    {selectedApp.matchGaps.map((g, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                        <Badge variant="outline" className="text-xs capitalize shrink-0">{g.severity}</Badge>
                        <span>{g.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {selectedApp && selectedApp.status !== 'rejected' && selectedApp.status !== 'hired' && (
              <>
                {getNextStatus(selectedApp.status as ApplicationStatus) && (
                  <Button
                    onClick={() =>
                      setStatusAction({
                        app: selectedApp,
                        newStatus: getNextStatus(selectedApp.status as ApplicationStatus)!,
                      })
                    }
                    className="gap-1"
                  >
                    <ChevronRight className="w-4 h-4" />
                    Move to {getNextStatus(selectedApp.status as ApplicationStatus)}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() =>
                    setStatusAction({ app: selectedApp, newStatus: 'rejected' })
                  }
                >
                  Reject
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setSelectedApp(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation */}
      <Dialog open={!!statusAction} onOpenChange={() => setStatusAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusAction?.newStatus === 'rejected'
                ? 'Reject Application?'
                : `Move to ${statusAction?.newStatus}?`}
            </DialogTitle>
            <DialogDescription>
              {statusAction?.newStatus === 'rejected'
                ? `Are you sure you want to reject ${statusAction?.app.candidate?.name}'s application?`
                : `Move ${statusAction?.app.candidate?.name}'s application to "${statusAction?.newStatus}" stage?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusAction(null)}>
              Cancel
            </Button>
            <Button
              variant={statusAction?.newStatus === 'rejected' ? 'destructive' : 'default'}
              onClick={() =>
                statusAction &&
                updateStatusMutation.mutate({
                  id: statusAction.app.id,
                  status: statusAction.newStatus,
                })
              }
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
