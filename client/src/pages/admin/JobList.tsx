import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { listJobs, deleteJob, updateJob } from '@/api';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusChip } from '@/components/StatusChip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/utils/helpers';
import { Plus, X, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { Job, JobStatus, LocationType } from '@/types';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Closed' },
];

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

export default function JobList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<JobStatus | 'all'>('all');
  const [locationType, setLocationType] = useState<LocationType | 'all'>('all');
  const [country, setCountry] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['/api/jobs', status, locationType, country],
    queryFn: () =>
      listJobs({
        status: status === 'all' ? undefined : status,
        locationType: locationType === 'all' ? undefined : locationType,
        country: country === 'all' ? undefined : country,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => deleteJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      setDeleteDialogOpen(false);
      setJobToDelete(null);
      setSelectedJobs(new Set());
      toast({ title: 'Job deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete job', variant: 'destructive' });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (jobIds: string[]) => {
      // Delete all jobs in parallel
      await Promise.all(jobIds.map(id => deleteJob(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      setBulkDeleteDialogOpen(false);
      setSelectedJobs(new Set());
      toast({ title: `${selectedJobs.size} job(s) deleted successfully` });
    },
    onError: () => {
      toast({ title: 'Failed to delete jobs', variant: 'destructive' });
    },
  });

  const handleDeleteClick = (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    setJobToDelete(job);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    setEditingJob(job);
    setLocation(`/admin/jobs/${job.id}`);
  };

  const handleDeleteConfirm = () => {
    if (jobToDelete) {
      deleteMutation.mutate(jobToDelete.id);
    }
  };

  const handleBulkDeleteConfirm = () => {
    if (selectedJobs.size > 0) {
      bulkDeleteMutation.mutate(Array.from(selectedJobs));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedJobs(new Set(jobs?.map(j => j.id) || []));
    } else {
      setSelectedJobs(new Set());
    }
  };

  const handleSelectJob = (jobId: string, checked: boolean) => {
    const newSelected = new Set(selectedJobs);
    if (checked) {
      newSelected.add(jobId);
    } else {
      newSelected.delete(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const allSelected = jobs && jobs.length > 0 && selectedJobs.size === jobs.length;
  const someSelected = selectedJobs.size > 0 && selectedJobs.size < (jobs?.length || 0);

  const columns: Column<Job>[] = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={allSelected}
          onCheckedChange={handleSelectAll}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      render: (row) => (
        <Checkbox
          checked={selectedJobs.has(row.id)}
          onCheckedChange={(checked) => handleSelectJob(row.id, checked as boolean)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      className: 'w-12',
    },
    {
      key: 'title',
      header: 'Job Title',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.department}</p>
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      sortable: true,
      render: (row) => (
        <span className="text-sm">{row.company || '-'}</span>
      ),
    },
    {
      key: 'locationType',
      header: 'Type',
      sortable: true,
      render: (row) => (
        <Badge variant="outline" className="capitalize">
          {row.locationType}
        </Badge>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (row) => (
        <span className="text-sm">
          {row.city}, {row.country}
        </span>
      ),
    },
    {
      key: 'seniorityLevel',
      header: 'Level',
      sortable: true,
      render: (row) => (
        <span className="text-sm capitalize">{row.seniorityLevel}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <StatusChip status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleEditClick(e, row)}
            className="h-8 w-8 p-0"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleDeleteClick(e, row)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const clearFilters = () => {
    setStatus('all');
    setLocationType('all');
    setCountry('all');
  };

  const hasFilters = status !== 'all' || locationType !== 'all' || country !== 'all';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">Manage job postings and view candidate matches</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/jobs/new-from-url">
            <Button variant="outline" className="gap-2" data-testid="button-create-from-url">
              <Plus className="w-4 h-4" />
              Create from URL
            </Button>
          </Link>
          <Link href="/admin/jobs/new">
            <Button className="gap-2" data-testid="button-create-job">
              <Plus className="w-4 h-4" />
              Create Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedJobs.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-md">
          <span className="text-sm font-medium">
            {selectedJobs.size} job(s) selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteDialogOpen(true)}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={(v) => setStatus(v as JobStatus | 'all')}>
          <SelectTrigger className="w-[140px]" data-testid="select-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          data={jobs || []}
          columns={columns}
          onRowClick={(row) => setLocation(`/admin/jobs/${row.id}`)}
          pageSize={10}
          emptyMessage="No jobs found. Create your first job posting!"
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Job"
        description={`Are you sure you want to delete "${jobToDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setJobToDelete(null);
        }}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete Selected Jobs"
        description={`Are you sure you want to delete ${selectedJobs.size} selected job(s)? This action cannot be undone.`}
        confirmLabel="Delete All"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => {
          setBulkDeleteDialogOpen(false);
        }}
      />
    </div>
  );
}
