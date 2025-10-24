"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { X, Bell, Mail, Smartphone, Users, MessageSquare, BookOpen, Trophy, Zap, Clock, Save, Check, Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import dynamic from 'next/dynamic';
import { toast } from "sonner";
import { useTheme } from "next-themes";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { PrivacySettings } from "@/components/settings/privacy-settings";
import { NotificationSettings } from "@/components/notifications/notification-settings";

// Dynamic imports for icons
// @ts-ignore
const User: any = dynamic(() => import('lucide-react').then(mod => mod.User), { ssr: false });
// @ts-ignore
const Settings: any = dynamic(() => import('lucide-react').then(mod => mod.Settings), { ssr: false });
// @ts-ignore
const ArrowLeft: any = dynamic(() => import('lucide-react').then(mod => mod.ArrowLeft), { ssr: false });

interface UserData {
  name: string;
  email: string;
  avatar: string;
  username?: string;
  bio?: string;
}

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

type TabType = 'appearance' | 'profile' | 'account' | 'notifications' | 'privacy';

export default function SettingsPage() {
  const { theme: currentTheme, setTheme: setAppTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('appearance');
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  // Account state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification preferences state
  const [notifPreferences, setNotifPreferences] = useState<NotificationPreferences>({
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
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchNotificationPreferences();
  }, []);

  const fetchNotificationPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        setNotifPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      setError(null);
      const response = await fetch('/api/profile');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load profile data');
      }

      const data = await response.json();
      const fullName = data.profile?.full_name || data.user?.email?.split('@')[0] || 'User';
      const initials = fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      const userData = {
        name: fullName,
        email: data.user?.email || '',
        avatar: data.profile?.avatar_url || initials,
        username: data.profile?.username || '',
        bio: data.profile?.bio || '',
      };

      setUser(userData);
      setFullName(userData.name);
      setUsername(userData.username || '');
      setBio(userData.bio || '');
      setIsPublic(data.profile?.is_public ?? true);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load settings data');
    } finally {
      setLoading(false);
    }
  };

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);

      // Validate username
      if (username && username.length < 3) {
        toast.error('Username must be at least 3 characters long');
        return;
      }

      // Validate bio length
      if (bio && bio.length > 160) {
        toast.error('Bio must be 160 characters or less');
        return;
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          username: username || null,
          bio: bio || null,
          is_public: isPublic,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to update profile');
        return;
      }

      // Update local user state
      if (user) {
        setUser({
          ...user,
          name: fullName,
          username: username,
          bio: bio,
        });
      }

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setIsChangingPassword(true);

      // Validate passwords
      if (!currentPassword || !newPassword || !confirmPassword) {
        toast.error('Please fill in all password fields');
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }

      if (newPassword.length < 8) {
        toast.error('New password must be at least 8 characters long');
        return;
      }

      if (currentPassword === newPassword) {
        toast.error('New password must be different from current password');
        return;
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to change password');
        return;
      }

      toast.success('Password changed successfully');

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setIsSavingNotifications(true);
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifPreferences)
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
      setIsSavingNotifications(false);
    }
  };

  const handleNotificationChange = (key: keyof NotificationPreferences, value: any) => {
    setNotifPreferences(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="caffeine-theme min-h-screen bg-background relative">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-brand/5 dark:bg-brand/8 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] left-[15%] w-[400px] h-[400px] bg-purple-500/3 dark:bg-purple-500/6 rounded-full blur-[80px] animate-float-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navbar */}
      {user && <DashboardNavbar user={user} />}

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-16">
        {/* Error State */}
        {error && !loading && (
          <Card className="mb-6 border-2 border-destructive/30 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl shadow-xl">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <X className="w-6 h-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-1">Failed to Load Settings</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button onClick={fetchUserData} variant="outline" size="sm">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-foreground via-foreground to-brand bg-clip-text text-transparent leading-relaxed">
            Settings
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your account preferences and settings
          </p>
        </div>

        {/* Settings Container */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card 
              className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl sticky top-24 shine-effect group hover:border-brand/30 transition-all duration-500 hover:scale-[1.01]"
              style={{ '--glow-color': 'var(--brand)' } as React.CSSProperties}
            >
              {/* Animated glow borders */}
              <div className="glow-border-top" />
              <div className="glow-border-bottom" />
              <div className="glow-border-left" />
              <div className="glow-border-right" />
              
              {/* Enhanced background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-12 transition-opacity duration-700 pointer-events-none" />
              
              <CardContent className="p-2">
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab('appearance')}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      activeTab === 'appearance'
                        ? "bg-brand text-brand-foreground shadow-lg shadow-brand/30"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    Appearance
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      activeTab === 'profile'
                        ? "bg-brand text-brand-foreground shadow-lg shadow-brand/30"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('account')}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      activeTab === 'account'
                        ? "bg-brand text-brand-foreground shadow-lg shadow-brand/30"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    Account
                  </button>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      activeTab === 'notifications'
                        ? "bg-brand text-brand-foreground shadow-lg shadow-brand/30"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    Notifications
                  </button>
                  <button
                    onClick={() => setActiveTab('privacy')}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      activeTab === 'privacy'
                        ? "bg-brand text-brand-foreground shadow-lg shadow-brand/30"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    Privacy
                  </button>
                  <button
                    onClick={() => setShowNotificationSettings(true)}
                    className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Notification Settings
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <Card 
                className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl shine-effect group hover:border-purple-500/30 transition-all duration-500 hover:scale-[1.01]"
                style={{ '--glow-color': '#a855f7' } as React.CSSProperties}
              >
                {/* Animated glow borders */}
                <div className="glow-border-top" />
                <div className="glow-border-bottom" />
                <div className="glow-border-left" />
                <div className="glow-border-right" />
                
                {/* Enhanced background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" />
                <CardHeader>
                  <CardTitle className="text-2xl">Appearance</CardTitle>
                  <CardDescription>
                    Customize how Codura looks on your device
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Theme</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select your preferred color scheme
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setAppTheme('dark')}
                        className={cn(
                          "relative p-4 rounded-lg border-2 transition-all duration-200",
                          currentTheme === 'dark'
                            ? "border-brand bg-brand/5 shadow-lg shadow-brand/20"
                            : "border-border/30 hover:border-border/50"
                        )}
                      >
                        <div className="aspect-video rounded-md bg-zinc-900 mb-3 p-3 flex flex-col gap-2">
                          <div className="h-2 bg-zinc-700 rounded w-1/2" />
                          <div className="h-2 bg-zinc-800 rounded w-3/4" />
                          <div className="h-2 bg-zinc-800 rounded w-2/3" />
                        </div>
                        <p className="text-sm font-medium">Dark</p>
                        {currentTheme === 'dark' && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>

                      <button
                        onClick={() => setAppTheme('light')}
                        className={cn(
                          "relative p-4 rounded-lg border-2 transition-all duration-200",
                          currentTheme === 'light'
                            ? "border-brand bg-brand/5 shadow-lg shadow-brand/20"
                            : "border-border/30 hover:border-border/50"
                        )}
                      >
                        <div className="aspect-video rounded-md bg-white mb-3 p-3 flex flex-col gap-2 border border-gray-300">
                          <div className="h-2 bg-gray-300 rounded w-1/2" />
                          <div className="h-2 bg-gray-200 rounded w-3/4" />
                          <div className="h-2 bg-gray-200 rounded w-2/3" />
                        </div>
                        <p className="text-sm font-medium">Light</p>
                        {currentTheme === 'light' && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand flex items-center justify-center">
                            <svg className="w-3 h-3 text-brand-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/20">
                    <Button
                      onClick={() => toast.success('Theme preference saved')}
                      className="bg-brand hover:bg-brand/90 text-brand-foreground"
                    >
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <Card 
                className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl shine-effect group hover:border-blue-500/30 transition-all duration-500 hover:scale-[1.01]"
                style={{ '--glow-color': '#3b82f6' } as React.CSSProperties}
              >
                {/* Animated glow borders */}
                <div className="glow-border-top" />
                <div className="glow-border-bottom" />
                <div className="glow-border-left" />
                <div className="glow-border-right" />
                
                {/* Enhanced background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" />
                <CardHeader>
                  <CardTitle className="text-2xl">Profile</CardTitle>
                  <CardDescription>
                    Manage your public profile information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullname">Full Name</Label>
                    <Input
                      id="fullname"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="bg-background/50 border-border/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="bg-background/50 border-border/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your profile will be available at codura.com/profile/{username || 'username'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={4}
                      className="bg-background/50 border-border/50 resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      {bio.length}/160 characters
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border/20">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                      <div className="space-y-0.5">
                        <Label htmlFor="public-profile" className="text-base font-semibold cursor-pointer">
                          Public Profile
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Allow others to view your profile and activity
                        </p>
                      </div>
                      <Switch
                        id="public-profile"
                        checked={isPublic}
                        onCheckedChange={setIsPublic}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/20">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="bg-brand hover:bg-brand/90 text-brand-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingProfile ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <Card 
                  className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl shine-effect group hover:border-cyan-500/30 transition-all duration-500 hover:scale-[1.01]"
                  style={{ '--glow-color': '#06b6d4' } as React.CSSProperties}
                >
                  {/* Animated glow borders */}
                  <div className="glow-border-top" />
                  <div className="glow-border-bottom" />
                  <div className="glow-border-left" />
                  <div className="glow-border-right" />
                  
                  {/* Enhanced background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" />
                  <CardHeader>
                    <CardTitle className="text-2xl">Account</CardTitle>
                    <CardDescription>
                      Manage your account security and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-muted/30 border-border/50 cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">
                        Contact support to change your email address
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl shine-effect group hover:border-red-500/30 transition-all duration-500 hover:scale-[1.01]"
                  style={{ '--glow-color': '#ef4444' } as React.CSSProperties}
                >
                  {/* Animated glow borders */}
                  <div className="glow-border-top" />
                  <div className="glow-border-bottom" />
                  <div className="glow-border-left" />
                  <div className="glow-border-right" />
                  
                  {/* Enhanced background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" />
                  <CardHeader>
                    <CardTitle className="text-xl">Change Password</CardTitle>
                    <CardDescription>
                      Update your password to keep your account secure
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="bg-background/50 border-border/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min. 8 characters)"
                        className="bg-background/50 border-border/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="bg-background/50 border-border/50"
                      />
                    </div>

                    <Button
                      onClick={handleChangePassword}
                      disabled={isChangingPassword}
                      className="bg-brand hover:bg-brand/90 text-brand-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isChangingPassword ? 'Updating...' : 'Update Password'}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-red-500/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl">
                  {/* Glow lines on all 4 sides */}
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
                  <div className="absolute left-0 inset-y-0 w-px bg-gradient-to-b from-transparent via-red-500/40 to-transparent" />
                  <div className="absolute right-0 inset-y-0 w-px bg-gradient-to-b from-transparent via-red-500/40 to-transparent" />
                  <CardHeader>
                    <CardTitle className="text-xl text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                    <CardDescription>
                      Irreversible actions for your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                      <h4 className="font-semibold mb-2">Delete Account</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Once you delete your account, there is no going back. All your data will be permanently removed.
                      </p>
                      <Button variant="destructive" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        Delete Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                {/* General Notifications */}
                <Card 
                  className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl shine-effect group hover:border-brand/30 transition-all duration-500 hover:scale-[1.01]"
                  style={{ '--glow-color': 'var(--brand)' } as React.CSSProperties}
                >
                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-3">
                      <Bell className="w-6 h-6 text-brand" />
                      General Notifications
                    </CardTitle>
                    <CardDescription>
                      Manage your notification preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <Label className="text-sm font-medium">Email Notifications</Label>
                          <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifPreferences.email_notifications}
                        onCheckedChange={(checked) => handleNotificationChange('email_notifications', checked)}
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
                        checked={notifPreferences.push_notifications}
                        onCheckedChange={(checked) => handleNotificationChange('push_notifications', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Connection Notifications */}
                <Card 
                  className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl shine-effect group hover:border-blue-500/30 transition-all duration-500 hover:scale-[1.01]"
                  style={{ '--glow-color': '#3b82f6' } as React.CSSProperties}
                >
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-3">
                      <Users className="w-5 h-5 text-brand" />
                      Connection Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <Label className="text-sm font-medium">Connection Requests</Label>
                          <p className="text-xs text-muted-foreground">When someone sends you a connection request</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifPreferences.connection_requests}
                        onCheckedChange={(checked) => handleNotificationChange('connection_requests', checked)}
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
                        checked={notifPreferences.connection_accepted}
                        onCheckedChange={(checked) => handleNotificationChange('connection_accepted', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Activity Notifications */}
                <Card 
                  className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl shine-effect group hover:border-purple-500/30 transition-all duration-500 hover:scale-[1.01]"
                  style={{ '--glow-color': '#a855f7' } as React.CSSProperties}
                >
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-brand" />
                      Activity Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <Label className="text-sm font-medium">Activity Reactions</Label>
                          <p className="text-xs text-muted-foreground">When someone reacts to your activities</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifPreferences.activity_reactions}
                        onCheckedChange={(checked) => handleNotificationChange('activity_reactions', checked)}
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
                        checked={notifPreferences.activity_comments}
                        onCheckedChange={(checked) => handleNotificationChange('activity_comments', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Content Notifications */}
                <Card 
                  className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl shine-effect group hover:border-green-500/30 transition-all duration-500 hover:scale-[1.01]"
                  style={{ '--glow-color': '#22c55e' } as React.CSSProperties}
                >
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-brand" />
                      Content Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <Label className="text-sm font-medium">Study Plan Shares</Label>
                          <p className="text-xs text-muted-foreground">When someone shares a study plan with you</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifPreferences.study_plan_shares}
                        onCheckedChange={(checked) => handleNotificationChange('study_plan_shares', checked)}
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
                        checked={notifPreferences.achievement_milestones}
                        onCheckedChange={(checked) => handleNotificationChange('achievement_milestones', checked)}
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
                        checked={notifPreferences.system_announcements}
                        onCheckedChange={(checked) => handleNotificationChange('system_announcements', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Frequency Settings */}
                <Card 
                  className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl shine-effect group hover:border-orange-500/30 transition-all duration-500 hover:scale-[1.01]"
                  style={{ '--glow-color': '#f97316' } as React.CSSProperties}
                >
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-3">
                      <Clock className="w-5 h-5 text-brand" />
                      Frequency Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Digest Frequency</Label>
                      <Select
                        value={notifPreferences.digest_frequency}
                        onValueChange={(value) => handleNotificationChange('digest_frequency', value)}
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
                          value={notifPreferences.quiet_hours_start || ''}
                          onChange={(e) => handleNotificationChange('quiet_hours_start', e.target.value)}
                          placeholder="HH:MM"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Quiet Hours End</Label>
                        <Input
                          type="time"
                          value={notifPreferences.quiet_hours_end || ''}
                          onChange={(e) => handleNotificationChange('quiet_hours_end', e.target.value)}
                          placeholder="HH:MM"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Set quiet hours to reduce notifications during specific times
                    </p>
                  </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveNotifications}
                    disabled={isSavingNotifications}
                    className="gap-2 bg-gradient-to-r from-brand to-purple-600 hover:from-brand/90 hover:to-purple-600/90 text-white shadow-lg"
                  >
                    {isSavingNotifications ? (
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
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <PrivacySettings />
            )}
          </div>
        </div>
      </main>

      {/* Notification Settings Modal */}
      {showNotificationSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Notification Settings</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotificationSettings(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <NotificationSettings
                isOpen={showNotificationSettings}
                onClose={() => setShowNotificationSettings(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
