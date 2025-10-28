"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PodCard } from "@/components/study-pods/pod-card";
import { CreatePodModal } from "@/components/study-pods/create-pod-modal";
import { MyInvitations } from "@/components/study-pods/my-invitations";
import {
  Search,
  Plus,
  Filter,
  Users,
  BookOpen,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { STUDY_SUBJECTS } from "@/types/study-pods";
import type { SkillLevel } from "@/types/study-pods";

export default function StudyPodsPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [pods, setPods] = useState<any[]>([]);
  const [myPods, setMyPods] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string>("");
  const [onlyWithSpace, setOnlyWithSpace] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    fetchPods();
    fetchMyPods();
  }, [searchQuery, selectedSubject, selectedSkillLevel, onlyWithSpace]);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        console.log("Study Pods - Fetched user data:", data);
        // Transform the data to match DashboardNavbar expectations
        const transformedUser = {
          name: data.profile?.full_name || data.user?.email?.split('@')[0] || 'User',
          email: data.user?.email || '',
          avatar: data.profile?.avatar_url || '',
          username: data.profile?.username || '',
        };
        console.log("Study Pods - Transformed user data:", transformedUser);
        setUser(transformedUser);
      } else {
        console.error("Study Pods - Failed to fetch user data:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchPods = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (selectedSubject) params.set("subject", selectedSubject);
      if (selectedSkillLevel) params.set("skill_level", selectedSkillLevel);
      if (onlyWithSpace) params.set("only_with_space", "true");

      const response = await fetch(`/api/study-pods/search?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPods(data.pods || []);
      }
    } catch (error) {
      console.error("Error fetching pods:", error);
      toast.error("Failed to load study pods");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyPods = async () => {
    try {
      const response = await fetch("/api/study-pods/my-pods");
      if (response.ok) {
        const data = await response.json();
        setMyPods(data.pods || []);
      }
    } catch (error) {
      console.error("Error fetching my pods:", error);
    }
  };

  const handleJoinPod = async (podId: string) => {
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

      // Refresh pods list
      fetchPods();
      fetchMyPods();
    } catch (error) {
      console.error("Error joining pod:", error);
      toast.error("Failed to join pod");
    }
  };

  const handlePodCreated = (pod: any) => {
    fetchPods();
    fetchMyPods();
    router.push(`/study-pods/${pod.id}`);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSubject("");
    setSelectedSkillLevel("");
    setOnlyWithSpace(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {user && <DashboardNavbar user={user} />}

      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />

        {/* Green gradient blob - top right */}
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-green-500/5 to-emerald-500/8 dark:from-green-500/8 dark:to-emerald-500/12 rounded-full blur-[120px] animate-pulse-slow" />

        {/* Cyan gradient blob - bottom left */}
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-cyan-500/3 to-blue-500/6 dark:from-cyan-500/6 dark:to-blue-500/10 rounded-full blur-[100px] animate-float-slow" style={{ animationDelay: "2s" }} />

        {/* Teal gradient blob - center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-teal-500/2 to-green-500/4 dark:from-teal-500/4 dark:to-green-500/8 rounded-full blur-[80px] animate-pulse-slow" style={{ animationDelay: "4s" }} />
      </div>

      {/* Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-emerald-500/25 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-emerald-400 to-green-400 bg-clip-text text-transparent">
              Study Pods
            </h1>
          </div>
          <p className="text-muted-foreground">
            Join collaborative study groups or create your own
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-emerald-500/25"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Pod
          </Button>
        </div>

        {/* Filters */}
        <div className={cn(
          "mb-6 p-4 rounded-xl border-2 backdrop-blur-xl",
          theme === 'light'
            ? "bg-white/80 border-gray-200"
            : "border-white/5 bg-zinc-950/50"
        )}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pods..."
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedSubject || "all"} onValueChange={(value) => setSelectedSubject(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {STUDY_SUBJECTS.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSkillLevel || "all"} onValueChange={(value) => setSelectedSkillLevel(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
                <SelectItem value="Mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(searchQuery || selectedSubject || selectedSkillLevel) && (
            <div className="mt-3 flex items-center gap-2">
              <span className={cn(
                "text-sm",
                theme === 'light' ? "text-gray-600" : "text-muted-foreground"
              )}>Active filters:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={cn(
            theme === 'light'
              ? "bg-gray-100 border border-gray-200"
              : "bg-zinc-900/50 border border-white/5"
          )}>
            <TabsTrigger value="all">All Pods</TabsTrigger>
            <TabsTrigger value="my-pods">
              My Pods {myPods.length > 0 && `(${myPods.length})`}
            </TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
          </TabsList>

          {/* Tabs Content */}
          <TabsContent value="all" className="mt-0">
          {loading ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-80 rounded-xl border-2 animate-pulse",
                    theme === 'light'
                      ? "bg-gray-100 border-gray-200"
                      : "bg-zinc-950/50 border-white/5"
                  )}
                />
              ))}
            </div>
          ) : pods.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className={cn(
                "text-lg font-semibold mb-2",
                theme === 'light' ? "text-gray-900" : "text-white"
              )}>No study pods found</h3>
              <p className={cn(
                "mb-4",
                theme === 'light' ? "text-gray-600" : "text-muted-foreground"
              )}>
                {searchQuery || selectedSubject || selectedSkillLevel
                  ? "Try adjusting your filters"
                  : "Be the first to create one!"}
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Study Pod
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {pods.map((pod, index) => (
                <div
                  key={pod.id}
                  className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <PodCard pod={pod} onJoin={handleJoinPod} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-pods" className="mt-0">
          {myPods.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No pods yet</h3>
              <p className="text-muted-foreground mb-4">
                Join or create a study pod to get started
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("all")}
                >
                  Browse Pods
                </Button>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Pod
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {myPods.map((pod, index) => (
                <div
                  key={pod.id}
                  className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <PodCard pod={pod} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="mt-0">
          <MyInvitations />
        </TabsContent>
        </Tabs>
      </main>

      {/* Create Pod Modal */}
      <CreatePodModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handlePodCreated}
      />
    </div>
  );
}
