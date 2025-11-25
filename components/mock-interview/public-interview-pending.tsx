"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, User, CheckCircle2, XCircle } from "lucide-react";

interface PublicInterviewPendingProps {
  sessionId: string;
  userId: string;
  onApproved: (sessionCode: string, publicSessionId: string) => void;
  onDenied: () => void;
  onCancel: () => void;
}

export function PublicInterviewPending({
  sessionId,
  userId,
  onApproved,
  onDenied,
  onCancel,
}: PublicInterviewPendingProps) {
  const [status, setStatus] = useState<'pending' | 'approved' | 'denied'>('pending');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial check for existing request
    checkRequestStatus();

    // Poll every 2 seconds for status updates
    const interval = setInterval(checkRequestStatus, 2000);
    return () => clearInterval(interval);
  }, [sessionId, userId]);

  const checkRequestStatus = async () => {
    try {
      const response = await fetch(`/api/mock-interview/public-sessions/requests?userId=me`);

      if (!response.ok) {
        throw new Error('Failed to fetch request status');
      }

      const data = await response.json();

      // Find the request for this specific session
      const myRequest = data.requests.find((r: any) => r.sessionId === sessionId);

      if (myRequest) {
        setRequestId(myRequest.id);
        const previousStatus = status;
        setStatus(myRequest.status);

        // Only process approval if status just changed to approved
        if (myRequest.status === 'approved' && previousStatus !== 'approved') {
          console.log('🎉 Join request just approved! Fetching session details...');

          // Fetch the specific session to get the session code
          const sessionResponse = await fetch('/api/mock-interview/public-sessions');
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            const currentSession = sessionData.sessions.find((s: any) => s.id === sessionId);

            console.log('Found session:', currentSession);

            // The sessionCode is returned as 'sessionId' from the API
            const sessionCode = currentSession?.sessionId || currentSession?.sessionCode;

            if (sessionCode) {
              console.log('✅ Session code found:', sessionCode);
              console.log('Calling onApproved callback...');
              onApproved(sessionCode, sessionId);
            } else {
              console.error('❌ Session code not found in approved session:', currentSession);
            }
          }
        } else if (myRequest.status === 'denied') {
          console.log('❌ Join request denied');
          onDenied();
        }
      }
    } catch (error) {
      console.error('Error checking request status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!requestId) return;

    try {
      const response = await fetch(`/api/mock-interview/public-sessions/requests?requestId=${requestId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onCancel();
      }
    } catch (error) {
      console.error('Error canceling request:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-emerald-500" />
          <p className="text-muted-foreground">Checking request status...</p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'approved') {
    return (
      <Card className="border-2 border-green-500/40 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl">
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Request Approved!</h3>
          <p className="text-muted-foreground">Connecting to interview...</p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'denied') {
    return (
      <Card className="border-2 border-red-500/40 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl">
        <CardContent className="py-12 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Request Denied</h3>
          <p className="text-muted-foreground mb-6">
            The host has denied your request to join this session.
          </p>
          <Button onClick={onCancel}>Back to Sessions</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl">
      <CardHeader className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Clock className="w-10 h-10 text-white animate-pulse" />
        </div>
        <CardTitle className="text-2xl">Waiting for Host Approval</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            Your request to join this public interview session has been sent to the host.
          </p>
          <p className="text-sm text-muted-foreground">
            You'll be automatically connected when the host approves your request.
          </p>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1 text-emerald-500">What happens next?</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• The host will review your request</li>
                <li>• If approved, you'll automatically enter the interview room</li>
                <li>• If denied, you can request to join another session</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pt-4">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
          <span className="text-sm text-muted-foreground">Waiting for response...</span>
        </div>

        <Button
          variant="outline"
          onClick={handleCancelRequest}
          className="w-full"
        >
          Cancel Request
        </Button>
      </CardContent>
    </Card>
  );
}
