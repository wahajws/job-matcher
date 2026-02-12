import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/utils/helpers';
import {
  Bell,
  BriefcaseBusiness,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  Sparkles,
  UserCheck,
  UserX,
  Mail,
  Clock,
} from 'lucide-react';
import type { AppNotification } from '@/types';

const notificationIcons: Record<string, React.ReactNode> = {
  application_received: <BriefcaseBusiness className="w-4 h-4 text-blue-500" />,
  status_changed: <Clock className="w-4 h-4 text-amber-500" />,
  shortlisted: <UserCheck className="w-4 h-4 text-emerald-500" />,
  rejected: <UserX className="w-4 h-4 text-rose-500" />,
  new_match: <Sparkles className="w-4 h-4 text-violet-500" />,
  message_received: <Mail className="w-4 h-4 text-blue-500" />,
  job_expired: <Clock className="w-4 h-4 text-gray-500" />,
};

function getNotificationLink(notification: AppNotification): string | null {
  const data = notification.data;
  if (!data) return null;

  switch (notification.type) {
    case 'application_received':
      if (data.jobId) return `/company/jobs/${data.jobId}/pipeline`;
      break;
    case 'status_changed':
    case 'shortlisted':
    case 'rejected':
      return '/candidate/applications';
    case 'new_match':
      if (data.jobId) return `/candidate/jobs/${data.jobId}`;
      break;
  }
  return null;
}

export default function Notifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', tab, page],
    queryFn: () => getNotifications({
      unreadOnly: tab === 'unread',
      page,
      limit: 20,
    }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: (data) => {
      toast({
        title: 'All Read',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const handleNotificationClick = (notification: AppNotification) => {
    // Mark as read
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }

    // Navigate
    const link = getNotificationLink(notification);
    if (link) {
      setLocation(link);
    }
  };

  const notifications = data?.notifications || [];
  const pagination = data?.pagination;
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay updated on your applications and matches
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending}
        >
          {markAllReadMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <CheckCheck className="w-4 h-4 mr-1" />
          )}
          Mark all read
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as 'all' | 'unread'); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notification.read
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-background'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {notificationIcons[notification.type] || (
                      <Bell className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {notification.body}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
