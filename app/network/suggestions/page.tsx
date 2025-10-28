"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserCard } from "@/components/social/user-card";
import { 
  Users, 
  UserPlus, 
  Sparkles,
  ArrowRight,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  XCircle,
  Filter,
  SortAsc
} from "lucide-react";
import { toast } from "sonner";
import type { UserSearchResult } from "@/types/database";

interface UserData {
  name: string;
  email: string;
  avatar: string;
  username?: string;
}

export default function SuggestionsPage() {
  const { theme } = useTheme();
  const router = useRouter();
  
  // State
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'recent' | 'mutual'>('score');
  const [filterBy, setFilterBy] = useState<'all' | 'university' | 'skills' | 'mutual'>('all');

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

  // Fetch suggestions
  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      
      const params = new URLSearchParams();
      params.append('limit', '12');
      if (refresh) params.append('refresh', 'true');
      
      const response = await fetch(`/api/users/suggestions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } else {
        console.error('Failed to fetch suggestions');
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      if (refresh) setRefreshing(false);
    }
  };

  const handleRefreshSuggestions = async () => {
    await fetchSuggestions(true);
    toast.success('Suggestions refreshed!');
  };

  const handleFeedback = async (userId: string, feedback: 'positive' | 'negative') => {
    try {
      setFeedbackLoading(userId);
      
      const response = await fetch('/api/suggestions/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          suggested_user_id: userId, 
          feedback_type: feedback 
        }),
      });

      if (response.ok) {
        toast.success(feedback === 'positive' ? 'Thanks for the feedback!' : 'We\'ll improve our suggestions');
        // Remove the suggestion from the list
        setSuggestions(prev => prev.filter(s => s.user_id !== userId));
      } else {
        toast.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setFeedbackLoading(null);
    }
  };

  const handleBulkConnect = async (userIds: string[]) => {
    try {
      setActionLoading('bulk');
      
      const promises = userIds.map(userId => 
        fetch('/api/connections/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to_user_id: userId }),
        })
      );
      
      await Promise.all(promises);
      toast.success(`Connection requests sent to ${userIds.length} users!`);
      
      // Update UI
      setSuggestions(prev => prev.map(s => 
        userIds.includes(s.user_id) 
          ? { ...s, connection_status: 'pending_sent' as const }
          : s
      ));
    } catch (error) {
      console.error('Error sending bulk connections:', error);
      toast.error('Failed to send some connection requests');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnect = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await fetch('/api/connections/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_user_id: userId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Connection request sent!');
        // Update user's connection status in UI
        setSuggestions(prev => prev.map(u =>
          u.user_id === userId ? { ...u, connection_status: 'pending_sent' } : u
        ));
      } else {
        toast.error(data.error || 'Failed to send connection request');
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast.error('Failed to send connection request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await fetch(`/api/connections/cancel?to_user_id=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Connection request canceled');
        setSuggestions(prev => prev.map(u =>
          u.user_id === userId ? { ...u, connection_status: 'none' } : u
        ));
      } else {
        toast.error(data.error || 'Failed to cancel connection request');
      }
    } catch (error) {
      console.error('Error canceling connection request:', error);
      toast.error('Failed to cancel connection request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await fetch('/api/connections/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_user_id: userId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Connection request accepted!');
        setSuggestions(prev => prev.map(u =>
          u.user_id === userId ? { ...u, connection_status: 'connected' } : u
        ));
      } else {
        toast.error(data.error || 'Failed to accept connection request');
      }
    } catch (error) {
      console.error('Error accepting connection:', error);
      toast.error('Failed to accept connection request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await fetch('/api/connections/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_user_id: userId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Connection request declined');
        setSuggestions(prev => prev.map(u =>
          u.user_id === userId ? { ...u, connection_status: 'none' } : u
        ));
      } else {
        toast.error(data.error || 'Failed to decline connection request');
      }
    } catch (error) {
      console.error('Error declining connection:', error);
      toast.error('Failed to decline connection request');
    } finally {
      setActionLoading(null);
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
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg backdrop-blur-xl",
              theme === 'light' 
                ? "from-purple-500 to-pink-500 shadow-purple-500/25 bg-white/20" 
                : "from-purple-600 to-pink-600 shadow-purple-500/25 bg-white/5"
            )}>
              <Sparkles className={cn(
                "w-6 h-6",
                theme === 'light' ? "text-purple-600" : "text-white"
              )} />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-brand to-purple-400 bg-clip-text text-transparent">
                Connection Suggestions
              </h1>
              <p className="text-muted-foreground">Discover people you might want to connect with</p>
            </div>
          </div>
        </div>

        {/* Enhanced Controls */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefreshSuggestions}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            
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

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {suggestions.length} suggestions
            </span>
            {suggestions.length > 0 && (
              <Button
                onClick={() => {
                  const connectableUsers = suggestions
                    .filter(s => s.connection_status === 'none')
                    .map(s => s.user_id);
                  if (connectableUsers.length > 0) {
                    handleBulkConnect(connectableUsers.slice(0, 5)); // Limit to 5 for safety
                  }
                }}
                disabled={actionLoading === 'bulk'}
                size="sm"
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Connect All
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className={cn(
            "mb-6 p-4 border-2 backdrop-blur-xl",
            theme === 'light' 
              ? "bg-white/80 border-black/5" 
              : "bg-zinc-950/80 border-white/5"
          )}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={cn(
                    "w-full p-2 rounded-lg border-2 text-sm",
                    theme === 'light' 
                      ? "bg-white border-zinc-200" 
                      : "bg-zinc-900 border-zinc-800"
                  )}
                >
                  <option value="score">Relevance Score</option>
                  <option value="recent">Recently Joined</option>
                  <option value="mutual">Most Mutual Connections</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Filter by</label>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as any)}
                  className={cn(
                    "w-full p-2 rounded-lg border-2 text-sm",
                    theme === 'light' 
                      ? "bg-white border-zinc-200" 
                      : "bg-zinc-900 border-zinc-800"
                  )}
                >
                  <option value="all">All Suggestions</option>
                  <option value="university">Same University</option>
                  <option value="skills">Similar Skills</option>
                  <option value="mutual">Mutual Connections</option>
                </select>
              </div>
            </div>
          </Card>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.user_id}
                className="animate-in fade-in-0 slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <UserCard
                  user={suggestion}
                  onConnect={handleConnect}
                  onCancel={handleCancel}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  onFeedback={handleFeedback}
                  showSuggestionReasons={true}
                  isLoading={actionLoading === suggestion.user_id || feedbackLoading === suggestion.user_id}
                />
              </div>
            ))}
          </div>
        ) : (
          <Card className={cn(
            "p-12 text-center border-2 backdrop-blur-xl",
            theme === 'light' 
              ? "bg-white/80 border-black/5" 
              : "bg-zinc-950/80 border-white/5"
          )}>
            <div className={cn(
              "w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center",
              theme === 'light' ? "bg-zinc-100" : "bg-zinc-900"
            )}>
              <Sparkles className={cn(
                "w-10 h-10",
                theme === 'light' ? "text-zinc-400" : "text-zinc-600"
              )} />
            </div>
            <h3 className={cn(
              "text-xl font-semibold mb-3",
              theme === 'light' ? "text-zinc-900" : "text-white"
            )}>
              No suggestions available
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              We couldn't find any connection suggestions at the moment. Try exploring the discover page to find developers.
            </p>
            <Button 
              onClick={() => router.push('/discover')}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Discover Developers
            </Button>
          </Card>
        )}

        {/* Call to Action */}
        {suggestions.length > 0 && (
          <div className="mt-12 text-center">
            <Card className={cn(
              "p-8 border-2 backdrop-blur-xl",
              theme === 'light' 
                ? "bg-white/80 border-black/5" 
                : "bg-zinc-950/80 border-white/5"
            )}>
              <h3 className={cn(
                "text-xl font-semibold mb-3",
                theme === 'light' ? "text-zinc-900" : "text-white"
              )}>
                Want to discover more developers?
              </h3>
              <p className="text-muted-foreground mb-6">
                Use our advanced search and filters to find developers with specific skills, universities, or experience.
              </p>
              <Button 
                onClick={() => router.push('/discover')}
                className="gap-2"
                size="lg"
              >
                Explore Discover Page
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}