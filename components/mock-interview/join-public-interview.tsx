"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Users, User } from "lucide-react";
import { PublicInterviewPending } from "./public-interview-pending";

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

  const fetchPublicSessions = async () => {
    try {
      const response = await fetch('/api/mock-interview/public-sessions');

      if (!response.ok) {
        throw new Error('Failed to fetch public sessions');
      }

      const data = await response.json();

      const sessions: PublicSession[] = data.sessions.map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description || '',
        endTime: s.endTime,
        hostUserId: s.hostUserId,
        hostName: s.hostName,
        isAvailable: s.isAvailable,
      }));

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

      <Card className="border-2 border-teal-500/20 bg-card/50 backdrop-blur-sm mb-6">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl bg-gradient-to-r from-teal-500 to-cyan-600 bg-clip-text text-transparent">
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
        <Card className="border-border/20 bg-card/30">
          <CardContent className="text-center py-12">
            <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Sessions Available</h3>
            <p className="text-muted-foreground">
              There are no public sessions available right now. Check back later!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card
              key={session.id}
              className={`border-2 ${
                session.isAvailable
                  ? "border-teal-500/20 hover:border-teal-500/40"
                  : "border-border/20 opacity-75"
              } bg-card/50 backdrop-blur-sm transition-all duration-300`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Session Info */}
                  <div className="flex-1 min-w-0">
                    {/* Host Name */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-sm font-semibold">
                        {session.hostName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Hosted by</p>
                        <p className="font-semibold">{session.hostName}</p>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold mb-2 text-foreground">
                      {session.title}
                    </h3>

                    {/* Description */}
                    {session.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {session.description}
                      </p>
                    )}

                    {/* Time Remaining */}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-teal-500" />
                      <span className="text-muted-foreground">
                        {getTimeRemaining(session.endTime)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Status and Action */}
                  <div className="flex flex-col items-end gap-3">
                    {/* Status Badge */}
                    <Badge
                      variant={session.isAvailable ? "default" : "secondary"}
                      className={
                        session.isAvailable
                          ? "bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/40"
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

                    {/* Request Button */}
                    <Button
                      onClick={() => handleRequestJoin(session.id)}
                      disabled={!session.isAvailable}
                      className={`${
                        session.isAvailable
                          ? "bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-500/90 hover:to-cyan-600/90"
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

      {/* Info Box */}
      <Card className="mt-6 border-border/20 bg-teal-500/5">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-sm mb-2 text-teal-500">How it works:</h4>
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
