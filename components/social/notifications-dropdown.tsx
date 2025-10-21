"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { 
  Bell, 
  Check, 
  X, 
  MoreHorizontal,
  Users,
  Trophy,
  BookOpen,
  Target,
  Zap,
  MessageSquare,
  Share2,
  Clock,
  Settings,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  notification_type: string;
  title: string;
  message?: string;
  link?: string;
  read: boolean;
  priority: string;
  metadata: any;
  created_at: string;
  actor?: {
    user_id: string;
    full_name: string;
    username: string;
    avatar_url?: string;
  };
}

interface NotificationsDropdownProps {
  className?: string;
}

export function NotificationsDropdown({ className }: NotificationsDropdownProps) {
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [migrationsNeeded, setMigrationsNeeded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // First check if migrations are needed
      const healthResponse = await fetch('/api/health/migrations');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        if (healthData.status === 'migrations_needed') {
          console.warn('Database migrations needed for notifications feature');
          setNotifications([]);
          setUnreadCount(0);
          setMigrationsNeeded(true);
          return;
        }
      }
      
      const response = await fetch('/api/notifications?limit=10&unread_only=false');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications.filter((n: Notification) => !n.read).length);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch notifications:', errorData.error || 'Unknown error');
        // Set empty state on error
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Set empty state on error
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_ids: notificationIds,
          read: true
        })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notificationIds.includes(notification.id)
              ? { ...notification, read: true }
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      } else {
        toast.error('Failed to mark notifications as read');
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    await markAsRead(unreadNotifications.map(n => n.id));
    toast.success('All notifications marked as read');
  };

  const getNotificationIcon = (type: string) => {
    const icons = {
      connection_request: Users,
      connection_accepted: Users,
      connection_milestone: Users,
      activity_reaction: MessageSquare,
      activity_comment: MessageSquare,
      study_plan_shared: BookOpen,
      achievement_milestone: Trophy,
      system_announcement: Zap
    };
    return icons[type as keyof typeof icons] || Bell;
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'urgent') return 'text-red-500';
    if (priority === 'high') return 'text-orange-500';
    
    const colors = {
      connection_request: 'text-blue-500',
      connection_accepted: 'text-green-500',
      connection_milestone: 'text-purple-500',
      activity_reaction: 'text-pink-500',
      activity_comment: 'text-cyan-500',
      study_plan_shared: 'text-indigo-500',
      achievement_milestone: 'text-yellow-500',
      system_announcement: 'text-gray-500'
    };
    return colors[type as keyof typeof colors] || 'text-gray-500';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead([notification.id]);
    }
    
    if (notification.link) {
      window.location.href = notification.link;
    }
    
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Bell Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size="sm"
        className="relative p-2"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <Card className={cn(
          "absolute right-0 top-12 w-96 max-h-96 overflow-hidden border-2 backdrop-blur-xl z-50",
          theme === 'light' 
            ? "bg-white/90 border-black/5 shadow-xl" 
            : "bg-zinc-950/90 border-white/5 shadow-xl"
        )}>
          {/* Header */}
          <div className={cn(
            "p-4 border-b",
            theme === 'light' ? "border-black/5" : "border-white/5"
          )}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    onClick={markAllAsRead}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
                      <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : migrationsNeeded ? (
              <div className="p-8 text-center">
                <div className={cn(
                  "w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center",
                  theme === 'light' ? "bg-yellow-100" : "bg-yellow-900/20"
                )}>
                  <Settings className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h4 className="font-medium text-foreground mb-2">Setup Required</h4>
                <p className="text-sm text-muted-foreground">
                  Run database migrations to enable notifications
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className={cn(
                  "w-12 h-12 mx-auto mb-4",
                  theme === 'light' ? "text-zinc-400" : "text-zinc-600"
                )} />
                <h4 className="font-medium text-foreground mb-2">No notifications</h4>
                <p className="text-sm text-muted-foreground">
                  You're all caught up!
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{
                borderColor: theme === 'light' ? '#e4e4e7' : '#27272a'
              }}>
                {notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.notification_type);
                  const iconColor = getNotificationColor(notification.notification_type, notification.priority);
                  
                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "p-4 hover:bg-opacity-50 cursor-pointer transition-colors",
                        !notification.read && "bg-blue-50/50 dark:bg-blue-500/10",
                        theme === 'light' ? "hover:bg-zinc-50" : "hover:bg-zinc-800"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          !notification.read 
                            ? "bg-blue-100 dark:bg-blue-500/20" 
                            : "bg-zinc-100 dark:bg-zinc-800"
                        )}>
                          <Icon className={cn("w-4 h-4", iconColor)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className={cn(
                                "text-sm font-medium",
                                !notification.read && "font-semibold",
                                theme === 'light' ? "text-zinc-900" : "text-white"
                              )}>
                                {notification.title}
                              </p>
                              {notification.message && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-muted-foreground">
                                  {formatTimeAgo(notification.created_at)}
                                </span>
                                {notification.priority === 'urgent' && (
                                  <Badge variant="destructive" className="text-xs">
                                    Urgent
                                  </Badge>
                                )}
                                {notification.priority === 'high' && (
                                  <Badge variant="secondary" className="text-xs">
                                    High
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              {!notification.read && (
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-1 h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead([notification.id]);
                                }}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className={cn(
              "p-3 border-t text-center",
              theme === 'light' ? "border-black/5" : "border-white/5"
            )}>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to full notifications page
                  window.location.href = '/notifications';
                }}
              >
                View all notifications
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
