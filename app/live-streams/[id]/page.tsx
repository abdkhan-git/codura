"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { StreamVideoPlayer } from "@/components/live-streams/stream-video-player";
import { StreamChat } from "@/components/live-streams/stream-chat";
import { StreamDescription } from "@/components/live-streams/stream-description";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

interface StreamData {
  id: string;
  room_id: string;
  viewer_count: number;
  started_at: string;
  problems: {
    title: string;
    difficulty: string;
    topic_tags: Array<{ name: string; slug: string }>;
  } | null;
  streamer: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  } | null;
}

export default function LiveStreamChatroomPage() {
  const { theme } = useTheme();
  const params = useParams();
  const router = useRouter();
  const streamId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [stream, setStream] = useState<StreamData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchUser();
    fetchSession();
  }, []);

  const fetchSession = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
  };

  useEffect(() => {
    if (streamId) {
      fetchStream();
      // Refresh stream data every 5 seconds to update viewer count
      const interval = setInterval(fetchStream, 5000);
      return () => clearInterval(interval);
    }
  }, [streamId]);

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

  const fetchStream = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/live-streams/${streamId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError("Stream not found or has ended");
        } else {
          setError("Failed to load stream");
        }
        return;
      }

      const data = await response.json();
      setStream(data.stream);
      setError(null);
    } catch (error) {
      console.error("Error fetching stream:", error);
      setError("Failed to load stream");
      toast.error("Failed to load stream");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {user && <DashboardNavbar user={user} />}
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-muted-foreground">Loading stream...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="min-h-screen bg-background">
        {user && <DashboardNavbar user={user} />}
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-xl text-destructive">{error || 'Stream not found'}</p>
            <Button onClick={() => router.push('/live-streams')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Live Streams
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {user && <DashboardNavbar user={user} />}

      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-purple-500/5 to-violet-500/8 dark:from-purple-500/8 dark:to-violet-500/12 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-violet-500/3 to-purple-500/6 dark:from-violet-500/6 dark:to-purple-500/10 rounded-full blur-[100px] animate-float-slow" style={{ animationDelay: "2s" }} />
      </div>

      {/* Content */}
      <main className="relative z-10 max-w-[1800px] mx-auto px-6 pt-24 pb-16">
        {/* Back Button */}
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/live-streams')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Live Streams
          </Button>
        </div>

        {/* Main Layout: Video + Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Side: Video + Description (75% on large screens) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Video Player */}
            <StreamVideoPlayer
              roomId={stream.room_id}
              userId={session?.user?.id || 'anonymous'}
              userName={user?.name || 'Anonymous'}
              streamerName={stream.streamer?.full_name || stream.streamer?.username}
            />

            {/* Stream Description */}
            <StreamDescription
              problem={stream.problems}
              streamer={stream.streamer}
              viewerCount={stream.viewer_count}
              startedAt={stream.started_at}
            />
          </div>

          {/* Right Side: Chat (25% on large screens) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 h-[calc(100vh-8rem)]">
              <StreamChat
                streamId={streamId}
                userId={session?.user?.id || 'anonymous'}
                userName={user?.name || 'Anonymous'}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

