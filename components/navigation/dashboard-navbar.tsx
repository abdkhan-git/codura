"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import CoduraLogo from "../logos/codura-logo.svg";
import CoduraLogoDark from "../logos/codura-logo-dark.svg";
import {
  Users,
  Trophy,
  Video,
  User,
  Settings,
  ChevronDown,
  Calendar,
  Search,
  MessageSquare,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { NotificationsDropdown } from "@/components/social/notifications-dropdown";
import { DefaultAvatar } from "@/components/ui/default-avatar";

interface UserData {
  name: string;
  email: string;
  avatar: string;
  username?: string;
}

interface DashboardNavbarProps {
  user: UserData;
}

// Theme-aware user name component
function UserNameText({ name, email }: { name: string; email: string }) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
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

export default function DashboardNavbar({ user }: DashboardNavbarProps) {
  const [showBorder, setShowBorder] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (resolvedTheme || theme) : 'light';

  useEffect(() => {
    const evaluateScrollPosition = () => {
      setShowBorder(window.pageYOffset >= 24);
    };

    window.addEventListener("scroll", evaluateScrollPosition);
    evaluateScrollPosition();

    return () => window.removeEventListener("scroll", evaluateScrollPosition);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-all duration-500",
        showBorder
          ? currentTheme === 'light'
            ? "border-black/10 bg-white/80 backdrop-blur-xl shadow-lg shadow-black/5"
            : "border-white/10 bg-zinc-950/80 backdrop-blur-xl shadow-lg shadow-black/20"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="flex items-center justify-between py-4 max-w-7xl mx-auto px-6">
        {/* Logo */}
        <Link href="/dashboard" aria-label="Codura homepage" className="flex items-center group">
          <Image
            src={currentTheme === 'light' ? CoduraLogoDark : CoduraLogo}
            alt="Codura logo"
            width={90}
            height={40}
            priority
            className="transition-all duration-200 group-hover:opacity-80"
          />
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-2 lg:flex">
          {/* Problems - Direct Link */}
          <Link href="/problems">
            <Button
              variant="ghost"
              className={cn(
                "relative group px-4 h-9 text-sm font-medium transition-all duration-300",
                "hover:bg-gradient-to-b",
                currentTheme === 'light'
                  ? "text-zinc-700 hover:text-zinc-900 hover:from-zinc-100 hover:to-zinc-50"
                  : "text-zinc-300 hover:text-white hover:from-zinc-800 hover:to-zinc-900"
              )}
            >
              <span className="relative z-10">Problems</span>
              {/* Underglow effect */}
              <div className={cn(
                "absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl",
                currentTheme === 'light'
                  ? "bg-gradient-to-r from-blue-200/50 to-purple-200/50"
                  : "bg-gradient-to-r from-blue-500/30 to-purple-500/30"
              )} />
            </Button>
          </Link>

          {/* Network Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "relative group px-4 h-9 text-sm font-medium transition-all duration-300 gap-1",
                  "hover:bg-gradient-to-b",
                  currentTheme === 'light'
                    ? "text-zinc-700 hover:text-zinc-900 hover:from-zinc-100 hover:to-zinc-50"
                    : "text-zinc-300 hover:text-white hover:from-zinc-800 hover:to-zinc-900"
                )}
              >
                <Users className="w-4 h-4" />
                <span className="relative z-10">Network</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                {/* Underglow effect */}
                <div className={cn(
                  "absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl",
                  currentTheme === 'light'
                    ? "bg-gradient-to-r from-green-200/50 to-emerald-200/50"
                    : "bg-gradient-to-r from-green-500/30 to-emerald-500/30"
                )} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              className={cn(
                "w-56 p-2 border backdrop-blur-2xl shadow-2xl rounded-xl mt-2 animate-in fade-in-0 zoom-in-95 duration-200",
                currentTheme === 'light'
                  ? "bg-white/90 border-black/10 shadow-black/10"
                  : "bg-zinc-950/90 border-white/10 shadow-black/50"
              )}
            >
              {/* Liquid glass overlay */}
              <div className={cn(
                "absolute inset-0 rounded-xl opacity-50 pointer-events-none",
                currentTheme === 'light'
                  ? "bg-gradient-to-br from-white/60 to-transparent"
                  : "bg-gradient-to-br from-white/5 to-transparent"
              )} />

              <DropdownMenuItem asChild className="relative z-10">
                <Link href="/discover" className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg group">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                    currentTheme === 'light'
                      ? "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25"
                      : "bg-gradient-to-br from-blue-600 to-cyan-600 shadow-lg shadow-blue-500/25"
                  )}>
                    <Search className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Discover</p>
                    <p className={cn("text-xs", currentTheme === 'light' ? "text-zinc-500" : "text-zinc-400")}>
                      Find developers
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="relative z-10">
                <Link href="/network/connections" className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg group">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                    currentTheme === 'light'
                      ? "bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/25"
                      : "bg-gradient-to-br from-green-600 to-emerald-600 shadow-lg shadow-green-500/25"
                  )}>
                    <Users className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">My Connections</p>
                    <p className={cn("text-xs", currentTheme === 'light' ? "text-zinc-500" : "text-zinc-400")}>
                      View network
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="relative z-10">
                <Link
                  href="/messages"
                  className="flex w-full items-center gap-3 px-3 py-2 cursor-pointer rounded-lg group"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                    currentTheme === 'light'
                      ? "bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/25"
                      : "bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-blue-500/25"
                  )}>
                    <MessageSquare className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">Messages</p>
                    <p className={cn("text-xs", currentTheme === 'light' ? "text-zinc-500" : "text-zinc-400")}>
                      Chat with connections
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="relative z-10">
                <Link href="/network/feed" className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg group">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                    currentTheme === 'light'
                      ? "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25"
                      : "bg-gradient-to-br from-blue-600 to-cyan-600 shadow-lg shadow-blue-500/25"
                  )}>
                    <MessageSquare className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Social Feed</p>
                    <p className={cn("text-xs", currentTheme === 'light' ? "text-zinc-500" : "text-zinc-400")}>
                      Share and connect
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="relative z-10">
                <Link href="/network/suggestions" className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg group">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                    currentTheme === 'light'
                      ? "bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25"
                      : "bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg shadow-purple-500/25"
                  )}>
                    <User className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Suggestions</p>
                    <p className={cn("text-xs", currentTheme === 'light' ? "text-zinc-500" : "text-zinc-400")}>
                      People to connect
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Compete Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "relative group px-4 h-9 text-sm font-medium transition-all duration-300 gap-1",
                  "hover:bg-gradient-to-b",
                  currentTheme === 'light'
                    ? "text-zinc-700 hover:text-zinc-900 hover:from-zinc-100 hover:to-zinc-50"
                    : "text-zinc-300 hover:text-white hover:from-zinc-800 hover:to-zinc-900"
                )}
              >
                <Trophy className="w-4 h-4" />
                <span className="relative z-10">Compete</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                {/* Underglow effect */}
                <div className={cn(
                  "absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl",
                  currentTheme === 'light'
                    ? "bg-gradient-to-r from-amber-200/50 to-orange-200/50"
                    : "bg-gradient-to-r from-amber-500/30 to-orange-500/30"
                )} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              className={cn(
                "w-56 p-2 border backdrop-blur-2xl shadow-2xl rounded-xl mt-2 animate-in fade-in-0 zoom-in-95 duration-200",
                currentTheme === 'light'
                  ? "bg-white/90 border-black/10 shadow-black/10"
                  : "bg-zinc-950/90 border-white/10 shadow-black/50"
              )}
            >
              {/* Liquid glass overlay */}
              <div className={cn(
                "absolute inset-0 rounded-xl opacity-50 pointer-events-none",
                currentTheme === 'light'
                  ? "bg-gradient-to-br from-white/60 to-transparent"
                  : "bg-gradient-to-br from-white/5 to-transparent"
              )} />

              <DropdownMenuItem asChild className="relative z-10">
                <Link href="/leaderboards" className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg group">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                    currentTheme === 'light'
                      ? "bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25"
                      : "bg-gradient-to-br from-amber-600 to-orange-600 shadow-lg shadow-amber-500/25"
                  )}>
                    <Trophy className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Leaderboards</p>
                    <p className={cn("text-xs", currentTheme === 'light' ? "text-zinc-500" : "text-zinc-400")}>
                      Top performers
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="relative z-10">
                <Link href="/mock-interview" className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg group">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                    currentTheme === 'light'
                      ? "bg-gradient-to-br from-red-500 to-rose-500 shadow-lg shadow-red-500/25"
                      : "bg-gradient-to-br from-red-600 to-rose-600 shadow-lg shadow-red-500/25"
                  )}>
                    <Video className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Mock Interview</p>
                    <p className={cn("text-xs", currentTheme === 'light' ? "text-zinc-500" : "text-zinc-400")}>
                      Practice sessions
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Community Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "relative group px-4 h-9 text-sm font-medium transition-all duration-300 gap-1",
                  "hover:bg-gradient-to-b",
                  currentTheme === 'light'
                    ? "text-zinc-700 hover:text-zinc-900 hover:from-zinc-100 hover:to-zinc-50"
                    : "text-zinc-300 hover:text-white hover:from-zinc-800 hover:to-zinc-900"
                )}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="relative z-10">Community</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                {/* Underglow effect */}
                <div className={cn(
                  "absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl",
                  currentTheme === 'light'
                    ? "bg-gradient-to-r from-indigo-200/50 to-violet-200/50"
                    : "bg-gradient-to-r from-indigo-500/30 to-violet-500/30"
                )} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              className={cn(
                "w-56 p-2 border backdrop-blur-2xl shadow-2xl rounded-xl mt-2 animate-in fade-in-0 zoom-in-95 duration-200",
                currentTheme === 'light'
                  ? "bg-white/90 border-black/10 shadow-black/10"
                  : "bg-zinc-950/90 border-white/10 shadow-black/50"
              )}
            >
              {/* Liquid glass overlay */}
              <div className={cn(
                "absolute inset-0 rounded-xl opacity-50 pointer-events-none",
                currentTheme === 'light'
                  ? "bg-gradient-to-br from-white/60 to-transparent"
                  : "bg-gradient-to-br from-white/5 to-transparent"
              )} />

              <DropdownMenuItem asChild className="relative z-10">
                <Link href="/study-pods" className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg group">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                    currentTheme === 'light'
                      ? "bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25"
                      : "bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/25"
                  )}>
                    <Users className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Study Pods</p>
                    <p className={cn("text-xs", currentTheme === 'light' ? "text-zinc-500" : "text-zinc-400")}>
                      Group sessions
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="relative z-10">
                <Link href="/discuss" className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg group">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                    currentTheme === 'light'
                      ? "bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/25"
                      : "bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25"
                  )}>
                    <MessageSquare className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Discuss</p>
                    <p className={cn("text-xs", currentTheme === 'light' ? "text-zinc-500" : "text-zinc-400")}>
                      Forums & Q&A
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Right Side - Notifications & User Menu */}
        <div className="flex items-center gap-3">
          {/* Messenger Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("toggle-messenger"));
            }}
            className={cn(
              "h-9 w-9 p-0 rounded-lg transition-all duration-300 hover:scale-110",
              currentTheme === 'light'
                ? "hover:bg-zinc-100"
                : "hover:bg-zinc-800"
            )}
            title="Toggle Messenger"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>

          {/* Notifications */}
          <NotificationsDropdown />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "flex items-center gap-2 h-9 px-2 rounded-lg transition-all duration-300",
                  currentTheme === 'light'
                    ? "hover:bg-zinc-100"
                    : "hover:bg-zinc-800"
                )}
              >
                <DefaultAvatar
                  src={user?.avatar}
                  name={user?.name}
                  username={user?.username}
                  size="sm"
                  className="ring-2 ring-background"
                />
                <span className="hidden sm:inline text-sm font-medium">
                  {user?.name?.split(' ')[0] || 'User'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className={cn(
                "w-72 p-2 border backdrop-blur-2xl shadow-2xl rounded-xl mt-2 animate-in fade-in-0 zoom-in-95 duration-200",
                currentTheme === 'light'
                  ? "bg-white/90 border-black/10 shadow-black/10"
                  : "bg-zinc-950/90 border-white/10 shadow-black/50"
              )}
            >
              {/* Liquid glass overlay */}
              <div className={cn(
                "absolute inset-0 rounded-xl opacity-50 pointer-events-none",
                currentTheme === 'light'
                  ? "bg-gradient-to-br from-white/60 to-transparent"
                  : "bg-gradient-to-br from-white/5 to-transparent"
              )} />

              {/* Profile Header */}
              <div className="px-3 py-3 mb-1 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <DefaultAvatar
                      src={user?.avatar}
                      name={user?.name}
                      username={user?.username}
                      size="lg"
                      className="ring-2 ring-border/50"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-background" />
                  </div>
                  <UserNameText name={user?.name || 'User'} email={user?.email || ''} />
                </div>
              </div>

              <DropdownMenuSeparator className={cn(
                "my-2",
                currentTheme === 'light' ? "bg-black/5" : "bg-white/5"
              )} />

              {/* Menu Items */}
              <div className="space-y-1 relative z-10">
                <DropdownMenuItem asChild>
                  <Link
                    href={user?.username ? `/profile/${user.username}` : '/settings'}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg group"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                      currentTheme === 'light'
                        ? "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25"
                        : "bg-gradient-to-br from-blue-600 to-cyan-600 shadow-lg shadow-blue-500/25"
                    )}>
                      <User className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-medium">Profile</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href={`/profile/${user?.username || ''}/posts-activity`}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg group"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                      currentTheme === 'light'
                        ? "bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25"
                        : "bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg shadow-purple-500/25"
                    )}>
                      <Calendar className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Posts & Activity</p>
                      <p className={cn("text-xs", currentTheme === 'light' ? "text-zinc-500" : "text-zinc-400")}>
                        View timeline
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg group"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                      currentTheme === 'light'
                        ? "bg-gradient-to-br from-slate-500 to-slate-600 shadow-lg shadow-slate-500/25"
                        : "bg-gradient-to-br from-slate-600 to-slate-700 shadow-lg shadow-slate-500/25"
                    )}>
                      <Settings className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-medium">Settings</span>
                  </Link>
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator className={cn(
                "my-2",
                currentTheme === 'light' ? "bg-black/5" : "bg-white/5"
              )} />

              {/* Sign Out */}
              <div className="relative z-10">
                <DropdownMenuItem
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg group hover:bg-red-50 dark:hover:bg-red-500/10"
                  onClick={async () => {
                    await fetch('/auth/signout', { method: 'POST' });
                    window.location.href = '/';
                  }}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center group-hover:from-red-600 group-hover:to-red-700 transition-all shadow-lg shadow-red-500/25">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">Sign out</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
