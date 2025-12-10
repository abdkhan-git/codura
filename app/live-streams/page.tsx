"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StreamCard } from "@/components/live-streams/stream-card";
import { StartStreamModal } from "@/components/live-streams/start-stream-modal";
import {
  Search,
  Plus,
  Video,
  Loader2,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

export default function LiveStreamsPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [streams, setStreams] = useState<any[]>([]);
  const [showStartModal, setShowStartModal] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    fetchStreams();
    // Refresh streams every 10 seconds
    const interval = setInterval(fetchStreams, 10000);
    return () => clearInterval(interval);
  }, [searchQuery, selectedDifficulty]);

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
        };
        setUser(transformedUser);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedDifficulty) params.set("difficulty", selectedDifficulty);

      const response = await fetch(`/api/live-streams?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStreams(data.streams || []);
      } else {
        toast.error("Failed to load live streams");
      }
    } catch (error) {
      console.error("Error fetching streams:", error);
      toast.error("Failed to load live streams");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDifficulty("");
  };

  return (
    <div className="min-h-screen bg-background">
      {user && <DashboardNavbar user={user} />}

      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />

        {/* Purple gradient blob - top right */}
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-purple-500/5 to-violet-500/8 dark:from-purple-500/8 dark:to-violet-500/12 rounded-full blur-[120px] animate-pulse-slow" />

        {/* Violet gradient blob - bottom left */}
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-violet-500/3 to-purple-500/6 dark:from-violet-500/6 dark:to-purple-500/10 rounded-full blur-[100px] animate-float-slow" style={{ animationDelay: "2s" }} />

        {/* Purple gradient blob - center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-500/2 to-violet-500/4 dark:from-purple-500/4 dark:to-violet-500/8 rounded-full blur-[80px] animate-pulse-slow" style={{ animationDelay: "4s" }} />
      </div>

      {/* Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 shadow-lg shadow-purple-500/25 flex items-center justify-center">
              <Video className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-purple-400 to-violet-400 bg-clip-text text-transparent">
              Live Streams
            </h1>
          </div>
          <p className="text-muted-foreground">
            Watch developers code in real-time
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Button
            onClick={() => setShowStartModal(true)}
            className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-lg shadow-purple-500/25"
          >
            <Plus className="w-4 h-4 mr-2" />
            Start Live Stream
          </Button>
        </div>

        {/* Filters */}
        <div className={cn(
          "mb-6 p-4 rounded-xl border-2 backdrop-blur-xl",
          theme === 'light'
            ? "bg-white/80 border-gray-200"
            : "border-white/5 bg-zinc-950/50"
        )}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by problem title or streamer name..."
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedDifficulty || "all"} onValueChange={(value) => setSelectedDifficulty(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(searchQuery || selectedDifficulty) && (
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

        {/* Streams Grid */}
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
        ) : streams.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className={cn(
              "text-lg font-semibold mb-2",
              theme === 'light' ? "text-gray-900" : "text-white"
            )}>No live streams at the moment</h3>
            <p className={cn(
              "mb-4",
              theme === 'light' ? "text-gray-600" : "text-muted-foreground"
            )}>
              {searchQuery || selectedDifficulty
                ? "Try adjusting your filters"
                : "Be the first to start streaming!"}
            </p>
            <Button
              onClick={() => setShowStartModal(true)}
              className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Start Live Stream
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {streams.map((stream, index) => (
              <div
                key={stream.id}
                className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <StreamCard stream={stream} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Start Stream Modal */}
      <StartStreamModal
        open={showStartModal}
        onClose={() => setShowStartModal(false)}
      />
    </div>
  );
}

