import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { estimateSalary } from '@/api';
import type { SalaryEstimateResult } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  DollarSign,
  Sparkles,
  Loader2,
  TrendingUp,
  Info,
} from 'lucide-react';

interface SalaryEstimatorProps {
  defaultRole?: string;
  defaultCountry?: string;
  defaultSkills?: string[];
  defaultYears?: number;
}

export function SalaryEstimator({
  defaultRole = '',
  defaultCountry = '',
  defaultSkills = [],
  defaultYears = 0,
}: SalaryEstimatorProps) {
  const { toast } = useToast();
  const [role, setRole] = useState(defaultRole);
  const [country, setCountry] = useState(defaultCountry);
  const [city, setCity] = useState('');
  const [years, setYears] = useState(defaultYears);
  const [result, setResult] = useState<SalaryEstimateResult | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      estimateSalary({ role, country, city: city || undefined, skills: defaultSkills, yearsExperience: years }),
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err: any) => {
      toast({ title: 'Estimation Failed', description: err.message, variant: 'destructive' });
    },
  });

  const formatSalary = (n: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Salary Estimator
        </CardTitle>
        <CardDescription>AI-powered salary estimation based on market data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Role (e.g. React Developer)" value={role} onChange={(e) => setRole(e.target.value)} />
          <Input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input
            type="number"
            placeholder="Years of experience"
            value={years || ''}
            onChange={(e) => setYears(parseInt(e.target.value) || 0)}
          />
        </div>
        <Button
          size="sm"
          className="gap-1"
          onClick={() => mutation.mutate()}
          disabled={!role || !country || mutation.isPending}
        >
          {mutation.isPending ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Estimating…</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" />Estimate Salary</>
          )}
        </Button>

        {result && (
          <div className="space-y-3 pt-2">
            {/* Range Bar */}
            <div className="bg-gradient-to-r from-red-100 via-yellow-100 to-green-100 dark:from-red-950/30 dark:via-yellow-950/30 dark:to-green-950/30 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Min</span>
                <span className="font-semibold text-primary">Median</span>
                <span className="text-muted-foreground">Max</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>{formatSalary(result.min, result.currency)}</span>
                <span className="text-primary">{formatSalary(result.median, result.currency)}</span>
                <span>{formatSalary(result.max, result.currency)}</span>
              </div>
            </div>

            {/* Factors */}
            {result.factors.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Key Factors</p>
                <div className="space-y-1">
                  {result.factors.map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs">
                      <TrendingUp className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>{f.factor}:</strong> {f.impact}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {result.marketComparison}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
