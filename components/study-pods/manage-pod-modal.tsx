"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Settings,
  Users,
  UserPlus,
  Edit,
  Trash2,
  BookOpen,
  Calendar,
  Trophy,
  Shield,
  TrendingUp,
  X,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pod, setPod] = useState<any>(null);

  useEffect(() => {
    if (isOpen && podId) {
      fetchPodData();
    }
  }, [isOpen, podId]);

  const fetchPodData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/study-pods/${podId}`);
      if (response.ok) {
        const data = await response.json();
        setPod(data.pod);
      }
    } catch (error) {
      console.error("Error fetching pod:", error);
      toast.error("Failed to load pod data");
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      icon: UserPlus,
      label: "Invite Members",
      description: "Add new members to your pod",
      color: "from-emerald-500 to-cyan-500",
      iconColor: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
      onClick: () => {
        router.push(`/study-pods/${podId}?tab=members&action=invite`);
        onClose();
      },
    },
    {
      icon: BookOpen,
      label: "Assign Problems",
      description: "Add problems for the pod to solve",
      color: "from-blue-500 to-cyan-500",
      iconColor: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      onClick: () => {
        router.push(`/study-pods/${podId}?tab=problems&action=assign`);
        onClose();
      },
    },
    {
      icon: Calendar,
      label: "Create Session",
      description: "Schedule a study session",
      color: "from-purple-500 to-violet-500",
      iconColor: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/30",
      onClick: () => {
        router.push(`/study-pods/${podId}?tab=sessions&action=create`);
        onClose();
      },
    },
    {
      icon: Trophy,
      label: "Start Challenge",
      description: "Create a pod challenge",
      color: "from-amber-500 to-orange-500",
      iconColor: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
      onClick: () => {
        router.push(`/study-pods/${podId}?tab=challenges&action=create`);
        onClose();
      },
    },
    {
      icon: Shield,
      label: "Manage Roles",
      description: "Update member permissions",
      color: "from-cyan-500 to-blue-500",
      iconColor: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/30",
      onClick: () => {
        router.push(`/study-pods/${podId}?tab=members`);
        onClose();
      },
    },
    {
      icon: TrendingUp,
      label: "View Analytics",
      description: "Check pod performance",
      color: "from-green-500 to-emerald-500",
      iconColor: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
      onClick: () => {
        router.push(`/study-pods/${podId}?tab=analytics`);
        onClose();
      },
    },
  ];

  const handleEdit = () => {
    router.push(`/study-pods/${podId}?tab=settings`);
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${pod?.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/study-pods/${podId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete pod");
      }

      toast.success("Study pod deleted successfully");
      onRefresh?.();
      router.push("/study-pods");
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error deleting pod:", error);
      toast.error("Failed to delete study pod");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "sm:max-w-4xl max-h-[90vh] overflow-y-auto border-2 backdrop-blur-xl p-0",
          theme === 'light'
            ? "bg-white/95 border-gray-200/50 shadow-2xl"
            : "bg-zinc-950/95 border-white/10 shadow-2xl shadow-emerald-500/10"
        )}
      >
        {/* Glassmorphic Background Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.12),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(6,182,212,0.12),transparent_50%)]" />
          <div className={cn(
            "absolute inset-0",
            theme === 'light'
              ? "bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)]"
              : "bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)]"
          )} style={{ backgroundSize: '24px 24px' }} />
        </div>

        {/* Header */}
        <div className={cn(
          "relative px-6 pt-6 pb-4 border-b",
          theme === 'light' ? "border-gray-200/50" : "border-white/10"
        )}>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-foreground via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Manage Pod
              </DialogTitle>
            </div>
            {pod && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn(
                  "font-semibold backdrop-blur-sm border",
                  theme === 'light'
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                )}>
                  {pod.name}
                </Badge>
                <span className={cn(
                  "text-sm flex items-center gap-1.5",
                  theme === 'light' ? "text-gray-600" : "text-muted-foreground"
                )}>
                  <Users className="w-3.5 h-3.5" />
                  {pod.current_member_count}/{pod.max_members} members
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="relative p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : pod ? (
            <>
              {/* Quick Actions Grid */}
              <div>
                <h3 className={cn(
                  "text-lg font-semibold mb-4 flex items-center gap-2",
                  theme === 'light' ? "text-gray-900" : "text-white"
                )}>
                  <ExternalLink className="w-5 h-5 text-emerald-400" />
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.onClick}
                      className={cn(
                        "relative group p-4 rounded-xl border-2 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] text-left overflow-hidden",
                        theme === 'light'
                          ? "bg-white/90 border-gray-200/50 hover:border-gray-300 hover:shadow-lg"
                          : "bg-zinc-900/50 border-white/10 hover:border-white/20 hover:shadow-xl",
                        `hover:${action.borderColor}`
                      )}
                    >
                      {/* Hover gradient overlay */}
                      <div className={cn(
                        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300",
                        action.color
                      )} />

                      <div className="relative flex items-start gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 border backdrop-blur-sm",
                          action.bgColor,
                          action.borderColor
                        )}>
                          <action.icon className={cn("w-5 h-5", action.iconColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={cn(
                            "font-semibold mb-1 transition-colors",
                            theme === 'light' ? "text-gray-900 group-hover:text-emerald-600" : "text-white group-hover:text-emerald-400"
                          )}>
                            {action.label}
                          </h4>
                          <p className={cn(
                            "text-sm line-clamp-1",
                            theme === 'light' ? "text-gray-600" : "text-muted-foreground"
                          )}>
                            {action.description}
                          </p>
                        </div>
                        <ExternalLink className={cn(
                          "w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                          action.iconColor
                        )} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pod Management Section */}
              <div className={cn(
                "p-4 rounded-xl border-2 backdrop-blur-sm",
                theme === 'light'
                  ? "bg-amber-50/50 border-amber-200/50"
                  : "bg-amber-500/5 border-amber-500/20"
              )}>
                <h3 className={cn(
                  "text-sm font-semibold mb-3 flex items-center gap-2",
                  theme === 'light' ? "text-amber-900" : "text-amber-400"
                )}>
                  <Settings className="w-4 h-4" />
                  Pod Settings
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    className={cn(
                      "transition-all duration-300 hover:scale-105 backdrop-blur-sm",
                      theme === 'light'
                        ? "border-gray-300 hover:bg-gray-100"
                        : "border-white/10 hover:border-white/20 hover:bg-zinc-900/50"
                    )}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Pod
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Pod Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className={cn(
                  "p-3 rounded-lg backdrop-blur-sm border transition-all duration-300 hover:scale-105 hover:shadow-md",
                  theme === 'light'
                    ? "bg-gray-50 border-gray-200"
                    : "bg-zinc-900/50 border-white/5"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span className={cn(
                      "text-xs font-medium",
                      theme === 'light' ? "text-gray-600" : "text-muted-foreground"
                    )}>
                      Members
                    </span>
                  </div>
                  <p className={cn(
                    "text-lg font-bold",
                    theme === 'light' ? "text-gray-900" : "text-white"
                  )}>
                    {pod.current_member_count}
                  </p>
                </div>

                <div className={cn(
                  "p-3 rounded-lg backdrop-blur-sm border transition-all duration-300 hover:scale-105 hover:shadow-md",
                  theme === 'light'
                    ? "bg-gray-50 border-gray-200"
                    : "bg-zinc-900/50 border-white/5"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span className={cn(
                      "text-xs font-medium",
                      theme === 'light' ? "text-gray-600" : "text-muted-foreground"
                    )}>
                      Sessions
                    </span>
                  </div>
                  <p className={cn(
                    "text-lg font-bold",
                    theme === 'light' ? "text-gray-900" : "text-white"
                  )}>
                    {pod.total_sessions || 0}
                  </p>
                </div>

                <div className={cn(
                  "p-3 rounded-lg backdrop-blur-sm border transition-all duration-300 hover:scale-105 hover:shadow-md",
                  theme === 'light'
                    ? "bg-gray-50 border-gray-200"
                    : "bg-zinc-900/50 border-white/5"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    <span className={cn(
                      "text-xs font-medium",
                      theme === 'light' ? "text-gray-600" : "text-muted-foreground"
                    )}>
                      Problems
                    </span>
                  </div>
                  <p className={cn(
                    "text-lg font-bold",
                    theme === 'light' ? "text-gray-900" : "text-white"
                  )}>
                    {pod.total_problems || 0}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
                <p className={cn(
                  "text-lg font-semibold",
                  theme === 'light' ? "text-gray-900" : "text-white"
                )}>
                  Failed to load pod data
                </p>
                <Button onClick={fetchPodData} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
