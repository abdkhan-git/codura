"use client";

import { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { UserPlus, UserCheck, Clock, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ConnectionStatusButtonProps extends Omit<ButtonProps, "onClick"> {
  userId: string;
  connectionStatus: 'none' | 'pending_sent' | 'pending_received' | 'connected';
  onStatusChange?: () => void;
}

export function ConnectionStatusButton({
  userId,
  connectionStatus,
  onStatusChange,
  ...props
}: ConnectionStatusButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(connectionStatus);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("");

  const handleConnect = async (message?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/connections/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_user_id: userId,
          ...(message && { message })
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send connection request");
      }

      setStatus("pending_sent");
      toast.success("Connection request sent");
      setShowMessageDialog(false);
      setConnectionMessage("");
      onStatusChange?.();
    } catch (error) {
      console.error("Failed to send connection request:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send request");
    } finally {
      setIsLoading(false);
    }
  };

  const openConnectDialog = () => {
    setShowMessageDialog(true);
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/connections/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user_id: userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel request");
      }

      setStatus("none");
      toast.success("Connection request cancelled");
      onStatusChange?.();
    } catch (error) {
      console.error("Failed to cancel request:", error);
      toast.error(error instanceof Error ? error.message : "Failed to cancel");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/connections/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_user_id: userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to accept connection");
      }

      setStatus("connected");
      toast.success("Connection request accepted");
      onStatusChange?.();
    } catch (error) {
      console.error("Failed to accept connection:", error);
      toast.error(error instanceof Error ? error.message : "Failed to accept");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/connections/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_user_id: userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to decline connection");
      }

      setStatus("none");
      toast.success("Connection request declined");
      onStatusChange?.();
    } catch (error) {
      console.error("Failed to decline connection:", error);
      toast.error(error instanceof Error ? error.message : "Failed to decline");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfriend = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/connections/unfriend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove connection");
      }

      setStatus("none");
      toast.success("Connection removed");
      onStatusChange?.();
    } catch (error) {
      console.error("Failed to remove connection:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "connected") {
    return (
      <Button
        variant="outline"
        disabled={isLoading}
        onClick={handleUnfriend}
        {...props}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
        ) : (
          <>
            <UserCheck className="w-4 h-4 mr-2" />
            Connected
          </>
        )}
      </Button>
    );
  }

  if (status === "pending_sent") {
    return (
      <Button
        variant="outline"
        disabled={isLoading}
        onClick={handleCancel}
        {...props}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
        ) : (
          <>
            <Clock className="w-4 h-4 mr-2" />
            Pending
          </>
        )}
      </Button>
    );
  }

  if (status === "pending_received") {
    return (
      <div className="flex gap-2">
        <Button
          variant="default"
          disabled={isLoading}
          onClick={handleAccept}
          {...props}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
          ) : (
            <>
              <UserCheck className="w-4 h-4 mr-2" />
              Accept
            </>
          )}
        </Button>
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={handleDecline}
          size={props.size}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // status === "none"
  return (
    <>
      <Button
        variant="default"
        disabled={isLoading}
        onClick={openConnectDialog}
        {...props}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
        ) : (
          <>
            <UserPlus className="w-4 h-4 mr-2" />
            Connect
          </>
        )}
      </Button>

      {/* Connection Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Connection Request</DialogTitle>
            <DialogDescription>
              Add a personalized message to your connection request (optional)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Textarea
              value={connectionMessage}
              onChange={(e) => setConnectionMessage(e.target.value)}
              placeholder="Hi! I'd like to connect with you..."
              className="min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {connectionMessage.length}/500
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowMessageDialog(false);
                setConnectionMessage("");
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleConnect(connectionMessage || undefined)}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending...
                </>
              ) : (
                "Send Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
