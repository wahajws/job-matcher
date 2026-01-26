import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useAuthStore } from '@/store/auth';
import { getCandidate, uploadCvs, getRecommendedJobs, rerunMatching } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScoreBadge } from '@/components/ScoreBadge';
import { StatusChip } from '@/components/StatusChip';
import { CandidateMatrixView } from '@/components/MatrixView';
import { FileDropzone } from '@/components/FileDropzone';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/utils/helpers';
import {
  Upload,
  Briefcase,
  Sparkles,
  RefreshCw,
  ArrowRight,
  FileText,
} from 'lucide-react';
import type { UploadProgress } from '@/types';

export default function CandidateDashboard() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<UploadProgress[]>([]);
  const [showUpload, setShowUpload] = useState(false);

  // Mock candidate ID - in real app would come from auth
  const candidateId = 'cand-1';

  const { data: candidate, isLoading: candidateLoading } = useQuery({
    queryKey: ['/api/candidates', candidateId],
    queryFn: () => getCandidate(candidateId),
  });

  const { data: recommendedJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['/api/candidates', candidateId, 'recommended-jobs'],
    queryFn: () => getRecommendedJobs(candidateId),
  });

  const uploadMutation = useMutation({
    mutationFn: (fileObjects: File[]) => uploadCvs(fileObjects),
    onSuccess: () => {
      toast({ title: 'CV uploaded successfully' });
      setFiles([]);
      setShowUpload(false);
      queryClient.invalidateQueries({ queryKey: ['/api/candidates', candidateId] });
    },
  });

  const rerunMutation = useMutation({
    mutationFn: () => rerunMatching(candidateId),
    onSuccess: () => {
      toast({ title: 'Matching re-run complete' });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates', candidateId, 'recommended-jobs'] });
    },
  });

  const handleFilesAccepted = (acceptedFiles: File[]) => {
    const newFiles: UploadProgress[] = acceptedFiles.slice(0, 1).map((file) => ({
      filename: file.name,
      progress: 0,
      status: 'pending',
    }));
    setFiles(newFiles);
  };

  const handleUpload = () => {
    const fileToUpload = files.filter((f) => f.status === 'pending');
    if (fileToUpload.length > 0) {
      uploadMutation.mutate([new File([''], fileToUpload[0].filename)]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-muted-foreground">Here's your job matching overview</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload CV Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="w-5 h-5" />
              My CV
            </CardTitle>
            <CardDescription>Upload or update your CV</CardDescription>
          </CardHeader>
          <CardContent>
            {candidateLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : candidate?.cvFile ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{candidate.cvFile.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {formatDate(candidate.cvFile.uploadedAt)}
                    </p>
                  </div>
                  <StatusChip status={candidate.cvFile.status} />
                </div>
                {!showUpload ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowUpload(true)}
                    className="w-full gap-2"
                    data-testid="button-update-cv"
                  >
                    <Upload className="w-4 h-4" />
                    Update CV
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <FileDropzone
                      onFilesAccepted={handleFilesAccepted}
                      files={files}
                      onRemoveFile={() => setFiles([])}
                      maxFiles={1}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowUpload(false);
                          setFiles([]);
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpload}
                        disabled={files.length === 0 || uploadMutation.isPending}
                        className="flex-1"
                        data-testid="button-upload-new-cv"
                      >
                        {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <FileDropzone
                  onFilesAccepted={handleFilesAccepted}
                  files={files}
                  onRemoveFile={() => setFiles([])}
                  maxFiles={1}
                />
                <Button
                  onClick={handleUpload}
                  disabled={files.length === 0 || uploadMutation.isPending}
                  className="w-full gap-2"
                  data-testid="button-first-upload"
                >
                  <Upload className="w-4 h-4" />
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload CV'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Matrix Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                My Matrix
              </CardTitle>
              <CardDescription>AI-extracted profile summary</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => rerunMutation.mutate()}
              disabled={rerunMutation.isPending}
              className="gap-2"
              data-testid="button-rerun-matching"
            >
              <RefreshCw className={`w-4 h-4 ${rerunMutation.isPending ? 'animate-spin' : ''}`} />
              Re-run
            </Button>
          </CardHeader>
          <CardContent>
            {candidateLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : candidate?.matrix ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <p className="text-2xl font-bold">{candidate.matrix.totalYearsExperience}</p>
                    <p className="text-xs text-muted-foreground">Years Exp.</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <p className="text-2xl font-bold">{candidate.matrix.skills.length}</p>
                    <p className="text-xs text-muted-foreground">Skills</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.matrix.skills.slice(0, 6).map((skill) => (
                    <Badge key={skill.name} variant="secondary" className="text-xs">
                      {skill.name}
                    </Badge>
                  ))}
                  {candidate.matrix.skills.length > 6 && (
                    <Badge variant="outline" className="text-xs">
                      +{candidate.matrix.skills.length - 6} more
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Matrix generated by Qwen (latest)</span>
                  <Badge variant="outline" className="text-[10px]">
                    {candidate.matrix.confidence}% confidence
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Sparkles className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Upload your CV to generate your matrix</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommended Jobs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Recommended Jobs
            </CardTitle>
            <CardDescription>Jobs that match your profile</CardDescription>
          </div>
          <Link href="/candidate/jobs">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all-jobs">
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
          ) : recommendedJobs?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Briefcase className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No job matches yet. Upload your CV to get started!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recommendedJobs?.slice(0, 5).map((match) => (
                <Link key={match.id} href={`/candidate/jobs/${match.jobId}`}>
                  <div
                    className="flex items-center gap-4 p-3 rounded-md border hover-elevate cursor-pointer"
                    data-testid={`recommended-job-${match.id}`}
                  >
                    <ScoreBadge score={match.score} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{match.job?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {match.job?.department} · {match.job?.city}, {match.job?.country}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize shrink-0">
                      {match.job?.locationType}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
