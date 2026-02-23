import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  generateCoverLetter,
  getRecommendedJobs,
  getCandidateProfile,
  getCoverLetterForJob,
  saveCoverLetter,
  deleteCoverLetter,
} from '@/api';
import { useAuthStore } from '@/store/auth';
import type { CoverLetterResult, CoverLetterTone, SavedCoverLetter } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Sparkles,
  Loader2,
  Copy,
  RefreshCw,
  CheckCircle2,
  Save,
  Trash2,
  Edit3,
} from 'lucide-react';

export default function CoverLetterGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [selectedJobId, setSelectedJobId] = useState('');
  const [tone, setTone] = useState<CoverLetterTone>('formal');
  const [result, setResult] = useState<CoverLetterResult | null>(null);
  const [editedLetter, setEditedLetter] = useState('');
  const [activeVersion, setActiveVersion] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Get candidate profile
  const { data: profile } = useQuery({
    queryKey: ['candidate-profile'],
    queryFn: getCandidateProfile,
  });

  const candidateId = user?.candidateId || profile?.id;

  // Fetch matched jobs
  const { data: matchedJobs } = useQuery({
    queryKey: ['candidate-recommended-jobs', candidateId],
    queryFn: () => (candidateId ? getRecommendedJobs(candidateId) : Promise.resolve([])),
    enabled: !!candidateId,
  });

  // Fetch saved cover letter for the selected job
  const { data: savedLetter, isLoading: savedLetterLoading } = useQuery({
    queryKey: ['cover-letter', selectedJobId],
    queryFn: () => getCoverLetterForJob(selectedJobId),
    enabled: !!selectedJobId,
  });

  // When job changes, load the saved letter if it exists
  useEffect(() => {
    if (savedLetter && savedLetter.content) {
      setEditedLetter(savedLetter.content);
      setTone(savedLetter.tone);
      setResult(null); // Clear AI result since we're loading saved
      setIsEditing(false);
    } else {
      setEditedLetter('');
      setResult(null);
      setIsEditing(false);
    }
  }, [savedLetter, selectedJobId]);

  const availableJobs = (matchedJobs || [])
    .filter((m) => m.job)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map((m) => ({
      id: m.job!.id,
      title: m.job!.title,
      company: (m.job as any)?.company || '',
      score: m.score,
    }));

  // Generate cover letter via AI
  const generateMutation = useMutation({
    mutationFn: () => generateCoverLetter(selectedJobId, tone),
    onSuccess: (data) => {
      setResult(data);
      setEditedLetter(data.coverLetter);
      setActiveVersion(0);
      setIsEditing(true);
      toast({ title: 'Cover letter generated!' });
    },
    onError: (err: any) => {
      toast({ title: 'Generation Failed', description: err.message, variant: 'destructive' });
    },
  });

  // Save cover letter
  const saveMutation = useMutation({
    mutationFn: () => saveCoverLetter(selectedJobId, editedLetter, tone),
    onSuccess: () => {
      toast({ title: 'Cover letter saved!', description: 'It will be available when you apply for this job.' });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['cover-letter', selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] });
    },
    onError: (err: any) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  // Delete cover letter
  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!savedLetter?.id) return Promise.reject('No cover letter to delete');
      return deleteCoverLetter(savedLetter.id);
    },
    onSuccess: () => {
      toast({ title: 'Cover letter deleted' });
      setEditedLetter('');
      setResult(null);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['cover-letter', selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] });
    },
    onError: (err: any) => {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(editedLetter);
    setCopied(true);
    toast({ title: 'Copied to clipboard!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const switchVersion = (idx: number) => {
    setActiveVersion(idx);
    if (idx === 0 && result) {
      setEditedLetter(result.coverLetter);
    } else if (result && result.alternateVersions[idx - 1]) {
      setEditedLetter(result.alternateVersions[idx - 1]);
    }
  };

  const hasSavedLetter = savedLetter && savedLetter.content;
  const hasContent = editedLetter.trim().length > 0;
  const isDirty = hasSavedLetter ? editedLetter !== savedLetter!.content : hasContent;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          AI Cover Letter Generator
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate a tailored cover letter based on your CV and a specific job posting.
          Saved cover letters are automatically used when you apply.
        </p>
      </div>

      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generate Cover Letter</CardTitle>
          <CardDescription>
            Select a job from your matches, choose a tone, and let AI write it for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Select Job</label>
              <Select
                value={selectedJobId}
                onValueChange={(val) => {
                  setSelectedJobId(val);
                  setResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a job…" />
                </SelectTrigger>
                <SelectContent>
                  {availableJobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title} {j.company && `— ${j.company}`}{' '}
                      <span className="text-xs text-muted-foreground">({j.score}% match)</span>
                    </SelectItem>
                  ))}
                  {availableJobs.length === 0 && (
                    <SelectItem value="_none" disabled>
                      No matched jobs yet — upload your CV to get matches
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Tone</label>
              <Select value={tone} onValueChange={(v) => setTone(v as CoverLetterTone)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!selectedJobId || generateMutation.isPending}
              className="gap-2"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : hasSavedLetter ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Cover Letter
                </>
              )}
            </Button>
          </div>

          {generateMutation.isPending && (
            <p className="text-sm text-muted-foreground">
              AI is crafting your cover letter… This may take 15-30 seconds.
            </p>
          )}

          {/* Saved letter indicator */}
          {selectedJobId && savedLetterLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading saved cover letter…
            </div>
          )}
          {hasSavedLetter && !savedLetterLoading && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Cover letter saved (v{savedLetter!.version}) — will be used when you apply
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor — show when we have content */}
      {(hasContent || hasSavedLetter) && !savedLetterLoading && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {hasSavedLetter && !isEditing ? 'Saved Cover Letter' : 'Your Cover Letter'}
              </CardTitle>
              <div className="flex gap-2">
                {hasContent && (
                  <Button variant="outline" size="sm" className="gap-1" onClick={handleCopy}>
                    {copied ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                )}
                {hasSavedLetter && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                )}
                {isDirty && (
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !editedLetter.trim()}
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save
                  </Button>
                )}
                {hasSavedLetter && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      if (confirm('Delete this cover letter?')) {
                        deleteMutation.mutate();
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                )}
              </div>
            </div>

            {/* Version tabs (only for AI-generated results with alternates) */}
            {result && result.alternateVersions.length > 0 && (
              <div className="flex gap-2 mt-2">
                <Badge
                  variant={activeVersion === 0 ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => switchVersion(0)}
                >
                  Full Version
                </Badge>
                {result.alternateVersions.map((_, i) => (
                  <Badge
                    key={i}
                    variant={activeVersion === i + 1 ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => switchVersion(i + 1)}
                  >
                    Short Version {i + 1}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isEditing || result ? (
              <Textarea
                className="min-h-[400px] font-mono text-sm"
                value={editedLetter}
                onChange={(e) => setEditedLetter(e.target.value)}
              />
            ) : (
              <div className="min-h-[200px] p-4 rounded-md bg-muted/30 whitespace-pre-wrap font-mono text-sm">
                {editedLetter}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
