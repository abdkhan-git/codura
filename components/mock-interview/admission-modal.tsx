"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Check, X, User } from "lucide-react";
import { toast } from "sonner";

export interface PendingUser {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
}

interface AdmissionModalProps {
  open: boolean;
  pendingUsers: PendingUser[];
  sessionId: string;
  onApprove: (userId: string) => void;
  onDeny: (userId: string) => void;
}

export function AdmissionModal({
  open,
  pendingUsers,
  sessionId,
  onApprove,
  onDeny,
}: AdmissionModalProps) {
  const handleApprove = async (user: PendingUser) => {
    try {
      const response = await fetch("/api/mock-interview/sessions/admission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          participantId: user.user_id,
          action: "approve",
        }),
      });

      if (!response.ok) throw new Error("Failed to approve");

      toast.success(`${user.full_name || user.username} has been admitted`);
      onApprove(user.user_id);
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error("Failed to approve participant");
    }
  };

  const handleDeny = async (user: PendingUser) => {
    try {
      const response = await fetch("/api/mock-interview/sessions/admission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          participantId: user.user_id,
          action: "deny",
        }),
      });

      if (!response.ok) throw new Error("Failed to deny");

      toast.success(`${user.full_name || user.username} was denied`);
      onDeny(user.user_id);
    } catch (error) {
      console.error("Error denying user:", error);
      toast.error("Failed to deny participant");
    }
  };

  if (pendingUsers.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-brand" />
            Admission Requests
          </DialogTitle>
          <DialogDescription>
            {pendingUsers.length} {pendingUsers.length === 1 ? "person wants" : "people want"} to join your interview
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {pendingUsers.map((user) => (
            <div
              key={user.user_id}
              className="flex items-center justify-between p-3 rounded-lg border border-border/20 bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-blue-600 flex items-center justify-center text-white font-semibold overflow-hidden">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm">
                      {user.full_name?.charAt(0) || user.username?.charAt(0) || "U"}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {user.full_name || user.username}
                  </p>
                  {user.username && user.full_name && (
                    <p className="text-xs text-muted-foreground">
                      @{user.username}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 gap-1"
                  onClick={() => handleApprove(user)}
                >
                  <Check className="w-4 h-4" />
                  Admit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1"
                  onClick={() => handleDeny(user)}
                >
                  <X className="w-4 h-4" />
                  Deny
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
