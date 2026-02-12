import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import {
  getConversations,
  getConversationMessages,
  sendMessage,
} from '@/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare,
  Send,
  Search,
  Briefcase,
  ArrowLeft,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import type { ConversationPreview, ChatMessage } from '@/types';

export default function MessagesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch conversations
  const { data: rawConversations, isLoading: loadingConvos } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    refetchInterval: 10000,
  });
  const conversations: ConversationPreview[] = Array.isArray(rawConversations) ? rawConversations : [];

  // Fetch messages for selected conversation
  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: () => getConversationMessages(selectedConversationId!),
    enabled: !!selectedConversationId,
    refetchInterval: 5000,
  });

  const messages = messagesData?.messages || [];

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      sendMessage(conversationId, content),
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Focus input when conversation is selected
  useEffect(() => {
    if (selectedConversationId) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedConversationId]);

  const handleSend = () => {
    if (!messageInput.trim() || !selectedConversationId) return;
    sendMutation.mutate({
      conversationId: selectedConversationId,
      content: messageInput.trim(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.otherUser.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>

      <Card className="flex-1 flex overflow-hidden">
        {/* Conversation List */}
        <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loadingConvos ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'No conversations found' : 'No conversations yet'}
                </p>
                {!searchTerm && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {user?.role === 'company'
                      ? 'Start a conversation from a candidate\'s application'
                      : 'Companies can reach out to you here'}
                  </p>
                )}
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={conv.id === selectedConversationId}
                  currentUserId={user?.id || ''}
                  onClick={() => setSelectedConversationId(conv.id)}
                />
              ))
            )}
          </ScrollArea>
        </div>

        {/* Message Thread */}
        <div className={`flex-1 flex flex-col ${!selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
          {selectedConversation ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedConversationId(null)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Avatar className="w-9 h-9">
                  {selectedConversation.otherUser.photoUrl && (
                    <AvatarImage src={selectedConversation.otherUser.photoUrl} />
                  )}
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {getInitials(selectedConversation.otherUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {selectedConversation.otherUser.name}
                  </p>
                  {selectedConversation.otherUser.headline && (
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedConversation.otherUser.headline}
                    </p>
                  )}
                </div>
                {selectedConversation.job && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Briefcase className="w-3 h-3" />
                    {selectedConversation.job.title}
                  </Badge>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
                        <Skeleton className="h-12 w-48 rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground">Send a message to start the conversation</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg, idx) => {
                      const isMe = msg.senderId === user?.id;
                      const showDate = idx === 0 || (
                        new Date(messages[idx - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString()
                      );
                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="flex justify-center my-4">
                              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                {format(new Date(msg.createdAt), 'MMM d, yyyy')}
                              </span>
                            </div>
                          )}
                          <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                isMe
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : 'bg-muted rounded-bl-md'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                              <p className={`text-[10px] mt-1 ${
                                isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                {format(new Date(msg.createdAt), 'h:mm a')}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t bg-background">
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={sendMutation.isPending}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!messageInput.trim() || sendMutation.isPending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Select a conversation</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Conversation list item component
function ConversationItem({
  conversation,
  isSelected,
  currentUserId,
  onClick,
}: {
  conversation: ConversationPreview;
  isSelected: boolean;
  currentUserId: string;
  onClick: () => void;
}) {
  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const lastMsg = conversation.lastMessage;
  const isLastMsgMine = lastMsg?.senderId === currentUserId;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 ${
        isSelected ? 'bg-muted' : ''
      }`}
    >
      <div className="relative">
        <Avatar className="w-10 h-10">
          {conversation.otherUser.photoUrl && (
            <AvatarImage src={conversation.otherUser.photoUrl} />
          )}
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(conversation.otherUser.name)}
          </AvatarFallback>
        </Avatar>
        {conversation.unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white bg-red-500 rounded-full">
            {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`text-sm truncate ${conversation.unreadCount > 0 ? 'font-semibold' : 'font-medium'}`}>
            {conversation.otherUser.name}
          </p>
          {lastMsg && (
            <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
              {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {conversation.job && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 flex-shrink-0">
              {conversation.job.title.length > 12
                ? conversation.job.title.substring(0, 12) + '…'
                : conversation.job.title}
            </Badge>
          )}
          {lastMsg ? (
            <p className={`text-xs truncate ${
              conversation.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
            }`}>
              {isLastMsgMine ? 'You: ' : ''}{lastMsg.content}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">No messages yet</p>
          )}
        </div>
      </div>
    </button>
  );
}
