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
import {
  Users,
  Plus,
  CheckCircle2,
  Clock,
  X,
  Settings,
  GraduationCap,
  Briefcase,
  MapPin,
  Calendar,
  ChevronDown,
  Sparkles,
  Trophy
} from "lucide-react";
import { toast } from "sonner";
import { ActivityFeed } from "@/components/social/activity-feed";
import type { UserSearchResult } from "@/types/database";
import { SentRequestCard } from "@/components/social/sent-request-card";
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
  const [activeTab, setActiveTab] = useState("connections");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  // Fetch connections and pending requests
  useEffect(() => {
    fetchConnections();
    fetchPendingRequests();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = connections;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
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
  }, [connections, searchQuery, filterSchool, filterCompany, filterGradYear, filterLocation]);

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
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
        fetchConnections();
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
    <div className="min-h-screen bg-background">
      {/* iOS 26 Liquid Glass Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-[-20%] right-[10%] w-[800px] h-[800px] bg-gradient-to-br from-brand/8 via-purple-500/6 to-cyan-500/4 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] left-[5%] w-[600px] h-[600px] bg-gradient-to-tr from-purple-500/5 via-pink-500/4 to-brand/6 rounded-full blur-[100px] animate-float-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[50%] w-[500px] h-[500px] bg-gradient-to-bl from-cyan-500/3 via-blue-500/4 to-purple-500/3 rounded-full blur-[90px] animate-pulse-slow" style={{ animationDelay: '4s' }} />
      </div>

      {/* Navbar */}
      <DashboardNavbar user={user} />

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-brand via-purple-500 to-cyan-500 shadow-lg shadow-brand/25">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-brand to-purple-400 bg-clip-text text-transparent">
                My Network
              </h1>
              <p className="text-muted-foreground">Grow and manage your professional connections</p>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Filter Sidebar - iOS 26 Style */}
          <div className={cn(
            "transition-all duration-500 ease-out",
            showFilters ? "w-80 opacity-100" : "w-0 opacity-0 overflow-hidden"
          )}>
            <div className="sticky top-24">
              <Card className="relative border-2 border-border/20 bg-gradient-to-br from-card/80 via-card/60 to-transparent backdrop-blur-2xl overflow-hidden shadow-2xl">
                {/* Glassmorphic glow effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-purple-500/5 to-transparent opacity-50" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand/20 to-transparent rounded-full blur-3xl" />

                <div className="relative p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-brand" />
                      <h3 className="text-lg font-semibold">Filters</h3>
                      {activeFiltersCount > 0 && (
                        <Badge className="bg-brand/20 text-brand border-brand/30">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </div>
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="text-xs h-7 text-muted-foreground hover:text-foreground"
                      >
                        Clear all
                      </Button>
                    )}
                  </div>

                  {/* School Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-brand" />
                      School
                    </label>
                    <div className="relative">
                      <Input
                        placeholder="Search universities..."
                        value={schoolQuery}
                        onChange={(e) => setSchoolQuery(e.target.value)}
                        className="bg-muted/30 border-border/40 focus:border-brand/50 backdrop-blur-sm"
                      />
                      {showSchoolDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-card/95 border-2 border-border/20 rounded-lg shadow-2xl backdrop-blur-xl max-h-48 overflow-y-auto">
                          {schoolResults.map((school) => (
                            <button
                              key={school.code}
                              onClick={() => {
                                setFilterSchool(school.name);
                                setSchoolQuery(school.name);
                                setShowSchoolDropdown(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-muted/30 transition-colors border-b border-border/10 last:border-b-0"
                            >
                              <div className="font-medium text-sm">{school.name}</div>
                              {school.city && school.state && (
                                <div className="text-xs text-muted-foreground">{school.city}, {school.state}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {filterSchool && (
                        <button
                          onClick={() => { setFilterSchool(""); setSchoolQuery(""); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Company Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-brand" />
                      Company
                    </label>
                    <CompanyAutocomplete
                      value={filterCompany}
                      onValueChange={setFilterCompany}
                      placeholder="Search companies..."
                      className="bg-muted/30 border-border/40 focus:border-brand/50"
                    />
                  </div>

                  {/* Graduation Year Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand" />
                      Graduation Year
                    </label>
                    <select
                      value={filterGradYear}
                      onChange={(e) => setFilterGradYear(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-muted/30 border-2 border-border/40 focus:border-brand/50 backdrop-blur-sm transition-all outline-none"
                    >
                      <option value="">All years</option>
                      {gradYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  {/* Location Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand" />
                      Location
                    </label>
                    <LocationAutocomplete
                      value={filterLocation}
                      onValueChange={setFilterLocation}
                      placeholder="Search locations worldwide..."
                      className="bg-muted/30 border-border/40 focus:border-brand/50"
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 space-y-6">
            {/* Search and Controls - Glassmorphic */}
            <Card className="relative p-6 border-2 border-border/20 bg-gradient-to-br from-card/80 via-card/60 to-transparent backdrop-blur-2xl overflow-hidden shadow-xl animate-in fade-in-0 slide-in-from-top-4 duration-700" style={{ animationDelay: '100ms' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-brand/5 via-purple-500/5 to-cyan-500/5 opacity-30" />

              <div className="relative flex flex-col lg:flex-row gap-4 items-center justify-between">
                {/* Search Bar with gradient border */}
                <div className="relative flex-1 max-w-md group">
                  <div className="absolute inset-0 bg-gradient-to-r from-brand via-purple-500 to-cyan-500 rounded-xl blur-sm opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                  <div className="relative">
                    <Settings className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Search by name, username, bio..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11 bg-muted/30 border-2 border-border/40 focus:border-brand/50 backdrop-blur-sm transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center hover:bg-muted transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  {/* Filter Toggle */}
                  <Button
                    onClick={() => setShowFilters(!showFilters)}
                    variant="outline"
                    className={cn(
                      "gap-2 transition-all duration-300",
                      showFilters && "bg-brand/10 border-brand/50 text-brand"
                    )}
                  >
                    <Settings className="w-4 h-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <Badge className="ml-1 bg-brand text-white">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>

                  {/* View Mode Toggle - iOS style */}
                  <div className="flex rounded-xl border-2 border-border/20 overflow-hidden bg-muted/20 backdrop-blur-sm">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        "p-2.5 transition-all duration-300",
                        viewMode === 'grid'
                          ? 'bg-gradient-to-r from-brand to-purple-500 text-white shadow-lg'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                      )}
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={cn(
                        "p-2.5 transition-all duration-300",
                        viewMode === 'list'
                          ? 'bg-gradient-to-r from-brand to-purple-500 text-white shadow-lg'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                      )}
                    >
                      <Users className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Filters Pills */}
              {activeFiltersCount > 0 && (
                <div className="relative mt-4 pt-4 border-t border-border/20 flex flex-wrap gap-2">
                  {filterSchool && (
                    <Badge variant="secondary" className="gap-2 pl-3 pr-2 py-1.5 bg-brand/10 border-brand/30 text-brand">
                      <GraduationCap className="w-3 h-3" />
                      {filterSchool}
                      <button onClick={() => { setFilterSchool(""); setSchoolQuery(""); }} className="hover:bg-brand/20 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {filterCompany && (
                    <Badge variant="secondary" className="gap-2 pl-3 pr-2 py-1.5 bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400">
                      <Briefcase className="w-3 h-3" />
                      {filterCompany}
                      <button onClick={() => setFilterCompany("")} className="hover:bg-purple-500/20 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {filterGradYear && (
                    <Badge variant="secondary" className="gap-2 pl-3 pr-2 py-1.5 bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                      <Calendar className="w-3 h-3" />
                      Class of {filterGradYear}
                      <button onClick={() => setFilterGradYear("")} className="hover:bg-cyan-500/20 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {filterLocation && (
                    <Badge variant="secondary" className="gap-2 pl-3 pr-2 py-1.5 bg-pink-500/10 border-pink-500/30 text-pink-600 dark:text-pink-400">
                      <MapPin className="w-3 h-3" />
                      {filterLocation}
                      <button onClick={() => setFilterLocation("")} className="hover:bg-pink-500/20 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </Card>

            {/* Tabs - Glassmorphic */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 border-2 border-border/20 bg-gradient-to-r from-card/80 via-card/60 to-card/80 backdrop-blur-2xl p-1 h-auto">
                <TabsTrigger
                  value="connections"
                  className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg py-3"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Connections</span>
                  <Badge variant="secondary" className="ml-1 bg-background/50">
                    {filteredConnections.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg py-3"
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">Pending</span>
                  <Badge variant="secondary" className="ml-1 bg-background/50">
                    {pendingRequests.filter(req => req.type === 'received').length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="sent"
                  className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg py-3"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Sent</span>
                  <Badge variant="secondary" className="ml-1 bg-background/50">
                    {pendingRequests.filter(req => req.type === 'sent').length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg py-3"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Activity</span>
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
                      <Button onClick={clearAllFilters} className="gap-2">
                        <X className="w-4 h-4" />
                        Clear Filters
                      </Button>
                    ) : (
                      <Button onClick={() => router.push('/discover')} className="gap-2 bg-gradient-to-r from-brand to-purple-500 hover:opacity-90">
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
                          onSelect={() => {}}
                          isSelected={false}
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
                      <Button onClick={() => router.push('/discover')} className="gap-2 bg-gradient-to-r from-brand to-purple-500 hover:opacity-90">
                        <Plus className="w-4 h-4" />
                        Find People to Connect With
                      </Button>
                    }
                  />
                )}
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-6 mt-6">
                <ActivityFeed />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}

// iOS 26-Style Connection Card
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
    <Link href={`/profile/${connection.user.username}`}>
      <Card className={cn(
        "group relative p-5 border-2 border-border/20 bg-gradient-to-br from-card/70 via-card/50 to-transparent backdrop-blur-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 animate-in fade-in-0 slide-in-from-bottom-4 hover:scale-[1.02] cursor-pointer",
        viewMode === 'list' && "flex items-center gap-4"
      )} style={{ animationDelay: `${index * 50}ms` }}>
        {/* Hover gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-purple-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl" />

        <div className={cn("relative flex items-start gap-4", viewMode === 'list' && "flex-1")}>
          {/* Avatar with glassmorphic border */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-brand via-purple-500 to-cyan-500 rounded-2xl blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
              {connection.user.avatar_url ? (
                <Image
                  src={connection.user.avatar_url}
                  alt={connection.user.full_name || 'User'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-brand to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                  {getInitials(connection.user.full_name || connection.user.username || 'U')}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background shadow-lg" />
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate group-hover:text-brand transition-colors">
              {connection.user.full_name || connection.user.username || 'Anonymous'}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              @{connection.user.username || 'user'}
            </p>

            {/* Metadata Pills */}
            <div className="flex flex-wrap gap-2 mt-3">
              {connection.user.university && (
                <Badge variant="secondary" className="text-xs bg-brand/10 text-brand border-brand/30">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  {connection.user.university}
                  {connection.user.graduation_year && ` '${connection.user.graduation_year.slice(-2)}`}
                </Badge>
              )}
              {connection.user.company && (
                <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                  <Briefcase className="w-3 h-3 mr-1" />
                  {connection.user.company}
                </Badge>
              )}
              {connection.user.location && (
                <Badge variant="secondary" className="text-xs bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30">
                  <MapPin className="w-3 h-3 mr-1" />
                  {connection.user.location}
                </Badge>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-3 text-sm">
              {connection.mutual_connections > 0 && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{connection.mutual_connections} mutual</span>
                </div>
              )}
              {connection.user.total_solved && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Trophy className="w-4 h-4" />
                  <span>{connection.user.total_solved} solved</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// iOS 26-Style Pending Request Card
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
    <Card className="group relative p-5 border-2 border-border/20 bg-gradient-to-br from-card/70 via-card/50 to-transparent backdrop-blur-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 animate-in fade-in-0 slide-in-from-bottom-4" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative flex items-center gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-2xl blur-md opacity-50" />
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
            {request.user.avatar_url ? (
              <Image
                src={request.user.avatar_url}
                alt={request.user.full_name || 'User'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-base">
                {getInitials(request.user.full_name || request.user.username || 'U')}
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-background shadow-lg animate-pulse" />
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base truncate">
              {request.user.full_name || request.user.username || 'Anonymous'}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            @{request.user.username || 'user'}
          </p>
          {request.message && (
            <p className="text-sm mt-2 italic text-muted-foreground line-clamp-2">
              "{request.message}"
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {request.type === 'received' ? (
            <>
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); onAccept(request.id, request.user.user_id); }}
                disabled={actionLoading === request.id}
                className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); onDecline(request.id, request.user.user_id); }}
                disabled={actionLoading === request.id}
                className="gap-2 border-red-500/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <X className="w-4 h-4" />
                Decline
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onCancel(request.id); }}
              disabled={actionLoading === request.id}
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
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
    <Card className="relative p-12 text-center border-2 border-border/20 bg-gradient-to-br from-card/70 via-card/50 to-transparent backdrop-blur-xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-muted/10 to-transparent" />
      <div className="relative">
        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10 backdrop-blur-sm">
          <Icon className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <h3 className="text-xl font-semibold mb-3">{title}</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
        {action}
      </div>
    </Card>
  );
}
