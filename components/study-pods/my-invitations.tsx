"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Mail, Clock } from "lucide-react";
import { toast } from "sonner";

interface Invitation {
  id: string;
  pod_id: string;
  invited_by: string;
  message: string | null;
  created_at: string;
  expires_at: string;
  pod: {
    name: string;
    description: string | null;
    subject: string;
    skill_level: string;
    current_member_count: number;
    max_members: number;
  };
}

export function MyInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchInvitations = async () => {
    try {
      const response = await fetch("/api/study-pods/invitations");
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleAction = async (inviteId: string, action: 'accept' | 'decline') => {
    setProcessingId(inviteId);

    try {
      const response = await fetch(`/api/study-pods/invitations/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || `Failed to ${action} invitation`);
        return;
      }

      toast.success(data.message || `Invitation ${action}ed successfully`);

      // Remove the processed invitation from the list
      setInvitations(prev => prev.filter(inv => inv.id !== inviteId));
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error);
      toast.error(`Failed to ${action} invitation`);
    } finally {
      setProcessingId(null);
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-xl font-semibold mb-2">No Invitations</h3>
        <p className="text-muted-foreground">
          You don't have any pending pod invitations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Mail className="w-6 h-6 text-emerald-500" />
        <h2 className="text-2xl font-bold">My Invitations</h2>
        <Badge variant="outline" className="ml-auto">
          {invitations.length} pending
        </Badge>
      </div>

      <div className="grid gap-4">
        {invitations.map((invitation) => {
          const expired = isExpired(invitation.expires_at);

          return (
            <Card
              key={invitation.id}
              className={`p-5 border-2 ${
                expired
                  ? 'border-white/5 bg-zinc-950/50 opacity-60'
                  : 'border-emerald-500/20 bg-zinc-950/80'
              } backdrop-blur-xl`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{invitation.pod.name}</h3>
                    {expired && (
                      <Badge variant="outline" className="text-xs text-red-400 border-red-400/20">
                        Expired
                      </Badge>
                    )}
                  </div>

                  {invitation.pod.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {invitation.pod.description}
                    </p>
                  )}

                  {invitation.message && (
                    <div className="mb-3 p-3 rounded-lg bg-zinc-900/50 border border-white/5">
                      <p className="text-sm italic">"{invitation.message}"</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      {invitation.pod.subject}
                    </Badge>
                    <Badge variant="outline">{invitation.pod.skill_level}</Badge>
                    <Badge variant="outline">
                      {invitation.pod.current_member_count}/{invitation.pod.max_members} members
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Invited {new Date(invitation.created_at).toLocaleDateString()}
                    </div>
                    <div>
                      Expires {new Date(invitation.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {!expired && (
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAction(invitation.id, 'accept')}
                      disabled={processingId !== null}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processingId === invitation.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                      )}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(invitation.id, 'decline')}
                      disabled={processingId !== null}
                      className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
