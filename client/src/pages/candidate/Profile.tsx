import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth';
import {
  getCandidateProfile,
  updateCandidateProfile,
  uploadCandidatePhoto,
  rerunMatching,
} from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, RefreshCw, Save, Camera, Link as LinkIcon, Globe, Github } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().optional(),
  headline: z.string().optional(),
  bio: z.string().optional(),
  linkedinUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  githubUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  portfolioUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const countryOptions = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'IN', label: 'India' },
  { value: 'MY', label: 'Malaysia' },
  { value: 'SG', label: 'Singapore' },
  { value: 'AU', label: 'Australia' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'SE', label: 'Sweden' },
  { value: 'CA', label: 'Canada' },
  { value: 'PK', label: 'Pakistan' },
];

export default function CandidateProfile() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const candidateId = user?.candidateId;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['candidate-profile'],
    queryFn: getCandidateProfile,
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      phone: '',
      country: '',
      countryCode: '',
      headline: '',
      bio: '',
      linkedinUrl: '',
      githubUrl: '',
      portfolioUrl: '',
    },
    values: profile
      ? {
          name: profile.name || '',
          phone: profile.phone || '',
          country: profile.country || '',
          countryCode: profile.countryCode || '',
          headline: profile.headline || '',
          bio: profile.bio || '',
          linkedinUrl: profile.linkedinUrl || '',
          githubUrl: profile.githubUrl || '',
          portfolioUrl: profile.portfolioUrl || '',
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormData) => updateCandidateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-profile'] });
      toast({ title: 'Profile updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update profile', description: error.message, variant: 'destructive' });
    },
  });

  const photoMutation = useMutation({
    mutationFn: (file: File) => uploadCandidatePhoto(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-profile'] });
      toast({ title: 'Photo updated successfully' });
      setPhotoPreview(null);
    },
    onError: (error: any) => {
      toast({ title: 'Photo upload failed', description: error.message, variant: 'destructive' });
    },
  });

  const rerunMutation = useMutation({
    mutationFn: () => (candidateId ? rerunMatching(candidateId) : Promise.reject('No candidate ID')),
    onSuccess: () => {
      toast({ title: 'Matching re-run complete', description: 'Your job recommendations have been updated.' });
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Preview
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
      // Upload
      photoMutation.mutate(file);
    }
  };

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const displayPhoto = photoPreview || profile?.photoUrl;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">Manage your personal information</p>
      </div>

      {/* Photo Upload */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="w-20 h-20">
                {displayPhoto && <AvatarImage src={displayPhoto} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <div>
              <h3 className="font-medium">{profile?.name}</h3>
              <p className="text-sm text-muted-foreground">{profile?.headline || 'No headline set'}</p>
              <p className="text-xs text-muted-foreground mt-1">{profile?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your profile details. Changes may affect your job matches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="headline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professional Headline</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Senior Software Engineer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about yourself..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+1 555 123 4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countryOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Social links */}
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Social Links
                </h4>
                <FormField
                  control={form.control}
                  name="linkedinUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn</FormLabel>
                      <FormControl>
                        <Input placeholder="https://linkedin.com/in/yourprofile" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="githubUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Github className="w-3.5 h-3.5" />
                        GitHub
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://github.com/yourusername" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="portfolioUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        Portfolio
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://yourportfolio.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Re-run Matching
          </CardTitle>
          <CardDescription>
            Update your job recommendations based on your current profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            If you've made significant changes to your profile or uploaded a new CV, you can
            re-run the matching algorithm to get updated job recommendations.
          </p>
          <Button
            variant="outline"
            onClick={() => rerunMutation.mutate()}
            disabled={rerunMutation.isPending || !candidateId}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${rerunMutation.isPending ? 'animate-spin' : ''}`} />
            {rerunMutation.isPending ? 'Processing...' : 'Re-run Matching'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
