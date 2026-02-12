import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeamMembers, inviteTeamMember, updateMemberRole, removeTeamMember } from '@/api';
import type { TeamMember, MemberRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  Eye,
  Briefcase,
  Crown,
  Mail,
  Clock,
} from 'lucide-react';

const roleIcons: Record<MemberRole, any> = {
  owner: Crown,
  admin: Shield,
  recruiter: Briefcase,
  viewer: Eye,
};

const roleColors: Record<MemberRole, string> = {
  owner: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  recruiter: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  deactivated: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function CompanySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('recruiter');
  const [confirmDelete, setConfirmDelete] = useState<TeamMember | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: getTeamMembers,
  });

  const memberList: TeamMember[] = Array.isArray(members) ? members : [];

  const inviteMutation = useMutation({
    mutationFn: () => inviteTeamMember(inviteEmail, inviteRole),
    onSuccess: () => {
      toast({ title: 'Invitation sent', description: `Invited ${inviteEmail} as ${inviteRole}` });
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to invite', description: err.message, variant: 'destructive' });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: MemberRole }) => updateMemberRole(id, role),
    onSuccess: () => {
      toast({ title: 'Role updated' });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to update role', description: err.message, variant: 'destructive' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeTeamMember(id),
    onSuccess: () => {
      toast({ title: 'Member removed' });
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to remove', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your team and company settings</p>
      </div>

      {/* Invite Member */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Team Member
          </CardTitle>
          <CardDescription>
            Add team members to help manage job postings and applications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
            <Input
              placeholder="Email address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Select
              value={inviteRole}
              onValueChange={(v) => setInviteRole(v as MemberRole)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="recruiter">Recruiter</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={!inviteEmail || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? 'Inviting...' : 'Send Invite'}
            </Button>
          </div>
          <div className="mt-3 text-xs text-muted-foreground space-y-1">
            <p><strong>Admin</strong> — Full access to jobs, applications, and team management</p>
            <p><strong>Recruiter</strong> — Can manage jobs and applications</p>
            <p><strong>Viewer</strong> — Read-only access to jobs and applications</p>
          </div>
        </CardContent>
      </Card>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Members ({memberList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
              ))}
            </div>
          ) : memberList.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No team members yet. Invite someone to get started!
            </p>
          ) : (
            <div className="space-y-3">
              {memberList.map((member) => {
                const RoleIcon = roleIcons[member.role] || Eye;
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                      <RoleIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {member.userName || member.email}
                        </p>
                        <Badge variant="outline" className={`text-xs ${roleColors[member.role]}`}>
                          {member.role}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${statusColors[member.status]}`}>
                          {member.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {member.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Invited {new Date(member.invitedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {member.role !== 'owner' && (
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          onValueChange={(role) =>
                            updateRoleMutation.mutate({ id: member.id, role: role as MemberRole })
                          }
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="recruiter">Recruiter</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setConfirmDelete(member)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{confirmDelete?.userName || confirmDelete?.email}</strong> from your team?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && removeMutation.mutate(confirmDelete.id)}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
