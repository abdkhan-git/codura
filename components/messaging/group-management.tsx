"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Edit as Edit3, 
  Crown, 
  Shield,
  User,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GroupMember {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

interface GroupManagementProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  currentUserId: string;
  onUpdate: () => void;
}

export function GroupManagement({ 
  isOpen, 
  onClose, 
  conversationId, 
  currentUserId, 
  onUpdate 
}: GroupManagementProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberId, setNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);

  // Fetch group members
  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  // Fetch group info
  const fetchGroupInfo = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        setGroupName(data.conversation?.name || "");
      }
    } catch (error) {
      console.error('Error fetching group info:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      fetchGroupInfo();
    }
  }, [isOpen, conversationId]);

  const handleUpdateName = async () => {
    if (!newName.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/conversations/${conversationId}/name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });

      if (response.ok) {
        setGroupName(newName.trim());
        setIsEditingName(false);
        setNewName("");
        toast.success("Group name updated");
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update group name");
      }
    } catch (error) {
      console.error('Error updating group name:', error);
      toast.error("Error updating group name");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberId.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/conversations/${conversationId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: newMemberId.trim(),
          role: newMemberRole
        })
      });

      if (response.ok) {
        setNewMemberId("");
        setNewMemberRole('member');
        setShowAddMember(false);
        fetchMembers();
        toast.success("Member added successfully");
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add member");
      }
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error("Error adding member");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/conversations/${conversationId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: memberId })
      });

      if (response.ok) {
        fetchMembers();
        toast.success("Member removed successfully");
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to remove member");
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error("Error removing member");
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-blue-500" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'admin': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const canManageMembers = members.find(m => m.id === currentUserId)?.role === 'owner' || 
                           members.find(m => m.id === currentUserId)?.role === 'admin';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Group Management
          </DialogTitle>
          <DialogDescription>
            Manage group members and settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Group Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Group Name</Label>
            {isEditingName ? (
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter new group name"
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleUpdateName}
                  disabled={loading || !newName.trim()}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditingName(false);
                    setNewName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm">{groupName}</span>
                {canManageMembers && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingName(true);
                      setNewName(groupName);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Add Member */}
          {canManageMembers && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Add Member</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Member
                </Button>
              </div>

              {showAddMember && (
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="member-id">User ID</Label>
                    <Input
                      id="member-id"
                      value={newMemberId}
                      onChange={(e) => setNewMemberId(e.target.value)}
                      placeholder="Enter user ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="member-role">Role</Label>
                    <Select value={newMemberRole} onValueChange={(value: 'admin' | 'member') => setNewMemberRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddMember}
                      disabled={loading || !newMemberId.trim()}
                    >
                      Add Member
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowAddMember(false);
                        setNewMemberId("");
                        setNewMemberRole('member');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Members List */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Members ({members.length})</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 text-white text-xs">
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">{member.name}</div>
                      {member.username && (
                        <div className="text-xs text-muted-foreground">@{member.username}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-xs", getRoleColor(member.role))}>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(member.role)}
                        {member.role}
                      </div>
                    </Badge>
                    
                    {canManageMembers && member.id !== currentUserId && member.role !== 'owner' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={loading}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <UserMinus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
