import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import {
  getConversations,
  getConversationMessages,
  sendMessage,
  createConversation,
  searchUsersForMessaging,
} from '@/api';
import type { MessageableUser } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare,
  Send,
  Search,
  Briefcase,
  ArrowLeft,
  PenSquare,
  User as UserIcon,
  Building2,
  Shield,
  Loader2,
  Check,
  CheckCheck,
} from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import type { ConversationPreview, ChatMessage } from '@/types';

/* ─── helpers ────────────────────────────────────────── */

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const formatMsgTime = (date: Date) => {
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
};

const getRoleIcon = (role: string) => {
  if (role === 'candidate') return <UserIcon className="w-3 h-3" />;
  if (role === 'company') return <Building2 className="w-3 h-3" />;
  return <Shield className="w-3 h-3" />;
};

/* ─── page ───────────────────────────────────────────── */

export default function MessagesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* new‑message dialog */
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgSearch, setDlgSearch] = useState('');
  const [dlgResults, setDlgResults] = useState<MessageableUser[]>([]);
  const [dlgLoading, setDlgLoading] = useState(false);
  const [dlgSelected, setDlgSelected] = useState<MessageableUser | null>(null);
  const [dlgText, setDlgText] = useState('');
  const [dlgSending, setDlgSending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canCompose = user?.role === 'company' || user?.role === 'admin';

  /* reset dialog */
  const resetDlg = () => {
    setDlgSearch('');
    setDlgResults([]);
    setDlgSelected(null);
    setDlgText('');
    setDlgLoading(false);
    setDlgSending(false);
  };

  /* load initial list on open */
  useEffect(() => {
    if (dlgOpen && dlgResults.length === 0 && !dlgSearch && !dlgSelected) {
      (async () => {
        setDlgLoading(true);
        try {
          setDlgResults(await searchUsersForMessaging(''));
        } catch {
          /* noop */
        } finally {
          setDlgLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dlgOpen]);

  /* debounced search */
  const onDlgSearch = useCallback((v: string) => {
    setDlgSearch(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setDlgLoading(true);
      try {
        setDlgResults(await searchUsersForMessaging(v.trim()));
      } catch {
        setDlgResults([]);
      } finally {
        setDlgLoading(false);
      }
    }, 300);
  }, []);

  /* start conversation */
  const onStartConvo = async () => {
    if (!dlgSelected) return;
    setDlgSending(true);
    try {
      const res = await createConversation({
        targetUserId: dlgSelected.id,
        message: dlgText.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedId(res.id);
      setDlgOpen(false);
      resetDlg();
    } catch (e) {
      console.error('Failed to create conversation:', e);
    } finally {
      setDlgSending(false);
    }
  };

  /* ─── data fetching ─────────────────── */
  const { data: raw, isLoading: loadingConvos } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    refetchInterval: 10000,
  });
  const conversations: ConversationPreview[] = Array.isArray(raw) ? raw : [];

  const { data: msgData, isLoading: loadingMsgs } = useQuery({
    queryKey: ['messages', selectedId],
    queryFn: () => getConversationMessages(selectedId!),
    enabled: !!selectedId,
    refetchInterval: 5000,
  });
  const messages = msgData?.messages || [];

  const sendMut = useMutation({
    mutationFn: ({ cid, content }: { cid: string; content: string }) =>
      sendMessage(cid, content),
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
    },
  });

  /* auto‑scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  /* focus input */
  useEffect(() => {
    if (selectedId) setTimeout(() => inputRef.current?.focus(), 100);
  }, [selectedId]);

  /* handlers */
  const handleSend = () => {
    if (!messageInput.trim() || !selectedId) return;
    sendMut.mutate({ cid: selectedId, content: messageInput.trim() });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filtered = conversations.filter((c) =>
    c.otherUser.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const selected = conversations.find((c) => c.id === selectedId);

  /* ─── render ────────────────────────── */
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-3 sm:-m-4 md:-m-6">
      {/* ── New Message Dialog ── */}
      <NewMessageDialog
        open={dlgOpen}
        onOpenChange={(o) => {
          if (!o) resetDlg();
          setDlgOpen(o);
        }}
        search={dlgSearch}
        onSearch={onDlgSearch}
        results={dlgResults}
        loading={dlgLoading}
        selected={dlgSelected}
        onSelect={setDlgSelected}
        text={dlgText}
        onTextChange={setDlgText}
        sending={dlgSending}
        onSend={onStartConvo}
      />

      {/* ── Main Container ── */}
      <div className="flex flex-1 min-h-0 bg-background">
        {/* ── Sidebar ── */}
        <aside
          className={`flex flex-col border-r bg-muted/20 w-full md:w-80 lg:w-[22rem] flex-shrink-0
            ${selectedId ? 'hidden md:flex' : 'flex'}`}
        >
          {/* sidebar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
            <h1 className="text-lg font-semibold">Messages</h1>
            {canCompose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  resetDlg();
                  setDlgOpen(true);
                }}
                title="New message"
              >
                <PenSquare className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* search */}
          <div className="px-3 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1"
              />
            </div>
          </div>

          {/* conversation list */}
          <ScrollArea className="flex-1">
            {loadingConvos ? (
              <div className="p-3 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyConversations
                hasSearch={!!searchTerm}
                canCompose={canCompose}
                onCompose={() => {
                  resetDlg();
                  setDlgOpen(true);
                }}
              />
            ) : (
              <div className="py-1">
                {filtered.map((c) => (
                  <ConversationRow
                    key={c.id}
                    conversation={c}
                    active={c.id === selectedId}
                    myId={user?.id || ''}
                    onClick={() => setSelectedId(c.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* ── Chat Area ── */}
        <section
          className={`flex-1 flex flex-col min-w-0
            ${!selectedId ? 'hidden md:flex' : 'flex'}`}
        >
          {selected ? (
            <>
              {/* chat header */}
              <div className="flex items-center gap-3 px-4 h-14 border-b bg-background flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden -ml-2"
                  onClick={() => setSelectedId(null)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Avatar className="w-8 h-8">
                  {selected.otherUser.photoUrl && (
                    <AvatarImage src={selected.otherUser.photoUrl} />
                  )}
                  <AvatarFallback className="text-[11px] bg-primary text-primary-foreground font-medium">
                    {getInitials(selected.otherUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">
                    {selected.otherUser.name}
                  </p>
                  {selected.otherUser.headline && (
                    <p className="text-xs text-muted-foreground truncate leading-tight">
                      {selected.otherUser.headline}
                    </p>
                  )}
                </div>
                {selected.job && (
                  <Badge variant="secondary" className="gap-1 text-xs font-normal hidden sm:flex">
                    <Briefcase className="w-3 h-3" />
                    {selected.job.title}
                  </Badge>
                )}
              </div>

              {/* messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                {loadingMsgs ? (
                  <div className="space-y-4 py-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}
                      >
                        <Skeleton className="h-10 w-44 rounded-2xl" />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No messages yet — say hello!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {messages.map((msg, idx) => {
                      const isMe = msg.senderId === user?.id;
                      const showDate =
                        idx === 0 ||
                        new Date(messages[idx - 1].createdAt).toDateString() !==
                          new Date(msg.createdAt).toDateString();

                      /* group consecutive messages from same sender */
                      const prevSame =
                        idx > 0 && messages[idx - 1].senderId === msg.senderId;
                      const nextSame =
                        idx < messages.length - 1 &&
                        messages[idx + 1].senderId === msg.senderId;

                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="flex justify-center my-3">
                              <span className="text-[11px] text-muted-foreground bg-muted/70 px-3 py-0.5 rounded-full">
                                {isToday(new Date(msg.createdAt))
                                  ? 'Today'
                                  : isYesterday(new Date(msg.createdAt))
                                    ? 'Yesterday'
                                    : format(
                                        new Date(msg.createdAt),
                                        'EEEE, MMM d, yyyy',
                                      )}
                              </span>
                            </div>
                          )}
                          <div
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${
                              prevSame && !showDate ? 'mt-0.5' : 'mt-3'
                            }`}
                          >
                            <div
                              className={`relative max-w-[70%] px-3.5 py-2 text-sm leading-relaxed
                                ${
                                  isMe
                                    ? `bg-primary text-primary-foreground ${
                                        nextSame
                                          ? 'rounded-2xl rounded-br-lg'
                                          : 'rounded-2xl rounded-br-sm'
                                      }`
                                    : `bg-muted ${
                                        nextSame
                                          ? 'rounded-2xl rounded-bl-lg'
                                          : 'rounded-2xl rounded-bl-sm'
                                      }`
                                }`}
                            >
                              <p className="whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                              <p
                                className={`text-[10px] mt-0.5 flex items-center gap-1 ${
                                  isMe
                                    ? 'text-primary-foreground/60 justify-end'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {format(new Date(msg.createdAt), 'h:mm a')}
                                {isMe &&
                                  (msg.read ? (
                                    <CheckCheck className="w-3 h-3" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  ))}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              {/* input bar */}
              <div className="px-4 py-3 border-t bg-background flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Type a message…"
                    className="flex-1 h-10"
                    disabled={sendMut.isPending}
                  />
                  <Button
                    size="icon"
                    className="h-10 w-10 flex-shrink-0"
                    onClick={handleSend}
                    disabled={!messageInput.trim() || sendMut.isPending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* no conversation selected */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium">
                Select a conversation
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Choose a conversation from the sidebar to start messaging
              </p>
              {canCompose && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-2"
                  onClick={() => {
                    resetDlg();
                    setDlgOpen(true);
                  }}
                >
                  <PenSquare className="w-3.5 h-3.5" />
                  New Message
                </Button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ─── Empty Conversations ────────────────────────────── */

function EmptyConversations({
  hasSearch,
  canCompose,
  onCompose,
}: {
  hasSearch: boolean;
  canCompose: boolean;
  onCompose: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <MessageSquare className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        {hasSearch ? 'No conversations found' : 'No conversations yet'}
      </p>
      {!hasSearch && canCompose ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 gap-2"
          onClick={onCompose}
        >
          <PenSquare className="w-3.5 h-3.5" />
          Start a conversation
        </Button>
      ) : !hasSearch ? (
        <p className="text-xs text-muted-foreground mt-1">
          Companies can reach out to you here
        </p>
      ) : null}
    </div>
  );
}

/* ─── Conversation Row ───────────────────────────────── */

function ConversationRow({
  conversation,
  active,
  myId,
  onClick,
}: {
  conversation: ConversationPreview;
  active: boolean;
  myId: string;
  onClick: () => void;
}) {
  const { otherUser, lastMessage, unreadCount, job } = conversation;
  const mine = lastMessage?.senderId === myId;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
        ${active ? 'bg-primary/5 border-r-2 border-primary' : 'hover:bg-muted/40'}`}
    >
      {/* avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-10 h-10">
          {otherUser.photoUrl && <AvatarImage src={otherUser.photoUrl} />}
          <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
            {getInitials(otherUser.name)}
          </AvatarFallback>
        </Avatar>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-primary rounded-full px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      {/* text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-sm truncate ${
              unreadCount > 0 ? 'font-semibold' : 'font-medium'
            }`}
          >
            {otherUser.name}
          </p>
          {lastMessage && (
            <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
              {formatMsgTime(new Date(lastMessage.createdAt))}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {job && (
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 h-4 flex-shrink-0 border-muted-foreground/30"
            >
              {job.title.length > 14
                ? job.title.substring(0, 14) + '…'
                : job.title}
            </Badge>
          )}
          {lastMessage ? (
            <p
              className={`text-xs truncate leading-snug ${
                unreadCount > 0
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              {mine ? 'You: ' : ''}
              {lastMessage.content}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No messages yet
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── New Message Dialog ─────────────────────────────── */

function NewMessageDialog({
  open,
  onOpenChange,
  search,
  onSearch,
  results,
  loading,
  selected,
  onSelect,
  text,
  onTextChange,
  sending,
  onSend,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  search: string;
  onSearch: (v: string) => void;
  results: MessageableUser[];
  loading: boolean;
  selected: MessageableUser | null;
  onSelect: (u: MessageableUser | null) => void;
  text: string;
  onTextChange: (v: string) => void;
  sending: boolean;
  onSend: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">New Message</DialogTitle>
        </DialogHeader>

        {!selected ? (
          /* step 1: pick recipient */
          <div className="px-5 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
                autoFocus
              />
            </div>
            <div className="mt-2 max-h-64 overflow-y-auto -mx-1">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : results.length > 0 ? (
                results.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => onSelect(u)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      {u.photoUrl && <AvatarImage src={u.photoUrl} />}
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">
                        {u.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate leading-tight">
                        {u.headline || u.email}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="gap-1 text-[10px] capitalize font-normal"
                    >
                      {getRoleIcon(u.role)}
                      {u.role}
                    </Badge>
                  </button>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {search.trim() ? 'No users found' : 'Type to search…'}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* step 2: compose */
          <div className="px-5 space-y-3 pb-2">
            <div className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg">
              <Avatar className="w-8 h-8 flex-shrink-0">
                {selected.photoUrl && (
                  <AvatarImage src={selected.photoUrl} />
                )}
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                  {getInitials(selected.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight">
                  {selected.name}
                </p>
                <p className="text-xs text-muted-foreground truncate leading-tight">
                  {selected.headline || selected.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => onSelect(null)}
              >
                Change
              </Button>
            </div>
            <Textarea
              placeholder="Write your message (optional)…"
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              rows={3}
              className="resize-none text-sm"
              autoFocus
            />
          </div>
        )}

        <DialogFooter className="px-5 py-3 border-t bg-muted/20">
          {selected ? (
            <Button
              onClick={onSend}
              disabled={sending}
              size="sm"
              className="gap-2"
            >
              {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {text.trim() ? 'Send Message' : 'Start Conversation'}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Select a person to message
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
