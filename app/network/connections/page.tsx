"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyAutocomplete } from "@/components/ui/company-autocomplete";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { DefaultAvatar } from "@/components/ui/default-avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  Plus,
  CheckCircle2,
  Clock,
  X,
  Settings,
  Users as Grid,
  Users as ListIcon,
  Send as MessageIcon,
  GraduationCap,
  Briefcase,
  MapPin,
  Calendar,
  ChevronDown,
  Sparkles,
  Trophy,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { ActivityFeed } from "@/components/social/activity-feed";
import type { UserSearchResult } from "@/types/database";
import { SentRequestCard } from "@/components/social/sent-request-card";
import { MessageUserButton } from "@/components/messaging/message-user-button";
import Image from "next/image";
import Link from "next/link";

interface ConnectionData {
  user: UserSearchResult;
  connected_at: string;
  mutual_connections: number;
}

interface PendingRequest {
  id: string;
  user: UserSearchResult;
  message?: string;
  created_at: string;
  type: 'received' | 'sent';
}

interface UserData {
  name: string;
  email: string;
  avatar: string;
  username?: string;
}

// School autocomplete (reusing existing logic)
interface School {
  code: string;
  name: string;
  city?: string | null;
  state?: string | null;
}

export default function ConnectionsPage() {
  const router = useRouter();

  // State
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [filteredConnections, setFilteredConnections] = useState<ConnectionData[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("connections");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Advanced Filters
  const [filterSchool, setFilterSchool] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterGradYear, setFilterGradYear] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  // School autocomplete state
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolResults, setSchoolResults] = useState<School[]>([]);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);

  // Bulk selection state
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Handle request selection
  const handleRequestSelect = (requestId: string) => {
    setSelectedRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
      }
      return newSet;
    });
  };

  // Debounce timer ref
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Generate graduation years
  const currentYear = new Date().getFullYear();
  const gradYears = Array.from({ length: 10 }, (_, i) => (currentYear - 5 + i).toString());

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

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search by name"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
      // Escape to clear search
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  // Fetch connections and pending requests
  useEffect(() => {
    fetchConnections();
    fetchPendingRequests();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = connections;

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(conn =>
        conn.user.full_name?.toLowerCase().includes(query) ||
        conn.user.username?.toLowerCase().includes(query) ||
        conn.user.bio?.toLowerCase().includes(query)
      );
    }

    if (filterSchool) {
      filtered = filtered.filter(conn =>
        conn.user.university?.toLowerCase().includes(filterSchool.toLowerCase())
      );
    }

    if (filterCompany) {
      filtered = filtered.filter(conn =>
        conn.user.company?.toLowerCase().includes(filterCompany.toLowerCase())
      );
    }

    if (filterGradYear) {
      filtered = filtered.filter(conn =>
        conn.user.graduation_year === filterGradYear
      );
    }

    if (filterLocation) {
      filtered = filtered.filter(conn =>
        conn.user.location?.toLowerCase().includes(filterLocation.toLowerCase())
      );
    }

    setFilteredConnections(filtered);
  }, [connections, debouncedSearchQuery, filterSchool, filterCompany, filterGradYear, filterLocation]);

  // School search
  useEffect(() => {
    if (schoolQuery.length < 2) {
      setSchoolResults([]);
      setShowSchoolDropdown(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/schools?q=${encodeURIComponent(schoolQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setSchoolResults(Array.isArray(data) ? data : []);
          setShowSchoolDropdown(data.length > 0);
        }
      } catch (error) {
        console.error('School search error:', error);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [schoolQuery]);

  const fetchConnections = async () => {
    try {
      const response = await fetch(`/api/connections/my-connections`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched connections data:', data);
        setConnections(data.connections || []);
        setFilteredConnections(data.connections || []);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch(`/api/connections/pending-requests`);
      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const handleAcceptRequest = async (requestId: string, userId: string) => {
    try {
      setActionLoading(requestId);
      const response = await fetch('/api/connections/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_user_id: userId }),
      });

      if (response.ok) {
        toast.success('Connection request accepted!');
        // Remove from pending requests
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
        // Add to connections immediately
        const acceptedUser = pendingRequests.find(req => req.id === requestId)?.user;
        if (acceptedUser) {
          setConnections(prev => [...prev, {
            user: acceptedUser,
            connected_at: new Date().toISOString(),
            mutual_connections: 0 // Will be updated on next fetch
          }]);
          setFilteredConnections(prev => [...prev, {
            user: acceptedUser,
            connected_at: new Date().toISOString(),
            mutual_connections: 0
          }]);
        }
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to accept request');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineRequest = async (requestId: string, userId: string) => {
    try {
      setActionLoading(requestId);
      const response = await fetch('/api/connections/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_user_id: userId }),
      });

      if (response.ok) {
        toast.success('Connection request declined');
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to decline request');
      }
    } catch (error) {
      console.error('Error declining request:', error);
      toast.error('Failed to decline request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfriend = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await fetch('/api/connections/unfriend', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      if (response.ok) {
        toast.success('Connection removed');
        setConnections(prev => prev.filter(conn => conn.user.user_id !== userId));
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to remove connection');
      }
    } catch (error) {
      console.error('Error removing connection:', error);
      toast.error('Failed to remove connection');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      const response = await fetch('/api/connections/cancel', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId }),
      });

      if (response.ok) {
        toast.success('Connection request canceled');
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('Error canceling request:', error);
      toast.error('Failed to cancel request');
    } finally {
      setActionLoading(null);
    }
  };

  const clearAllFilters = () => {
    setFilterSchool("");
    setFilterCompany("");
    setFilterGradYear("");
    setFilterLocation("");
    setSchoolQuery("");
  };

  const activeFiltersCount = [filterSchool, filterCompany, filterGradYear, filterLocation].filter(Boolean).length;

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background relative z-0">
        {/* Subtle ambient background like Connection Suggestions */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 bg-background" />
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-cyan-500/8 via-blue-500/5 to-transparent rounded-full blur-[200px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-t from-rose-500/6 to-transparent rounded-full blur-[150px]" />
      </div>

      {/* Navbar */}
      <DashboardNavbar user={user} />

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-br from-cyan-500/30 via-blue-500/20 to-rose-500/30 rounded-2xl blur-lg" />
                <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-cyan-500/10 via-blue-500/8 to-rose-500/10 border border-cyan-500/20 backdrop-blur-sm">
                  <Users className="w-6 h-6 text-cyan-400" />
                </div>
            </div>
            <div>
                <h1 className="text-4xl font-bold">
                  <span className="text-white">My</span> <span className="bg-gradient-to-r from-cyan-400 to-rose-400 bg-clip-text text-transparent">Network</span>
              </h1>
                <p className="text-slate-400 text-lg">Grow and manage your professional connections</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-slate-700/50 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all duration-200"
                disabled={isRefreshing}
                onClick={async () => {
                  setIsRefreshing(true);
                  try {
                    await Promise.all([fetchConnections(), fetchPendingRequests()]);
                    toast.success('Network refreshed');
                  } catch (error) {
                    toast.error('Failed to refresh network');
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
              >
                {isRefreshing ? (
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "border-slate-700/50 transition-all duration-200",
                  showFilters 
                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400" 
                    : "hover:border-cyan-500/30"
                )}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Filter Sidebar - Clean Style */}
          <div className={cn(
            "transition-all duration-500 ease-out",
            showFilters ? "w-80 opacity-100" : "w-0 opacity-0 overflow-hidden"
          )}>
            <div className="sticky top-24">
              <Card className="relative border border-cyan-500/20 bg-gradient-to-br from-[#1a1f2e]/95 via-[#1e2430]/90 to-[#1a1f2e]/95 backdrop-blur-xl overflow-hidden shadow-2xl shadow-cyan-500/10">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/3 to-transparent" />
                <div className="relative p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-lg font-semibold text-white">Filters</h3>
                      {activeFiltersCount > 0 && (
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </div>
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="text-xs h-7 text-slate-400 hover:text-white"
                      >
                        Clear all
                      </Button>
                    )}
                  </div>

                  {/* School Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2 text-slate-300">
                      <GraduationCap className="w-4 h-4 text-rose-400" />
                      School
                    </label>
                    <div className="relative">
                      <Input
                        placeholder="Search universities..."
                        value={schoolQuery}
                        onChange={(e) => setSchoolQuery(e.target.value)}
                        className="bg-slate-800/50 border-slate-700/50 focus:border-cyan-500/50 text-white placeholder:text-slate-500"
                      />
                      {showSchoolDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-[#1a1f2e] border border-slate-700/50 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                          {schoolResults.map((school) => (
                            <button
                              key={school.code}
                              onClick={() => {
                                setFilterSchool(school.name);
                                setSchoolQuery(school.name);
                                setShowSchoolDropdown(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-slate-800/50 transition-colors border-b border-slate-700/30 last:border-b-0"
                            >
                              <div className="font-medium text-sm text-white">{school.name}</div>
                              {school.city && school.state && (
                                <div className="text-xs text-slate-400">{school.city}, {school.state}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {filterSchool && (
                        <button
                          onClick={() => { setFilterSchool(""); setSchoolQuery(""); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Company Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2 text-slate-300">
                      <Briefcase className="w-4 h-4 text-purple-400" />
                      Company
                    </label>
                    <CompanyAutocomplete
                      value={filterCompany}
                      onValueChange={setFilterCompany}
                      placeholder="Search companies..."
                      className="bg-slate-800/50 border-slate-700/50 focus:border-purple-500/50"
                    />
                  </div>

                  {/* Graduation Year Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2 text-slate-300">
                      <Calendar className="w-4 h-4 text-purple-400" />
                      Graduation Year
                    </label>
                    <select
                      value={filterGradYear}
                      onChange={(e) => setFilterGradYear(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 focus:border-purple-500/50 transition-all outline-none text-white"
                    >
                      <option value="">All years</option>
                      {gradYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  {/* Location Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2 text-slate-300">
                      <MapPin className="w-4 h-4 text-orange-400" />
                      Location
                    </label>
                    <LocationAutocomplete
                      value={filterLocation}
                      onValueChange={setFilterLocation}
                      placeholder="Search locations worldwide..."
                      className="bg-slate-800/50 border-slate-700/50 focus:border-purple-500/50"
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 space-y-6">
            {/* Search and Controls - Glassmorphism Design */}
            <Card className="relative p-6 border border-slate-700/50 bg-card/90 backdrop-blur-xl overflow-hidden hover:border-cyan-500/30 transition-all duration-300">
              <div className="relative flex flex-col lg:flex-row gap-4 items-center justify-between">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Settings className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search by name, username, bio..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-20 h-11 bg-slate-800/50 border-slate-700/50 focus:border-purple-500/50 text-white placeholder:text-slate-500 transition-all"
                  />
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center hover:bg-slate-700 transition-all"
                    >
                      <X className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ) : (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-slate-500">
                      <kbd className="px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-400">⌘</kbd>
                      <kbd className="px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-400">K</kbd>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">

                  {/* View Mode Toggle - Clean style with proper z-index */}
                  <div className="flex rounded-lg border border-slate-700/50 overflow-hidden bg-slate-800/30">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setViewMode('grid')}
                          className={cn(
                            "p-2.5 transition-all duration-200 relative z-10",
                            viewMode === 'grid'
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                          )}
                        >
                          <Grid className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="z-50">
                        <p>Grid view</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setViewMode('list')}
                          className={cn(
                            "p-2.5 transition-all duration-200 relative z-10",
                            viewMode === 'list'
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                          )}
                        >
                          <ListIcon className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="z-50">
                        <p>List view</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              {/* Active Filters Pills */}
              {activeFiltersCount > 0 && (
                <div className="relative mt-4 pt-4 border-t border-slate-700/50 flex flex-wrap gap-2">
                  {filterSchool && (
                    <Badge variant="secondary" className="gap-2 pl-3 pr-2 py-1.5 bg-orange-500/10 border-orange-500/30 text-orange-400">
                      <GraduationCap className="w-3 h-3" />
                      {filterSchool}
                      <button onClick={() => { setFilterSchool(""); setSchoolQuery(""); }} className="hover:bg-orange-500/20 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {filterCompany && (
                    <Badge variant="secondary" className="gap-2 pl-3 pr-2 py-1.5 bg-purple-500/10 border-purple-500/30 text-purple-400">
                      <Briefcase className="w-3 h-3" />
                      {filterCompany}
                      <button onClick={() => setFilterCompany("")} className="hover:bg-purple-500/20 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {filterGradYear && (
                    <Badge variant="secondary" className="gap-2 pl-3 pr-2 py-1.5 bg-purple-500/10 border-purple-500/30 text-purple-400">
                      <Calendar className="w-3 h-3" />
                      Class of {filterGradYear}
                      <button onClick={() => setFilterGradYear("")} className="hover:bg-purple-500/20 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {filterLocation && (
                    <Badge variant="secondary" className="gap-2 pl-3 pr-2 py-1.5 bg-orange-500/10 border-orange-500/30 text-orange-400">
                      <MapPin className="w-3 h-3" />
                      {filterLocation}
                      <button onClick={() => setFilterLocation("")} className="hover:bg-orange-500/20 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </Card>

            {/* Tabs - Glassmorphism Design */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 border border-slate-700/50 bg-card/90 backdrop-blur-xl p-1 h-auto">
                <TabsTrigger
                  value="connections"
                  className="gap-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/20 transition-all duration-300 rounded-lg py-3 hover:bg-cyan-500/10"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Connections</span>
                  <Badge variant="secondary" className="ml-1 bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                    {filteredConnections.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="gap-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/20 transition-all duration-300 rounded-lg py-3 hover:bg-cyan-500/10"
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">Pending</span>
                  <Badge variant="secondary" className="ml-1 bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                    {pendingRequests.filter(req => req.type === 'received').length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="sent"
                  className="gap-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/20 transition-all duration-300 rounded-lg py-3 hover:bg-cyan-500/10"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Sent</span>
                  <Badge variant="secondary" className="ml-1 bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                    {pendingRequests.filter(req => req.type === 'sent').length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Connections Tab */}
              <TabsContent value="connections" className="space-y-6 mt-6">
                {filteredConnections.length > 0 ? (
                  <div className={cn(
                    "grid gap-6",
                    viewMode === 'grid'
                      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-1"
                  )}>
                    {filteredConnections.map((connection, index) => (
                      <ConnectionCard
                        key={connection.user.user_id}
                        connection={connection}
                        onUnfriend={handleUnfriend}
                        actionLoading={actionLoading}
                        viewMode={viewMode}
                        index={index}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Users}
                    title={activeFiltersCount > 0 ? "No connections match your filters" : "No connections yet"}
                    description={activeFiltersCount > 0
                      ? "Try adjusting your filters to see more results"
                      : "Start building your network by discovering and connecting with other developers"
                    }
                    action={activeFiltersCount > 0 ? (
                      <Button onClick={clearAllFilters} className="gap-2 bg-slate-800 hover:bg-slate-700 border-slate-700">
                        <X className="w-4 h-4" />
                        Clear Filters
                      </Button>
                    ) : (
                      <Button onClick={() => router.push('/discover')} className="gap-2 bg-blue-500 hover:bg-blue-600 text-white">
                        <Plus className="w-4 h-4" />
                        Discover Developers
                      </Button>
                    )}
                  />
                )}
              </TabsContent>

              {/* Pending Requests Tab */}
              <TabsContent value="pending" className="space-y-6 mt-6">
                {pendingRequests.filter(req => req.type === 'received').length > 0 ? (
                  <div className="grid gap-6">
                    {pendingRequests
                      .filter(req => req.type === 'received')
                      .map((request, index) => (
                        <PendingRequestCard
                          key={request.id}
                          request={request}
                          onAccept={handleAcceptRequest}
                          onDecline={handleDeclineRequest}
                          onCancel={handleCancelRequest}
                          actionLoading={actionLoading}
                          index={index}
                        />
                      ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Clock}
                    title="No pending requests"
                    description="You don't have any pending connection requests at the moment"
                  />
                )}
              </TabsContent>

              {/* Sent Requests Tab */}
              <TabsContent value="sent" className="space-y-6 mt-6">
                {pendingRequests.filter(req => req.type === 'sent').length > 0 ? (
                  <div className={cn(
                    "grid gap-6",
                    viewMode === 'grid'
                      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-1"
                  )}>
                    {pendingRequests
                      .filter(req => req.type === 'sent')
                      .map((request, index) => (
                        <SentRequestCard
                          key={request.id}
                          request={request}
                          onCancel={handleCancelRequest}
                          onSelect={handleRequestSelect}
                          isSelected={selectedRequests.has(request.id)}
                          actionLoading={actionLoading}
                          viewMode={viewMode}
                          theme="dark"
                          index={index}
                        />
                      ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Plus}
                    title="No sent requests"
                    description="You haven't sent any connection requests yet"
                    action={
                      <Button onClick={() => router.push('/discover')} className="gap-2 bg-blue-500 hover:bg-blue-600 text-white">
                        <Plus className="w-4 h-4" />
                        Find People to Connect With
                      </Button>
                    }
                  />
                )}
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </main>
    </div>
    </TooltipProvider>
  );
}

// Clean Connection Card
function ConnectionCard({
  connection,
  onUnfriend,
  actionLoading,
  viewMode,
  index
}: {
  connection: ConnectionData;
  onUnfriend: (userId: string) => void;
  actionLoading: string | null;
  viewMode: 'grid' | 'list';
  index: number;
}) {
  const [showActions, setShowActions] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card className={cn(
      "group relative p-4 border border-slate-700/50 bg-card/90 backdrop-blur-xl overflow-hidden hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 hover:scale-[1.005] animate-in slide-in-from-bottom-4 fade-in-0",
      viewMode === 'list' && "flex items-center gap-4"
    )} style={{ animationDelay: `${index * 100}ms` }}>
      <div className={cn("relative flex items-start gap-4", viewMode === 'list' && "flex-1")}>
        <Link href={`/profile/${connection.user.username}`} className="contents">
          {/* Avatar - Glassmorphism Design */}
          <div className="relative flex-shrink-0 cursor-pointer group-hover:scale-105 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-rose-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
            <div className="relative">
              <DefaultAvatar
                src={connection.user.avatar_url}
                name={connection.user.full_name}
                username={connection.user.username}
                size="lg"
                className="w-14 h-14 rounded-2xl border border-cyan-500/30"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-cyan-500 to-rose-500 rounded-full border-2 border-[#1a1f2e] shadow-lg shadow-cyan-500/30" />
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg truncate bg-gradient-to-r from-white via-cyan-400 to-rose-400 bg-clip-text text-transparent group-hover:from-cyan-300 group-hover:via-rose-300 group-hover:to-blue-300 transition-all duration-500">
              {connection.user.full_name || connection.user.username || 'Anonymous'}
            </h3>
            <p className="text-sm text-slate-400 truncate group-hover:text-cyan-300 transition-colors duration-300">
              @{connection.user.username || 'user'}
            </p>

            {/* Metadata Pills */}
            <div className="flex flex-wrap gap-2 mt-4">
              {connection.user.university && (
                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-rose-500/20 to-pink-500/20 text-rose-300 border border-rose-500/30 backdrop-blur-sm shadow-lg shadow-rose-500/10">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  {connection.user.university}
                  {connection.user.graduation_year && ` '${connection.user.graduation_year.slice(-2)}`}
                </Badge>
              )}
              {connection.user.company && (
                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 backdrop-blur-sm shadow-lg shadow-cyan-500/10">
                  <Briefcase className="w-3 h-3 mr-1" />
                  {connection.user.company}
                </Badge>
              )}
              {connection.user.location && (
                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-slate-600/20 to-slate-700/20 text-slate-300 border border-slate-600/30 backdrop-blur-sm">
                  <MapPin className="w-3 h-3 mr-1" />
                  {connection.user.location}
                </Badge>
              )}
            </div>

            {/* Connection Info */}
            <div className="mt-3 space-y-3">
              {/* Stats Row */}
              <div className="flex items-center gap-4 text-sm">
                {/* Problems Solved */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors cursor-help">
                      <Trophy className="w-4 h-4" />
                      <span>{connection.user.total_solved || 0}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Problems solved</p>
                  </TooltipContent>
                </Tooltip>
                
                {/* Current Streak */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors cursor-help">
                      <Calendar className="w-4 h-4" />
                      <span>{connection.user.current_streak || 0}d</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Current study streak</p>
                  </TooltipContent>
                </Tooltip>
                
                {/* Mutual Connections */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors cursor-help">
                      <Users className="w-4 h-4" />
                      <span>{connection.mutual_connections || 0}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Mutual connections</p>
                  </TooltipContent>
                </Tooltip>
            </div>

              {/* Connection Date */}
              <div className="text-xs text-slate-500">
                Connected {connection.connected_at ? new Date(connection.connected_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recently'}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 border-cyan-500/30 hover:border-cyan-500/60 hover:bg-gradient-to-r hover:from-cyan-500/10 hover:to-rose-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20"
                    onClick={() => {
                      // Open messaging widget or navigate to messages
                      window.open(`/messages?user=${connection.user.user_id}`, '_blank');
                    }}
                  >
                    <MessageIcon className="w-4 h-4 mr-1" />
                    Message
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send a message</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-8 h-8 p-0 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
                    onClick={() => window.open(`/profile/${connection.user.username}`, '_blank')}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View profile</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </Link>
      </div>
    </Card>
  );
}

// Clean Pending Request Card
function PendingRequestCard({
  request,
  onAccept,
  onDecline,
  onCancel,
  actionLoading,
  index
}: {
  request: PendingRequest;
  onAccept: (requestId: string, userId: string) => void;
  onDecline: (requestId: string, userId: string) => void;
  onCancel: (requestId: string) => void;
  actionLoading: string | null;
  index: number;
}) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card className="group relative p-4 border border-slate-700/50 bg-card/90 backdrop-blur-xl overflow-hidden hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 hover:scale-[1.01] animate-in slide-in-from-bottom-4 fade-in-0" style={{ animationDelay: `${index * 100}ms` }}>
      <div className="relative flex items-center gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0 group-hover:scale-110 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-rose-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
          <div className="relative">
            <DefaultAvatar
              src={request.user.avatar_url}
              name={request.user.full_name}
              username={request.user.username}
              size="lg"
              className="w-14 h-14 rounded-2xl border border-cyan-500/30"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-cyan-500 to-rose-500 rounded-full border-2 border-[#1a1f2e] shadow-lg shadow-cyan-500/30" />
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg truncate bg-gradient-to-r from-white via-cyan-400 to-rose-400 bg-clip-text text-transparent group-hover:from-cyan-300 group-hover:via-rose-300 group-hover:to-blue-300 transition-all duration-500">
              {request.user.full_name || request.user.username || 'Anonymous'}
            </h3>
            {request.type === 'received' && (
              <Badge variant="secondary" className="text-xs bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                New
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-400 truncate group-hover:text-cyan-300 transition-colors duration-300">
            @{request.user.username || 'user'}
          </p>
          {request.message && (
            <p className="text-sm mt-2 italic text-slate-400 line-clamp-2 group-hover:text-cyan-300 transition-colors duration-300">
              "{request.message}"
            </p>
          )}
          <div className="text-xs text-slate-500 mt-1">
            {request.type === 'received' ? 'Received' : 'Sent'} {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {request.type === 'received' ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onAccept(request.id, request.user.user_id); }}
                    disabled={actionLoading === request.id}
                        className="gap-2 bg-gradient-to-r from-cyan-500 to-rose-500 hover:from-cyan-600 hover:to-rose-600 text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 transition-all duration-300"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Accept
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Accept connection request</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); onDecline(request.id, request.user.user_id); }}
                    disabled={actionLoading === request.id}
                        className="gap-2 border-cyan-500/30 text-cyan-300 hover:bg-gradient-to-r hover:from-red-500/10 hover:to-pink-500/10 hover:border-red-500/50 hover:text-red-400 transition-all duration-300"
                  >
                    <X className="w-4 h-4" />
                    Decline
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Decline connection request</p>
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); onCancel(request.id); }}
                  disabled={actionLoading === request.id}
                  className="border-cyan-500/30 text-cyan-300 hover:bg-gradient-to-r hover:from-red-500/10 hover:to-pink-500/10 hover:border-red-500/50 hover:text-red-400 transition-all duration-300"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Cancel connection request</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </Card>
  );
}

// Empty State Component
function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: any;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
        <Card className="relative p-12 text-center border border-slate-700/50 bg-card/90 backdrop-blur-xl overflow-hidden">
      <div className="relative">
        <div className="relative w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-rose-500/20 border border-cyan-500/30 backdrop-blur-sm shadow-2xl shadow-cyan-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-rose-500/20 rounded-full blur-xl" />
          <Icon className="w-12 h-12 text-cyan-400 relative z-10" />
        </div>
        <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-white via-cyan-400 to-rose-400 bg-clip-text text-transparent">{title}</h3>
        <p className="text-slate-400 mb-6 max-w-md mx-auto text-lg">{description}</p>
        {action}
      </div>
    </Card>
  );
}
