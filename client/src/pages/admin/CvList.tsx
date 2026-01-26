import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { listCandidates } from '@/api';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusChip } from '@/components/StatusChip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/utils/helpers';
import { Upload, Search, X } from 'lucide-react';
import type { Candidate, CvStatus } from '@/types';

const statusOptions: { value: CvStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'parsing', label: 'Parsing' },
  { value: 'matrix_ready', label: 'Matrix Ready' },
  { value: 'failed', label: 'Failed' },
  { value: 'needs_review', label: 'Needs Review' },
];

const countryOptions = [
  { value: 'all', label: 'All Countries' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'IN', label: 'India' },
  { value: 'SG', label: 'Singapore' },
  { value: 'AU', label: 'Australia' },
];

export default function CvList() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<CvStatus | 'all'>('all');
  const [country, setCountry] = useState('all');
  const [search, setSearch] = useState('');

  const { data: candidates, isLoading } = useQuery({
    queryKey: ['/api/candidates', status, country, search],
    queryFn: () =>
      listCandidates({
        status: status === 'all' ? undefined : status,
        country: country === 'all' ? undefined : country,
        search: search || undefined,
      }),
  });

  const columns: Column<Candidate>[] = [
    {
      key: 'name',
      header: 'Candidate',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'country',
      header: 'Country',
      sortable: true,
      render: (row) => <span className="text-sm">{row.country}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <StatusChip status={row.cvFile?.status || 'uploaded'} />,
    },
    {
      key: 'tags',
      header: 'Tags',
      render: (row) => (
        <div className="flex gap-1 flex-wrap">
          {row.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {row.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{row.tags.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Uploaded',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
  ];

  const clearFilters = () => {
    setStatus('all');
    setCountry('all');
    setSearch('');
  };

  const hasFilters = status !== 'all' || country !== 'all' || search !== '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">CV Database</h1>
          <p className="text-muted-foreground">Browse and manage all candidate CVs</p>
        </div>
        <Link href="/admin/cvs/upload">
          <Button className="gap-2" data-testid="button-upload-cvs">
            <Upload className="w-4 h-4" />
            Upload CVs
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as CvStatus | 'all')}>
          <SelectTrigger className="w-[160px]" data-testid="select-status">
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
          data={candidates || []}
          columns={columns}
          onRowClick={(row) => setLocation(`/admin/cvs/${row.id}`)}
          pageSize={10}
          emptyMessage="No candidates found matching your criteria"
        />
      )}
    </div>
  );
}
