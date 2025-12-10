"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Bell, 
  BellOff, 
  Mail, 
  Smartphone, 
  Clock, 
  Globe,
  MessageSquare,
  Users,
  UserPlus,
  BookOpen,
  Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface NotificationSettings {
  user_id: string;
  message_notifications: boolean;
  group_invites: boolean;
  connection_requests: boolean;
  study_pod_updates: boolean;
  achievement_notifications: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch notification settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      } else {
        toast.error('Failed to load notification settings');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast.success('Notification settings saved');
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    if (!settings) return;
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Failed to load settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            General Notifications
          </CardTitle>
          <CardDescription>
            Control your overall notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.email_notifications}
              onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive push notifications on your device
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={settings.push_notifications}
              onCheckedChange={(checked) => updateSetting('push_notifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Message Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Message Notifications
          </CardTitle>
          <CardDescription>
            Control notifications for messages and conversations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="message-notifications">New Messages</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when you receive new messages
              </p>
            </div>
            <Switch
              id="message-notifications"
              checked={settings.message_notifications}
              onCheckedChange={(checked) => updateSetting('message_notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="group-invites">Group Invites</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when invited to group chats
              </p>
            </div>
            <Switch
              id="group-invites"
              checked={settings.group_invites}
              onCheckedChange={(checked) => updateSetting('group_invites', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Social Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Social Notifications
          </CardTitle>
          <CardDescription>
            Control notifications for social activities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="connection-requests">Connection Requests</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about new connection requests
              </p>
            </div>
            <Switch
              id="connection-requests"
              checked={settings.connection_requests}
              onCheckedChange={(checked) => updateSetting('connection_requests', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="study-pod-updates">Study Pod Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about study pod activities
              </p>
            </div>
            <Switch
              id="study-pod-updates"
              checked={settings.study_pod_updates}
              onCheckedChange={(checked) => updateSetting('study_pod_updates', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="achievement-notifications">Achievements</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about new achievements
              </p>
            </div>
            <Switch
              id="achievement-notifications"
              checked={settings.achievement_notifications}
              onCheckedChange={(checked) => updateSetting('achievement_notifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Set times when you don't want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="quiet-hours-enabled">Enable Quiet Hours</Label>
              <p className="text-sm text-muted-foreground">
                Pause notifications during specified hours
              </p>
            </div>
            <Switch
              id="quiet-hours-enabled"
              checked={settings.quiet_hours_enabled}
              onCheckedChange={(checked) => updateSetting('quiet_hours_enabled', checked)}
            />
          </div>

          {settings.quiet_hours_enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">Start Time</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={settings.quiet_hours_start}
                    onChange={(e) => updateSetting('quiet_hours_start', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-end">End Time</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={settings.quiet_hours_end}
                    onChange={(e) => updateSetting('quiet_hours_end', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={settings.timezone} onValueChange={(value) => updateSetting('timezone', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
