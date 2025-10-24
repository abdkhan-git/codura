"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { GroupManagement } from "@/components/messaging/group-management";
import {
  Users,
  Bell,
  BellOff as BellOffIcon,
  LogOut,
  UserMinus as UserMinusIcon,
  Trash2 as TrashIcon,
  ShieldAlert as ShieldIcon,
  Crown as CrownIcon,
  Archive as ArchiveIcon,
  Edit2 as EditIcon,
  UserPlus as UserPlusIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ConversationMenuModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: {
    id: string;
    type: "direct" | "group";
    name?: string;
    participants?: Array<{
      id: string;
      name: string;
      username?: string;
      avatar?: string;
      role?: "owner" | "admin" | "member";
    }>;
    is_archived?: boolean;
    is_muted?: boolean;
    muted_until?: string | null;
  };
  currentUserId: string;
  onLeaveChat?: (conversationId: string) => void;
  onMuteToggle?: (conversationId: string, mute: boolean) => void;
  onRemoveMember?: (conversationId: string, memberId: string) => void;
  onDeleteChat?: (conversationId: string) => void;
  onUnarchiveChat?: (conversationId: string) => void;
  onArchiveChat?: (conversationId: string) => void;
  onUpdateAvatar?: (conversationId: string, avatarUrl: string) => void;
}

