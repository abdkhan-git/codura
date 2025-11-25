"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Settings,
  Users,
  User,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface ManagePodModalProps {
  isOpen: boolean;
  onClose: () => void;
  podId: string;
  onRefresh?: () => void;
}

export function ManagePodModal({
  isOpen,
  onClose,
  podId,
  onRefresh,
}: ManagePodModalProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");

  // Pod settings
  const [podName, setPodName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [requireApproval, setRequireApproval] = useState(true);
  const [maxMembers, setMaxMembers] = useState(10);

  // Members
  const [members, setMembers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && podId) {
      fetchPodData();
    }
  }, [isOpen, podId]);

  const fetchPodData = async () => {
    setLoading(true);
    try {
      // Fetch pod details
      const podResponse = await fetch(`/api/study-pods/${podId}`);
      if (podResponse.ok) {
        const podData = await podResponse.json();
        const pod = podData.pod;

        setPodName(pod.name || "");
        setDescription(pod.description || "");
        setVisibility(pod.visibility || "public");
        setRequireApproval(pod.require_approval !== false);
        setMaxMembers(pod.max_members || 10);
        setMembers(pod.members || []);
      }

      // Fetch pending requests
      const requestsResponse = await fetch(`/api/study-pods/${podId}/join-requests`);
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setPendingRequests(requestsData.requests || []);
      }
    } catch (error) {
      console.error("Error fetching pod data:", error);
      toast.error("Failed to load pod data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/study-pods/${podId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: podName,
          description,
          visibility,
          require_approval: requireApproval,
          max_members: maxMembers,
        }),
      });

      if (response.ok) {
        toast.success("Pod settings updated!");
        onRefresh?.();
      } else {
        toast.error("Failed to update settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/study-pods/${podId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        toast.success("Member role updated");
        fetchPodData();
      } else {
        toast.error("Failed to update role");
      }
    } catch (error) {
      console.error("Error updating member:", error);
      toast.error("Failed to update member");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const response = await fetch(`/api/study-pods/${podId}/members/${memberId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Member removed");
        fetchPodData();
        onRefresh?.();
      } else {
        toast.error("Failed to remove member");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  const handleJoinRequest = async (requestId: string, action: "approve" | "decline") => {
    try {
      const response = await fetch(`/api/study-pods/join-requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        toast.success(action === "approve" ? "Request approved" : "Request declined");
        fetchPodData();
        onRefresh?.();
      } else {
        toast.error(`Failed to ${action} request`);
      }
    } catch (error) {
      console.error("Error handling request:", error);
      toast.error("Failed to process request");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "max-w-3xl max-h-[85vh] overflow-y-auto backdrop-blur-xl border shadow-2xl",
          theme === "light"
            ? "bg-white/95 border-gray-200/50"
            : "bg-zinc-900/95 border-white/10"
        )}
      >
        <DialogHeader>
          <DialogTitle className={cn(
            "text-2xl font-bold flex items-center gap-2",
            theme === "light" ? "text-gray-900" : "text-white"
          )}>
            <Settings className="w-6 h-6 text-emerald-500" />
            Manage Study Pod
          </DialogTitle>
          <DialogDescription>
            Manage pod settings, members, and join requests
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="members">
                <Users className="w-4 h-4 mr-2" />
                Members ({members.length})
              </TabsTrigger>
              <TabsTrigger value="requests">
                <Settings className="w-4 h-4 mr-2" />
                Requests ({pendingRequests.length})
              </TabsTrigger>
            </TabsList>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Pod Name</Label>
                  <Input
                    value={podName}
                    onChange={(e) => setPodName(e.target.value)}
                    placeholder="Enter pod name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your study pod..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Visibility</Label>
                    <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Max Members</Label>
                    <Input
                      type="number"
                      value={maxMembers}
                      onChange={(e) => setMaxMembers(parseInt(e.target.value) || 10)}
                      className="mt-1"
                      min={2}
                      max={100}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Approval for New Members</Label>
                    <p className="text-sm text-gray-500">
                      New members must be approved before joining
                    </p>
                  </div>
                  <Switch
                    checked={requireApproval}
                    onCheckedChange={setRequireApproval}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border backdrop-blur-md shadow-md transition-all hover:shadow-lg",
                    theme === "light"
                      ? "bg-white/60 border-gray-200/50"
                      : "bg-zinc-800/40 border-zinc-700/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.user?.avatar_url} />
                      <AvatarFallback>
                        {member.user?.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.user?.full_name}</p>
                      <p className="text-sm text-gray-500">
                        @{member.user?.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={member.role}
                      onValueChange={(role) => handleUpdateMemberRole(member.id, role)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">
                          <div className="flex items-center">
                            <Settings className="w-3 h-3 mr-2" />
                            Owner
                          </div>
                        </SelectItem>
                        <SelectItem value="moderator">
                          <div className="flex items-center">
                            <Settings className="w-3 h-3 mr-2" />
                            Moderator
                          </div>
                        </SelectItem>
                        <SelectItem value="member">
                          <div className="flex items-center">
                            <User className="w-3 h-3 mr-2" />
                            Member
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {member.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Requests Tab */}
            <TabsContent value="requests" className="space-y-4">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No pending requests</p>
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border backdrop-blur-md shadow-md transition-all hover:shadow-lg",
                      theme === "light"
                        ? "bg-white/60 border-gray-200/50"
                        : "bg-zinc-800/40 border-zinc-700/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={request.user?.avatar_url} />
                        <AvatarFallback>
                          {request.user?.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.user?.full_name}</p>
                        <p className="text-sm text-gray-500">
                          @{request.user?.username}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleJoinRequest(request.id, "approve")}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleJoinRequest(request.id, "decline")}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
