import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { listCandidates, deleteCandidate, updateCandidate } from '@/api';
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
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/utils/helpers';
import { Upload, Search, X, Edit, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<CvStatus | 'all'>('all');
  const [country, setCountry] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const { data: candidates, isLoading } = useQuery({
    queryKey: ['/api/candidates', status, country, search, sortBy],
    queryFn: () =>
      listCandidates({
        status: status === 'all' ? undefined : status,
        country: country === 'all' ? undefined : country,
        search: search || undefined,
        sortBy: sortBy === 'recent' ? 'recent' : undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (candidateId: string) => deleteCandidate(candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      setDeleteDialogOpen(false);
      setCandidateToDelete(null);
      setSelectedCandidates(new Set());
      toast({ title: 'Candidate deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete candidate', variant: 'destructive' });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (candidateIds: string[]) => {
      // Delete all candidates in parallel
      await Promise.all(candidateIds.map(id => deleteCandidate(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      setBulkDeleteDialogOpen(false);
      setSelectedCandidates(new Set());
      toast({ title: `${selectedCandidates.size} candidate(s) deleted successfully` });
    },
    onError: () => {
      toast({ title: 'Failed to delete candidates', variant: 'destructive' });
    },
  });

  const handleDeleteClick = (e: React.MouseEvent, candidate: Candidate) => {
    e.stopPropagation();
    setCandidateToDelete(candidate);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, candidate: Candidate) => {
    e.stopPropagation();
    setLocation(`/admin/cvs/${candidate.id}`);
  };

  const handleDeleteConfirm = () => {
    if (candidateToDelete) {
      deleteMutation.mutate(candidateToDelete.id);
    }
  };

  const handleBulkDeleteConfirm = () => {
    if (selectedCandidates.size > 0) {
      bulkDeleteMutation.mutate(Array.from(selectedCandidates));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCandidates(new Set(candidates?.map(c => c.id) || []));
    } else {
      setSelectedCandidates(new Set());
    }
  };

  const handleSelectCandidate = (candidateId: string, checked: boolean) => {
    const newSelected = new Set(selectedCandidates);
    if (checked) {
      newSelected.add(candidateId);
    } else {
      newSelected.delete(candidateId);
    }
    setSelectedCandidates(newSelected);
  };

  const allSelected = candidates && candidates.length > 0 && selectedCandidates.size === candidates.length;
  const someSelected = selectedCandidates.size > 0 && selectedCandidates.size < (candidates?.length || 0);

  const columns: Column<Candidate>[] = [
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
          checked={selectedCandidates.has(row.id)}
          onCheckedChange={(checked) => handleSelectCandidate(row.id, checked as boolean)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      className: 'w-12',
    },
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

      {/* Bulk Actions Bar */}
      {selectedCandidates.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-md">
          <span className="text-sm font-medium">
            {selectedCandidates.size} candidate(s) selected
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
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'recent' | 'name')}>
          <SelectTrigger className="w-[140px]" data-testid="select-sort">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recent First</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Candidate"
        description={`Are you sure you want to delete "${candidateToDelete?.name}"? This action cannot be undone and will delete all associated CV files, matrices, and matches.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setCandidateToDelete(null);
        }}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete Selected Candidates"
        description={`Are you sure you want to delete ${selectedCandidates.size} selected candidate(s)? This action cannot be undone and will delete all associated CV files, matrices, and matches.`}
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
