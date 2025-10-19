"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { UserCard } from "@/components/social/user-card";
import { UserSearchFilters } from "@/components/social/user-search-filters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Users, Sparkles, X } from "lucide-react";
import type { UserSearchResult } from "@/types/database";
import { toast } from "sonner";

interface UserData {
  name: string;
  email: string;
  avatar: string;
  username?: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function DiscoverPage() {
  const { theme } = useTheme();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  // Search filters
  const [searchQuery, setSearchQuery] = useState("");
  const [university, setUniversity] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [minSolved, setMinSolved] = useState(0);
  const [maxSolved, setMaxSolved] = useState(1000);

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

  // Fetch suggestions on mount
  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const response = await fetch('/api/users/suggestions?limit=6');
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleSearch = async (page = 1) => {
    try {
      setSearchLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) params.append('q', searchQuery);
      if (university) params.append('university', university);
      if (graduationYear) params.append('graduation_year', graduationYear);
      if (minSolved > 0) params.append('min_solved', minSolved.toString());
      if (maxSolved < 1000) params.append('max_solved', maxSolved.toString());

      const response = await fetch(`/api/users/search?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setPagination(data.pagination || pagination);
      } else {
        toast.error('Failed to search users');
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('An error occurred while searching');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleReset = () => {
    setSearchQuery("");
    setUniversity("");
    setGraduationYear("");
    setMinSolved(0);
    setMaxSolved(1000);
    setUsers([]);
    setPagination({
      page: 1,
      limit: 12,
      total: 0,
      totalPages: 0,
      hasMore: false,
    });
  };

  const handleConnect = async (userId: string) => {
    try {
      const response = await fetch('/api/connections/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_user_id: userId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Connection request sent!');
        // Update user's connection status in UI
        setUsers(prev => prev.map(u =>
          u.user_id === userId ? { ...u, connection_status: 'pending_sent' } : u
        ));
        setSuggestions(prev => prev.map(u =>
          u.user_id === userId ? { ...u, connection_status: 'pending_sent' } : u
        ));
      } else {
        toast.error(data.error || 'Failed to send connection request');
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast.error('Failed to send connection request');
    }
  };

  const handleCancel = async (userId: string) => {
    try {
      const response = await fetch(`/api/connections/cancel?to_user_id=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Connection request canceled');
        // Update UI
        setUsers(prev => prev.map(u =>
          u.user_id === userId ? { ...u, connection_status: 'none' } : u
        ));
        setSuggestions(prev => prev.map(u =>
          u.user_id === userId ? { ...u, connection_status: 'none' } : u
        ));
      } else {
        toast.error(data.error || 'Failed to cancel connection request');
      }
    } catch (error) {
      console.error('Error canceling connection request:', error);
      toast.error('Failed to cancel connection request');
    }
  };

