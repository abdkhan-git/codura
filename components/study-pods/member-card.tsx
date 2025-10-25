"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DefaultAvatar } from "@/components/ui/default-avatar";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Star, MoreVertical, TrendingUp, TrendingDown, UserX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Member {
  id: string;
  user_id: string;
  role: 'owner' | 'moderator' | 'member';
  users: {
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  user_stats?: {
    total_solved: number;
  } | null;
}

interface MemberCardProps {
  member: Member;
  podId: string;
  currentUserRole: 'owner' | 'moderator' | 'member' | null;
  onMemberUpdate?: () => void;
}

export function MemberCard({ member, podId, currentUserRole, onMemberUpdate }: MemberCardProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const canManage = currentUserRole === 'owner' ||
    (currentUserRole === 'moderator' && member.role === 'member');

  const getRoleIcon = (role: string) => {
    if (role === 'owner' || role === 'moderator') {
      return <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />;
    }
    return null;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'moderator':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-muted/30 text-muted-foreground';
    }
  };

  const handlePromote = async () => {
    if (member.role === 'moderator') return;

    setLoading(true);
    try {
      const response = await fetch(`/api/study-pods/${podId}/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'moderator' }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to promote member');
        return;
      }

      toast.success('Member promoted to moderator');
      onMemberUpdate?.();
    } catch (error) {
      console.error('Error promoting member:', error);
      toast.error('Failed to promote member');
    } finally {
      setLoading(false);
    }
  };

  const handleDemote = async () => {
    if (member.role !== 'moderator') return;

    setLoading(true);
    try {
      const response = await fetch(`/api/study-pods/${podId}/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'member' }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to demote moderator');
        return;
      }

      toast.success('Moderator demoted to member');
      onMemberUpdate?.();
    } catch (error) {
      console.error('Error demoting moderator:', error);
      toast.error('Failed to demote moderator');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(`Are you sure you want to remove ${member.users.full_name} from the pod?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/study-pods/${podId}/members/${member.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to remove member');
        return;
      }

      toast.success('Member removed from pod');
      onMemberUpdate?.();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={cn(
      "p-4 border-2 backdrop-blur-xl hover:border-emerald-500/20 transition-all duration-300",
      theme === 'light'
        ? "bg-white border-gray-200 hover:border-emerald-500/30"
        : "border-white/5 bg-zinc-950/80"
    )}>
      <div className="flex items-center gap-4">
        <DefaultAvatar
          src={member.users.avatar_url}
          name={member.users.full_name}
          username={member.users.username}
          size="lg"
          className="w-12 h-12"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "font-semibold truncate",
              theme === 'light' ? "text-gray-900" : "text-white"
            )}>
              {member.users.full_name}
            </h4>
            {getRoleIcon(member.role)}
          </div>
          <p className={cn(
            "text-sm truncate",
            theme === 'light' ? "text-gray-600" : "text-muted-foreground"
          )}>
            @{member.users.username}
          </p>
          {member.user_stats && (
            <p className="text-xs text-emerald-400">
              {member.user_stats.total_solved} problems solved
            </p>
          )}
          <Badge className={`mt-1 text-xs ${getRoleBadgeColor(member.role)}`}>
            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/profile/${member.users.username}`}>
            <Button variant="ghost" size="sm">
              View
            </Button>
          </Link>

          {canManage && member.role !== 'owner' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MoreVertical className="w-4 h-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={cn(
                theme === 'light'
                  ? "bg-white border-gray-200"
                  : "bg-zinc-900 border-white/10"
              )}>
                {currentUserRole === 'owner' && (
                  <>
                    {member.role === 'member' && (
                      <DropdownMenuItem onClick={handlePromote} className="cursor-pointer">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Promote to Moderator
                      </DropdownMenuItem>
                    )}
                    {member.role === 'moderator' && (
                      <DropdownMenuItem onClick={handleDemote} className="cursor-pointer">
                        <TrendingDown className="w-4 h-4 mr-2" />
                        Demote to Member
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className={theme === 'light' ? "bg-gray-200" : "bg-white/10"} />
                  </>
                )}
                <DropdownMenuItem
                  onClick={handleRemove}
                  className="cursor-pointer text-red-400 focus:text-red-400"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Remove from Pod
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </Card>
  );
}
