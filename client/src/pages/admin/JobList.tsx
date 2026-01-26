import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { listJobs } from '@/api';
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
import { formatDate } from '@/utils/helpers';
import { Plus, X } from 'lucide-react';
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
  const [status, setStatus] = useState<JobStatus | 'all'>('all');
  const [locationType, setLocationType] = useState<LocationType | 'all'>('all');
  const [country, setCountry] = useState('all');

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['/api/jobs', status, locationType, country],
    queryFn: () =>
      listJobs({
        status: status === 'all' ? undefined : status,
        locationType: locationType === 'all' ? undefined : locationType,
        country: country === 'all' ? undefined : country,
      }),
  });

  const columns: Column<Job>[] = [
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
        <Link href="/admin/jobs/new">
          <Button className="gap-2" data-testid="button-create-job">
            <Plus className="w-4 h-4" />
            Create Job
          </Button>
        </Link>
      </div>

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
    </div>
  );
}
