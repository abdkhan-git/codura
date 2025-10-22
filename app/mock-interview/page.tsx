"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Users, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { WaitingRoom } from "@/components/mock-interview/waiting-room";
import { VideoCallInterface } from "@/components/mock-interview/video-call-interface";

interface UserData {
  name: string;
  email: string;
  avatar: string;
  username?: string;
  user_id?: string;
}

type SessionMode = "selection" | "waiting" | "active";
type SessionRole = "host" | "join" | null;

export default function MockInterviewPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionMode, setSessionMode] = useState<SessionMode>("selection");
  const [sessionRole, setSessionRole] = useState<SessionRole>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/users/me');
      if (!response.ok) throw new Error('Failed to fetch user data');
      const data = await response.json();

      // The API returns user data directly, map it to expected format
      setUser({
        name: data.full_name || data.username || 'User',
        email: data.email || '',
        avatar: data.avatar_url || data.username?.charAt(0).toUpperCase() || 'U',
        username: data.username,
        user_id: data.id,
      });
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = (role: "host" | "join") => {
    setSessionRole(role);

    // Generate a session ID for hosts
    if (role === "host") {
      const newSessionId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
    } else {
      setSessionId(null);
    }

    setSessionMode("waiting");
  };

  const handleJoinSession = (joinSessionId: string) => {
    setSessionId(joinSessionId);
    setSessionMode("active");
  };

  const handleDevicesReady = () => {
    setSessionMode("active");
  };

  const handleLeaveSession = () => {
    setSessionMode("selection");
    setSessionRole(null);
    setSessionId(null);
  };

  if (isLoading) {
    return (
      <div className="caffeine-theme min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="caffeine-theme min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access mock interviews</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="caffeine-theme min-h-screen bg-background relative">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-brand/5 dark:bg-brand/8 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] left-[15%] w-[400px] h-[400px] bg-purple-500/3 dark:bg-purple-500/6 rounded-full blur-[80px] animate-float-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navbar */}
      <DashboardNavbar user={user} />

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Selection Mode */}
        {sessionMode === "selection" && (
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Link href="/dashboard">
              <Button variant="ghost" className="mb-6 gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>

            {/* Header */}
            <div className="mb-12 text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground via-brand to-purple-400 bg-clip-text text-transparent">
                Mock Interview
              </h1>
              <p className="text-lg text-muted-foreground">
                Practice your interview skills with peers in real-time
              </p>
            </div>

            {/* Session Type Selection */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Host Session Card */}
              <Card className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-brand/40 transition-all duration-500 shadow-xl hover:scale-[1.02] cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none" />

                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand to-blue-600 flex items-center justify-center">
                    <Video className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">Host Session</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Start a new interview session and invite a partner
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                      Create a unique session room
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                      Share session link with partner
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                      Control recording and settings
                    </li>
                  </ul>

                  <Button
                    className="w-full bg-gradient-to-r from-brand to-blue-600 hover:from-brand/90 hover:to-blue-600/90"
                    onClick={() => handleStartSession("host")}
                  >
                    Host Interview
                  </Button>
                </CardContent>
              </Card>

              {/* Join Session Card */}
              <Card className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-purple-500/40 transition-all duration-500 shadow-xl hover:scale-[1.02] cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none" />

                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">Join Session</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Enter a session code to join an interview
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      Enter session ID from host
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      Connect with your partner
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      Start practicing immediately
                    </li>
                  </ul>

                  <Button
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-500/90 hover:to-pink-600/90"
                    onClick={() => handleStartSession("join")}
                  >
                    Join Interview
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Info Section */}
            <Card className="mt-8 border-border/20 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Video className="w-5 h-5 text-brand" />
                  How Mock Interviews Work
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Host creates a session and shares the session ID with their interview partner</p>
                  <p>• Both participants test their audio, video, and microphone in the waiting room</p>
                  <p>• Once ready, connect and start your mock interview with video and chat features</p>
                  <p>• Use the chat box to share links, code snippets, or notes during the session</p>
                  <p>• Sessions can be recorded for later review (with both participants consent)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Waiting Room Mode */}
        {sessionMode === "waiting" && sessionRole && (
          <WaitingRoom
            sessionRole={sessionRole}
            sessionId={sessionId}
            user={user}
            onDevicesReady={handleDevicesReady}
            onJoinSession={handleJoinSession}
            onCancel={handleLeaveSession}
          />
        )}

        {/* Active Video Call Mode */}
        {sessionMode === "active" && sessionId && (
          <VideoCallInterface
            sessionId={sessionId}
            user={user}
            isHost={sessionRole === "host"}
            onLeave={handleLeaveSession}
          />
        )}
      </main>
    </div>
  );
}
