"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Users,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  Loader2,
  LogOut,
  ChevronLeft,
  Star,
  Plus,
  UserPlus,
  Shield,
  Settings,
  ListPlus,
  Target,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { MemberCard } from "@/components/study-pods/member-card";
import { InviteMembersModal } from "@/components/study-pods/invite-members-modal";
import { JoinRequestsSection } from "@/components/study-pods/join-requests-section";
import { EditPodModal } from "@/components/study-pods/edit-pod-modal";
import { PodProblemsList } from "@/components/study-pods/pod-problems-list";
import { AssignProblemsModal } from "@/components/study-pods/assign-problems-modal";
import { CreateSessionModal } from "@/components/study-pods/create-session-modal";
import { SessionCard } from "@/components/study-pods/session-card";
import { SessionDetailModal } from "@/components/study-pods/session-detail-modal";

export default function StudyPodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [pod, setPod] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [podId, setPodId] = useState<string>("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignProblemsModal, setShowAssignProblemsModal] = useState(false);
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [showSessionDetailModal, setShowSessionDetailModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionFilter, setSessionFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

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

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        console.log("Study Pod Detail - Fetched user data:", data);
        // Transform the data to match DashboardNavbar expectations
        const transformedUser = {
          name: data.profile?.full_name || data.user?.email?.split('@')[0] || 'User',
          email: data.user?.email || '',
          avatar: data.profile?.avatar_url || '',
          username: data.profile?.username || '',
        };
        console.log("Study Pod Detail - Transformed user data:", transformedUser);
        setUser(transformedUser);
      } else {
        console.error("Study Pod Detail - Failed to fetch user data:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  useEffect(() => {
    if (podId) {
      fetchPodDetails();
    }
  }, [podId]);

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
      fetchSessions(); // Fetch sessions after pod is loaded
    } catch (error) {
      console.error("Error fetching pod:", error);
      toast.error("Failed to load study pod");
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async (filter: string = sessionFilter) => {
    if (!podId) return;

    setSessionsLoading(true);
    try {
      const response = await fetch(`/api/study-pods/${podId}/sessions?filter=${filter}`);
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

  // Fetch sessions when filter changes
  useEffect(() => {
    if (podId) {
      fetchSessions();
    }
  }, [sessionFilter, podId]);

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

  return (
    <div className="min-h-screen bg-background">
      {user && <DashboardNavbar user={user} />}

      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-green-500/5 to-emerald-500/8 dark:from-green-500/8 dark:to-emerald-500/12 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-cyan-500/3 to-blue-500/6 dark:from-cyan-500/6 dark:to-blue-500/10 rounded-full blur-[100px] animate-float-slow" />
      </div>

      {/* Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-16">
        {/* Back Button */}
        <Link
          href="/study-pods"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Study Pods
        </Link>

        {/* Header */}
        <div className={cn(
          "mb-8 p-6 rounded-xl border-2 backdrop-blur-xl",
          theme === 'light'
            ? "bg-white border-gray-200"
            : "border-white/5 bg-zinc-950/80"
        )}>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className={cn(
                "text-3xl font-bold mb-2",
                theme === 'light' ? "text-gray-900" : "text-white"
              )}>{pod.name}</h1>
              <p className={cn(
                "mb-4",
                theme === 'light' ? "text-gray-600" : "text-muted-foreground"
              )}>{pod.description}</p>

              <div className="flex flex-wrap gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  {pod.subject}
                </Badge>
                <Badge variant="outline">{pod.skill_level}</Badge>
                <Badge variant="outline">
                  {pod.members?.length || 0}/{pod.max_members} members
                </Badge>
                {pod.total_sessions > 0 && (
                  <Badge variant="outline">{pod.total_sessions} sessions</Badge>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {pod.is_member ? (
                <>
                  <div className="flex gap-2">
                    {pod.group_chat_id && (
                      <Link href={`/messages?conversation=${pod.group_chat_id}`}>
                        <Button
                          className="bg-gradient-to-r from-cyan-500 to-blue-500"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Group Chat
                        </Button>
                      </Link>
                    )}
                    {(pod.user_role === 'owner' || pod.user_role === 'moderator') && (
                      <>
                        <Button
                          onClick={() => setShowEditModal(true)}
                          variant="outline"
                          className="border-emerald-500/20 hover:bg-emerald-500/10"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Edit Pod
                        </Button>
                        <Button
                          onClick={() => setShowInviteModal(true)}
                          className="bg-gradient-to-r from-green-500 to-emerald-500"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Invite
                        </Button>
                      </>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="border-emerald-500/20"
                    disabled
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" />
                    Joined
                  </Button>
                  {pod.user_role !== 'owner' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLeave}
                      disabled={actionLoading}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4 mr-2" />
                      )}
                      Leave Pod
                    </Button>
                  )}
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

        {/* Tabs */}
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className={cn(
            theme === 'light'
              ? "bg-gray-100 border border-gray-200"
              : "bg-zinc-900/50 border border-white/5"
          )}>
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-2" />
              Members
            </TabsTrigger>
            <TabsTrigger value="problems">
              <Target className="w-4 h-4 mr-2" />
              Problems
            </TabsTrigger>
            {(pod.user_role === 'owner' || pod.user_role === 'moderator') && pod.requires_approval && (
              <TabsTrigger value="requests">
                <Shield className="w-4 h-4 mr-2" />
                Join Requests
              </TabsTrigger>
            )}
            <TabsTrigger value="activity">
              <TrendingUp className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <Calendar className="w-4 h-4 mr-2" />
              Sessions
            </TabsTrigger>
          </TabsList>

          {/* Members */}
          <TabsContent value="members" className="space-y-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {pod.members.map((member: any) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  podId={podId}
                  currentUserRole={pod.user_role}
                  onMemberUpdate={fetchPodDetails}
                />
              ))}
            </div>
          </TabsContent>

          {/* Problems */}
          <TabsContent value="problems" className="space-y-4">
            {(pod.user_role === 'owner' || pod.user_role === 'moderator') && (
              <div className="flex justify-end mb-4">
                <Button
                  onClick={() => setShowAssignProblemsModal(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  <ListPlus className="w-4 h-4 mr-2" />
                  Assign Problems
                </Button>
              </div>
            )}
            <PodProblemsList
              podId={podId}
              currentUserRole={pod.user_role}
              totalMembers={pod.members?.length || 0}
            />
          </TabsContent>

          {/* Join Requests (only for owner/moderator on approval-required pods) */}
          {(pod.user_role === 'owner' || pod.user_role === 'moderator') && pod.requires_approval && (
            <TabsContent value="requests" className="space-y-4">
              <JoinRequestsSection podId={podId} />
            </TabsContent>
          )}

          {/* Activity */}
          <TabsContent value="activity" className="space-y-4">
            {pod.recent_activities && pod.recent_activities.length > 0 ? (
              <div className="space-y-3">
                {pod.recent_activities.map((activity: any) => (
                  <Card
                    key={activity.id}
                    className={cn(
                      "p-4 border-2 backdrop-blur-xl",
                      theme === 'light'
                        ? "bg-white border-gray-200"
                        : "border-white/5 bg-zinc-950/80"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {activity.users && (
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={activity.users.avatar_url || ""} />
                          <AvatarFallback className="bg-gradient-to-br from-brand to-purple-600">
                            {activity.users.full_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className={cn(
                          "font-medium",
                          theme === 'light' ? "text-gray-900" : "text-white"
                        )}>{activity.title}</h4>
                        {activity.description && (
                          <p className={cn(
                            "text-sm",
                            theme === 'light' ? "text-gray-600" : "text-muted-foreground"
                          )}>
                            {activity.description}
                          </p>
                        )}
                        <p className={cn(
                          "text-xs mt-1",
                          theme === 'light' ? "text-gray-500" : "text-muted-foreground"
                        )}>
                          {new Date(activity.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className={cn(
                "text-center py-12",
                theme === 'light' ? "text-gray-600" : "text-muted-foreground"
              )}>
                No activity yet
              </div>
            )}
          </TabsContent>

          {/* Sessions */}
          <TabsContent value="sessions" className="space-y-4">
            {/* Header with Create Button */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant={sessionFilter === 'upcoming' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSessionFilter('upcoming')}
                  className={sessionFilter === 'upcoming' ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : ''}
                >
                  Upcoming
                </Button>
                <Button
                  variant={sessionFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSessionFilter('all')}
                  className={sessionFilter === 'all' ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : ''}
                >
                  All
                </Button>
                <Button
                  variant={sessionFilter === 'past' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSessionFilter('past')}
                  className={sessionFilter === 'past' ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : ''}
                >
                  Past
                </Button>
              </div>

              {pod.is_member && (pod.user_role === 'owner' || pod.user_role === 'moderator') && (
                <Button
                  onClick={() => setShowCreateSessionModal(true)}
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Session
                </Button>
              )}
            </div>

            {/* Sessions List */}
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : sessions && sessions.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {sessions.map((session: any) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    podId={podId}
                    userRole={pod?.user_role}
                    isHost={session.host_user_id === user?.id}
                    onViewDetails={() => {
                      setSelectedSessionId(session.id);
                      setShowSessionDetailModal(true);
                    }}
                    onJoin={async () => {
                      const response = await fetch(`/api/study-pods/sessions/${session.id}/join`, {
                        method: 'POST',
                      });
                      if (response.ok) {
                        toast.success("Attendance marked!");
                        fetchSessions();
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className={cn(
                "text-center py-12",
                theme === 'light' ? "text-gray-600" : "text-muted-foreground"
              )}>
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">
                  {sessionFilter === 'upcoming' ? 'No upcoming sessions' :
                   sessionFilter === 'past' ? 'No past sessions' : 'No sessions yet'}
                </p>
                {pod.is_member && (pod.user_role === 'owner' || pod.user_role === 'moderator') && (
                  <p className="text-sm mb-4">Schedule your first session to get started!</p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Invite Members Modal */}
      <InviteMembersModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        podId={podId}
        onSuccess={fetchPodDetails}
      />

      {/* Edit Pod Modal */}
      <EditPodModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        pod={pod}
        userRole={pod?.user_role}
        onSuccess={fetchPodDetails}
      />

      {/* Assign Problems Modal */}
      <AssignProblemsModal
        isOpen={showAssignProblemsModal}
        onClose={() => setShowAssignProblemsModal(false)}
        podId={podId}
        onSuccess={() => {
          // Trigger a re-render of the problems list by switching tabs and back
          setShowAssignProblemsModal(false);
        }}
      />

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={showCreateSessionModal}
        onClose={() => setShowCreateSessionModal(false)}
        podId={podId}
        onSuccess={() => {
          fetchSessions();
          fetchPodDetails();
        }}
      />

      {/* Session Detail Modal */}
      {selectedSessionId && (
        <SessionDetailModal
          isOpen={showSessionDetailModal}
          onClose={() => {
            setShowSessionDetailModal(false);
            setSelectedSessionId(null);
          }}
          sessionId={selectedSessionId}
          podId={podId}
          userRole={pod?.user_role}
          isHost={sessions.find(s => s.id === selectedSessionId)?.host_user_id === user?.id}
          onRefresh={() => {
            fetchSessions();
            fetchPodDetails();
          }}
        />
      )}
    </div>
  );
}
