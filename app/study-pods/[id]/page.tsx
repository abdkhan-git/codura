"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { io, Socket } from 'socket.io-client';
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  CheckCircle2,
  Loader2,
  LogOut,
  ChevronLeft,
  Plus,
  Settings,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// Components
import { PodSidebar, PodSection } from "@/components/study-pods/pod-sidebar";
import { PodOverview } from "@/components/study-pods/pod-overview";
import { LiveSessionsSection } from "@/components/study-pods/live-sessions-section";
import { InviteMembersModal } from "@/components/study-pods/invite-members-modal";
import { EditPodModal } from "@/components/study-pods/edit-pod-modal";
import { ManagePodModal } from "@/components/study-pods/manage-pod-modal";
import { PodProblemsList } from "@/components/study-pods/pod-problems-list";
import { AssignProblemsModal } from "@/components/study-pods/assign-problems-modal";
import { CreateChallengeModal } from "@/components/study-pods/create-challenge-modal";
import { ChallengeCard } from "@/components/study-pods/challenge-card";
import { ChallengeDetailModal } from "@/components/study-pods/challenge-detail-modal";
import { MembersTabSection } from "@/components/study-pods/members-tab-section";
import { ProblemDiscussionThread } from "@/components/study-pods/problem-discussion-thread";
import { PodSettingsForm } from "@/components/study-pods/pod-settings-form";

