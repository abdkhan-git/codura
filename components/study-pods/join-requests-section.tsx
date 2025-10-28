"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface JoinRequest {
  id: string;
  user_id: string;
  message: string | null;
  created_at: string;
  user: {
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface JoinRequestsSectionProps {
  podId: string;
}

export function JoinRequestsSection({ podId }: JoinRequestsSectionProps) {
  const { theme } = useTheme();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});

  const fetchRequests = async () => {
    try {
      const response = await fetch(`/api/study-pods/${podId}/join-requests`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching join requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [podId]);

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingId(requestId);

    try {
      const response = await fetch(`/api/study-pods/join-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejection_reason: action === 'reject' ? rejectionReason[requestId] : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || `Failed to ${action} request`);
        return;
      }

      toast.success(data.message || `Request ${action}d successfully`);

      // Remove the processed request from the list
      setRequests(prev => prev.filter(r => r.id !== requestId));

      // Clear rejection reason
      if (action === 'reject') {
        setRejectionReason(prev => {
          const newState = { ...prev };
          delete newState[requestId];
          return newState;
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      toast.error(`Failed to ${action} request`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className={cn(
        "text-center py-8",
        theme === 'light' ? "text-gray-600" : "text-muted-foreground"
      )}>
        <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No pending join requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <Card
          key={request.id}
          className={cn(
            "p-4 border-2 backdrop-blur-xl",
            theme === 'light'
              ? "bg-white border-gray-200"
              : "border-white/5 bg-zinc-950/80"
          )}
        >
          <div className="flex items-start gap-4">
            <Avatar className="w-12 h-12 flex-shrink-0">
              <AvatarImage src={request.user?.avatar_url || ""} />
              <AvatarFallback className="bg-gradient-to-br from-brand to-purple-600">
                {request.user?.full_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={cn(
                  "font-semibold truncate",
                  theme === 'light' ? "text-gray-900" : "text-white"
                )}>{request.user?.full_name}</h4>
                <Badge variant="outline" className="text-xs">
                  @{request.user?.username}
                </Badge>
              </div>

              {request.message && (
                <p className={cn(
                  "text-sm mb-2",
                  theme === 'light' ? "text-gray-600" : "text-muted-foreground"
                )}>{request.message}</p>
              )}

              <p className={cn(
                "text-xs",
                theme === 'light' ? "text-gray-600" : "text-muted-foreground"
              )}>
                Requested {new Date(request.created_at).toLocaleDateString()}
              </p>

              {processingId === request.id && (
                <Textarea
                  placeholder="Rejection reason (optional)"
                  value={rejectionReason[request.id] || ""}
                  onChange={(e) => setRejectionReason(prev => ({
                    ...prev,
                    [request.id]: e.target.value
                  }))}
                  className={cn(
                    "mt-2 text-sm",
                    theme === 'light'
                      ? "bg-white border-gray-300"
                      : "bg-zinc-900 border-white/10"
                  )}
                  rows={2}
                />
              )}

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => handleAction(request.id, 'approve')}
                  disabled={processingId !== null}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processingId === request.id ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (processingId === request.id) {
                      handleAction(request.id, 'reject');
                    } else {
                      setProcessingId(request.id);
                    }
                  }}
                  disabled={processingId !== null && processingId !== request.id}
                  className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                >
                  {processingId === request.id && processingId ? (
                    <>
                      <XCircle className="w-4 h-4 mr-1" />
                      Confirm Reject
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </>
                  )}
                </Button>
                {processingId === request.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setProcessingId(null)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
