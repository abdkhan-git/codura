"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageCircle, 
  Heart, 
  Share2, 
  MoreHorizontal,
  Send,
  Image,
  Link,
  Smile,
  Filter,
  Grid3X3,
  List,
  Plus,
  TrendingUp,
  Users,
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
  X
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
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState('text');
  const [newPostMedia, setNewPostMedia] = useState<File[]>([]);
  const [newPostLink, setNewPostLink] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
  const [comments, setComments] = useState<{ [key: string]: any[] }>({});
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [connectionsOnly, setConnectionsOnly] = useState(false);

  const postTypes = [
    { value: 'all', label: 'All Posts', icon: Grid3X3 },
    { value: 'text', label: 'Text', icon: MessageCircle },
    { value: 'image', label: 'Images', icon: Image },
    { value: 'video', label: 'Videos', icon: Video },
    { value: 'link', label: 'Links', icon: Link },
    { value: 'achievement', label: 'Achievements', icon: TrendingUp },
    { value: 'problem_solved', label: 'Problems', icon: Users }
  ];

  const filterOptions = [
    { value: 'all', label: 'All Posts', icon: Grid3X3 },
    { value: 'connections', label: 'Connections Only', icon: Users },
    { value: 'text', label: 'Text', icon: MessageCircle },
    { value: 'image', label: 'Images', icon: Image },
    { value: 'video', label: 'Videos', icon: Video },
    { value: 'link', label: 'Links', icon: Link },
    { value: 'achievement', label: 'Achievements', icon: TrendingUp },
    { value: 'problem_solved', label: 'Problems', icon: Users }
  ];

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
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
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  // Fetch posts
  const fetchPosts = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const currentOffset = reset ? 0 : offset;
      const params = new URLSearchParams({
        limit: '10',
        offset: currentOffset.toString()
      });

      if (activeTab !== 'all' && activeTab !== 'connections') {
        params.set('types', activeTab);
      }

      if (activeTab === 'connections') {
        params.set('connections_only', 'true');
      }

      const response = await fetch(`/api/feed/posts?${params}`);
      if (response.ok) {
        const data = await response.json();

        if (reset) {
          setPosts(data.posts || []);
          setOffset(10);
        } else {
          setPosts(prev => [...prev, ...(data.posts || [])]);
          setOffset(prev => prev + 10);
        }

        setHasMore(data.pagination.hasMore);
      } else {
        toast.error('Failed to load posts');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [offset, activeTab]);

  useEffect(() => {
    fetchPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setNewPostMedia(prev => [...prev, ...files]);
      setNewPostType('image');
    }
  };

  const handleLinkInput = (link: string) => {
    setNewPostLink(link);
    if (link.trim()) {
      setNewPostType('link');
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewPostContent(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && newPostMedia.length === 0 && !newPostLink.trim()) {
      toast.error('Please enter some content or attach media');
      return;
    }

    try {
      setActionLoading('create');
      
      // Handle media uploads first
      let mediaUrls: string[] = [];
      if (newPostMedia.length > 0) {
        // In a real app, you'd upload to a storage service like AWS S3, Cloudinary, etc.
        // For now, we'll simulate with placeholder URLs
        mediaUrls = newPostMedia.map((_, index) => `https://example.com/media/${Date.now()}-${index}.jpg`);
      }

      const response = await fetch('/api/feed/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newPostContent,
          post_type: newPostType,
          media_urls: mediaUrls,
          metadata: {
            link: newPostLink || null,
            uploaded_files: newPostMedia.length
          },
          is_public: true
        })
      });

      if (response.ok) {
        toast.success('Post created successfully!');
        setNewPostContent('');
        setNewPostMedia([]);
        setNewPostLink('');
        setShowCreatePost(false);
        fetchPosts(true);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setActionLoading(null);
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

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
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

        {/* Create Post Section */}
        <Card className={cn(
          "p-6 mb-8 border-2 backdrop-blur-xl transition-all duration-300",
          theme === 'light' 
            ? "bg-white/80 border-black/5 hover:border-blue-500/20 shadow-lg" 
            : "bg-zinc-950/80 border-white/5 hover:border-blue-500/20 shadow-lg"
        )}>
          <div className="flex items-start gap-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-brand to-orange-300 text-white font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <Textarea
                placeholder="What's on your mind?"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="min-h-[100px] resize-none border-2"
                onClick={() => setShowCreatePost(true)}
              />
              
              {/* Link Input */}
              {newPostType === 'link' && (
                <Input
                  placeholder="Paste a link here..."
                  value={newPostLink}
                  onChange={(e) => handleLinkInput(e.target.value)}
                  className="mt-2"
                />
              )}
              
              {/* Media Preview */}
              {newPostMedia.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-muted-foreground">Attached files:</p>
                  <div className="flex flex-wrap gap-2">
                    {newPostMedia.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 bg-muted px-2 py-1 rounded">
                        <span className="text-sm">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setNewPostMedia(prev => prev.filter((_, i) => i !== index))}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="mt-3 p-3 border rounded-lg bg-background">
                  <div className="grid grid-cols-8 gap-2">
                    {['😀', '😂', '😍', '🥳', '👍', '❤️', '🔥', '💯', '🎉', '🚀', '💪', '⭐', '🎯', '💡', '🌟', '🎊'].map((emoji) => (
                      <Button
                        key={emoji}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEmojiSelect(emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {showCreatePost && (
                <div className="space-y-4">
                  {/* Post Type Selection */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Post type:</span>
                    <Button
                      variant={newPostType === 'text' ? 'default' : 'outline'}
                      size="sm"
                      className="gap-2"
                      onClick={() => setNewPostType('text')}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Text
                    </Button>
                    <Button
                      variant={newPostType === 'image' ? 'default' : 'outline'}
                      size="sm"
                      className="gap-2"
                      onClick={() => setNewPostType('image')}
                    >
                      <Image className="w-4 h-4" />
                      Image
                    </Button>
                    <Button
                      variant={newPostType === 'link' ? 'default' : 'outline'}
                      size="sm"
                      className="gap-2"
                      onClick={() => setNewPostType('link')}
                    >
                      <Link className="w-4 h-4" />
                      Link
                    </Button>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id="media-upload"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => document.getElementById('media-upload')?.click()}
                      >
                        <Image className="w-4 h-4" />
                        Upload Media
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        <Smile className="w-4 h-4" />
                        Emoji
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowCreatePost(false);
                          setNewPostContent('');
                          setNewPostMedia([]);
                          setNewPostLink('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreatePost}
                        disabled={(!newPostContent.trim() && newPostMedia.length === 0 && !newPostLink.trim()) || actionLoading === 'create'}
                        className="gap-2 bg-gradient-to-r from-brand to-purple-600 hover:from-brand/90 hover:to-purple-600/90 text-white"
                      >
                        {actionLoading === 'create' ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            Posting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Post
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
            
            {/* Modern Filter Buttons */}
            <div className="flex flex-wrap gap-3">
              {filterOptions.map((type) => {
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
            
            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/20">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <Settings className="w-4 h-4" />
                Filter Settings
              </Button>
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
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onRepost={handleRepost}
                  onComment={handleComment}
                  actionLoading={actionLoading}
                  showComments={showComments}
                  setShowComments={setShowComments}
                  comments={comments}
                  newComment={newComment}
                  setNewComment={setNewComment}
                  formatTimeAgo={formatTimeAgo}
                  theme={theme}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center mt-8">
                <Button
                  onClick={() => fetchPosts(false)}
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
                      <Plus className="w-4 h-4" />
                      Load More
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Post Card Component
function PostCard({ 
  post, 
  onLike, 
  onRepost, 
  onComment, 
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
  onLike: (postId: string) => void;
  onRepost: (postId: string) => void;
  onComment: (postId: string) => void;
  actionLoading: string | null;
  showComments: { [key: string]: boolean };
  setShowComments: (value: { [key: string]: boolean }) => void;
  comments: { [key: string]: any[] };
  newComment: { [key: string]: string };
  setNewComment: (value: { [key: string]: string }) => void;
  formatTimeAgo: (date: string) => string;
  theme: string | undefined;
}) {
  return (
    <Card className={cn(
      "p-6 border-2 backdrop-blur-xl transition-all duration-300 hover:shadow-lg",
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
              <span className="font-semibold text-foreground">{post.user_name}</span>
              <span className="text-muted-foreground">@{post.user_username}</span>
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
          <Button variant="ghost" size="sm" className="p-2">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Post Content */}
        <div className="space-y-3">
          <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
          
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

        {/* Post Stats */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {post.view_count}
          </div>
          <div className="flex items-center gap-1">
            <Reply className="w-4 h-4" />
            {post.comment_count}
          </div>
          <div className="flex items-center gap-1">
            <Repeat className="w-4 h-4" />
            {post.repost_count}
          </div>
        </div>

        {/* Post Actions */}
        <div className="flex items-center justify-between pt-4 border-t" style={{
          borderColor: theme === 'light' ? '#e4e4e7' : '#27272a'
        }}>
          <div className="flex items-center gap-6">
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

            <Button variant="ghost" size="sm" className="gap-2">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-2">
              <Bookmark className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <Flag className="w-4 h-4" />
            </Button>
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
                <AvatarFallback className="bg-gradient-to-br from-brand to-orange-300 text-white text-sm">
                  U
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
