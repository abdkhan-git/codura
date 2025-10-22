"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface InviteMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  podId: string;
  onSuccess?: () => void;
}

export function InviteMembersModal({ isOpen, onClose, podId, onSuccess }: InviteMembersModalProps) {
  const [usernames, setUsernames] = useState<string>("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    const usernameList = usernames
      .split(",")
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (usernameList.length === 0) {
      toast.error("Please enter at least one username");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/study-pods/${podId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: usernameList,
          message: message || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to send invitations");
        return;
      }

      toast.success(data.message || "Invitations sent successfully");
      setUsernames("");
      setMessage("");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error sending invitations:", error);
      toast.error("Failed to send invitations");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-2 border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="w-5 h-5 text-emerald-500" />
            Invite Members
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="usernames">
              Usernames <span className="text-muted-foreground">(comma-separated)</span>
            </Label>
            <Input
              id="usernames"
              placeholder="johndoe, janedoe, ..."
              value={usernames}
              onChange={(e) => setUsernames(e.target.value)}
              className="bg-zinc-900 border-white/10"
            />
            <p className="text-xs text-muted-foreground">
              Enter usernames separated by commas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Join our study pod!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-zinc-900 border-white/10 min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/500
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleInvite}
            disabled={loading}
            className="bg-gradient-to-r from-green-500 to-emerald-500"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Send Invitations
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
