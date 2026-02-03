import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { getCandidate, getNotes, addNote, getMatchesForCandidate, updateCandidate } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusChip } from '@/components/StatusChip';
import { ScoreBadge } from '@/components/ScoreBadge';
import { CandidateMatrixView } from '@/components/MatrixView';
import { EvidenceList } from '@/components/EvidenceList';
import { RightDrawer } from '@/components/RightDrawer';
import { BreakdownBar } from '@/components/BreakdownBar';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';
import { formatDate, formatFileSize, getCountryFromCode } from '@/utils/helpers';
import { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  FileText,
  Clock,
  Tag,
  Send,
  Briefcase,
  Edit,
} from 'lucide-react';

export default function CvDetail() {
  const [, params] = useRoute('/admin/cvs/:id');
  const candidateId = params?.id || '';
  const { toast } = useToast();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [noteContent, setNoteContent] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [newTag, setNewTag] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    headline: '',
  });

  const { data: candidate, isLoading } = useQuery({
    queryKey: ['/api/candidates', candidateId],
    queryFn: () => getCandidate(candidateId),
    enabled: !!candidateId,
  });

  const { data: notes, isLoading: notesLoading } = useQuery({
    queryKey: ['/api/candidates', candidateId, 'notes'],
    queryFn: () => getNotes(candidateId),
    enabled: !!candidateId,
  });

  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ['/api/candidates', candidateId, 'matches'],
    queryFn: () => getMatchesForCandidate(candidateId),
    enabled: !!candidateId,
  });

  const addNoteMutation = useMutation({
    mutationFn: () => addNote(candidateId, noteContent, user?.name || 'Admin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates', candidateId, 'notes'] });
      setNoteContent('');
      toast({ title: 'Note added successfully' });
    },
  });

  const addTagMutation = useMutation({
    mutationFn: (tag: string) =>
      updateCandidate(candidateId, { tags: [...(candidate?.tags || []), tag] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates', candidateId] });
      setNewTag('');
      toast({ title: 'Tag added' });
    },
  });

  const updateCandidateMutation = useMutation({
    mutationFn: (data: { name: string; email: string; phone: string; country: string; countryCode: string; headline?: string }) =>
      updateCandidate(candidateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates', candidateId] });
      setIsEditDialogOpen(false);
      toast({ title: 'Candidate updated successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to update candidate', variant: 'destructive' });
    },
  });

  const handleEditClick = () => {
    if (candidate) {
      setEditForm({
        name: candidate.name || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        country: candidate.country || '',
        headline: candidate.headline || '',
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleEditSubmit = () => {
    updateCandidateMutation.mutate({
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      country: editForm.country,
      countryCode: editForm.country,
      headline: editForm.headline,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Candidate not found</p>
        <Link href="/admin/cvs">
          <Button variant="outline" className="mt-4">
            Back to CVs
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/cvs">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{candidate.name}</h1>
          <p className="text-muted-foreground">{candidate.headline || 'Candidate Profile'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleEditClick} className="gap-2">
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <StatusChip status={candidate.cvFile?.status || 'uploaded'} />
        </div>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="flex-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium truncate">{candidate.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{candidate.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Country</p>
                  <p className="text-sm font-medium">{getCountryFromCode(candidate.country)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Uploaded</p>
                  <p className="text-sm font-medium">{formatDate(candidate.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
          {candidate.cvFile && (
            <div className="mt-4 pt-4 border-t flex items-center gap-4">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{candidate.cvFile.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(candidate.cvFile.fileSize)}
                  {candidate.cvFile.batchTag && ` · ${candidate.cvFile.batchTag}`}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList>
          <TabsTrigger value="matrix" data-testid="tab-matrix">Matrix</TabsTrigger>
          <TabsTrigger value="evidence" data-testid="tab-evidence">Evidence</TabsTrigger>
          <TabsTrigger value="matches" data-testid="tab-matches">Matches</TabsTrigger>
          <TabsTrigger value="notes" data-testid="tab-notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix">
          {candidate.matrix ? (
            <CandidateMatrixView matrix={candidate.matrix} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Matrix not yet generated. CV is still being processed.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="evidence">
          {candidate.matrix?.evidence ? (
            <EvidenceList evidence={candidate.matrix.evidence} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No evidence snippets available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="matches">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job Matches</CardTitle>
            </CardHeader>
            <CardContent>
              {matchesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : matches?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No job matches found</p>
              ) : (
                <div className="space-y-2">
                  {matches?.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center gap-4 p-3 rounded-md border hover-elevate cursor-pointer"
                      onClick={() => setSelectedMatch(match)}
                      data-testid={`match-row-${match.id}`}
                    >
                      <ScoreBadge score={match.score} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{match.job?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {match.job?.department} · {match.job?.city}, {match.job?.country}
                        </p>
                      </div>
                      <BreakdownBar breakdown={match.breakdown} compact />
                      <StatusChip status={match.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {candidate.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                  {candidate.tags.length === 0 && (
                    <p className="text-sm text-muted-foreground">No tags</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    data-testid="input-new-tag"
                  />
                  <Button
                    size="sm"
                    onClick={() => newTag && addTagMutation.mutate(newTag)}
                    disabled={!newTag || addTagMutation.isPending}
                    data-testid="button-add-tag"
                  >
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Admin Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a note about this candidate..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={3}
                    data-testid="input-note"
                  />
                  <Button
                    size="sm"
                    onClick={() => addNoteMutation.mutate()}
                    disabled={!noteContent || addNoteMutation.isPending}
                    className="gap-2"
                    data-testid="button-add-note"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Add Note
                  </Button>
                </div>
                <div className="space-y-3 max-h-60 overflow-auto custom-scrollbar">
                  {notesLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : notes?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No notes yet</p>
                  ) : (
                    notes?.map((note) => (
                      <div key={note.id} className="p-3 rounded-md bg-muted/50 text-sm">
                        <p>{note.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {note.authorName} · {formatDate(note.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Match Detail Drawer */}
      <RightDrawer
        open={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        title={selectedMatch?.job?.title}
        description={`${selectedMatch?.job?.department} · ${selectedMatch?.job?.city}, ${selectedMatch?.job?.country}`}
      >
        {selectedMatch && (
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-4">
              <ScoreBadge score={selectedMatch.score} size="lg" showLabel />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Score Breakdown</h4>
              <BreakdownBar breakdown={selectedMatch.breakdown} />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Explanation</h4>
              <p className="text-sm text-muted-foreground">{selectedMatch.explanation}</p>
            </div>

            {selectedMatch.gaps?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Gaps</h4>
                <div className="space-y-2">
                  {selectedMatch.gaps.map((gap: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 rounded-md bg-rose-50 dark:bg-rose-900/20 text-sm"
                    >
                      <Badge
                        variant="outline"
                        className="text-xs capitalize"
                      >
                        {gap.severity}
                      </Badge>
                      <span>{gap.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-4 border-t">
              <Link href={`/admin/jobs/${selectedMatch.jobId}`}>
                <Button variant="outline" className="gap-2">
                  <Briefcase className="w-4 h-4" />
                  View Job
                </Button>
              </Link>
            </div>
          </div>
        )}
      </RightDrawer>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Candidate</DialogTitle>
            <DialogDescription>Update candidate information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Country</label>
              <Select value={editForm.country} onValueChange={(v) => setEditForm({ ...editForm, country: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="DE">Germany</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="IN">India</SelectItem>
                  <SelectItem value="SG">Singapore</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                  <SelectItem value="MY">Malaysia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Headline</label>
              <Input
                value={editForm.headline}
                onChange={(e) => setEditForm({ ...editForm, headline: e.target.value })}
                placeholder="Professional headline"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={updateCandidateMutation.isPending}>
              {updateCandidateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
