import type { Evidence } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface EvidenceListProps {
  evidence: Evidence[];
}

export function EvidenceList({ evidence }: EvidenceListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopy = async (ev: Evidence) => {
    await navigator.clipboard.writeText(ev.text);
    setCopiedId(ev.id);
    toast({
      title: 'Copied to clipboard',
      description: 'The evidence snippet has been copied.',
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (evidence.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-muted-foreground">No evidence snippets available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="evidence-list">
      {evidence.map((ev) => (
        <Card key={ev.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {ev.category}
                </Badge>
                <span className="text-xs text-muted-foreground">{ev.source}</span>
              </div>
              <p className="text-sm leading-relaxed">{ev.text}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(ev)}
              data-testid={`button-copy-evidence-${ev.id}`}
            >
              {copiedId === ev.id ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
