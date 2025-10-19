"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { UserCard } from "@/components/social/user-card";
import { UserSearchFilters } from "@/components/social/user-search-filters";
import { UserCardSkeleton } from "@/components/social/user-card-skeleton";
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
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Search filters - initialize from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || "");
  const [university, setUniversity] = useState(searchParams.get('university') || "");
  const [graduationYear, setGraduationYear] = useState(searchParams.get('year') || "");
  const [minSolved, setMinSolved] = useState(parseInt(searchParams.get('min_solved') || '0'));
  const [maxSolved, setMaxSolved] = useState(parseInt(searchParams.get('max_solved') || '1000'));
  const [company, setCompany] = useState(searchParams.get('company') || "");
  const [minRating, setMinRating] = useState(parseInt(searchParams.get('min_rating') || '0'));
  const [maxRating, setMaxRating] = useState(parseInt(searchParams.get('max_rating') || '3000'));
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance');

  // Debounce timer ref
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

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

  // Fetch suggestions and users on mount (only if no URL params)
  useEffect(() => {
    if (!searchParams.toString()) {
      fetchSuggestions();
      // Always fetch users on mount to show them immediately
      handleSearch(1, false);
    }
  }, []);

  // Auto-search on mount if URL has params
  useEffect(() => {
    if (searchParams.toString()) {
      handleSearch(parseInt(searchParams.get('page') || '1'), false);
    }
  }, []);

  // Refresh connection status when page becomes visible (handles navigation back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && users.length > 0) {
        // Page became visible and we have users, refresh their connection status
        refreshConnectionStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [users.length]);

  const fetchSuggestions = async () => {
    try {
      const response = await fetch('/api/users/suggestions?limit=6');
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } else {
        console.warn('Failed to fetch suggestions:', response.status);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  };

  // Update URL with current filters
  const updateURL = useCallback((page: number = 1) => {
    const params = new URLSearchParams();

    if (searchQuery) params.set('q', searchQuery);
    if (university) params.set('university', university);
    if (graduationYear) params.set('year', graduationYear);
    if (company) params.set('company', company);
    if (minSolved > 0) params.set('min_solved', minSolved.toString());
    if (maxSolved < 1000) params.set('max_solved', maxSolved.toString());
    if (minRating > 0) params.set('min_rating', minRating.toString());
    if (maxRating < 3000) params.set('max_rating', maxRating.toString());
    if (sortBy !== 'relevance') params.set('sort', sortBy);
    if (page > 1) params.set('page', page.toString());

    const newURL = params.toString() ? `/discover?${params.toString()}` : '/discover';
    router.replace(newURL, { scroll: false });
  }, [searchQuery, university, graduationYear, company, minSolved, maxSolved, minRating, maxRating, sortBy, router]);

  const handleSearch = async (page = 1, updateUrl = true) => {
    try {
      setSearchLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) params.append('q', searchQuery);
      if (university) params.append('university', university);
      if (graduationYear) params.append('graduation_year', graduationYear);
      if (company) params.append('company', company);
      if (minSolved > 0) params.append('min_solved', minSolved.toString());
      if (maxSolved < 1000) params.append('max_solved', maxSolved.toString());
      if (minRating > 0) params.append('min_rating', minRating.toString());
      if (maxRating < 3000) params.append('max_rating', maxRating.toString());
      if (sortBy) params.append('sort', sortBy);

      const response = await fetch(`/api/users/search?${params}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Search results with connection status:', data.users?.map(u => ({
          name: u.full_name,
          connection_status: u.connection_status
        })));
        setUsers(data.users || []);
        setPagination(data.pagination || pagination);

        // Update URL with current filters
        if (updateUrl) {
          updateURL(page);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Search failed:', errorData);
        toast.error(errorData.error || 'Failed to search users');
        setUsers([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('An error occurred while searching');
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search - triggers 500ms after user stops typing
  const debouncedSearch = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      handleSearch(1);
    }, 500);
  }, [searchQuery, university, graduationYear, company, minSolved, maxSolved, minRating, maxRating, sortBy]);

  // Trigger search when filters change (including when clearing filters)
  useEffect(() => {
    // Always trigger search when any filter changes, including when clearing them
    debouncedSearch();

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, university, graduationYear, company, minSolved, maxSolved, minRating, maxRating, sortBy]);

  const handleReset = () => {
    setSearchQuery("");
    setUniversity("");
    setGraduationYear("");
    setCompany("");
    setMinSolved(0);
    setMaxSolved(1000);
    setMinRating(0);
    setMaxRating(3000);
    setSortBy('relevance');
    setUsers([]);
    setPagination({
      page: 1,
      limit: 12,
      total: 0,
      totalPages: 0,
      hasMore: false,
    });
    router.replace('/discover', { scroll: false });
    // Fetch both suggestions and basic users when resetting
    fetchSuggestions();
    handleSearch(1, false);
  };

  // Function to refresh connection status for all users
  const refreshConnectionStatus = async () => {
    try {
      // Re-fetch the current search results to get updated connection status
      await handleSearch(pagination.page, false);
    } catch (error) {
      console.error('Error refreshing connection status:', error);
    }
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
        console.log('Connection request sent successfully for user:', userId);
        // Update user's connection status in UI
        setUsers(prev => prev.map(u =>
          u.user_id === userId ? { ...u, connection_status: 'pending_sent' } : u
        ));
        setSuggestions(prev => prev.map(u =>
          u.user_id === userId ? { ...u, connection_status: 'pending_sent' } : u
        ));
      } else {
        console.error('Connection request failed:', data);
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

  const hasActiveFilters = searchQuery || university || graduationYear || company ||
                          minSolved > 0 || maxSolved < 1000 ||
                          minRating > 0 || maxRating < 3000;

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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
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
            <Button
              onClick={refreshConnectionStatus}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Refresh Status
            </Button>
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
          company={company}
          setCompany={setCompany}
          minSolved={minSolved}
          setMinSolved={setMinSolved}
          maxSolved={maxSolved}
          setMaxSolved={setMaxSolved}
          minRating={minRating}
          setMinRating={setMinRating}
          maxRating={maxRating}
          setMaxRating={setMaxRating}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onReset={handleReset}
          isLoading={searchLoading}
        />

        {/* Suggestions Section (Show when no active filters) */}
        {!hasActiveFilters && suggestions.length > 0 && (
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
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Results or All Users */}
        {users.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className={cn(
                "text-xl font-semibold",
                theme === 'light' ? "text-zinc-900" : "text-white"
              )}>
                {hasActiveFilters ? `Search Results (${pagination.total} users)` : `Developers (${pagination.total} users)`}
              </h2>
            </div>

            {searchLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <UserCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {users.map((user, index) => (
                    <div
                      key={user.user_id}
                      className="animate-in fade-in-0 slide-in-from-bottom-4"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <UserCard
                        user={user}
                        onConnect={handleConnect}
                        onCancel={handleCancel}
                        onAccept={handleAccept}
                        onDecline={handleDecline}
                      />
                    </div>
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

                {/* Results Summary */}
                {pagination.total > 0 && (
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} developers
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Empty State */}
        {users.length === 0 && !searchLoading && hasActiveFilters && (
          <Card className={cn(
            "mt-8 p-12 text-center border-2 backdrop-blur-xl animate-in fade-in-0 slide-in-from-top-4",
            theme === 'light'
              ? "bg-white/80 border-black/5"
              : "bg-zinc-950/80 border-white/5"
          )}>
            <div className={cn(
              "w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center",
              theme === 'light' ? "bg-zinc-100" : "bg-zinc-900"
            )}>
              <Users className={cn(
                "w-10 h-10",
                theme === 'light' ? "text-zinc-400" : "text-zinc-600"
              )} />
            </div>
            <h3 className={cn(
              "text-xl font-semibold mb-3",
              theme === 'light' ? "text-zinc-900" : "text-white"
            )}>
              No developers found
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              We couldn't find any developers matching your current filters. Try adjusting your search criteria or explore our suggestions.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleReset} variant="outline" className="gap-2">
                <X className="w-4 h-4" />
                Clear all filters
              </Button>
              <Button 
                onClick={() => {
                  setSearchQuery("");
                  setUniversity("");
                  setGraduationYear("");
                  setCompany("");
                  setMinSolved(0);
                  setMaxSolved(1000);
                  setMinRating(0);
                  setMaxRating(3000);
                  setSortBy('relevance');
                }} 
                variant="ghost" 
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                View suggestions
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}