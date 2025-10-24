"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  MoreHorizontal,
  Send,
  Smile,
  ThumbsUp,
  PartyPopper,
  Zap,
  Users,
  Trophy,
  BookOpen,
  Target,
  Clock,
  ChevronDown,
  Filter,
  Search
} from "lucide-react";
import { toast } from "sonner";

interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  title: string;
  description?: string;
  metadata: any;
  target_user_id?: string;
  target_problem_id?: number;
  is_public: boolean;
  created_at: string;
  user_name: string;
  user_username: string;
  user_avatar_url?: string;
  target_user_name?: string;
  target_user_username?: string;
  target_user_avatar_url?: string;
  reaction_count: number;
  comment_count: number;
  user_reacted: boolean;
}

interface ActivityFeedProps {
  className?: string;
}

export function ActivityFeed({ className }: ActivityFeedProps) {
  const { theme } = useTheme();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
  const [comments, setComments] = useState<{ [key: string]: any[] }>({});

  const activityTypes = [
    { value: 'connection_made', label: 'Connections', icon: Users },
    { value: 'problem_solved', label: 'Problems Solved', icon: Trophy },
    { value: 'achievement_earned', label: 'Achievements', icon: PartyPopper },
    { value: 'study_plan_shared', label: 'Study Plans', icon: BookOpen },
    { value: 'profile_updated', label: 'Profile Updates', icon: Target },
    { value: 'streak_milestone', label: 'Streaks', icon: Zap }
  ];

  const fetchActivities = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({
        limit: '10',
        offset: reset ? '0' : offset.toString()
      });

      if (selectedTypes.length > 0) {
        params.set('types', selectedTypes.join(','));
      }

      const response = await fetch(`/api/activity/feed?${params}`);
      if (response.ok) {
        const data = await response.json();
        
        if (reset) {
          setActivities(data.activities || []);
        } else {
          setActivities(prev => [...prev, ...(data.activities || [])]);
        }
        
        setHasMore(data.pagination.hasMore);
        setOffset(prev => prev + 10);
      } else {
        toast.error('Failed to load activities');
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [offset, selectedTypes]);

  useEffect(() => {
    fetchActivities(true);
  }, [selectedTypes]);

  const handleReaction = async (activityId: string, reactionType: string) => {
    try {
      const response = await fetch('/api/activity/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: activityId,
          reaction_type: reactionType
        })
      });

      if (response.ok) {
        // Update local state
        setActivities(prev => prev.map(activity => 
          activity.id === activityId 
            ? { 
                ...activity, 
                reaction_count: activity.reaction_count + 1,
                user_reacted: true
              }
            : activity
        ));
        toast.success('Reaction added!');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add reaction');
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast.error('Failed to add reaction');
    }
  };

  const handleComment = async (activityId: string) => {
    const content = newComment[activityId];
    if (!content?.trim()) return;

    try {
      const response = await fetch('/api/activity/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: activityId,
          content: content.trim()
        })
      });

      if (response.ok) {
        setNewComment(prev => ({ ...prev, [activityId]: '' }));
        setActivities(prev => prev.map(activity => 
          activity.id === activityId 
            ? { ...activity, comment_count: activity.comment_count + 1 }
            : activity
        ));
        toast.success('Comment added!');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const getActivityIcon = (activityType: string) => {
    const type = activityTypes.find(t => t.value === activityType);
    return type?.icon || Clock;
  };

  const getActivityColor = (activityType: string) => {
    const colors = {
      connection_made: 'text-blue-500',
      problem_solved: 'text-green-500',
      achievement_earned: 'text-yellow-500',
      study_plan_shared: 'text-purple-500',
      profile_updated: 'text-orange-500',
      streak_milestone: 'text-red-500'
    };
    return colors[activityType as keyof typeof colors] || 'text-gray-500';
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

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        {[...Array(5)].map((_, i) => (
          <Card key={i} className={cn(
            "p-6 border-2 backdrop-blur-xl animate-pulse",
            theme === 'light' 
              ? "bg-white/60 border-black/5" 
              : "bg-zinc-950/60 border-white/5"
          )}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
                <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2" />
                <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-400 to-rose-400 bg-clip-text text-transparent">
          Activity Feed
        </h2>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className={cn(
          "p-4 border-2 backdrop-blur-xl",
          theme === 'light' 
            ? "bg-white/80 border-black/5" 
            : "bg-zinc-950/80 border-white/5"
        )}>
          <div className="flex flex-wrap gap-2">
            {activityTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedTypes.includes(type.value);
              return (
                <Button
                  key={type.value}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedTypes(prev => prev.filter(t => t !== type.value));
                    } else {
                      setSelectedTypes(prev => [...prev, type.value]);
                    }
                  }}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {type.label}
                </Button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Activities */}
      {activities.length === 0 ? (
        <Card className={cn(
          "p-12 text-center border-2 backdrop-blur-xl",
          theme === 'light' 
            ? "bg-white/80 border-black/5" 
            : "bg-zinc-950/80 border-white/5"
        )}>
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-cyan-500/10 to-rose-500/10 border-2 border-cyan-500/20">
            <Clock className="w-10 h-10 text-cyan-400" />
          </div>
          <h3 className="text-xl font-semibold mb-3 bg-gradient-to-r from-white via-cyan-400 to-rose-400 bg-clip-text text-transparent">
            No activities yet
          </h3>
          <p className="text-muted-foreground">
            Connect with others to see their activities in your feed
          </p>
        </Card>
      ) : (
        <>
          {activities.map((activity) => {
            const ActivityIcon = getActivityIcon(activity.activity_type);
            const activityColor = getActivityColor(activity.activity_type);
            
            return (
              <Card key={activity.id} className={cn(
                "p-6 border-2 backdrop-blur-xl transition-all duration-300 hover:shadow-lg",
                theme === 'light' 
                  ? "bg-white/80 border-black/5 hover:border-blue-500/20" 
                  : "bg-zinc-950/80 border-white/5 hover:border-blue-500/20"
              )}>
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={activity.user_avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-brand to-orange-300 text-white font-semibold">
                      {activity.user_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-3">
                    {/* Activity Header */}
                    <div className="flex items-center gap-2">
                      <ActivityIcon className={cn("w-5 h-5", activityColor)} />
                      <span className="font-semibold text-foreground">
                        {activity.user_name}
                      </span>
                      <span className="text-muted-foreground">
                        @{activity.user_username}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">
                        {formatTimeAgo(activity.created_at)}
                      </span>
                    </div>

                    {/* Activity Content */}
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {activity.title}
                      </h3>
                      {activity.description && (
                        <p className="text-muted-foreground">
                          {activity.description}
                        </p>
                      )}
                    </div>

                    {/* Activity Actions */}
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={() => handleReaction(activity.id, 'like')}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "gap-2",
                          activity.user_reacted && "text-blue-500"
                        )}
                      >
                        <Heart className={cn(
                          "w-4 h-4",
                          activity.user_reacted && "fill-current"
                        )} />
                        {activity.reaction_count}
                      </Button>

                      <Button
                        onClick={() => setShowComments(prev => ({
                          ...prev,
                          [activity.id]: !prev[activity.id]
                        }))}
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {activity.comment_count}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </Button>
                    </div>

                    {/* Comments Section */}
                    {showComments[activity.id] && (
                      <div className="border-t pt-4 space-y-3">
                        {/* Add Comment */}
                        <div className="flex gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-gradient-to-br from-brand to-orange-300 text-white text-sm">
                              U
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 flex gap-2">
                            <Input
                              placeholder="Write a comment..."
                              value={newComment[activity.id] || ''}
                              onChange={(e) => setNewComment(prev => ({
                                ...prev,
                                [activity.id]: e.target.value
                              }))}
                              className="flex-1"
                            />
                            <Button
                              onClick={() => handleComment(activity.id)}
                              size="sm"
                              disabled={!newComment[activity.id]?.trim()}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Comments List */}
                        <div className="space-y-3">
                          {/* Placeholder for comments - would be fetched from API */}
                          <div className="text-sm text-muted-foreground text-center py-4">
                            Comments will be loaded here
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Load More */}
          {hasMore && (
            <div className="text-center">
              <Button
                onClick={() => fetchActivities(false)}
                disabled={loadingMore}
                variant="outline"
                className="gap-2"
              >
                {loadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Load More
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
