"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

interface UserData {
  name: string;
  email: string;
  avatar: string;
  username?: string;
}

export default function ConnectionsPage() {
  const { theme } = useTheme();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <DashboardNavbar user={user} />

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-brand to-purple-400 bg-clip-text text-transparent">
            My Connections
          </h1>
          <p className="text-muted-foreground">View and manage your network</p>
        </div>

        <Card className={cn(
          "p-12 text-center border-2 backdrop-blur-xl",
          theme === 'light'
            ? "bg-white/80 border-black/5"
            : "bg-zinc-950/80 border-white/5"
        )}>
          <div className={cn(
            "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
            theme === 'light' ? "bg-zinc-100" : "bg-zinc-900"
          )}>
            <Users className={cn(
              "w-8 h-8",
              theme === 'light' ? "text-zinc-400" : "text-zinc-600"
            )} />
          </div>
          <h3 className={cn(
            "text-lg font-semibold mb-2",
            theme === 'light' ? "text-zinc-900" : "text-white"
          )}>
            Coming Soon
          </h3>
          <p className="text-muted-foreground">
            This feature is currently under development. Check back soon!
          </p>
        </Card>
      </main>
    </div>
  );
}
