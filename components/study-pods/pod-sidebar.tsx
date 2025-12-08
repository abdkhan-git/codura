"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Users,
  Trophy,
  Target,
  Video,
  Settings,
  MessageCircle,
} from "lucide-react";

export type PodSection =
  | "overview"
  | "live-sessions"
  | "practice"
  | "challenges"
  | "members"
  | "settings";

interface PodSidebarProps {
  activeSection: PodSection;
  onSectionChange: (section: PodSection) => void;
  userRole: string;
  requiresApproval: boolean;
  pendingRequests?: number;
  groupChatId?: string;
  onGroupChat?: () => void;
  activeSessions?: number;
}

export function PodSidebar({
  activeSection,
  onSectionChange,
  userRole,
  requiresApproval,
  pendingRequests = 0,
  groupChatId,
  onGroupChat,
  activeSessions = 0,
}: PodSidebarProps) {
  const { theme } = useTheme();
  const isAdmin = userRole === "owner" || userRole === "moderator";

  const sections = [
    {
      id: "overview" as PodSection,
      label: "Overview",
      icon: LayoutDashboard,
      show: true,
    },
    {
      id: "live-sessions" as PodSection,
      label: "Live Sessions",
      icon: Video,
      show: true,
      badge: activeSessions > 0 ? activeSessions : undefined,
      pulse: activeSessions > 0,
    },
    {
      id: "practice" as PodSection,
      label: "Practice",
      icon: Target,
      show: true,
    },
    {
      id: "challenges" as PodSection,
      label: "Challenges",
      icon: Trophy,
      show: true,
    },
    {
      id: "members" as PodSection,
      label: "Members",
      icon: Users,
      show: true,
      badge: isAdmin && requiresApproval && pendingRequests > 0 ? pendingRequests : undefined,
    },
    {
      id: "settings" as PodSection,
      label: "Settings",
      icon: Settings,
      show: isAdmin,
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      {/* Section Label */}
      <div className={cn(
        "px-4 pt-4 pb-2",
        theme === "light" ? "text-gray-400" : "text-white/30"
      )}>
        <span className="text-[10px] font-bold uppercase tracking-widest">Navigation</span>
      </div>

      <nav className="px-3 pb-4 space-y-1">
        {sections.filter(s => s.show).map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? theme === "light"
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/80"
                    : "bg-white/10 text-white shadow-sm"
                  : theme === "light"
                    ? "text-gray-600 hover:text-gray-900 hover:bg-white/60"
                    : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className={cn(
                "w-4 h-4 flex-shrink-0",
                isActive
                  ? theme === "light" ? "text-gray-700" : "text-white"
                  : theme === "light" ? "text-gray-400" : "text-white/40"
              )} />

              <span className="flex-1 text-left">{section.label}</span>

              {section.badge && (
                <span className={cn(
                  "min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-medium rounded-full text-white",
                  section.pulse ? "bg-emerald-500" : "bg-amber-500"
                )}>
                  {section.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Group Chat Button */}
        {groupChatId && (
          <div className={cn(
            "pt-3 mt-3 border-t",
            theme === "light" ? "border-gray-200" : "border-white/5"
          )}>
            <button
              onClick={onGroupChat}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                theme === "light"
                  ? "text-gray-600 hover:text-gray-900 hover:bg-white/60"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <MessageCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">Group Chat</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}