  const handleAccept = async (userId: string) => {
    try {
      const response = await fetch('/api/connections/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_user_id: userId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Connection request accepted!');
        // Update UI
        setUsers(prev => prev.map(u =>
          u.user_id === userId ? { ...u, connection_status: 'connected' } : u
        ));
        setSuggestions(prev => prev.map(u =>
          u.user_id === userId ? { ...u, connection_status: 'connected' } : u
        ));
      } else {
        toast.error(data.error || 'Failed to accept connection request');
      }
    } catch (error) {
      console.error('Error accepting connection:', error);
      toast.error('Failed to accept connection request');
    }
  };

  const handleDecline = async (userId: string) => {
    try {
      const response = await fetch('/api/connections/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_user_id: userId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Connection request declined');
        // Update UI
        setUsers(prev => prev.map(u =>
          u.user_id === userId ? { ...u, connection_status: 'none' } : u
        ));
        setSuggestions(prev => prev.map(u =>
          u.user_id === userId ? { ...u, connection_status: 'none' } : u
        ));
      } else {
        toast.error(data.error || 'Failed to decline connection request');
      }
    } catch (error) {
      console.error('Error declining connection:', error);
      toast.error('Failed to decline connection request');
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
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-brand/5 dark:bg-brand/8 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] left-[15%] w-[400px] h-[400px] bg-purple-500/3 dark:bg-purple-500/6 rounded-full blur-[80px] animate-float-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navbar */}
      <DashboardNavbar user={user} />

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
              theme === 'light'
                ? "from-blue-500 to-cyan-500 shadow-blue-500/25"
                : "from-blue-600 to-cyan-600 shadow-blue-500/25"
            )}>
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-brand to-purple-400 bg-clip-text text-transparent">
                Discover Developers
              </h1>
              <p className="text-muted-foreground">Find and connect with developers who share your interests</p>
            </div>
          </div>
        </div>

        {/* Search Filters */}
        <UserSearchFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          university={university}
          setUniversity={setUniversity}
          graduationYear={graduationYear}
          setGraduationYear={setGraduationYear}
          minSolved={minSolved}
          setMinSolved={setMinSolved}
          maxSolved={maxSolved}
          setMaxSolved={setMaxSolved}
          onSearch={() => handleSearch(1)}
          onReset={handleReset}
          isLoading={searchLoading}
        />

        {/* Suggestions Section (Show when no search) */}
        {users.length === 0 && suggestions.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className={cn(
                "w-5 h-5",
                theme === 'light' ? "text-amber-500" : "text-amber-400"
              )} />
              <h2 className={cn(
                "text-xl font-semibold",
                theme === 'light' ? "text-zinc-900" : "text-white"
              )}>
                Suggested Connections
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestions.map((suggestion) => (
                <UserCard
                  key={suggestion.user_id}
                  user={suggestion}
                  onConnect={handleConnect}
                  onCancel={handleCancel}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                />
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {users.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className={cn(
                "text-xl font-semibold",
                theme === 'light' ? "text-zinc-900" : "text-white"
              )}>
                Search Results ({pagination.total} users)
              </h2>
            </div>

            {searchLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {users.map((user) => (
                    <UserCard
                      key={user.user_id}
                      user={user}
                      onConnect={handleConnect}
                      onCancel={handleCancel}
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-4">
                    <Button
                      onClick={() => handleSearch(pagination.page - 1)}
                      disabled={pagination.page === 1 || searchLoading}
                      variant="outline"
                      size="lg"
                      className={cn(
                        "gap-2 border-2",
                        theme === 'light'
                          ? "border-zinc-200 hover:border-blue-500"
                          : "border-zinc-800 hover:border-blue-500"
                      )}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>

                    <div className={cn(
                      "px-4 py-2 rounded-lg font-medium",
                      theme === 'light' ? "bg-zinc-100 text-zinc-900" : "bg-zinc-900 text-white"
                    )}>
                      Page {pagination.page} of {pagination.totalPages}
                    </div>

                    <Button
                      onClick={() => handleSearch(pagination.page + 1)}
                      disabled={!pagination.hasMore || searchLoading}
                      variant="outline"
                      size="lg"
                      className={cn(
                        "gap-2 border-2",
                        theme === 'light'
                          ? "border-zinc-200 hover:border-blue-500"
                          : "border-zinc-800 hover:border-blue-500"
                      )}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Empty State */}
        {users.length === 0 && !searchLoading && (searchQuery || university || graduationYear || minSolved > 0 || maxSolved < 1000) && (
          <Card className={cn(
            "mt-8 p-12 text-center border-2 backdrop-blur-xl",
            theme === 'light'
              ? "bg-white/80 border-black/5"
              : "bg-zinc-950/80 border-white/5"
          )}>
            <div className={cn(
              "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
              theme === 'light' ? "bg-zinc-100" : "bg-zinc-900"
            )}>
              <Users className={cn(
                "w-8 h-8",
                theme === 'light' ? "text-zinc-400" : "text-zinc-600"
              )} />
            </div>
            <h3 className={cn(
              "text-lg font-semibold mb-2",
              theme === 'light' ? "text-zinc-900" : "text-white"
            )}>
              No users found
            </h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search filters or search terms
            </p>
            <Button onClick={handleReset} variant="outline" className="gap-2">
              <X className="w-4 h-4" />
              Clear filters
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
