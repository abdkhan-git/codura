"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { CreatePostModal } from "@/components/social/create-post-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageCircle,
  Heart,
  Share2,
  MoreHorizontal,
  Send,
  Image,
  Link,
  Smile,
  Grid3X3,
  Plus,
  TrendingUp,
  Users,
  User,
  Clock,
  RefreshCw,
  Settings,
  Eye,
  Reply,
  Repeat,
  Bookmark,
  Flag,
  Edit,
  Trash2,
  Pin,
  Unpin,
  Video,
  X,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Lightbulb,
  Briefcase,
  Target,
  Calendar,
  BookOpen,
  Trophy,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface Post {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  post_type: string;
  metadata: any;
  is_public: boolean;
  is_pinned: boolean;
  parent_post_id?: string;
  original_post_id?: string;
  repost_count: number;
  like_count: number;
  comment_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_username: string;
  user_avatar_url?: string;
  user_liked: boolean;
  user_reposted: boolean;
  user_saved: boolean;
  original_post_content?: string;
  original_post_user_name?: string;
  original_post_user_username?: string;
  parent_post_content?: string;
  parent_post_user_name?: string;
  parent_post_user_username?: string;
}

interface UserData {
  name: string;
  email: string;
  avatar: string;
  username?: string;
}

export default function SocialFeedPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
  const [comments, setComments] = useState<{ [key: string]: any[] }>({});
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  const postsPerPage = 10;

  // Enhanced filter options matching post types
  const filterOptions = [
    // General Filters
    { value: 'all', label: 'All Posts', icon: Grid3X3, category: 'general' },
    { value: 'my_posts', label: 'My Posts', icon: User, category: 'general' },
    { value: 'connections', label: 'Connections', icon: Users, category: 'general' },

    // Content Type Filters (matching Create Post types)
    { value: 'celebrate', label: 'Celebrations', icon: PartyPopper, category: 'content', color: 'from-purple-500 to-pink-500' },
    { value: 'find_expert', label: 'Find Expert', icon: Lightbulb, category: 'content', color: 'from-yellow-500 to-orange-500' },
    { value: 'hiring', label: 'Job Opportunities', icon: Briefcase, category: 'content', color: 'from-blue-500 to-cyan-500' },
    { value: 'study_pod', label: 'Study Pods', icon: Users, category: 'content', color: 'from-green-500 to-emerald-500' },
    { value: 'mock_interview', label: 'Mock Interviews', icon: Target, category: 'content', color: 'from-red-500 to-rose-500' },
    { value: 'event', label: 'Events', icon: Calendar, category: 'content', color: 'from-indigo-500 to-purple-500' },
    { value: 'share_resource', label: 'Resources', icon: BookOpen, category: 'content', color: 'from-teal-500 to-cyan-500' },
    { value: 'problem_solved', label: 'Solutions', icon: Trophy, category: 'content', color: 'from-amber-500 to-yellow-500' },
    { value: 'general', label: 'General', icon: Sparkles, category: 'content', color: 'from-gray-500 to-slate-500' }
  ];

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          const userData = {
            name: data.profile?.full_name || data.user?.email?.split('@')[0] || 'User',
            email: data.user?.email || '',
            avatar: data.profile?.avatar_url || data.profile?.full_name?.charAt(0).toUpperCase() || 'U',
            username: data.profile?.username || '',
          };
          setUser(userData);
          // Set the actual user ID for comparison
          const userId = data.user?.id || data.profile?.user_id || '';
          setCurrentUserId(userId);
          console.log('Current user ID set to:', userId);
          console.log('User data:', data);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  // Fetch posts with pagination
  const fetchPosts = useCallback(async (page: number, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
      }

      const offset = (page - 1) * postsPerPage;
      const params = new URLSearchParams({
        limit: postsPerPage.toString(),
        offset: offset.toString()
      });

      if (activeTab !== 'all' && activeTab !== 'connections' && activeTab !== 'my_posts') {
        params.set('types', activeTab);
      }

      if (activeTab === 'connections') {
        params.set('connections_only', 'true');
      }

      if (activeTab === 'my_posts') {
        params.set('user_id', user?.email || '');
      }

      const response = await fetch(`/api/feed/posts?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
        setTotalPosts(data.pagination?.total || 0);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / postsPerPage));
        setCurrentPage(page);
      } else {
        toast.error('Failed to load posts');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [activeTab, user?.email, postsPerPage]);

  useEffect(() => {
    fetchPosts(1, true);
  }, [activeTab]);


  const handleDeletePost = async (postId: string) => {
    try {
      const response = await fetch(`/api/feed/posts/${postId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Post deleted successfully');
        setPosts(prev => prev.filter(p => p.id !== postId));
        setDeleteDialogOpen(false);
        setPostToDelete(null);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleLike = async (postId: string) => {
    try {
      setActionLoading(postId);
      const response = await fetch('/api/feed/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId })
      });

      if (response.ok) {
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                like_count: post.like_count + 1,
                user_liked: true
              }
            : post
        ));
        toast.success('Post liked!');
      } else {
        const data = await response.json();
        if (data.error.includes('Already liked')) {
          // Unlike the post
          const unlikeResponse = await fetch(`/api/feed/likes?post_id=${postId}`, {
            method: 'DELETE'
          });
          if (unlikeResponse.ok) {
            setPosts(prev => prev.map(post => 
              post.id === postId 
                ? { 
                    ...post, 
                    like_count: Math.max(0, post.like_count - 1),
                    user_liked: false
                  }
                : post
            ));
            toast.success('Post unliked');
          }
        } else {
          toast.error(data.error || 'Failed to like post');
        }
      }
    } catch (error) {
      console.error('Error liking post:', error);
      toast.error('Failed to like post');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRepost = async (postId: string) => {
    try {
      setActionLoading(postId);
      const response = await fetch('/api/feed/reposts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId })
      });

      if (response.ok) {
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                repost_count: post.repost_count + 1,
                user_reposted: true
              }
            : post
        ));
        toast.success('Post reposted!');
      } else {
        const data = await response.json();
        if (data.error.includes('Already reposted')) {
          // Unrepost
          const unrepostResponse = await fetch(`/api/feed/reposts?post_id=${postId}`, {
            method: 'DELETE'
          });
          if (unrepostResponse.ok) {
            setPosts(prev => prev.map(post => 
              post.id === postId 
                ? { 
                    ...post, 
                    repost_count: Math.max(0, post.repost_count - 1),
                    user_reposted: false
                  }
                : post
            ));
            toast.success('Repost removed');
          }
        } else {
          toast.error(data.error || 'Failed to repost');
        }
      }
    } catch (error) {
      console.error('Error reposting:', error);
      toast.error('Failed to repost');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComment = async (postId: string) => {
    const content = newComment[postId];
    if (!content?.trim()) return;

    try {
      setActionLoading(postId);
      const response = await fetch('/api/feed/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          content: content.trim()
        })
      });

      if (response.ok) {
        setNewComment(prev => ({ ...prev, [postId]: '' }));
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, comment_count: post.comment_count + 1 }
            : post
        ));
        toast.success('Comment added!');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setActionLoading(null);
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

  // Handle save/unsave post
  const handleSave = async (postId: string) => {
    try {
      setActionLoading(postId);
      const response = await fetch(`/api/feed/posts/${postId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection: 'general' })
      });

      if (response.ok) {
        const data = await response.json();
        // Update post in state
        setPosts(posts.map(p =>
          p.id === postId
            ? { ...p, user_saved: data.saved }
            : p
        ));
        toast.success(data.saved ? 'Post saved!' : 'Post unsaved');
      } else {
        toast.error('Failed to save post');
      }
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle copy link to post
  const handleCopyLink = async (postId: string) => {
    const postUrl = `${window.location.origin}/network/feed?post=${postId}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      console.error('Error copying link:', error);
      toast.error('Failed to copy link');
    }
  };

  // Handle not interested
  const handleNotInterested = async (postId: string) => {
    try {
      const response = await fetch(`/api/feed/posts/${postId}/preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preference_type: 'not_interested',
          reason: 'User selected not interested'
        })
      });

      if (response.ok) {
        // Remove post from feed
        setPosts(posts.filter(p => p.id !== postId));
        setTotalPosts(totalPosts - 1);
        toast.success('Post hidden. We\'ll show you fewer posts like this.');
      } else {
        toast.error('Failed to hide post');
      }
    } catch (error) {
      console.error('Error setting preference:', error);
      toast.error('An error occurred');
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Liquid Glass Background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-background" />
          <div className="absolute top-[-10%] right-[20%] w-[600px] h-[600px] bg-brand/5 dark:bg-brand/8 rounded-full blur-[120px] animate-pulse-slow" />
          <div className="absolute bottom-[10%] left-[15%] w-[500px] h-[500px] bg-purple-500/3 dark:bg-purple-500/6 rounded-full blur-[100px] animate-float-slow" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[30%] left-[50%] w-[400px] h-[400px] bg-cyan-500/2 dark:bg-cyan-500/4 rounded-full blur-[80px] animate-pulse-slow" style={{ animationDelay: '4s' }} />
        </div>

        {/* Navbar */}
        <DashboardNavbar user={user} />

        {/* Main Content */}
        <main className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-16">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg backdrop-blur-xl",
                theme === 'light' 
                  ? "from-blue-500 to-cyan-500 shadow-blue-500/25 bg-white/20" 
                  : "from-blue-600 to-cyan-600 shadow-blue-500/25 bg-white/5"
              )}>
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-brand to-purple-400 bg-clip-text text-transparent">
                  Social Feed
                </h1>
                <p className="text-muted-foreground">Connect, share, and engage with your network</p>
              </div>
            </div>
          </div>

          {/* Create Post Trigger */}
          <Card
            className={cn(
              "p-6 mb-8 border-2 backdrop-blur-xl transition-all duration-300 cursor-pointer",
              "hover:shadow-xl hover:scale-[1.01]",
              theme === 'light'
                ? "bg-white/80 border-black/5 hover:border-brand/30"
                : "bg-zinc-950/80 border-white/5 hover:border-brand/30"
            )}
            onClick={() => setShowCreatePost(true)}
          >
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12 ring-2 ring-brand/10">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-brand to-orange-300 text-white font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-muted-foreground text-lg">
                  What do you want to talk about?
                </p>
              </div>
              <Button
                className="gap-2 bg-gradient-to-r from-brand to-purple-600 hover:from-brand/90 hover:to-purple-600/90 text-white shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreatePost(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Create Post
              </Button>
            </div>
          </Card>

          {/* Modern Filter Bar */}
          <Card className={cn(
            "p-6 mb-8 border-2 backdrop-blur-xl",
            theme === 'light' 
              ? "bg-white/80 border-black/5" 
              : "bg-zinc-950/80 border-white/5"
          )}>
            <div className="flex flex-col space-y-4">
              {/* Filter Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Filter Posts</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort by:</span>
                  <select className="px-3 py-1 rounded-lg border border-border bg-background text-sm">
                    <option>Latest</option>
                    <option>Most Liked</option>
                    <option>Most Comments</option>
                  </select>
                </div>
              </div>
              
              {/* Enhanced Filter Buttons with Categories */}
              <div className="space-y-4">
                {/* General Filters */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    View
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.filter(f => f.category === 'general').map((type) => {
                      const Icon = type.icon;
                      const isActive = activeTab === type.value;
                      return (
                        <button
                          key={type.value}
                          onClick={() => setActiveTab(type.value)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105",
                            isActive
                              ? "bg-gradient-to-r from-brand to-purple-600 text-white shadow-lg shadow-brand/25"
                              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{type.label}</span>
                          {isActive && (
                            <div className="w-2 h-2 rounded-full bg-white/80" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Content Type Filters */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Filter by Topic
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.filter(f => f.category === 'content').map((type) => {
                      const Icon = type.icon;
                      const isActive = activeTab === type.value;
                      return (
                        <button
                          key={type.value}
                          onClick={() => setActiveTab(type.value)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 relative overflow-hidden group",
                            isActive
                              ? `bg-gradient-to-r ${type.color} text-white shadow-lg`
                              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {isActive && type.color && (
                            <div className={cn(
                              "absolute inset-0 bg-gradient-to-r opacity-20 animate-pulse",
                              type.color
                            )} />
                          )}
                          <Icon className="w-4 h-4 relative z-10" />
                          <span className="relative z-10">{type.label}</span>
                          {isActive && (
                            <div className="w-2 h-2 rounded-full bg-white/90 relative z-10" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/20">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-2 text-muted-foreground hover:text-foreground"
                      onClick={() => fetchPosts(1, true)}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh the feed</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                      <Settings className="w-4 h-4" />
                      Filter Settings
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Advanced filter options</p>
                  </TooltipContent>
                </Tooltip>
                {process.env.NODE_ENV === 'development' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 text-xs"
                    onClick={() => {
                      // Force show pagination for testing
                      setTotalPages(3);
                      setTotalPosts(25);
                    }}
                  >
                    Test Pagination
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Posts Feed */}
          {loading ? (
            <div className="space-y-6">
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
          ) : posts.length === 0 ? (
            <Card className={cn(
              "p-12 text-center border-2 backdrop-blur-xl",
              theme === 'light' 
                ? "bg-white/80 border-black/5" 
                : "bg-zinc-950/80 border-white/5"
            )}>
              {/* Modern Empty State */}
              <div className="max-w-md mx-auto">
                <div className={cn(
                  "w-24 h-24 rounded-2xl mx-auto mb-6 flex items-center justify-center",
                  "bg-gradient-to-br from-brand/10 to-purple-500/10",
                  "border-2 border-brand/20"
                )}>
                  <MessageCircle className={cn(
                    "w-12 h-12",
                    "text-brand"
                  )} />
                </div>
                
                <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-brand bg-clip-text text-transparent">
                  Your Social Feed Awaits
                </h3>
                
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Start connecting with fellow developers, share your coding journey, and discover what your network is working on.
                </p>
                
                <div className="space-y-4">
                  <Button
                    onClick={() => setShowCreatePost(true)}
                    size="lg"
                    className="w-full gap-3 bg-gradient-to-r from-brand to-purple-600 hover:from-brand/90 hover:to-purple-600/90 text-white shadow-lg shadow-brand/25 hover:shadow-xl hover:shadow-brand/30 transition-all duration-300"
                  >
                    <Plus className="w-5 h-5" />
                    Create Your First Post
                  </Button>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>Connect with others</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>Share achievements</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <>
            <div className="space-y-6">
              {posts.map((post, index) => (
                <div
                  key={post.id}
                  className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <PostCard
                    post={post}
                    currentUserId={currentUserId}
                    onLike={handleLike}
                    onRepost={handleRepost}
                    onComment={handleComment}
                    onDelete={(postId) => {
                      setPostToDelete(postId);
                      setDeleteDialogOpen(true);
                    }}
                    onSave={handleSave}
                    onCopyLink={handleCopyLink}
                    onNotInterested={handleNotInterested}
                    actionLoading={actionLoading}
                    showComments={showComments}
                    setShowComments={setShowComments}
                    comments={comments}
                    newComment={newComment}
                    setNewComment={setNewComment}
                    formatTimeAgo={formatTimeAgo}
                    theme={theme}
                  />
                </div>
              ))}
            </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    onClick={() => fetchPosts(currentPage - 1, true)}
                    disabled={currentPage === 1}
                    variant="outline"
                    className="gap-2"
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
                          onClick={() => fetchPosts(page, true)}
                          variant={currentPage === page ? "default" : "ghost"}
                          size="sm"
                          className="w-10"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    onClick={() => fetchPosts(currentPage + 1, true)}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    className="gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Posts Count and Debug Info */}
              <div className="text-center mt-4 text-sm text-muted-foreground">
                Showing {posts.length} of {totalPosts} posts
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-2 text-xs">
                    Page {currentPage} of {totalPages} | Total: {totalPosts}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Post?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your post and all associated comments and reactions.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => postToDelete && handleDeletePost(postToDelete)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Create Post Modal */}
          <CreatePostModal
            open={showCreatePost}
            onOpenChange={setShowCreatePost}
            user={user}
            onPostCreated={() => fetchPosts(currentPage)}
          />
        </main>
      </div>
    </TooltipProvider>
  );
}

// Post Card Component
function PostCard({
  post,
  currentUserId,
  onLike,
  onRepost,
  onComment,
  onDelete,
  onSave,
  onCopyLink,
  onNotInterested,
  actionLoading,
  showComments,
  setShowComments,
  comments,
  newComment,
  setNewComment,
  formatTimeAgo,
  theme
}: {
  post: any;
  currentUserId: string;
  onLike: (postId: string) => void;
  onRepost: (postId: string) => void;
  onComment: (postId: string) => void;
  onDelete: (postId: string) => void;
  onSave: (postId: string) => void;
  onCopyLink: (postId: string) => void;
  onNotInterested: (postId: string) => void;
  actionLoading: string | null;
  showComments: { [key: string]: boolean };
  setShowComments: (value: { [key: string]: boolean }) => void;
  comments: { [key: string]: any[] };
  newComment: { [key: string]: string };
  setNewComment: (value: { [key: string]: string }) => void;
  formatTimeAgo: (date: string) => string;
  theme: string | undefined;
}) {
  const isOwnPost = post.user_id === currentUserId;
  console.log('PostCard - post.user_id:', post.user_id, 'currentUserId:', currentUserId, 'isOwnPost:', isOwnPost);

  return (
    <Card className={cn(
      "p-6 border-2 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:scale-[1.01]",
      theme === 'light' 
        ? "bg-white/80 border-black/5 hover:border-blue-500/20" 
        : "bg-zinc-950/80 border-white/5 hover:border-blue-500/20"
    )}>
      <div className="space-y-4">
        {/* Post Header */}
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={post.user_avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-brand to-orange-300 text-white font-semibold">
              {post.user_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-base text-foreground">{post.user_name}</span>
              <span className="text-sm text-muted-foreground">@{post.user_username}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">
                {formatTimeAgo(post.created_at)}
              </span>
              {post.is_pinned && (
                <Badge variant="secondary" className="text-xs">
                  <Pin className="w-3 h-3 mr-1" />
                  Pinned
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {post.post_type === 'repost' && post.original_post_user_name && (
                <span>Reposted from {post.original_post_user_name}</span>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Universal Actions (for all posts) */}
              <DropdownMenuItem onClick={() => onSave(post.id)}>
                <Bookmark className={cn(
                  "w-4 h-4 mr-2",
                  post.user_saved && "fill-current text-brand"
                )} />
                {post.user_saved ? 'Unsave Post' : 'Save Post'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopyLink(post.id)}>
                <Link className="w-4 h-4 mr-2" />
                Copy Link to Post
              </DropdownMenuItem>

              {/* Own Post Actions */}
              {isOwnPost && (
                <>
                  <div className="my-1 h-px bg-border" />
                  <DropdownMenuItem onClick={() => {}}>
                    <Pin className="w-4 h-4 mr-2" />
                    {post.is_pinned ? 'Unpin' : 'Pin'} Post
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Post
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(post.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Post
                  </DropdownMenuItem>
                </>
              )}

              {/* Other User's Post Actions */}
              {!isOwnPost && (
                <>
                  <div className="my-1 h-px bg-border" />
                  <DropdownMenuItem onClick={() => onNotInterested(post.id)}>
                    <X className="w-4 h-4 mr-2" />
                    Not Interested
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}}>
                    <Eye className="w-4 h-4 mr-2" />
                    Hide This Post
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}}>
                    <User className="w-4 h-4 mr-2" />
                    Hide Posts from @{post.user_username}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                    <Flag className="w-4 h-4 mr-2" />
                    Report Post
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Post Content */}
        <div className="space-y-3">
          <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">{post.content}</p>
          
          {/* Original Post Content (for reposts) */}
          {post.original_post_content && (
            <Card className={cn(
              "p-4 border-2 backdrop-blur-xl",
              theme === 'light' 
                ? "bg-zinc-50/80 border-black/5" 
                : "bg-zinc-900/80 border-white/5"
            )}>
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-gradient-to-br from-brand to-orange-300 text-white text-sm">
                    {post.original_post_user_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{post.original_post_user_name}</span>
                    <span className="text-xs text-muted-foreground">@{post.original_post_user_username}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{post.original_post_content}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Media */}
          {post.media_urls && post.media_urls.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {post.media_urls.slice(0, 4).map((url: string, index: number) => (
                <div key={index} className="aspect-square rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <img 
                    src={url} 
                    alt={`Media ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Engagement Preview */}
        {(post.like_count > 0 || post.comment_count > 0 || post.repost_count > 0) && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground pb-3 border-b" style={{
            borderColor: theme === 'light' ? '#e4e4e7' : '#27272a'
          }}>
            {post.like_count > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                {post.like_count} {post.like_count === 1 ? 'like' : 'likes'}
              </span>
            )}
            {post.comment_count > 0 && (
              <span>{post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}</span>
            )}
            {post.repost_count > 0 && (
              <span>{post.repost_count} {post.repost_count === 1 ? 'repost' : 'reposts'}</span>
            )}
          </div>
        )}

        {/* Post Actions */}
        <div className="flex items-center justify-between pt-4 border-t" style={{
          borderColor: theme === 'light' ? '#e4e4e7' : '#27272a'
        }}>
          <div className="flex items-center gap-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => onLike(post.id)}
                  disabled={actionLoading === post.id}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-2",
                    post.user_liked && "text-red-500"
                  )}
                >
                  <Heart className={cn(
                    "w-4 h-4",
                    post.user_liked && "fill-current"
                  )} />
                  {post.like_count}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{post.user_liked ? 'Unlike' : 'Like'} this post</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setShowComments(prev => ({
                    ...prev,
                    [post.id]: !prev[post.id]
                  }))}
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  {post.comment_count}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Comment on this post</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => onRepost(post.id)}
                  disabled={actionLoading === post.id}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-2",
                    post.user_reposted && "text-green-500"
                  )}
                >
                  <Repeat className={cn(
                    "w-4 h-4",
                    post.user_reposted && "fill-current"
                  )} />
                  {post.repost_count}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{post.user_reposted ? 'Remove repost' : 'Repost'} this post</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Share2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Share this post</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Bookmark className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save this post</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Flag className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Report this post</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Comments Section */}
        {showComments[post.id] && (
          <div className="border-t pt-4 space-y-4" style={{
            borderColor: theme === 'light' ? '#e4e4e7' : '#27272a'
          }}>
            {/* Add Comment */}
            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={post.user_avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-brand to-orange-300 text-white text-sm">
                  {post.user_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Write a comment..."
                  value={newComment[post.id] || ''}
                  onChange={(e) => setNewComment(prev => ({
                    ...prev,
                    [post.id]: e.target.value
                  }))}
                  className="flex-1"
                />
                <Button
                  onClick={() => onComment(post.id)}
                  disabled={!newComment[post.id]?.trim() || actionLoading === post.id}
                  size="sm"
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
    </Card>
  );
}