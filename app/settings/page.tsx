"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import Image from "next/image";
import CoduraLogo from "@/components/logos/codura-logo.svg";
import CoduraLogoDark from "@/components/logos/codura-logo-dark.svg";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, X } from "lucide-react";
import dynamic from 'next/dynamic';
import { toast } from "sonner";
import { useTheme } from "next-themes";

// Theme-aware user name component
function UserNameText({ name, email }: { name: string; email: string }) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? (resolvedTheme === 'dark' || theme === 'dark') : false;

  return (
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold truncate" style={{ color: isDark ? '#F4F4F5' : '#18181B' }}>
        {name}
      </p>
      <p className="text-xs truncate" style={{ color: isDark ? '#A1A1AA' : '#71717A' }}>
        {email}
      </p>
    </div>
  );
}

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

type TabType = 'appearance' | 'profile' | 'account';

export default function SettingsPage() {
  const { theme: currentTheme, setTheme: setAppTheme } = useTheme();
  const [showBorder, setShowBorder] = useState(false);
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

  useEffect(() => {
    const evaluateScrollPosition = () => {
      setShowBorder(window.pageYOffset >= 24);
    };
    window.addEventListener("scroll", evaluateScrollPosition);
    evaluateScrollPosition();
    return () => window.removeEventListener("scroll", evaluateScrollPosition);
  }, []);

  useEffect(() => {
    fetchUserData();
  }, []);

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

  return (
    <div className="caffeine-theme min-h-screen bg-background relative">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-brand/5 dark:bg-brand/8 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] left-[15%] w-[400px] h-[400px] bg-purple-500/3 dark:bg-purple-500/6 rounded-full blur-[80px] animate-float-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navbar */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b border-b-transparent bg-gradient-to-b shadow-none backdrop-blur-none transition-all duration-500",
          showBorder
            ? "border-b-border/50 shadow-xl backdrop-blur-md from-background/80 to-background/50"
            : ""
        )}
      >
        <div className="flex items-center justify-between py-4 max-w-7xl mx-auto px-6">
          <Link href="/" aria-label="Codura homepage" className="flex items-center group">
            <Image
              src={currentTheme === 'light' ? CoduraLogoDark : CoduraLogo}
              alt="Codura logo"
              width={90}
              height={40}
              priority
              className="transition-all duration-200 group-hover:opacity-80"
            />
          </Link>

          <nav className="hidden items-center gap-6 text-base leading-7 font-light text-muted-foreground lg:flex">
            <Link className="hover:text-foreground transition-colors" href="/dashboard">
              Dashboard
            </Link>
            <Link className="hover:text-foreground transition-colors" href="/problems">
              Problems
            </Link>
            <Link className="hover:text-foreground transition-colors" href="/mock-interview">
              Interview
            </Link>
            <Link className="hover:text-foreground transition-colors" href="/leaderboards">
              Leaderboards
            </Link>
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 hover:bg-accent">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-orange-300 flex items-center justify-center text-white font-semibold text-sm overflow-hidden relative">
                      {user.avatar && user.avatar.startsWith('http') ? (
                        <img
                          src={user.avatar}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm">{user.avatar}</span>
                      )}
                    </div>
                    <span className="hidden sm:inline text-sm text-muted-foreground">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[280px]"
                >
                  <div className="px-3 py-3.5 mb-1">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand to-blue-600 dark:from-brand dark:to-orange-400 flex items-center justify-center text-white font-semibold overflow-hidden ring-1 ring-border/50">
                          {user.avatar && user.avatar.startsWith('http') ? (
                            <img
                              src={user.avatar}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm">{user.avatar}</span>
                          )}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-card" />
                      </div>
                      <UserNameText name={user.name} email={user.email} />
                    </div>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent my-1.5" />

                  <div className="py-1 space-y-0.5">
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/profile/${user?.username || ''}`}
                        className="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm font-medium group"
                      >
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 dark:from-brand dark:to-orange-400 flex items-center justify-center group-hover:from-blue-600 group-hover:to-blue-700 dark:group-hover:from-brand/90 dark:group-hover:to-orange-500 transition-all shadow-sm">
                          {/* @ts-ignore */}
                          <User className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                        </div>
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm font-medium group"
                      >
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-slate-500 to-slate-600 dark:from-brand dark:to-orange-400 flex items-center justify-center group-hover:from-slate-600 group-hover:to-slate-700 dark:group-hover:from-brand/90 dark:group-hover:to-orange-500 transition-all shadow-sm">
                          {/* @ts-ignore */}
                          <Settings className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                        </div>
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent my-1.5" />

                  <div className="py-1">
                    <DropdownMenuItem
                      variant="destructive"
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm font-medium group"
                      onClick={async () => {
                        await fetch('/auth/signout', { method: 'POST' });
                        window.location.href = '/';
                      }}
                    >
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-red-500 to-red-600 dark:from-red-500/80 dark:to-red-600/80 flex items-center justify-center group-hover:from-red-600 group-hover:to-red-700 dark:group-hover:from-red-500 dark:group-hover:to-red-600 transition-all shadow-sm">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </div>
                      <span className="text-red-600 dark:text-red-400">Sign out</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </header>

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
          </div>
        </div>
      </main>
    </div>
  );
}
