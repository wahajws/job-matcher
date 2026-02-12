import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sparkles, ArrowRight, Loader2, Building2, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Register() {
  const [, setLocation] = useLocation();
  const { registerUser, isAuthenticated, user } = useAuthStore();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'candidate' | 'company'>('candidate');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') setLocation('/admin/dashboard');
      else if (user.role === 'company') setLocation('/company/dashboard');
      else setLocation('/candidate/dashboard');
    }
  }, [isAuthenticated, user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords don\'t match',
        description: 'Please make sure both passwords are the same.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await registerUser({ email, password, name, role });
      toast({
        title: 'Account created!',
        description: 'Welcome to CV Matcher.',
      });
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary text-primary-foreground shadow-lg">
              <Sparkles className="w-7 h-7" />
            </div>
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription className="text-sm">
            Join CV Matcher — AI-powered recruitment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role selector */}
            <div className="space-y-3">
              <Label>I am a</Label>
              <RadioGroup
                value={role}
                onValueChange={(v) => setRole(v as 'candidate' | 'company')}
                className="grid grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="role-candidate"
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    role === 'candidate'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="candidate" id="role-candidate" className="sr-only" />
                  <UserCircle className="w-6 h-6 mb-1.5" />
                  <span className="font-medium text-sm">Candidate</span>
                  <span className="text-xs text-muted-foreground">Find matching jobs</span>
                </Label>
                <Label
                  htmlFor="role-company"
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    role === 'company'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="company" id="role-company" className="sr-only" />
                  <Building2 className="w-6 h-6 mb-1.5" />
                  <span className="font-medium text-sm">Company</span>
                  <span className="text-xs text-muted-foreground">Post jobs & recruit</span>
                </Label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                {role === 'company' ? 'Company Name' : 'Full Name'}
              </Label>
              <Input
                id="name"
                placeholder={role === 'company' ? 'Acme Inc.' : 'John Doe'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
                data-testid="input-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                data-testid="input-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                data-testid="input-confirm-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              size="lg"
              disabled={isLoading}
              data-testid="button-register"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
