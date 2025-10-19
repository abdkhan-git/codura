"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Search, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Clock, 
  Shield, 
  MoreHorizontal,
  Filter,
  SortAsc,
  Grid3X3,
  List,
  X,
  Check,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import type { UserSearchResult } from "@/types/database";
import { SentRequestCard } from "@/components/social/sent-request-card";

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

export default function ConnectionsPage() {
  const { theme } = useTheme();
  const router = useRouter();
  
  // State
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("connections");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Bulk selection state
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

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

  // Fetch connections and pending requests
  useEffect(() => {
    fetchConnections();
    fetchPendingRequests();
  }, []);

  // Debounced search
  const debouncedSearch = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      if (activeTab === 'connections') {
        fetchConnections();
      } else {
        fetchPendingRequests();
      }
    }, 300);
  }, [searchQuery, activeTab]);

  useEffect(() => {
    debouncedSearch();
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [debouncedSearch]);

  const fetchConnections = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (sortBy) params.append('sort', sortBy);

      const response = await fetch(`/api/connections/my-connections?${params}`);
      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections || []);
      } else {
        console.error('Failed to fetch connections');
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);

      const response = await fetch(`/api/connections/pending-requests?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data.requests || []);
      } else {
        console.error('Failed to fetch pending requests');
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
        // Remove from pending and add to connections
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
        // Refresh connections to show the new connection
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

  // Bulk selection functions
  const handleSelectRequest = (requestId: string) => {
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

  const handleSelectAll = () => {
    const currentTabRequests = activeTab === 'pending' 
      ? pendingRequests.filter(req => req.type === 'received')
      : activeTab === 'sent'
      ? pendingRequests.filter(req => req.type === 'sent')
      : [];
    
    if (selectedRequests.size === currentTabRequests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(currentTabRequests.map(req => req.id)));
    }
  };

  const handleBulkAccept = async () => {
    if (selectedRequests.size === 0) return;
    
    setBulkActionLoading(true);
    const results = await Promise.allSettled(
      Array.from(selectedRequests).map(requestId => 
        fetch('/api/connections/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request_id: requestId }),
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    if (successful > 0) {
      toast.success(`${successful} connection${successful > 1 ? 's' : ''} accepted`);
      setPendingRequests(prev => prev.filter(req => !selectedRequests.has(req.id)));
      setConnections(prev => [...prev, ...pendingRequests.filter(req => selectedRequests.has(req.id)).map(req => ({
        user: req.user,
        connected_at: new Date().toISOString(),
        mutual_connections: 0
      }))]);
    }
    
    if (failed > 0) {
      toast.error(`${failed} request${failed > 1 ? 's' : ''} failed to accept`);
    }

    setSelectedRequests(new Set());
    setBulkActionLoading(false);
  };

  const handleBulkDecline = async () => {
    if (selectedRequests.size === 0) return;
    
    setBulkActionLoading(true);
    const results = await Promise.allSettled(
      Array.from(selectedRequests).map(requestId => 
        fetch('/api/connections/decline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request_id: requestId }),
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    if (successful > 0) {
      toast.success(`${successful} request${successful > 1 ? 's' : ''} declined`);
      setPendingRequests(prev => prev.filter(req => !selectedRequests.has(req.id)));
    }
    
    if (failed > 0) {
      toast.error(`${failed} request${failed > 1 ? 's' : ''} failed to decline`);
    }

    setSelectedRequests(new Set());
    setBulkActionLoading(false);
  };

  const handleBulkCancel = async () => {
    if (selectedRequests.size === 0) return;
    
    setBulkActionLoading(true);
    const results = await Promise.allSettled(
      Array.from(selectedRequests).map(requestId => 
        fetch('/api/connections/cancel', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request_id: requestId }),
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    if (successful > 0) {
      toast.success(`${successful} request${successful > 1 ? 's' : ''} canceled`);
      setPendingRequests(prev => prev.filter(req => !selectedRequests.has(req.id)));
    }
    
    if (failed > 0) {
      toast.error(`${failed} request${failed > 1 ? 's' : ''} failed to cancel`);
    }

    setSelectedRequests(new Set());
    setBulkActionLoading(false);
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
                ? "from-blue-500 to-cyan-500 shadow-blue-500/25 bg-white/20" 
                : "from-blue-600 to-cyan-600 shadow-blue-500/25 bg-white/5"
            )}>
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-brand to-purple-400 bg-clip-text text-transparent">
            My Connections
          </h1>
              <p className="text-muted-foreground">Manage your professional network</p>
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <Card className={cn(
          "p-6 mb-8 border-2 backdrop-blur-xl transition-all duration-300",
          theme === 'light' 
            ? "bg-white/80 border-black/5 hover:border-blue-500/20 shadow-lg" 
            : "bg-zinc-950/80 border-white/5 hover:border-blue-500/20 shadow-lg"
        )}>
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none",
                theme === 'light' ? "text-zinc-400" : "text-zinc-500"
              )} />
              <Input
                type="text"
                placeholder="Search connections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "pl-10 h-11 border-2 transition-all duration-300",
                  theme === 'light' 
                    ? "bg-white/60 border-zinc-200 focus:border-blue-500 focus:ring-blue-500/20" 
                    : "bg-zinc-900/60 border-zinc-800 focus:border-blue-500 focus:ring-blue-500/20"
                )}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-all",
                    theme === 'light' 
                      ? "hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600" 
                      : "hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
        </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Bulk Actions (only show for pending/sent tabs) */}
              {(activeTab === 'pending' || activeTab === 'sent') && selectedRequests.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedRequests.size} selected
                  </span>
                  {activeTab === 'pending' && (
                    <>
                      <Button
                        onClick={handleBulkAccept}
                        disabled={bulkActionLoading}
                        size="sm"
                        className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="w-4 h-4" />
                        Accept All
                      </Button>
                      <Button
                        onClick={handleBulkDecline}
                        disabled={bulkActionLoading}
                        size="sm"
                        variant="destructive"
                        className="gap-2"
                      >
                        <X className="w-4 h-4" />
                        Decline All
                      </Button>
                    </>
                  )}
                  {activeTab === 'sent' && (
                    <Button
                      onClick={handleBulkCancel}
                      disabled={bulkActionLoading}
                      size="sm"
                      variant="destructive"
                      className="gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel All
                    </Button>
                  )}
                </div>
              )}

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={cn(
                  "px-3 py-2 rounded-lg border-2 text-sm transition-all duration-300",
                  theme === 'light' 
                    ? "bg-white/60 border-zinc-200 focus:border-blue-500" 
                    : "bg-zinc-900/60 border-zinc-800 focus:border-blue-500"
                )}
              >
                <option value="recent">Recently Added</option>
                <option value="name">Name A-Z</option>
                <option value="activity">Most Active</option>
                <option value="mutual">Most Mutual</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex rounded-lg border-2 overflow-hidden" style={{
                borderColor: theme === 'light' ? '#e4e4e7' : '#27272a'
              }}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 transition-all duration-300",
                    viewMode === 'grid' 
                      ? (theme === 'light' ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white')
                      : (theme === 'light' ? 'bg-white/60 text-zinc-600 hover:bg-zinc-100' : 'bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800')
                  )}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 transition-all duration-300",
                    viewMode === 'list' 
                      ? (theme === 'light' ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white')
                      : (theme === 'light' ? 'bg-white/60 text-zinc-600 hover:bg-zinc-100' : 'bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800')
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn(
            "grid w-full grid-cols-4 mb-8 border-2 backdrop-blur-xl",
            theme === 'light' 
              ? "bg-white/80 border-black/5" 
              : "bg-zinc-950/80 border-white/5"
          )}>
            <TabsTrigger 
              value="connections" 
              className="gap-2 data-[state=active]:bg-brand data-[state=active]:text-white"
            >
              <UserCheck className="w-4 h-4" />
              Connections ({connections.length})
            </TabsTrigger>
            <TabsTrigger 
              value="pending" 
              className="gap-2 data-[state=active]:bg-brand data-[state=active]:text-white"
            >
              <Clock className="w-4 h-4" />
              Pending ({pendingRequests.filter(req => req.type === 'received').length})
            </TabsTrigger>
            <TabsTrigger 
              value="sent" 
              className="gap-2 data-[state=active]:bg-brand data-[state=active]:text-white"
            >
              <UserPlus className="w-4 h-4" />
              Sent ({pendingRequests.filter(req => req.type === 'sent').length})
            </TabsTrigger>
            <TabsTrigger 
              value="activity" 
              className="gap-2 data-[state=active]:bg-brand data-[state=active]:text-white"
            >
              <AlertCircle className="w-4 h-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Connections Tab */}
          <TabsContent value="connections" className="space-y-6">
            {connections.length > 0 ? (
              <div className={cn(
                "grid gap-6",
                viewMode === 'grid' 
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
                  : "grid-cols-1"
              )}>
                {connections.map((connection, index) => (
                  <ConnectionCard
                    key={connection.user.user_id}
                    connection={connection}
                    onUnfriend={handleUnfriend}
                    actionLoading={actionLoading}
                    viewMode={viewMode}
                    theme={theme}
                    index={index}
                  />
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
            <Users className={cn(
                    "w-10 h-10",
                    theme === 'light' ? "text-zinc-400" : "text-zinc-600"
                  )} />
                </div>
                <h3 className={cn(
                  "text-xl font-semibold mb-3",
                  theme === 'light' ? "text-zinc-900" : "text-white"
                )}>
                  No connections yet
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Start building your network by discovering and connecting with other developers.
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
          </TabsContent>

          {/* Pending Requests Tab */}
          <TabsContent value="pending" className="space-y-6">
            {pendingRequests.filter(req => req.type === 'received').length > 0 ? (
              <>
                {/* Select All Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleSelectAll}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRequests.size === pendingRequests.filter(req => req.type === 'received').length && selectedRequests.size > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4"
                      />
                      Select All
                    </Button>
                    {selectedRequests.size > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {selectedRequests.size} of {pendingRequests.filter(req => req.type === 'received').length} selected
                      </span>
                    )}
                  </div>
                </div>

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
                        onSelect={handleSelectRequest}
                        isSelected={selectedRequests.has(request.id)}
                        actionLoading={actionLoading}
                        theme={theme}
                        index={index}
                      />
                    ))}
                </div>
              </>
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
                  <Clock className={cn(
                    "w-10 h-10",
                    theme === 'light' ? "text-zinc-400" : "text-zinc-600"
                  )} />
                </div>
                <h3 className={cn(
                  "text-xl font-semibold mb-3",
                  theme === 'light' ? "text-zinc-900" : "text-white"
                )}>
                  No pending requests
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  You don't have any pending connection requests at the moment.
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Sent Requests Tab */}
          <TabsContent value="sent" className="space-y-6">
            {pendingRequests.filter(req => req.type === 'sent').length > 0 ? (
              <>
                {/* Select All Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleSelectAll}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRequests.size === pendingRequests.filter(req => req.type === 'sent').length && selectedRequests.size > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4"
                      />
                      Select All
                    </Button>
                    {selectedRequests.size > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {selectedRequests.size} of {pendingRequests.filter(req => req.type === 'sent').length} selected
                      </span>
                    )}
                  </div>
                </div>

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
                        onSelect={handleSelectRequest}
                        isSelected={selectedRequests.has(request.id)}
                        actionLoading={actionLoading}
                        viewMode={viewMode}
                        theme={theme}
                        index={index}
                      />
                    ))}
                </div>
              </>
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
                  <UserPlus className={cn(
                    "w-10 h-10",
                    theme === 'light' ? "text-zinc-400" : "text-zinc-600"
                  )} />
                </div>
                <h3 className={cn(
                  "text-xl font-semibold mb-3",
                  theme === 'light' ? "text-zinc-900" : "text-white"
                )}>
                  No sent requests
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  You haven't sent any connection requests yet.
                </p>
                <Button
                  onClick={() => router.push('/discover')}
                  className="gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Find People to Connect With
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
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
                <AlertCircle className={cn(
                  "w-10 h-10",
              theme === 'light' ? "text-zinc-400" : "text-zinc-600"
            )} />
          </div>
          <h3 className={cn(
                "text-xl font-semibold mb-3",
            theme === 'light' ? "text-zinc-900" : "text-white"
          )}>
                Activity Timeline
          </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Track all your connection activity, requests, and network growth.
              </p>
              <p className="text-sm text-muted-foreground">
                Coming soon - Activity timeline feature
          </p>
        </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Connection Card Component
function ConnectionCard({ 
  connection, 
  onUnfriend, 
  actionLoading, 
  viewMode, 
  theme, 
  index 
}: {
  connection: ConnectionData;
  onUnfriend: (userId: string) => void;
  actionLoading: string | null;
  viewMode: 'grid' | 'list';
  theme: string | undefined;
  index: number;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <Card className={cn(
      "p-6 border-2 backdrop-blur-xl transition-all duration-300 hover:shadow-lg animate-in fade-in-0 slide-in-from-bottom-4",
      theme === 'light' 
        ? "bg-white/80 border-black/5 hover:border-blue-500/20" 
        : "bg-zinc-950/80 border-white/5 hover:border-blue-500/20",
      viewMode === 'list' && "flex items-center gap-4"
    )} style={{ animationDelay: `${index * 50}ms` }}>
      <div className={cn("flex items-start gap-4", viewMode === 'list' && "flex-1")}>
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold shadow-lg",
            "bg-gradient-to-br from-brand to-orange-300 text-white shadow-brand/20"
          )}>
            {connection.user.avatar_url ? (
              <img
                src={connection.user.avatar_url}
                alt={connection.user.full_name || connection.user.username || 'User'}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  console.log('Connection avatar image failed to load:', connection.user.avatar_url);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              (connection.user.full_name || connection.user.username || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
        </div>

        {/* User Info */}
        <div className={cn("flex-1 min-w-0", viewMode === 'list' && "flex items-center justify-between")}>
          <div className="min-w-0">
            <h3 className={cn(
              "font-semibold text-lg truncate",
              theme === 'light' ? "text-zinc-900" : "text-white"
            )}>
              {connection.user.full_name || connection.user.username || 'Anonymous'}
            </h3>
            <p className={cn(
              "text-sm truncate",
              theme === 'light' ? "text-zinc-600" : "text-zinc-400"
            )}>
              @{connection.user.username || 'user'}
            </p>
            {connection.user.job_title && (
              <p className={cn(
                "text-xs mt-1",
                theme === 'light' ? "text-zinc-500" : "text-zinc-500"
              )}>
                {connection.user.job_title}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className={cn(
            "flex items-center gap-4 mt-3",
            viewMode === 'list' && "mt-0"
          )}>
            <div className="text-center">
              <div className={cn(
                "text-lg font-semibold",
                theme === 'light' ? "text-zinc-900" : "text-white"
              )}>
                {connection.mutual_connections}
              </div>
              <div className={cn(
                "text-xs",
                theme === 'light' ? "text-zinc-500" : "text-zinc-500"
              )}>
                Mutual
              </div>
            </div>
            <div className="text-center">
              <div className={cn(
                "text-lg font-semibold",
                theme === 'light' ? "text-zinc-900" : "text-white"
              )}>
                {connection.user.total_solved || 0}
              </div>
              <div className={cn(
                "text-xs",
                theme === 'light' ? "text-zinc-500" : "text-zinc-500"
              )}>
                Solved
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActions(!showActions)}
            className="p-2"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>

          {showActions && (
            <div className={cn(
              "absolute right-0 top-8 w-48 p-2 rounded-lg border-2 backdrop-blur-xl shadow-lg z-10",
              theme === 'light' 
                ? "bg-white/90 border-black/5" 
                : "bg-zinc-900/90 border-white/5"
            )}>
              <button
                onClick={() => {
                  onUnfriend(connection.user.user_id);
                  setShowActions(false);
                }}
                disabled={actionLoading === connection.user.user_id}
                className={cn(
                  "w-full p-2 text-left text-sm rounded-md transition-colors",
                  theme === 'light' 
                    ? "text-red-600 hover:bg-red-50" 
                    : "text-red-400 hover:bg-red-500/10"
                )}
              >
                {actionLoading === connection.user.user_id ? 'Removing...' : 'Remove Connection'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// Pending Request Card Component
function PendingRequestCard({ 
  request, 
  onAccept, 
  onDecline, 
  onCancel, 
  onSelect,
  isSelected,
  actionLoading, 
  theme, 
  index 
}: {
  request: PendingRequest;
  onAccept: (requestId: string, userId: string) => void;
  onDecline: (requestId: string, userId: string) => void;
  onCancel: (requestId: string) => void;
  onSelect?: (requestId: string) => void;
  isSelected?: boolean;
  actionLoading: string | null;
  theme: string | undefined;
  index: number;
}) {
  return (
    <Card className={cn(
      "p-6 border-2 backdrop-blur-xl transition-all duration-300 hover:shadow-lg animate-in fade-in-0 slide-in-from-bottom-4",
      theme === 'light' 
        ? "bg-white/80 border-black/5 hover:border-blue-500/20" 
        : "bg-zinc-950/80 border-white/5 hover:border-blue-500/20",
      isSelected && "ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-500/10"
    )} style={{ animationDelay: `${index * 50}ms` }}>
      <div className="flex items-center gap-4">
        {/* Selection Checkbox */}
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={() => onSelect(request.id)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
        )}
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold shadow-lg",
            "bg-gradient-to-br from-brand to-orange-300 text-white shadow-brand/20"
          )}>
            {request.user.avatar_url ? (
              <img
                src={request.user.avatar_url}
                alt={request.user.full_name || request.user.username || 'User'}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  console.log('Pending request avatar image failed to load:', request.user.avatar_url);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              (request.user.full_name || request.user.username || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-background"></div>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              "font-semibold text-lg truncate",
              theme === 'light' ? "text-zinc-900" : "text-white"
            )}>
              {request.user.full_name || request.user.username || 'Anonymous'}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {request.type === 'received' ? 'Received' : 'Sent'}
            </Badge>
          </div>
          <p className={cn(
            "text-sm truncate",
            theme === 'light' ? "text-zinc-600" : "text-zinc-400"
          )}>
            @{request.user.username || 'user'}
          </p>
          {request.message && (
            <p className={cn(
              "text-sm mt-2 italic",
              theme === 'light' ? "text-zinc-500" : "text-zinc-500"
            )}>
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
                onClick={() => onAccept(request.id, request.user.user_id)}
                disabled={actionLoading === request.id}
                className="gap-2 bg-green-500 hover:bg-green-600 text-white"
              >
                <Check className="w-4 h-4" />
                {actionLoading === request.id ? 'Accepting...' : 'Accept'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDecline(request.id, request.user.user_id)}
                disabled={actionLoading === request.id}
                className="gap-2 text-red-600 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
                Decline
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCancel(request.id)}
              disabled={actionLoading === request.id}
              className="gap-2 text-zinc-600 hover:bg-zinc-100"
            >
              <X className="w-4 h-4" />
              {actionLoading === request.id ? 'Canceling...' : 'Cancel'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}