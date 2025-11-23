"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, User, Clock } from "lucide-react";

interface PublicInterviewAdmissionProps {
  sessionId: string;
  onApprove: (requestId: string, sessionCode: string) => void;
}

interface JoinRequest {
  id: string;
  sessionId: string;
  requesterId: string;
  requesterName: string;
  requesterUsername: string;
  requesterAvatar: string;
  status: string;
  createdAt: string;
}

export function PublicInterviewAdmission({ sessionId, onApprove }: PublicInterviewAdmissionProps) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetchJoinRequests();
    // Poll for new requests every 3 seconds
    const interval = setInterval(fetchJoinRequests, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const fetchJoinRequests = async () => {
    if (!sessionId) return;
    try {
      const response = await fetch(
        `/api/mock-interview/public-sessions/requests?sessionId=${sessionId}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch join requests');
      }

      const data = await response.json();
      setRequests(data.requests);
    } catch (error) {
      console.error('Error fetching join requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const response = await fetch('/api/mock-interview/public-sessions/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: 'approve' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve request');
      }

      const data = await response.json();

      // Session code is now generated and ready - start the interview
      if (data.request.sessionCode) {
        onApprove(requestId, data.request.sessionCode);
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert(error instanceof Error ? error.message : 'Failed to approve request');
      setProcessingId(null);
    }
  };

  const handleDeny = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const response = await fetch('/api/mock-interview/public-sessions/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: 'deny' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to deny request');
      }

      // Refresh requests
      fetchJoinRequests();
    } catch (error) {
      console.error('Error denying request:', error);
      alert(error instanceof Error ? error.message : 'Failed to deny request');
    } finally {
      setProcessingId(null);
    }
  };

  const getTimeAgo = (createdAt: string) => {
    const now = new Date().getTime();
    const created = new Date(createdAt).getTime();
    const diff = now - created;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const processedRequests = requests.filter((r) => r.status !== 'pending');

  if (isLoading) {
    return (
      <Card className="border-border/20 bg-card/50">
        <CardContent className="py-8 text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading requests...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-2 border-green-500/20 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-green-500" />
              Pending Join Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-semibold">
                    {request.requesterName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-semibold">{request.requesterName}</p>
                    <p className="text-sm text-muted-foreground">
                      @{request.requesterUsername}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="w-3 h-3" />
                      {getTimeAgo(request.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeny(request.id)}
                    disabled={processingId === request.id}
                    className="border-red-500/40 text-red-500 hover:bg-red-500/10"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Deny
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.id)}
                    disabled={processingId === request.id}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-500/90 hover:to-emerald-600/90"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    {processingId === request.id ? 'Approving...' : 'Approve'}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Pending Requests */}
      {pendingRequests.length === 0 && (
        <Card className="border-border/20 bg-card/30">
          <CardContent className="py-8 text-center">
            <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No pending join requests</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Waiting for users to request to join your session...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Processed Requests History */}
      {processedRequests.length > 0 && (
        <Card className="border-border/20 bg-card/30">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {processedRequests.slice(0, 3).map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background/30"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                    {request.requesterName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{request.requesterName}</p>
                    <p className="text-xs text-muted-foreground">
                      {getTimeAgo(request.createdAt)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={request.status === 'approved' ? 'default' : 'secondary'}
                  className={
                    request.status === 'approved'
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-muted text-muted-foreground'
                  }
                >
                  {request.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
