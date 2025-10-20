"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Users,
  Search,
  GraduationCap,
  Briefcase,
  MapPin,
  X,
  Loader2,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Connection {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  university: string | null;
  graduation_year: string | null;
  company: string | null;
  location: string | null;
  job_title: string | null;
  connected_at: string;
  mutual_connections_count: number;
}

interface ConnectionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username?: string;
  isOwnProfile?: boolean;
}

export function ConnectionsModal({
  open,
  onOpenChange,
  userId,
  username,
  isOwnProfile = false,
}: ConnectionsModalProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [filteredConnections, setFilteredConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (open) {
      fetchConnections();
    }
  }, [open, userId]);

  useEffect(() => {
    // Filter connections based on search query
    if (!searchQuery.trim()) {
      setFilteredConnections(connections);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = connections.filter(
      (conn) =>
        conn.full_name?.toLowerCase().includes(query) ||
        conn.username?.toLowerCase().includes(query) ||
        conn.university?.toLowerCase().includes(query) ||
        conn.company?.toLowerCase().includes(query) ||
        conn.location?.toLowerCase().includes(query) ||
        conn.job_title?.toLowerCase().includes(query)
    );
    setFilteredConnections(filtered);
  }, [searchQuery, connections]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}/connections`);

      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections || []);
        setFilteredConnections(data.connections || []);
        setIsPrivate(!data.has_access && !isOwnProfile);
      } else {
        setIsPrivate(true);
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
      setIsPrivate(true);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col bg-gradient-to-br from-card/95 via-card/90 to-card/95 backdrop-blur-xl border-2 border-border/20 shadow-2xl">
        {/* Glassmorphic background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-purple-500/5 to-brand/5 opacity-50 pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 rounded-full blur-3xl opacity-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl opacity-20 pointer-events-none" />

        <DialogHeader className="relative z-10">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-purple-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span>
              {isOwnProfile ? "My Connections" : `${username}'s Connections`}
            </span>
          </DialogTitle>
          <DialogDescription>
            {isPrivate
              ? "This user's connections are private"
              : `${connections.length} connection${connections.length !== 1 ? "s" : ""}`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20 relative z-10">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
          </div>
        ) : isPrivate ? (
          <div className="flex flex-col items-center justify-center py-20 relative z-10 text-center">
            <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-4">
              <EyeOff className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connections are Private</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              {username} has chosen to keep their connections private. Connect with them to view their network.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="relative z-10 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search connections by name, company, school, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 bg-muted/20 border-border/40 focus:border-brand/50 backdrop-blur-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Connections List */}
            <div className="relative z-10 flex-1 overflow-y-auto space-y-3 pr-2">
              {filteredConnections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "No connections found matching your search"
                      : "No connections yet"}
                  </p>
                </div>
              ) : (
                filteredConnections.map((connection) => (
                  <Link
                    key={connection.user_id}
                    href={`/profile/${connection.username}`}
                    onClick={() => onOpenChange(false)}
                  >
                    <div className="group relative p-4 rounded-xl border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-md hover:border-brand/40 transition-all duration-300 hover:scale-[1.01] cursor-pointer overflow-hidden">
                      {/* Hover gradient effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-brand/5 via-purple-500/5 to-brand/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="relative flex items-start gap-4">
                        {/* Avatar */}
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg overflow-hidden flex-shrink-0">
                          {connection.avatar_url ? (
                            <Image
                              src={connection.avatar_url}
                              alt={connection.full_name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            getInitials(connection.full_name)
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <h4 className="font-semibold text-base group-hover:text-brand transition-colors">
                                {connection.full_name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                @{connection.username}
                              </p>
                            </div>
                            {connection.mutual_connections_count > 0 && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-brand/10 text-brand border-brand/30"
                              >
                                {connection.mutual_connections_count} mutual
                              </Badge>
                            )}
                          </div>

                          {connection.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                              {connection.bio}
                            </p>
                          )}

                          {/* Metadata */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {connection.job_title && connection.company && (
                              <div className="flex items-center gap-1.5">
                                <Briefcase className="w-3 h-3 text-brand" />
                                <span>
                                  {connection.job_title} at {connection.company}
                                </span>
                              </div>
                            )}
                            {connection.university && (
                              <div className="flex items-center gap-1.5">
                                <GraduationCap className="w-3 h-3 text-brand" />
                                <span>
                                  {connection.university}
                                  {connection.graduation_year &&
                                    ` '${connection.graduation_year.slice(-2)}`}
                                </span>
                              </div>
                            )}
                            {connection.location && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-brand" />
                                <span>{connection.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
