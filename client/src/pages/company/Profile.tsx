import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  getCompanyProfile,
  updateCompanyProfile,
  uploadCompanyLogo,
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
import { Building2, Save, Camera, Globe } from 'lucide-react';

const profileSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  description: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const companySizeOptions = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
];

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

const industryOptions = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Consulting',
  'Media & Entertainment',
  'Real Estate',
  'Transportation',
  'Energy',
  'Non-profit',
  'Government',
  'Other',
];

export default function CompanyProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['company-profile'],
    queryFn: getCompanyProfile,
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      companyName: '',
      industry: '',
      companySize: '',
      website: '',
      description: '',
      country: '',
      city: '',
    },
    values: profile
      ? {
          companyName: profile.companyName || '',
          industry: profile.industry || '',
          companySize: profile.companySize || '',
          website: profile.website || '',
          description: profile.description || '',
          country: profile.country || '',
          city: profile.city || '',
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormData) => updateCompanyProfile(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
      toast({ title: 'Company profile updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update profile', description: error.message, variant: 'destructive' });
    },
  });

  const logoMutation = useMutation({
    mutationFn: (file: File) => uploadCompanyLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
      toast({ title: 'Logo updated successfully' });
      setLogoPreview(null);
    },
    onError: (error: any) => {
      toast({ title: 'Logo upload failed', description: error.message, variant: 'destructive' });
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
      logoMutation.mutate(file);
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

  const displayLogo = logoPreview || profile?.logoUrl;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Company Profile</h1>
        <p className="text-muted-foreground">Manage your company information</p>
      </div>

      {/* Logo Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="w-20 h-20 rounded-lg">
                {displayLogo && <AvatarImage src={displayLogo} className="rounded-lg" />}
                <AvatarFallback className="bg-primary text-primary-foreground text-xl rounded-lg">
                  {profile?.companyName?.substring(0, 2).toUpperCase() || 'CO'}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
            <div>
              <h3 className="font-medium">{profile?.companyName || 'Your Company'}</h3>
              <p className="text-sm text-muted-foreground">{profile?.industry || 'Set your industry'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click the logo to upload a new one
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            This information is shown on your job postings to attract candidates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industryOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companySize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Size</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companySizeOptions.map((opt) => (
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

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      Website
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://yourcompany.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell candidates about your company, culture, and values..."
                        className="min-h-[120px]"
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

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="San Francisco" {...field} />
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
    </div>
  );
}
