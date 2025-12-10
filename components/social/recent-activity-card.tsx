"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Heart,
  Clock,
  Reply,
  Repeat,
  Zap,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface RecentActivity {
  id: string;
  type: 'post' | 'like' | 'comment' | 'repost';
  created_at: string;
  content?: string;
  post_id?: string;
  post_content?: string;
  post_author?: string;
  metadata?: any;
}

interface RecentActivityCardProps {
  userId: string;
  username?: string;
  className?: string;
}

export function RecentActivityCard({ userId, username, className }: RecentActivityCardProps) {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchRecentActivity();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchRecentActivity = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await fetch(`/api/users/${userId}/activity?limit=5`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      } else {
        console.error('Failed to fetch recent activity:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'post': return <MessageSquare className="w-4 h-4" />;
      case 'like': return <Heart className="w-4 h-4" />;
      case 'comment': return <Reply className="w-4 h-4" />;
      case 'repost': return <Repeat className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'post': return 'from-blue-500 to-cyan-500';
      case 'like': return 'from-red-500 to-pink-500';
      case 'comment': return 'from-green-500 to-emerald-500';
      case 'repost': return 'from-purple-500 to-indigo-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'post': return 'bg-blue-500/10 dark:bg-blue-500/20';
      case 'like': return 'bg-red-500/10 dark:bg-red-500/20';
      case 'comment': return 'bg-green-500/10 dark:bg-green-500/20';
      case 'repost': return 'bg-purple-500/10 dark:bg-purple-500/20';
      default: return 'bg-gray-500/10 dark:bg-gray-500/20';
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

  const getActivityTitle = (activity: RecentActivity) => {
    switch (activity.type) {
      case 'post': return 'Created a post';
      case 'like': return `Liked ${activity.post_author ? activity.post_author + "'s post" : 'a post'}`;
      case 'comment': return `Commented on ${activity.post_author ? activity.post_author + "'s post" : 'a post'}`;
      case 'repost': return `Reposted ${activity.post_author ? activity.post_author + "'s post" : 'a post'}`;
      default: return 'Activity';
    }
  };

  const getActivityDescription = (activity: RecentActivity) => {
    if (activity.type === 'post' && activity.content) {
      return activity.content;
    }
    if (activity.type === 'comment' && activity.content) {
      return activity.content;
    }
    if (activity.post_content) {
      return activity.post_content;
    }
    return '';
  };

  if (loading) {
    return (
      <Card className={cn(
        "relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl",
        className
      )}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              "bg-gradient-to-br from-brand/20 to-brand/5 backdrop-blur-sm"
            )}>
              <Clock className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Recent Activity</h3>
              <p className="text-xs text-muted-foreground font-normal">Latest updates</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-muted/50" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted/50 rounded w-3/4" />
                  <div className="h-3 bg-muted/50 rounded w-1/2" />
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
        "relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl shine-effect group hover:border-brand/40 transition-all duration-500",
        className
      )}>
        <div className="glow-border-top" />
        <div className="glow-border-right" />
        <div className="glow-border-bottom" />
        <div className="glow-border-left" />

        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              "bg-gradient-to-br from-brand/20 to-brand/5 backdrop-blur-sm"
            )}>
              <Clock className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Recent Activity</h3>
              <p className="text-xs text-muted-foreground font-normal">Latest updates</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className={cn(
              "w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br from-muted/50 to-muted/20 backdrop-blur-sm"
            )}>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Activity will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl shine-effect group hover:border-brand/40 transition-all duration-500",
      className
    )}>
      {/* Animated glow borders */}
      <div className="glow-border-top" />
      <div className="glow-border-right" />
      <div className="glow-border-bottom" />
      <div className="glow-border-left" />

      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              "bg-gradient-to-br from-brand/20 to-brand/5 backdrop-blur-sm",
              "group-hover:scale-110 transition-transform duration-300"
            )}>
              <Clock className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Recent Activity</h3>
              <p className="text-xs text-muted-foreground font-normal">Latest updates</p>
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchRecentActivity(true)}
            disabled={refreshing}
            className={cn(
              "gap-2 h-9 px-3 rounded-lg",
              "hover:bg-brand/10 hover:text-brand transition-all duration-200",
              "border border-transparent hover:border-brand/20"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            <span className="text-xs font-medium">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {activities.map((activity, index) => {
            const activityLink = activity.post_id ? `/network/feed?post=${activity.post_id}` : '#';

            return (
              <Link
                key={activity.id}
                href={activityLink}
                className="block"
              >
                <div
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl",
                    "bg-gradient-to-br from-muted/30 to-muted/10 backdrop-blur-sm",
                    "border border-border/20",
                    "hover:border-brand/30 hover:from-brand/5 hover:to-brand/10",
                    "transition-all duration-300 ease-out",
                    "hover:scale-[1.02] hover:shadow-lg hover:shadow-brand/10",
                    "animate-in fade-in-0 slide-in-from-left-4 duration-300"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    "bg-gradient-to-br shadow-lg relative overflow-hidden",
                    getActivityBgColor(activity.type),
                    "transition-transform duration-300"
                  )}>
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-20",
                      getActivityColor(activity.type)
                    )} />
                    <div className="relative z-10">
                      {getActivityIcon(activity.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {getActivityTitle(activity)}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs px-2 py-0 h-5",
                          "bg-gradient-to-br from-muted/50 to-muted/30",
                          "border border-border/30"
                        )}
                      >
                        {activity.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatTimeAgo(activity.created_at)}
                      </span>
                    </div>
                    {getActivityDescription(activity) && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {getActivityDescription(activity)}
                      </p>
                    )}
                    {activity.metadata && (
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 hover:text-red-500 transition-colors">
                          <Heart className="w-3 h-3" />
                          {activity.metadata.like_count || 0}
                        </span>
                        <span className="flex items-center gap-1 hover:text-green-500 transition-colors">
                          <Reply className="w-3 h-3" />
                          {activity.metadata.comment_count || 0}
                        </span>
                        <span className="flex items-center gap-1 hover:text-purple-500 transition-colors">
                          <Repeat className="w-3 h-3" />
                          {activity.metadata.repost_count || 0}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        {username && (
          <div className="mt-4 pt-4 border-t border-border/20">
            <Link href={`/profile/${username}/posts-activity`}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full rounded-lg",
                  "bg-gradient-to-br from-brand/10 to-brand/5",
                  "hover:from-brand/20 hover:to-brand/10",
                  "border border-brand/20 hover:border-brand/40",
                  "text-brand font-semibold",
                  "transition-all duration-300",
                  "hover:scale-[1.02] hover:shadow-lg hover:shadow-brand/20"
                )}
              >
                View All Activity
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