export default function StudyPodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { theme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Core state
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [pod, setPod] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [podId, setPodId] = useState<string>("");
  const [activeSection, setActiveSection] = useState<PodSection>("overview");

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showManagePodModal, setShowManagePodModal] = useState(false);
  const [showAssignProblemsModal, setShowAssignProblemsModal] = useState(false);
  const [showCreateChallengeModal, setShowCreateChallengeModal] = useState(false);
  const [showChallengeDetailModal, setShowChallengeDetailModal] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [showDiscussionModal, setShowDiscussionModal] = useState(false);
  const [discussionProblemId, setDiscussionProblemId] = useState<string | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Challenges state
  const [challenges, setChallenges] = useState<any[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [challengeFilter, setChallengeFilter] = useState<'all' | 'active' | 'upcoming' | 'completed'>('active');

  // Pending requests count for badge
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Socket.io ref for real-time updates
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    const initializeParams = async () => {
      const { id } = await params;
      setPodId(id);
    };
    initializeParams();
  }, [params]);

  // Handle URL parameters for tab navigation and actions
  useEffect(() => {
    const tab = searchParams.get('tab');
    const action = searchParams.get('action');

    // Handle tab parameter
    if (tab && ['overview', 'live-sessions', 'practice', 'challenges', 'members', 'settings'].includes(tab)) {
      setActiveSection(tab as PodSection);

      // Clear URL params after handling to prevent stuck state
      if (action) {
        setTimeout(() => {
          const url = new URL(window.location.href);
          url.searchParams.delete('action');
          window.history.replaceState({}, '', url.toString());
        }, 100);
      }
    }

    // Handle action parameter
    if (action) {
      switch (action) {
        case 'invite':
          setShowInviteModal(true);
          break;
        case 'assign':
          setShowAssignProblemsModal(true);
          break;
        case 'create':
          // Check which tab we're on to determine which modal to open
          if (tab === 'challenges') {
            setShowCreateChallengeModal(true);
          } else if (tab === 'sessions' || tab === 'live-sessions') {
            toast.info('Session creation coming soon!');
          }
          break;
      }
    }
  }, [searchParams]);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        const transformedUser = {
          name: data.profile?.full_name || data.user?.email?.split('@')[0] || 'User',
          email: data.user?.email || '',
          avatar: data.profile?.avatar_url || '',
          username: data.profile?.username || '',
          id: data.user?.id,
        };
        setUser(transformedUser);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  useEffect(() => {
    if (podId) {
      fetchPodDetails();
      fetchSessions();
      fetchChallenges();
    }
  }, [podId]);

  // Set up real-time updates via Socket.io
  useEffect(() => {
    if (!podId || !user?.id) return;

    // Initialize Socket.io connection
    const socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
      auth: { userId: user.id },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to real-time updates');
      // Join pod room for updates
      socket.emit('join_pod', podId);
    });

    // Listen for session updates
    socket.on('session_created', (data: any) => {
      if (data.podId === podId) {
        console.log('🆕 New session created');
        fetchSessions(); // Refresh sessions
        toast.success('New session scheduled!');
      }
    });

    socket.on('session_updated', (data: any) => {
      if (data.podId === podId) {
        console.log('📝 Session updated');
        fetchSessions(); // Refresh sessions
      }
    });

    socket.on('session_started', (data: any) => {
      if (data.podId === podId) {
        console.log('🚀 Session started');
        fetchSessions(); // Refresh sessions
        toast.success(`Session "${data.title}" is now live!`);
      }
    });

    socket.on('pod_updated', (data: any) => {
      if (data.podId === podId) {
        console.log('📝 Pod details updated');
        fetchPodDetails(); // Refresh pod details
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from real-time updates');
    });

    return () => {
      socket.emit('leave_pod', podId);
      socket.disconnect();
    };
  }, [podId, user]);

  const fetchPodDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/study-pods/${podId}`);

      if (!response.ok) {
        toast.error("Failed to load study pod");
        router.push("/study-pods");
        return;
      }

      const data = await response.json();
      setPod(data.pod);

      // Count pending requests if admin
      if (data.pod?.pending_requests) {
        setPendingRequestsCount(data.pod.pending_requests.length);
      }
    } catch (error) {
      console.error("Error fetching pod:", error);
      toast.error("Failed to load study pod");
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    if (!podId) return;

    setSessionsLoading(true);
    try {
      const response = await fetch(`/api/study-pods/${podId}/sessions`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchChallenges = async (filter: string = challengeFilter) => {
    if (!podId) return;

    setChallengesLoading(true);
    try {
      const response = await fetch(`/api/study-pods/${podId}/challenges?filter=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setChallenges(data.challenges || []);
      }
    } catch (error) {
      console.error("Error fetching challenges:", error);
    } finally {
      setChallengesLoading(false);
    }
  };

  useEffect(() => {
    if (podId) {
      fetchChallenges();
    }
  }, [challengeFilter, podId]);

  const handleJoin = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/study-pods/${podId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to join pod");
        return;
      }

      if (data.requires_approval) {
        toast.success(data.message || "Join request sent for approval");
      } else {
        toast.success(data.message || "Successfully joined the study pod!");
      }

      fetchPodDetails();
    } catch (error) {
      console.error("Error joining pod:", error);
      toast.error("Failed to join pod");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this pod?")) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/study-pods/${podId}/leave`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to leave pod");
        return;
      }

      toast.success("Left the study pod");
      router.push("/study-pods");
    } catch (error) {
      console.error("Error leaving pod:", error);
      toast.error("Failed to leave pod");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGroupChat = () => {
    if (pod?.group_chat_id) {
      router.push(`/messages?conversation=${pod.group_chat_id}`);
    }
  };

  // Get live sessions count for sidebar badge - filter out stale "in_progress" sessions
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const liveSessionsCount = sessions.filter(s => {
    if (s.status !== "in_progress") return false;
    // Only count as live if scheduled within last 24 hours
    const scheduledAt = new Date(s.scheduled_at);
    return !isNaN(scheduledAt.getTime()) && scheduledAt > twentyFourHoursAgo;
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {user && <DashboardNavbar user={user} />}
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  if (!pod) {
    return null;
  }

  const isAdmin = pod.user_role === "owner" || pod.user_role === "moderator";

  return (
    <div className="min-h-screen bg-background">
      {user && <DashboardNavbar user={user} />}

      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-green-500/5 to-emerald-500/8 dark:from-green-500/8 dark:to-emerald-500/12 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-cyan-500/3 to-blue-500/6 dark:from-cyan-500/6 dark:to-blue-500/10 rounded-full blur-[100px] animate-float-slow" />
      </div>

      {/* Main Layout */}
      <div className="relative z-10 pt-16 min-h-screen flex flex-col">
        {/* Header Bar - Compact */}
        <header className={cn(
          "border-b px-6 py-3 sticky top-16 z-20",
          theme === "light" ? "border-gray-200 bg-white/95" : "border-white/5 bg-zinc-950/95",
          "backdrop-blur-xl"
        )}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/study-pods"
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    theme === "light"
                      ? "hover:bg-gray-100 text-gray-600"
                      : "hover:bg-white/5 text-white/60"
                  )}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className={cn(
                    "text-xl font-bold",
                    theme === "light" ? "text-gray-900" : "text-white"
                  )}>
                    {pod.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                      {pod.subject}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {pod.skill_level}
                    </Badge>
                    <span className={cn(
                      "text-xs",
                      theme === "light" ? "text-gray-500" : "text-white/50"
                    )}>
                      {pod.members?.length || 0}/{pod.max_members} members
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {pod.is_member ? (
                  <>
                    {isAdmin && (
                      <>
                        <Button
                          onClick={() => setShowManagePodModal(true)}
                          size="sm"
                          variant="outline"
                          className={cn(
                            "border-emerald-500/30",
                            theme === "light"
                              ? "hover:bg-emerald-50"
                              : "hover:bg-emerald-500/10"
                          )}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Manage Pod
                        </Button>
                        <Button
                          onClick={() => setShowInviteModal(true)}
                          size="sm"
                          className="bg-gradient-to-r from-green-500 to-emerald-500"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Invite
                        </Button>
                      </>
                    )}
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-500"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Joined
                    </Badge>
                  </>
                ) : (
                  <Button
                    onClick={handleJoin}
                    disabled={actionLoading}
                    className="bg-gradient-to-r from-green-500 to-emerald-500"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {pod.join_status?.requires_approval ? "Request to Join" : "Join Pod"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area with Sidebar */}
        <div className="flex-1 flex min-h-0">
          {/* Sidebar - Seamless connection */}
          <PodSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            userRole={pod.user_role}
            requiresApproval={pod.requires_approval}
            pendingRequests={pendingRequestsCount}
            groupChatId={pod.group_chat_id}
            onGroupChat={handleGroupChat}
            activeSessions={liveSessionsCount}
          />

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-5xl mx-auto">
              {/* Overview Section */}
              {activeSection === "overview" && (
                <PodOverview
                  pod={pod}
                  sessions={sessions}
                  challenges={challenges}
                  onNavigate={setActiveSection}
                  onStartSession={() => setActiveSection("live-sessions")}
                  onCreateChallenge={() => setShowCreateChallengeModal(true)}
                  onOpenDiscussion={(problemId: string) => {
                    setDiscussionProblemId(problemId);
                    setShowDiscussionModal(true);
                  }}
                />
              )}

              {/* Live Sessions Section */}
              {activeSection === "live-sessions" && (
                <LiveSessionsSection
                  podId={podId}
                  pod={pod}
                  sessions={sessions}
                  sessionsLoading={sessionsLoading}
                  onRefresh={() => {
                    fetchSessions();
                    fetchPodDetails();
                  }}
                  user={user}
                />
              )}

              {/* Practice Section */}
              {activeSection === "practice" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={cn(
                        "text-xl font-bold",
                        theme === "light" ? "text-gray-900" : "text-white"
                      )}>
                        Practice Problems
                      </h2>
                      <p className={cn(
                        "text-sm",
                        theme === "light" ? "text-gray-600" : "text-white/60"
                      )}>
                        Assigned problems for your pod to practice together
                      </p>
                    </div>
                    {isAdmin && (
                      <Button
                        onClick={() => setShowAssignProblemsModal(true)}
                        className="bg-gradient-to-r from-green-500 to-emerald-500"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Assign Problems
                      </Button>
                    )}
                  </div>
                  <PodProblemsList
                    podId={podId}
                    currentUserRole={pod.user_role}
                    totalMembers={pod.members?.length || 0}
                    currentUserId={user?.id}
                  />
                </div>
              )}

              {/* Challenges Section */}
              {activeSection === "challenges" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {(['active', 'upcoming', 'all', 'completed'] as const).map((filter) => (
                        <Button
                          key={filter}
                          variant={challengeFilter === filter ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setChallengeFilter(filter)}
                          className={challengeFilter === filter ? 'bg-gradient-to-r from-amber-500 to-orange-500' : ''}
                        >
                          {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </Button>
                      ))}
                    </div>

                    {isAdmin && (
                      <Button
                        onClick={() => setShowCreateChallengeModal(true)}
                        className="bg-gradient-to-r from-amber-500 to-orange-500"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Challenge
                      </Button>
                    )}
                  </div>

                  {challengesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    </div>
                  ) : challenges.length > 0 ? (
                    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                      {challenges.map((challenge) => (
                        <ChallengeCard
                          key={challenge.id}
                          challenge={challenge}
                          participation={challenge.user_participation}
                          onJoin={async () => {
                            const response = await fetch(`/api/study-pods/challenges/${challenge.id}/join`, {
                              method: 'POST',
                            });
                            if (response.ok) {
                              toast.success("Joined challenge!");
                              fetchChallenges();
                            } else {
                              const data = await response.json();
                              toast.error(data.error || "Failed to join challenge");
                            }
                          }}
                          onViewDetails={() => {
                            setSelectedChallengeId(challenge.id);
                            setShowChallengeDetailModal(true);
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className={cn(
                      "text-center py-12 rounded-xl border-2",
                      theme === "light" ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/5"
                    )}>
                      <Trophy className={cn(
                        "w-12 h-12 mx-auto mb-4",
                        theme === "light" ? "text-gray-400" : "text-white/30"
                      )} />
                      <p className={cn(
                        "text-lg font-medium mb-2",
                        theme === "light" ? "text-gray-900" : "text-white"
                      )}>
                        No {challengeFilter !== 'all' ? challengeFilter : ''} challenges
                      </p>
                      {isAdmin && (
                        <Button
                          onClick={() => setShowCreateChallengeModal(true)}
                          className="mt-4 bg-gradient-to-r from-amber-500 to-orange-500"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Challenge
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Members Section */}
              {activeSection === "members" && (
                <MembersTabSection
                  pod={pod}
                  podId={podId}
                  isAdmin={isAdmin}
                  pendingCount={pendingRequestsCount}
                  onInvite={() => setShowInviteModal(true)}
                  onLeave={handleLeave}
                  onUpdate={fetchPodDetails}
                  actionLoading={actionLoading}
                />
              )}

              {/* Settings Section */}
              {activeSection === "settings" && isAdmin && (
                <div className="space-y-6">
                  <div>
                    <h2 className={cn(
                      "text-2xl font-bold bg-gradient-to-r from-foreground via-emerald-400 to-cyan-400 bg-clip-text text-transparent",
                    )}>
                      Pod Settings
                    </h2>
                    <p className={cn(
                      "text-sm mt-1",
                      theme === "light" ? "text-gray-600" : "text-muted-foreground"
                    )}>
                      Manage your study pod settings and preferences
                    </p>
                  </div>

                  <PodSettingsForm
                    pod={pod}
                    userRole={pod?.user_role}
                    onSuccess={fetchPodDetails}
                  />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Modals */}
      <InviteMembersModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        podId={podId}
        onSuccess={fetchPodDetails}
      />

      <EditPodModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        pod={pod}
        userRole={pod?.user_role}
        onSuccess={fetchPodDetails}
      />

      <ManagePodModal
        isOpen={showManagePodModal}
        onClose={() => setShowManagePodModal(false)}
        podId={podId}
        onRefresh={fetchPodDetails}
      />

      <AssignProblemsModal
        isOpen={showAssignProblemsModal}
        onClose={() => setShowAssignProblemsModal(false)}
        podId={podId}
        onSuccess={() => setShowAssignProblemsModal(false)}
      />

      <CreateChallengeModal
        isOpen={showCreateChallengeModal}
        onClose={() => setShowCreateChallengeModal(false)}
        podId={podId}
        onChallengeCreated={() => {
          fetchChallenges();
          fetchPodDetails();
        }}
      />

      {selectedChallengeId && (
        <ChallengeDetailModal
          isOpen={showChallengeDetailModal}
          onClose={() => {
            setShowChallengeDetailModal(false);
            setSelectedChallengeId(null);
          }}
          challengeId={selectedChallengeId}
          podId={podId}
          onJoined={fetchChallenges}
          isAdmin={isAdmin}
        />
      )}

      {discussionProblemId && (
        <ProblemDiscussionThread
          podId={podId}
          problemId={discussionProblemId}
          currentUserId={user?.id}
          isAdmin={isAdmin}
          isOpen={showDiscussionModal}
          onClose={() => {
            setShowDiscussionModal(false);
            setDiscussionProblemId(null);
          }}
        />
      )}
    </div>
  );
}