export function ConversationMenuModal({
  open,
  onOpenChange,
  conversation,
  currentUserId,
  onLeaveChat,
  onMuteToggle,
  onRemoveMember,
  onDeleteChat,
  onUnarchiveChat,
  onArchiveChat,
  onUpdateAvatar,
}: ConversationMenuModalProps) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGroupManagement, setShowGroupManagement] = useState(false);

  const currentUserRole = conversation.participants?.find(
    (p) => p.id === currentUserId
  )?.role || "member";

  const isGroupChat = conversation.type === "group";
  const isMuted = conversation.is_muted;

  const handleLeaveChat = () => {
    onLeaveChat?.(conversation.id);
    onOpenChange(false);
    toast.success("You have left the conversation");
  };

  const handleToggleMute = async () => {
    const newMuteState = !isMuted;
    
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ muted: newMuteState }),
      });

      if (response.ok) {
        onMuteToggle?.(conversation.id, newMuteState);
        toast.success(newMuteState ? "Conversation muted" : "Conversation unmuted");
      } else {
        toast.error("Failed to update mute status");
      }
    } catch (error) {
      console.error("Error toggling mute:", error);
      toast.error("Error updating mute status");
    }
  };

  const handleRemoveMember = (memberId: string) => {
    onRemoveMember?.(conversation.id, memberId);
    toast.success("Member removed from conversation");
  };

  const handleDeleteChat = () => {
    onDeleteChat?.(conversation.id);
    onOpenChange(false);
    toast.success("Conversation deleted");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#1a1f2e] border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isGroupChat ? "Group Chat Settings" : "Conversation Settings"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {isGroupChat
              ? `Manage "${conversation.name}" and its members`
              : "Manage this conversation"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Group Members Section - Only for group chats */}
          {isGroupChat && conversation.participants && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-sm">
                  Members ({conversation.participants.length})
                </h3>
              </div>
              <ScrollArea className="max-h-[300px] pr-4">
                <div className="space-y-2">
                  {conversation.participants.map((participant) => {
                    const isCurrentUser = participant.id === currentUserId;
                    const canRemove = !isCurrentUser && (currentUserRole === "owner" || currentUserRole === "admin");

                    return (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="w-10 h-10 border border-white/10">
                            <AvatarImage src={participant.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 text-white font-semibold text-sm">
                              {participant.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">
                                {participant.name}
                                {isCurrentUser && (
                                  <span className="text-gray-400 ml-1">(You)</span>
                                )}
                              </p>
                              {participant.role === "owner" && (
                                <Badge className="h-5 px-2 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">
                                  <CrownIcon className="w-3 h-3 mr-1" />
                                  Owner
                                </Badge>
                              )}
                              {participant.role === "admin" && (
                                <Badge className="h-5 px-2 bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">
                                  <ShieldIcon className="w-3 h-3 mr-1" />
                                  Admin
                                </Badge>
                              )}
                            </div>
                            {participant.username && (
                              <p className="text-xs text-gray-400">
                                @{participant.username}
                              </p>
                            )}
                          </div>
                        </div>
                        {canRemove && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(participant.id)}
                            className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <UserMinusIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Actions Section */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm mb-3 text-gray-400">Actions</h3>

            {/* Mute/Unmute */}
            <Button
              variant="ghost"
              onClick={handleToggleMute}
              className="w-full justify-start gap-3 h-auto py-3 px-4 hover:bg-white/5 text-left"
            >
              {isMuted ? (
                <>
                  <Bell className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium">Unmute conversation</p>
                    <p className="text-xs text-gray-400">Receive notifications again</p>
                  </div>
                </>
              ) : (
                <>
                  <BellOffIcon className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium">Mute conversation</p>
                    <p className="text-xs text-gray-400">Stop receiving notifications</p>
                  </div>
                </>
              )}
            </Button>

            {/* Leave Group (only for group chats) */}
            {isGroupChat && !showLeaveConfirm && (
              <Button
                variant="ghost"
                onClick={() => setShowLeaveConfirm(true)}
                className="w-full justify-start gap-3 h-auto py-3 px-4 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-left"
              >
                <LogOut className="w-5 h-5" />
                <div className="flex-1">
                  <p className="font-medium">Leave group</p>
                  <p className="text-xs text-gray-400">You can be re-added later</p>
                </div>
              </Button>
            )}

            {/* Leave Confirmation */}
            {showLeaveConfirm && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-3">
                <div className="flex items-start gap-3">
                  <LogOut className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-400 mb-1">Leave this group?</p>
                    <p className="text-xs text-gray-400">
                      You'll stop receiving messages from this group. You can be re-added by any member.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLeaveConfirm(false)}
                    className="hover:bg-white/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleLeaveChat}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    Leave Group
                  </Button>
                </div>
              </div>
            )}

            {/* Group Management Section */}
            {isGroupChat && (
              <>
                {/* Manage Group - Only for Owners/Admins */}
                {(currentUserRole === "owner" || currentUserRole === "admin") && (
                  <Button
                    variant="ghost"
                    onClick={() => setShowGroupManagement(true)}
                    className="w-full justify-start gap-3 h-auto py-3 px-4 hover:bg-white/5 text-left"
                  >
                    <Users className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="font-medium">Manage Group</p>
                      <p className="text-xs text-gray-400">Add/remove members, change settings</p>
                    </div>
                  </Button>
                )}

                {/* Change Group Name - Only for Owners/Admins */}
                {(currentUserRole === "owner" || currentUserRole === "admin") && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const newName = prompt('Enter new group name:', conversation.name);
                      if (newName && newName.trim() && newName !== conversation.name) {
                        // TODO: Implement change group name API
                        console.log('Change group name:', newName);
                      }
                    }}
                    className="w-full justify-start gap-3 h-auto py-3 px-4 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 text-left"
                  >
                    <EditIcon className="w-5 h-5" />
                    <div className="flex-1">
                      <p className="font-medium">Change group name</p>
                      <p className="text-xs text-gray-400">Update the group chat name</p>
                    </div>
                  </Button>
                )}

                {/* Add Members - Only for Owners/Admins */}
                {(currentUserRole === "owner" || currentUserRole === "admin") && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      // TODO: Implement add members functionality
                      console.log('Add members to group');
                    }}
                    className="w-full justify-start gap-3 h-auto py-3 px-4 hover:bg-green-500/10 text-green-400 hover:text-green-300 text-left"
                  >
                    <UserPlusIcon className="w-5 h-5" />
                    <div className="flex-1">
                      <p className="font-medium">Add members</p>
                      <p className="text-xs text-gray-400">Invite people to this group</p>
                    </div>
                  </Button>
                )}
              </>
            )}

            {/* Change Avatar Button - Only for Group Chats */}
            {onUpdateAvatar && isGroupChat && (currentUserRole === "owner" || currentUserRole === "admin") && (
              <Button
                variant="ghost"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      // TODO: Implement proper file upload to storage service
                      // For now, create a temporary URL
                      const tempUrl = URL.createObjectURL(file);
                      onUpdateAvatar(conversation.id, tempUrl);
                    }
                  };
                  input.click();
                }}
                className="w-full justify-start gap-3 h-auto py-3 px-4 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 text-left"
              >
                <Users className="w-5 h-5" />
                <div className="flex-1">
                  <p className="font-medium">Change group avatar</p>
                  <p className="text-xs text-gray-400">Upload a new group photo</p>
                </div>
              </Button>
            )}

            {/* Archive/Unarchive Toggle */}
            <Button
              variant="ghost"
              onClick={() => {
                if (conversation.is_archived) {
                  onUnarchiveChat?.(conversation.id);
                } else {
                  onArchiveChat?.(conversation.id);
                }
              }}
              className="w-full justify-start gap-3 h-auto py-3 px-4 hover:bg-green-500/10 text-green-400 hover:text-green-300 text-left"
            >
              <ArchiveIcon className="w-5 h-5" />
              <div className="flex-1">
                <p className="font-medium">
                  {conversation.is_archived ? "Unarchive conversation" : "Archive conversation"}
                </p>
                <p className="text-xs text-gray-400">
                  {conversation.is_archived 
                    ? "Move this conversation back to active" 
                    : "Hide this conversation from main view"}
                </p>
              </div>
            </Button>

            {(!isGroupChat || currentUserRole === "owner") && !showDeleteConfirm && (
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full justify-start gap-3 h-auto py-3 px-4 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-left"
              >
                <TrashIcon className="w-5 h-5" />
                <div className="flex-1">
                  <p className="font-medium">Delete conversation</p>
                  <p className="text-xs text-gray-400">
                    {isGroupChat ? "Delete this group for everyone" : "Delete this conversation"}
                  </p>
                </div>
              </Button>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-3">
                <div className="flex items-start gap-3">
                  <TrashIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-400 mb-1">Delete permanently?</p>
                    <p className="text-xs text-gray-400">
                      This action cannot be undone. All messages will be permanently deleted.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="hover:bg-white/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDeleteChat}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Group Management Modal */}
      <GroupManagement
        isOpen={showGroupManagement}
        onClose={() => setShowGroupManagement(false)}
        conversationId={conversation.id}
        currentUserId={currentUserId}
        onUpdate={() => {
          // Refresh conversation data
          if (onUpdateAvatar) {
            // Trigger a refresh of the conversation
            window.location.reload();
          }
        }}
      />
    </Dialog>
  );
}
