import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, Link, useLocation } from 'wouter';
import { getCandidate, getMatchesForJob, createConversation } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ScoreBadge } from '@/components/ScoreBadge';
import { BreakdownBar } from '@/components/BreakdownBar';
import { useToast } from '@/hooks/use-toast';
import { getCountryFromCode } from '@/utils/helpers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  User,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Globe,
  ExternalLink,
  MessageSquare,
  Send,
  Loader2,
  Mail,
  Phone,
  Languages,
  Star,
} from 'lucide-react';

export default function CompanyCandidateProfile() {
  const [, params] = useRoute('/company/candidates/:id');
  const candidateId = params?.id || '';
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageText, setMessageText] = useState('');

  // Get job from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('job') || '';

  const { data: candidate, isLoading } = useQuery({
    queryKey: ['candidate', candidateId],
    queryFn: () => getCandidate(candidateId),
    enabled: !!candidateId,
  });

  // Get match data for this candidate's job
  const { data: jobMatches } = useQuery({
    queryKey: ['matches-for-job', jobId],
    queryFn: () => getMatchesForJob(jobId),
    enabled: !!jobId,
  });

  const match = jobMatches?.find((m: any) => m.candidateId === candidateId);
  const matrix = candidate?.matrix;

  // Message mutation
  const messageMutation = useMutation({
    mutationFn: () => {
      const userId = (match as any)?.candidate?.userId || candidate?.userId;
      if (!userId) {
        return Promise.reject(new Error('Cannot find user account for this candidate'));
      }
      return createConversation({
        candidateUserId: userId,
        jobId: jobId || undefined,
        message: messageText.trim(),
      });
    },
    onSuccess: () => {
      toast({ title: 'Message sent!', description: `Conversation started with ${candidate?.name}` });
      setShowMessageDialog(false);
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setLocation('/messages');
    },
    onError: (err: any) => {
      toast({ title: 'Failed to send', description: err.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Candidate not found</p>
        <Link href="/company/candidates">
          <Button variant="outline" className="mt-4">Back to Candidates</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/company/candidates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {candidate.photoUrl ? (
              <img src={candidate.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{candidate.name}</h1>
            <p className="text-muted-foreground">
              {candidate.headline || matrix?.roles?.[0] || 'Candidate'}
            </p>
          </div>
          {match && <ScoreBadge score={match.score} size="lg" showLabel />}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button
          className="gap-2"
          onClick={() => setShowMessageDialog(true)}
        >
          <MessageSquare className="w-4 h-4" />
          Message Candidate
        </Button>
        {candidate.linkedinUrl && (
          <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              <Globe className="w-4 h-4" /> LinkedIn <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        )}
        {candidate.githubUrl && (
          <a href={candidate.githubUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              <Globe className="w-4 h-4" /> GitHub <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        )}
      </div>

      {/* Match Details */}
      {match && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Match Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <BreakdownBar breakdown={match.breakdown} />
            {match.explanation && (
              <p className="text-sm text-muted-foreground">{match.explanation}</p>
            )}
            {(match as any).gaps && (match as any).gaps.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <p className="text-sm font-medium">Gaps:</p>
                {(match as any).gaps.map((gap: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 text-sm">
                    <Badge variant="outline" className="capitalize shrink-0 text-xs">
                      {gap.severity}
                    </Badge>
                    <span className="text-muted-foreground">{gap.description}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {candidate.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${candidate.email}`} className="text-primary hover:underline">
                  {candidate.email}
                </a>
              </div>
            )}
            {candidate.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{candidate.phone}</span>
              </div>
            )}
            {candidate.country && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{getCountryFromCode(candidate.countryCode || candidate.country)}</span>
              </div>
            )}
          </div>
          {candidate.bio && (
            <div className="mt-3">
              <p className="text-sm font-medium mb-1">About</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{candidate.bio}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills */}
      {matrix && matrix.skills && matrix.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Skills & Expertise</CardTitle>
            <CardDescription>
              {matrix.skills.length} skills · {matrix.totalYearsExperience} years total experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {matrix.skills.map((skill: any, i: number) => (
                <Badge
                  key={i}
                  variant={skill.level === 'advanced' ? 'default' : 'secondary'}
                  className="text-sm py-1 px-2.5"
                >
                  {skill.name}
                  <span className="ml-1.5 opacity-70 text-xs">
                    {skill.level} · {skill.yearsOfExperience}y
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Experience & Education */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Roles */}
        {matrix?.roles && matrix.roles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {matrix.roles.map((role: string, i: number) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-primary" />
                    {role}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Education */}
        {matrix?.education && matrix.education.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Education
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {matrix.education.map((edu: any, i: number) => (
                  <li key={i} className="text-sm">
                    <p className="font-medium">{edu.degree}</p>
                    <p className="text-muted-foreground">
                      {edu.institution} {edu.year && `· ${edu.year}`}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Domains & Languages */}
      <div className="grid gap-4 md:grid-cols-2">
        {matrix?.domains && matrix.domains.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Domains</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {matrix.domains.map((d: string, i: number) => (
                  <Badge key={i} variant="outline">{d}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {matrix?.languages && matrix.languages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Languages className="w-4 h-4" />
                Languages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {matrix.languages.map((l: any, i: number) => (
                  <Badge key={i} variant="outline">
                    {l.language} ({l.proficiency})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Location Preferences */}
      {matrix?.locationSignals && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {matrix.locationSignals.currentCountry && (
              <p>
                <span className="text-muted-foreground">Currently in:</span>{' '}
                <strong>{matrix.locationSignals.currentCountry}</strong>
              </p>
            )}
            {matrix.locationSignals.willingToRelocate != null && (
              <p>
                <span className="text-muted-foreground">Willing to relocate:</span>{' '}
                <strong>{matrix.locationSignals.willingToRelocate ? 'Yes' : 'No'}</strong>
              </p>
            )}
            {matrix.locationSignals.preferredLocations && matrix.locationSignals.preferredLocations.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Preferred:</span>
                <div className="flex flex-wrap gap-1">
                  {matrix.locationSignals.preferredLocations.map((loc: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{loc}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message {candidate.name}</DialogTitle>
            <DialogDescription>Start a conversation with this candidate</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Hi! We reviewed your profile and think you'd be a great fit…"
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => messageMutation.mutate()}
              disabled={messageMutation.isPending || !messageText.trim()}
              className="gap-2"
            >
              {messageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
