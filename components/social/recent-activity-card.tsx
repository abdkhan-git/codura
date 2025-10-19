"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import {
  MessageCircle,
  Heart,
  Share2,
  Trophy,
  BookOpen,
  Users,
  Clock,
  Eye,
  Reply,
  Repeat,
  TrendingUp,
  Zap
} from 'lucide-react';
import Link from 'next/link';

interface RecentActivity {
  id: string;
  type: 'post' | 'like' | 'comment' | 'repost' | 'achievement' | 'problem_solved';
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
  user?: {
    user_id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  post?: {
    id: string;
    content: string;
    post_type: string;
    like_count: number;
    comment_count: number;
    repost_count: number;
  };
}

interface RecentActivityCardProps {
  userId: string;
  className?: string;
}

export function RecentActivityCard({ userId, className }: RecentActivityCardProps) {
  const { theme } = useTheme();
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivity();
  }, [userId]);

  const fetchRecentActivity = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}/recent-activity?limit=5`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      } else {
        console.error('Failed to fetch recent activity');
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'post': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'like': return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment': return <Reply className="w-4 h-4 text-green-500" />;
      case 'repost': return <Repeat className="w-4 h-4 text-purple-500" />;
      case 'achievement': return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 'problem_solved': return <TrendingUp className="w-4 h-4 text-orange-500" />;
      default: return <Zap className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'post': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'like': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'comment': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'repost': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
      case 'achievement': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'problem_solved': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getAvatarInitials = (user: { full_name: string | null; username: string | null }) => {
    if (!user.full_name) return user.username?.[0]?.toUpperCase() || 'U';
    return user.full_name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card className={cn(
        "border-2 backdrop-blur-xl",
        theme === 'light' ? "bg-white/80 border-black/5" : "bg-zinc-950/80 border-white/5",
        className
      )}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className={cn(
        "border-2 backdrop-blur-xl",
        theme === 'light' ? "bg-white/80 border-black/5" : "bg-zinc-950/80 border-white/5",
        className
      )}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className={cn(
              "w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center",
              theme === 'light' ? "bg-zinc-100" : "bg-zinc-900"
            )}>
              <Clock className={cn(
                "w-6 h-6",
                theme === 'light' ? "text-zinc-400" : "text-zinc-600"
              )} />
            </div>
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-2 backdrop-blur-xl",
      theme === 'light' ? "bg-white/80 border-black/5" : "bg-zinc-950/80 border-white/5",
      className
    )}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-brand" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                getActivityColor(activity.type)
              )}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">
                    {activity.title}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {activity.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  {activity.description}
                </p>
                {activity.post && (
                  <div className="mt-2 p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-foreground line-clamp-2">
                      {activity.post.content}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {activity.post.like_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Reply className="w-3 h-3" />
                        {activity.post.comment_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Repeat className="w-3 h-3" />
                        {activity.post.repost_count}
                      </span>
                    </div>
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t" style={{
          borderColor: theme === 'light' ? '#e4e4e7' : '#27272a'
        }}>
          <Button variant="ghost" size="sm" className="w-full">
            View All Activity
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
