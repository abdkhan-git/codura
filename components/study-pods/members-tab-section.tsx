"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Plus, Users, Clock, LogOut, Loader2 } from "lucide-react";
import { MemberCard } from "./member-card";
import { JoinRequestsSection } from "./join-requests-section";

interface MembersTabSectionProps {
  pod: any;
  podId: string;
  isAdmin: boolean;
  pendingCount: number;
  onInvite: () => void;
  onLeave: () => void;
  onUpdate: () => void;
  actionLoading: boolean;
}

export function MembersTabSection({
  pod,
  podId,
  isAdmin,
  pendingCount,
  onInvite,
  onLeave,
  onUpdate,
  actionLoading,
}: MembersTabSectionProps) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"members" | "requests">("members");

  const showRequestsTab = isAdmin && pod.requires_approval;

  return (
    <div className="space-y-5">
      {/* Header with tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Tabs */}
        <div className={cn(
          "inline-flex p-1 rounded-lg",
          theme === "light" ? "bg-gray-100" : "bg-white/5"
        )}>
          <button
            onClick={() => setActiveTab("members")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
              activeTab === "members"
                ? theme === "light"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "bg-white/10 text-white"
                : theme === "light"
                  ? "text-gray-600 hover:text-gray-900"
                  : "text-white/60 hover:text-white"
            )}
          >
            <Users className="w-4 h-4" />
            Members
            <span className={cn(
              "ml-1 px-1.5 py-0.5 text-xs rounded-full",
              activeTab === "members"
                ? theme === "light" ? "bg-gray-100 text-gray-600" : "bg-white/10 text-white/70"
                : theme === "light" ? "bg-gray-200 text-gray-500" : "bg-white/5 text-white/40"
            )}>
              {pod.members?.length || 0}
            </span>
          </button>

          {showRequestsTab && (
            <button
              onClick={() => setActiveTab("requests")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
                activeTab === "requests"
                  ? theme === "light"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "bg-white/10 text-white"
                  : theme === "light"
                    ? "text-gray-600 hover:text-gray-900"
                    : "text-white/60 hover:text-white"
              )}
            >
              <Clock className="w-4 h-4" />
              Requests
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-amber-500 text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Invite button */}
        {isAdmin && (
          <Button
            onClick={onInvite}
            size="sm"
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Invite
          </Button>
        )}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === "members" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Members Grid */}
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
              {pod.members?.map((member: any) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  podId={podId}
                  currentUserRole={pod.user_role}
                  onMemberUpdate={onUpdate}
                />
              ))}
            </div>

            {/* Leave Pod Button */}
            {pod.user_role !== 'owner' && pod.is_member && (
              <div className={cn(
                "pt-6 border-t",
                theme === "light" ? "border-gray-200" : "border-white/10"
              )}>
                <Button
                  variant="outline"
                  onClick={onLeave}
                  disabled={actionLoading}
                  className="text-destructive hover:bg-destructive/10"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4 mr-2" />
                  )}
                  Leave Pod
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "requests" && showRequestsTab && (
          <div className="animate-in fade-in duration-300">
            <JoinRequestsSection podId={podId} />
          </div>
        )}
      </div>
    </div>
  );
}
