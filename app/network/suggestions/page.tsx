"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { UserCard } from "@/components/social/user-card";
import { Sparkles } from "lucide-react";
import type { UserSearchResult } from "@/types/database";
import { toast } from "sonner";

interface UserData {
  name: string;
  email: string;
  avatar: string;
  username?: string;
}

export default function SuggestionsPage() {
  const { theme } = useTheme();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

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
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      setSuggestionsLoading(true);
      const response = await fetch('/api/users/suggestions?limit=12');
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleConnect = async (userId: string) => {
    toast.info('Connection request functionality coming soon!');
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
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-brand/5 dark:bg-brand/8 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] left-[15%] w-[400px] h-[400px] bg-purple-500/3 dark:bg-purple-500/6 rounded-full blur-[80px] animate-float-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navbar */}
      <DashboardNavbar user={user} />

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
              theme === 'light'
                ? "from-purple-500 to-pink-500 shadow-purple-500/25"
                : "from-purple-600 to-pink-600 shadow-purple-500/25"
            )}>
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-brand to-purple-400 bg-clip-text text-transparent">
                Suggested Connections
              </h1>
              <p className="text-muted-foreground">People you may want to connect with</p>
            </div>
          </div>
        </div>

        {suggestionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestions.map((suggestion) => (
              <UserCard
                key={suggestion.user_id}
                user={suggestion}
                onConnect={handleConnect}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
