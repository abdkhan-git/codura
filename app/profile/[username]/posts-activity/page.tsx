"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  MessageCircle,
  Heart,
  Repeat,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock
} from "lucide-react";
import { toast } from "sonner";

interface Activity {
  id: string;
  type: 'post' | 'like' | 'comment' | 'repost';
  created_at: string;
  content?: string;
  post_id?: string;
  post_content?: string;
  post_author?: string;
  metadata?: any;
}

interface UserData {
  name: string;
  email: string;
  avatar: string;
  username?: string;
}

export default function PostsActivityPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const username = params.username as string;

  const [user, setUser] = useState<UserData | null>(null);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const activitiesPerPage = 20;

  // Activity type filters - Social Feed only
  const activityFilters = [
    { value: 'all', label: 'All Activity', icon: Calendar },
    { value: 'posts', label: 'Posts', icon: MessageCircle },
    { value: 'likes', label: 'Likes', icon: Heart },
    { value: 'comments', label: 'Comments', icon: MessageCircle },
    { value: 'reposts', label: 'Reposts', icon: Repeat },
  ];

  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          setUser({
            name: data.profile?.full_name || data.user?.email?.split('@')[0] || 'User',
            email: data.user?.email || '',
            avatar: data.profile?.avatar_url || data.profile?.full_name?.charAt(0).toUpperCase() || 'U',
            username: data.profile?.username || '',
          });
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    }
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    async function fetchProfileUser() {
      try {
        const response = await fetch(`/api/users/${username}`);
        if (response.ok) {
          const data = await response.json();
          setProfileUser(data.user);
          setError(null);
        } else {
          const errorData = await response.json();
          console.error('Failed to fetch user:', errorData);
          setError(errorData.error || 'User not found');
          toast.error('User not found');
        }
      } catch (error) {
        console.error('Error fetching profile user:', error);
        setError('Failed to load user profile');
        toast.error('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    }

    if (username) {
      fetchProfileUser();
    }
  }, [username]);

  useEffect(() => {
    async function fetchActivities() {
      if (!profileUser?.user_id) return;

      try {
        setLoading(true);
        const params = new URLSearchParams({
          limit: activitiesPerPage.toString(),
          offset: ((currentPage - 1) * activitiesPerPage).toString(),
        });

        if (activeFilter !== 'all') {
          params.set('type', activeFilter);
        }

        const response = await fetch(`/api/users/${profileUser.user_id}/activity?${params}`);
        if (response.ok) {
          const data = await response.json();
          setActivities(data.activities || []);
          setTotalPages(Math.ceil((data.total || 0) / activitiesPerPage));
        } else {
          toast.error('Failed to load activities');
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
        toast.error('Failed to load activities');
      } finally {
        setLoading(false);
      }
    }

    fetchActivities();
  }, [profileUser?.user_id, activeFilter, sortBy, currentPage]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'post':
        return MessageCircle;
      case 'like':
        return Heart;
      case 'comment':
        return MessageCircle;
      case 'repost':
        return Repeat;
      default:
        return Calendar;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'post':
        return 'from-blue-500 to-cyan-500';
      case 'like':
        return 'from-red-500 to-pink-500';
      case 'comment':
        return 'from-green-500 to-emerald-500';
      case 'repost':
        return 'from-purple-500 to-indigo-500';
      default:
        return 'from-gray-500 to-slate-500';
    }
  };

  const formatActivityText = (activity: Activity) => {
    switch (activity.type) {
      case 'post':
        return 'created a post';
      case 'like':
        return `liked ${activity.post_author}'s post`;
      case 'comment':
        return `commented on ${activity.post_author}'s post`;
      case 'repost':
        return `reposted ${activity.post_author}'s post`;
      default:
        return 'had activity';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-background">
        {/* Background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-background" />
        </div>

        {user && <DashboardNavbar user={user} />}

        <main className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-16">
          <Card className={cn(
            "p-12 text-center border-2 backdrop-blur-xl",
            theme === 'light'
              ? "bg-white/80 border-black/5"
              : "bg-zinc-950/80 border-white/5"
          )}>
            <div className="max-w-md mx-auto">
              <div className={cn(
                "w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center",
                "bg-gradient-to-br from-red-500/10 to-orange-500/10",
                "border-2 border-red-500/20"
              )}>
                <MessageCircle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">User Not Found</h3>
              <p className="text-muted-foreground mb-6">
                {error || "The user you're looking for doesn't exist or their profile is private."}
              </p>
              <Button
                onClick={() => router.push('/network')}
                className="bg-gradient-to-r from-brand to-purple-600 hover:from-brand/90 hover:to-purple-600/90 text-white"
              >
                Go to Network
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Liquid Glass Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-[-10%] right-[20%] w-[600px] h-[600px] bg-brand/5 dark:bg-brand/8 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] left-[15%] w-[500px] h-[500px] bg-purple-500/3 dark:bg-purple-500/6 rounded-full blur-[100px] animate-float-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navbar */}
      <DashboardNavbar user={user} />

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4 gap-2 hover:gap-3 transition-all"
            onClick={() => router.push(`/profile/${username}`)}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </Button>

          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 ring-4 ring-brand/20">
              <AvatarImage src={profileUser.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-brand to-orange-300 text-white text-2xl font-bold">
                {profileUser.full_name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground via-brand to-purple-400 bg-clip-text text-transparent">
                Posts & Activity
              </h1>
              <p className="text-muted-foreground">
                {profileUser.full_name}'s timeline
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className={cn(
          "p-6 mb-6 border-2 backdrop-blur-xl",
          theme === 'light'
            ? "bg-white/80 border-black/5"
            : "bg-zinc-950/80 border-white/5"
        )}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {activityFilters.map((filter) => {
                const Icon = filter.icon;
                return (
                  <Button
                    key={filter.value}
                    variant={activeFilter === filter.value ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "gap-2 transition-all",
                      activeFilter === filter.value &&
                        "bg-gradient-to-r from-brand to-purple-600 text-white"
                    )}
                    onClick={() => {
                      setActiveFilter(filter.value);
                      setCurrentPage(1);
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {filter.label}
                  </Button>
                );
              })}
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="most_engaged">Most Engaged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Activity Timeline */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <Card className={cn(
            "p-12 text-center border-2 backdrop-blur-xl",
            theme === 'light'
              ? "bg-white/80 border-black/5"
              : "bg-zinc-950/80 border-white/5"
          )}>
            <div className="max-w-md mx-auto">
              <div className={cn(
                "w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center",
                "bg-gradient-to-br from-brand/10 to-purple-500/10",
                "border-2 border-brand/20"
              )}>
                <Calendar className="w-10 h-10 text-brand" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Activity Yet</h3>
              <p className="text-muted-foreground">
                {activeFilter === 'all'
                  ? "This user hasn't posted anything yet."
                  : `No ${activeFilter} activity found.`}
              </p>
            </div>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const Icon = getActivityIcon(activity.type);
                const colorGradient = getActivityColor(activity.type);

                return (
                  <Card
                    key={activity.id}
                    className={cn(
                      "p-6 border-2 backdrop-blur-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.01]",
                      theme === 'light'
                        ? "bg-white/80 border-black/5"
                        : "bg-zinc-950/80 border-white/5"
                    )}
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: 'fadeInUp 0.5s ease-out forwards'
                    }}
                  >
                    <div className="flex gap-4">
                      {/* Activity Icon */}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg flex-shrink-0",
                        colorGradient
                      )}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      {/* Activity Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">
                                {profileUser.full_name}
                              </span>{' '}
                              {formatActivityText(activity)}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(activity.created_at)}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {activity.type}
                          </Badge>
                        </div>

                        {/* Activity Content Preview */}
                        {activity.content && (
                          <div className={cn(
                            "mt-3 p-3 rounded-lg border",
                            theme === 'light'
                              ? "bg-gray-50 border-gray-200"
                              : "bg-zinc-900 border-zinc-800"
                          )}>
                            <p className="text-sm line-clamp-3">{activity.content}</p>
                          </div>
                        )}

                        {activity.post_content && activity.type !== 'post' && (
                          <div className={cn(
                            "mt-3 p-3 rounded-lg border",
                            theme === 'light'
                              ? "bg-gray-50 border-gray-200"
                              : "bg-zinc-900 border-zinc-800"
                          )}>
                            <p className="text-xs text-muted-foreground mb-1">
                              Original post by {activity.post_author}
                            </p>
                            <p className="text-sm line-clamp-2">{activity.post_content}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          currentPage === page &&
                            "bg-gradient-to-r from-brand to-purple-600 text-white"
                        )}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
