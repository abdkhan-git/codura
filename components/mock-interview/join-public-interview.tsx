"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Users, User } from "lucide-react";
import { PublicInterviewPending } from "./public-interview-pending";
import { cn } from "@/lib/utils";

interface JoinPublicInterviewProps {
  user: {
    name: string;
    email: string;
    avatar: string;
    username?: string;
    user_id?: string;
  };
  onBack: () => void;
  onJoinSession: (sessionCode: string, publicSessionId: string) => void;
}

interface PublicSession {
  id: string;
  title: string;
  description: string;
  endTime: string;
  hostUserId: string;
  hostName: string;
  isAvailable: boolean;
  category: "technical" | "behavioral" | "general";
}

export function JoinPublicInterview({ user, onBack, onJoinSession }: JoinPublicInterviewProps) {
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicSessions();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchPublicSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const detectCategory = (title: string) => {
    if (title.startsWith("[Technical]")) {
      return { category: "technical" as const, cleanTitle: title.replace(/^\[Technical\]\s*/i, "") };
    }
    if (title.startsWith("[Behavioral]")) {
      return { category: "behavioral" as const, cleanTitle: title.replace(/^\[Behavioral\]\s*/i, "") };
    }
    return { category: "general" as const, cleanTitle: title };
  };

  const fetchPublicSessions = async () => {
    try {
      const response = await fetch('/api/mock-interview/public-sessions');

      if (!response.ok) {
        throw new Error('Failed to fetch public sessions');
      }

      const data = await response.json();

      const sessions: PublicSession[] = data.sessions.map((s: any) => {
        const { category, cleanTitle } = detectCategory(s.title || "");
        return {
          id: s.id,
          title: cleanTitle,
          description: s.description || '',
          endTime: s.endTime,
          hostUserId: s.hostUserId,
          hostName: s.hostName,
          isAvailable: s.isAvailable,
          category,
        };
      });

      setSessions(sessions);
    } catch (error) {
      console.error('Error fetching public sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestJoin = async (sessionId: string) => {
    try {
      // Check for existing requests first so rejoin flows don't error
      const existing = await fetch('/api/mock-interview/public-sessions/requests?userId=me');
      if (existing.ok) {
        const data = await existing.json();
        const myRequest = data.requests.find((r: any) => r.sessionId === sessionId);
        if (myRequest?.status === 'approved') {
          // Fetch session code and jump straight in
          const sessionsRes = await fetch('/api/mock-interview/public-sessions');
          if (sessionsRes.ok) {
            const { sessions: activeSessions } = await sessionsRes.json();
            const current = activeSessions.find((s: any) => s.id === sessionId);
            const sessionCode = current?.sessionCode || current?.sessionId;
            if (sessionCode) {
              onJoinSession(sessionCode, sessionId);
              return;
            }
          }
        } else if (myRequest?.status === 'pending') {
          setPendingSessionId(sessionId);
          return;
        }
      }

      const response = await fetch('/api/mock-interview/public-sessions/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        const message = error.error || 'Failed to request join';

        // If user already has a pending request, jump them to the pending screen instead of blocking
        if (response.status === 409 && message.toLowerCase().includes('pending')) {
          setPendingSessionId(sessionId);
          return;
        }

        throw new Error(message);
      }

      // Show the pending screen
      setPendingSessionId(sessionId);
    } catch (error) {
      console.error('Error requesting to join session:', error);
      alert(error instanceof Error ? error.message : 'Failed to send join request');
    }
  };

  const getTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return "Expired";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  // If user has sent a request, show the pending screen
  if (pendingSessionId && user.user_id) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => setPendingSessionId(null)}>
          <ArrowLeft className="w-4 h-4" />
          Back to Sessions
        </Button>

        <PublicInterviewPending
          sessionId={pendingSessionId}
          userId={user.user_id}
          onApproved={(sessionCode) => {
            console.log('Request approved! Session code:', sessionCode);
            onJoinSession(sessionCode, pendingSessionId);
          }}
          onDenied={() => {
            alert('Your request was denied by the host.');
            setPendingSessionId(null);
          }}
          onCancel={() => {
            setPendingSessionId(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Button variant="ghost" className="mb-6 gap-2" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <Card className="border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl shadow-xl mb-6">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
            Available Public Sessions
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            Browse and request to join public interview sessions
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Sessions List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <Card className="border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl">
          <CardContent className="text-center py-12">
            <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Sessions Available</h3>
            <p className="text-muted-foreground">
              There are no public sessions available right now. Check back later!
            </p>
          </CardContent>
        </Card>
      ) : (
        ["technical", "behavioral"].map((category) => {
          const list = sessions.filter((s) => s.category === category);
          return (
            <div key={category} className="space-y-3 mb-6">
              <h4 className={cn(
                "text-lg font-semibold capitalize",
                category === "technical" ? "text-teal-500" : "text-amber-500"
              )}>
                {category} Sessions
              </h4>
              {list.length === 0 ? (
                <Card className="border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl">
                  <CardContent className="text-center py-6 text-sm text-muted-foreground">
                    No {category} sessions available right now.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {list.map((session) => (
                    <Card
                      key={session.id}
                      className={cn(
                        "border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl transition-all duration-300 shadow-lg",
                        session.isAvailable ? "hover:border-emerald-500/40" : "opacity-80"
                      )}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-semibold shadow-lg">
                                {session.hostName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Hosted by</p>
                                <p className="font-semibold">{session.hostName}</p>
                              </div>
                            </div>

                            <h3 className="text-xl font-bold mb-2">
                              {session.title}
                            </h3>

                            {session.description && (
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {session.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-emerald-500" />
                              <span className="text-muted-foreground">
                                {getTimeRemaining(session.endTime)}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-3">
                            <Badge
                              variant={session.isAvailable ? "default" : "secondary"}
                              className={
                                session.isAvailable
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              <div
                                className={`w-2 h-2 rounded-full mr-2 ${
                                  session.isAvailable ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
                                }`}
                              />
                              {session.isAvailable ? "Available" : "Unavailable"}
                            </Badge>

                              <Button
                                onClick={() => handleRequestJoin(session.id)}
                                disabled={!session.isAvailable}
                                className={`${
                                  session.isAvailable
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-500/90 hover:to-teal-600/90"
                                  : "bg-muted text-muted-foreground cursor-not-allowed"
                                } min-w-[140px]`}
                              >
                              <User className="w-4 h-4 mr-2" />
                              Request to Join
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Info Box */}
      <Card className="mt-6 border-2 border-border/20 bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-sm mb-2 text-emerald-500">How it works:</h4>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>• Click "Request to Join" on any available session</li>
            <li>• The host will receive your request and can approve or deny it</li>
            <li>• Once approved, you'll be connected to start the interview</li>
            <li>• Sessions marked "Unavailable" are currently with another user</li>
            <li>• Sessions automatically close when the host's availability ends</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
