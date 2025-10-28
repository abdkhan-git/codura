"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  PartyPopper, 
  Target, 
  BookOpen, 
  Users,
  Shield,
  Info
} from "lucide-react";
import { toast } from "sonner";

interface PrivacySettings {
  share_problem_solved: boolean;
  share_achievements: boolean;
  share_streaks: boolean;
  share_study_plans: boolean;
  share_connections: boolean;
}

export function PrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings>({
    share_problem_solved: true,
    share_achievements: true,
    share_streaks: true,
    share_study_plans: true,
    share_connections: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/profile/privacy-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
      toast.error('Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof PrivacySettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/profile/privacy-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
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
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Activity Sharing</h2>
          <p className="text-sm text-muted-foreground">
            Control which activities are automatically shared to your network
          </p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">How it works</p>
            <p>
              When you achieve something (solve a problem, earn an achievement, etc.), 
              we can automatically create a post to share it with your network. 
              You can control which types of activities are shared.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Problem Solved */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Problem Solved</h3>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share when you solve coding problems to show your progress
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.share_problem_solved}
                onCheckedChange={(checked) => updateSetting('share_problem_solved', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <PartyPopper className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Achievements</h3>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Celebrate earning achievements and milestones
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.share_achievements}
                onCheckedChange={(checked) => updateSetting('share_achievements', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Streaks */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Study Streaks</h3>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share your consistency milestones and study streaks
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.share_streaks}
                onCheckedChange={(checked) => updateSetting('share_streaks', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Study Plans */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Study Plans</h3>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share your study plans and learning roadmaps
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.share_study_plans}
                onCheckedChange={(checked) => updateSetting('share_study_plans', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Connections - Not Recommended */}
        <Card className="opacity-75">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-500/20 to-slate-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">New Connections</h3>
                    <Badge variant="outline" className="border-gray-300 text-gray-600">
                      Not Recommended
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share when you make new connections (can be too frequent)
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.share_connections}
                onCheckedChange={(checked) => updateSetting('share_connections', checked)}
                disabled
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="flex justify-end">
        <Button 
          onClick={saveSettings} 
          disabled={saving}
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
