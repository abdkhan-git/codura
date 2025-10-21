"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Users, 
  MessageSquare, 
  BookOpen, 
  Trophy, 
  Zap,
  Clock,
  Save,
  Check
} from "lucide-react";
import { toast } from "sonner";

interface NotificationPreferences {
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  connection_requests: boolean;
  connection_accepted: boolean;
  activity_reactions: boolean;
  activity_comments: boolean;
  study_plan_shares: boolean;
  achievement_milestones: boolean;
  system_announcements: boolean;
  digest_frequency: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export default function NotificationSettingsPage() {
  const { theme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    user_id: '',
    email_notifications: true,
    push_notifications: true,
    connection_requests: true,
    connection_accepted: true,
    activity_reactions: true,
    activity_comments: true,
    study_plan_shares: true,
    achievement_milestones: true,
    system_announcements: true,
    digest_frequency: 'daily',
    quiet_hours_start: '',
    quiet_hours_end: ''
  });

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          setUser({
            name: data.profile?.full_name || data.user?.email?.split('@')[0] || 'User',
            email: data.user?.email || '',
            avatar: data.profile?.avatar_url || data.profile?.full_name?.charAt(0).toUpperCase() || 'U',
            username: data.profile?.username || '',
          });
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  useEffect(() => {
    async function fetchPreferences() {
      try {
        const response = await fetch('/api/notifications/preferences');
        if (response.ok) {
          const data = await response.json();
          setPreferences(data.preferences);
        }
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
      }
    }

    fetchPreferences();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        toast.success('Notification preferences saved!');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Liquid Glass Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-[-10%] right-[20%] w-[600px] h-[600px] bg-brand/5 dark:bg-brand/8 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] left-[15%] w-[500px] h-[500px] bg-purple-500/3 dark:bg-purple-500/6 rounded-full blur-[100px] animate-float-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navbar */}
      <DashboardNavbar user={user} />

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-16">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg backdrop-blur-xl",
              theme === 'light' 
                ? "from-blue-500 to-cyan-500 shadow-blue-500/25 bg-white/20" 
                : "from-blue-600 to-cyan-600 shadow-blue-500/25 bg-white/5"
            )}>
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-brand to-purple-400 bg-clip-text text-transparent">
                Notification Settings
              </h1>
              <p className="text-muted-foreground">Manage your notification preferences</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* General Notifications */}
          <Card className={cn(
            "p-6 border-2 backdrop-blur-xl",
            theme === 'light' 
              ? "bg-white/80 border-black/5" 
              : "bg-zinc-950/80 border-white/5"
          )}>
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-5 h-5 text-brand" />
              <h2 className="text-xl font-semibold text-foreground">General Notifications</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.email_notifications}
                  onCheckedChange={(checked) => handlePreferenceChange('email_notifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Push Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive push notifications in browser</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.push_notifications}
                  onCheckedChange={(checked) => handlePreferenceChange('push_notifications', checked)}
                />
              </div>
            </div>
          </Card>

          {/* Connection Notifications */}
          <Card className={cn(
            "p-6 border-2 backdrop-blur-xl",
            theme === 'light' 
              ? "bg-white/80 border-black/5" 
              : "bg-zinc-950/80 border-white/5"
          )}>
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-5 h-5 text-brand" />
              <h2 className="text-xl font-semibold text-foreground">Connection Notifications</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Connection Requests</Label>
                    <p className="text-xs text-muted-foreground">When someone sends you a connection request</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.connection_requests}
                  onCheckedChange={(checked) => handlePreferenceChange('connection_requests', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Connection Accepted</Label>
                    <p className="text-xs text-muted-foreground">When someone accepts your connection request</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.connection_accepted}
                  onCheckedChange={(checked) => handlePreferenceChange('connection_accepted', checked)}
                />
              </div>
            </div>
          </Card>

          {/* Activity Notifications */}
          <Card className={cn(
            "p-6 border-2 backdrop-blur-xl",
            theme === 'light' 
              ? "bg-white/80 border-black/5" 
              : "bg-zinc-950/80 border-white/5"
          )}>
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="w-5 h-5 text-brand" />
              <h2 className="text-xl font-semibold text-foreground">Activity Notifications</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Activity Reactions</Label>
                    <p className="text-xs text-muted-foreground">When someone reacts to your activities</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.activity_reactions}
                  onCheckedChange={(checked) => handlePreferenceChange('activity_reactions', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Activity Comments</Label>
                    <p className="text-xs text-muted-foreground">When someone comments on your activities</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.activity_comments}
                  onCheckedChange={(checked) => handlePreferenceChange('activity_comments', checked)}
                />
              </div>
            </div>
          </Card>

          {/* Content Notifications */}
          <Card className={cn(
            "p-6 border-2 backdrop-blur-xl",
            theme === 'light' 
              ? "bg-white/80 border-black/5" 
              : "bg-zinc-950/80 border-white/5"
          )}>
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="w-5 h-5 text-brand" />
              <h2 className="text-xl font-semibold text-foreground">Content Notifications</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Study Plan Shares</Label>
                    <p className="text-xs text-muted-foreground">When someone shares a study plan with you</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.study_plan_shares}
                  onCheckedChange={(checked) => handlePreferenceChange('study_plan_shares', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Achievement Milestones</Label>
                    <p className="text-xs text-muted-foreground">When you or your connections reach milestones</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.achievement_milestones}
                  onCheckedChange={(checked) => handlePreferenceChange('achievement_milestones', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">System Announcements</Label>
                    <p className="text-xs text-muted-foreground">Important platform updates and announcements</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.system_announcements}
                  onCheckedChange={(checked) => handlePreferenceChange('system_announcements', checked)}
                />
              </div>
            </div>
          </Card>

          {/* Frequency Settings */}
          <Card className={cn(
            "p-6 border-2 backdrop-blur-xl",
            theme === 'light' 
              ? "bg-white/80 border-black/5" 
              : "bg-zinc-950/80 border-white/5"
          )}>
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-5 h-5 text-brand" />
              <h2 className="text-xl font-semibold text-foreground">Frequency Settings</h2>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Digest Frequency</Label>
                <Select
                  value={preferences.digest_frequency}
                  onValueChange={(value) => handlePreferenceChange('digest_frequency', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How often to receive notification digests
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quiet Hours Start</Label>
                  <Input
                    type="time"
                    value={preferences.quiet_hours_start || ''}
                    onChange={(e) => handlePreferenceChange('quiet_hours_start', e.target.value)}
                    placeholder="HH:MM"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quiet Hours End</Label>
                  <Input
                    type="time"
                    value={preferences.quiet_hours_end || ''}
                    onChange={(e) => handlePreferenceChange('quiet_hours_end', e.target.value)}
                    placeholder="HH:MM"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Set quiet hours to reduce notifications during specific times
              </p>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2 bg-gradient-to-r from-brand to-purple-600 hover:from-brand/90 hover:to-purple-600/90 text-white shadow-lg"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
