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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Search, Users, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";

interface Connection {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_online?: boolean;
}

interface NewMessageDialogProps {
  open: boolean;
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
}

export function NewMessageDialog({
  open,
  onClose,
  onConversationCreated,
}: NewMessageDialogProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [filteredConnections, setFilteredConnections] = useState<Connection[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      loadConnections();
      setSelectedUsers(new Set());
      setSearchQuery("");
      setGroupName("");
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredConnections(
        connections.filter(
          (conn) =>
            conn.full_name.toLowerCase().includes(query) ||
            conn.username.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredConnections(connections);
    }
  }, [searchQuery, connections]);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/connections");
      if (response.ok) {
        const data = await response.json();
        console.log("Connections API response:", data);
        
        // Transform connections data to match our interface
        const conns: Connection[] = data.connections.map((conn: any) => ({
          user_id: conn.user_id,
          username: conn.username,
          full_name: conn.full_name,
          avatar_url: conn.avatar_url,
          is_online: false, // We'll add online status later if needed
        }));
        setConnections(conns);
        setFilteredConnections(conns);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error("Connections API error:", response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch connections`);
      }
    } catch (error) {
      console.error("Failed to load connections:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load connections");
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleCreate = async () => {
    if (selectedUsers.size === 0) {
      toast.error("Please select at least one person");
      return;
    }

    setCreating(true);
    try {
      const isGroup = selectedUsers.size > 1;

      // For group chats, require a name
      if (isGroup && !groupName.trim()) {
        toast.error("Please enter a group name");
        setCreating(false);
        return;
      }

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: isGroup ? "group" : "direct",
          participant_ids: Array.from(selectedUsers),
          ...(isGroup && { name: groupName.trim() }),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Server error creating conversation:", error);
        throw new Error(error.error || "Failed to create conversation");
      }

      const { conversation } = await response.json();

      if (!conversation || !conversation.id) {
        console.error("Invalid conversation response:", conversation);
        throw new Error("Invalid conversation data received");
      }

      toast.success(
        isGroup
          ? `Created group "${groupName}"`
          : "Conversation started"
      );

      onConversationCreated(conversation.id);
      onClose();
    } catch (error) {
      console.error("Failed to create conversation:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create conversation"
      );
    } finally {
      setCreating(false);
    }
  };

  const selectedConnections = connections.filter((conn) =>
    selectedUsers.has(conn.user_id)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand" />
            New Message
          </DialogTitle>
          <DialogDescription>
            Select connections to start a conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected users */}
          {selectedUsers.size > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-zinc-900/50 rounded-lg border border-white/5">
              {selectedConnections.map((conn) => (
                <Badge
                  key={conn.user_id}
                  variant="secondary"
                  className="pl-2 pr-1 gap-2"
                >
                  <span>{conn.full_name}</span>
                  <button
                    onClick={() => toggleUser(conn.user_id)}
                    className="hover:bg-white/10 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Group name input (only if multiple selected) */}
          {selectedUsers.size > 1 && (
            <div>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name..."
                className="bg-zinc-900/50 border-white/10"
              />
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connections..."
              className="pl-10 bg-zinc-900/50 border-white/10"
            />
          </div>

          {/* Connections list */}
          <ScrollArea className="h-[300px] border border-white/5 rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                <Users className="w-12 h-12 mb-4 opacity-50" />
                <p className="font-medium">No connections found</p>
                <p className="text-sm mt-2">
                  {searchQuery
                    ? "Try a different search term"
                    : "Connect with others to start messaging"}
                </p>
              </div>
            ) : (
              <div className="p-2">
                {filteredConnections.map((conn) => (
                  <div
                    key={conn.user_id}
                    onClick={() => toggleUser(conn.user_id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer",
                      "hover:bg-zinc-900/50",
                      selectedUsers.has(conn.user_id) && "bg-brand/10"
                    )}
                  >
                    <Checkbox
                      checked={selectedUsers.has(conn.user_id)}
                      onCheckedChange={() => toggleUser(conn.user_id)}
                      className="flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />

                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={conn.avatar_url || ""} />
                        <AvatarFallback className="bg-gradient-to-br from-brand to-purple-600 text-white">
                          {conn.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {conn.is_online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-950" />
                      )}
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate">{conn.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        @{conn.username}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={selectedUsers.size === 0 || creating}
              className="flex-1 bg-gradient-to-br from-brand to-purple-600 hover:from-brand/90 hover:to-purple-600/90"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {selectedUsers.size > 1
                    ? `Create Group (${selectedUsers.size})`
                    : "Start Chat"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
