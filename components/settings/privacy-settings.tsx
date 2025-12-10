"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  Trophy
} from "lucide-react";
import { toast } from "sonner";

export function PrivacySettings() {
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setIsPublic(data.profile?.is_public ?? true);
      }
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
      toast.error('Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: isPublic })
      });

      if (response.ok) {
        toast.success('Privacy settings updated successfully');
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error('Failed to save privacy settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded animate-pulse" />
        <div className="space-y-4">
          <div className="h-20 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Leaderboard Privacy</h2>
          <p className="text-sm text-muted-foreground">
            Control your visibility on school leaderboards
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold">Public Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Allow your profile and stats to appear on leaderboards
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </CardContent>
      </Card>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="text-sm text-amber-700 dark:text-amber-300">
          <p className="font-medium mb-1">What this means:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>When <strong>enabled</strong>: You appear on your school's leaderboard and others can see your ranking</li>
            <li>When <strong>disabled</strong>: Your profile is hidden from all leaderboards</li>
          </ul>
        </div>
      </div>

      <Separator />

      <div className="flex justify-end">
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
