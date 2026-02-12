import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiChat } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  Minimize2,
} from 'lucide-react';

interface ChatEntry {
  role: 'user' | 'assistant';
  content: string;
}

export function AiChatWidget() {
  const { isAuthenticated, user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: (msg: string) => aiChat(msg, history),
    onSuccess: (data, variables) => {
      setHistory((h) => [
        ...h,
        { role: 'user', content: variables },
        { role: 'assistant', content: data.response },
      ]);
      setSuggestedActions(data.suggestedActions || []);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history]);

  const handleSend = () => {
    if (!input.trim() || mutation.isPending) return;
    const msg = input.trim();
    setInput('');
    mutation.mutate(msg);
  };

  const handleSuggestion = (action: string) => {
    setInput('');
    mutation.mutate(action);
  };

  if (!isAuthenticated) return null;

  // Floating bubble
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        aria-label="Open AI chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] h-[500px] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground rounded-t-xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span className="font-semibold text-sm">AI Assistant</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button onClick={() => { setOpen(false); setHistory([]); }} className="p-1 hover:bg-white/20 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {history.length === 0 && (
          <div className="text-center py-8 space-y-3">
            <Sparkles className="w-8 h-8 text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">
              Hi {user?.name?.split(' ')[0] || 'there'}! How can I help you today?
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {(user?.role === 'candidate'
                ? ['Improve my CV', 'Find matching jobs', 'Interview tips']
                : user?.role === 'company'
                ? ['Write a job description', 'Hiring tips', 'Review my posting']
                : ['Platform overview', 'View stats']
              ).map((q) => (
                <Badge
                  key={q}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => handleSuggestion(q)}
                >
                  {q}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {history.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {mutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-muted px-3 py-2 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}

        {/* Suggested actions after last response */}
        {suggestedActions.length > 0 && !mutation.isPending && history.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {suggestedActions.map((a) => (
              <Badge
                key={a}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 text-xs"
                onClick={() => handleSuggestion(a)}
              >
                {a}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything…"
            className="text-sm"
            autoFocus
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || mutation.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
