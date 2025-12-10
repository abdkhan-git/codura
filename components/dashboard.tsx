// components/dashboard.tsx
"use client"
import React from "react"
import Link from "next/link"
import { LogOut, Settings, User, Trophy, BookOpen, Target, Flame } from "lucide-react"
import {
  Card,
  CardContent,
  CardAction,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { DefaultAvatar } from "@/components/ui/default-avatar"

type DashboardProps = {
  userData: {
    full_name: string
    avatar_url?: string | null
    email: string
  }
  userDashboard: {
    problems_solved?: number
    university_rank?: number
    mock_interviews?: number
    day_streak?: number
  }
  questionnaireCompleted: boolean
  resetQuestionnaireAction?: (formData: FormData) => Promise<void>
}

export function Dashboard({ 
  userData, 
  userDashboard, 
  questionnaireCompleted,
  resetQuestionnaireAction 
}: DashboardProps) {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r p-4 flex flex-col gap-6">
        {/* Logo */}
        <h2 className="text-xl font-bold">Codura</h2>

        {/* User Profile Section */}
        <div className="flex flex-col items-center gap-2">
          <DefaultAvatar
            src={userData.avatar_url}
            name={userData.full_name}
            username={userData.username}
            size="xl"
            className="w-20 h-20 border-2 border-brand/20 shadow-lg"
          />
          <p className="text-sm font-semibold">{userData.full_name}</p>
          <p className="text-xs opacity-70">{userData.email}</p>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex flex-col gap-2">
          <Button asChild variant="default" className="justify-start w-full">
            <a href="#">Practice Questions</a>
          </Button>
          <Button asChild variant="default" className="justify-start w-full">
            <a href="#">Mock Interviews</a>
          </Button>
          <Button asChild variant="default" className="justify-start w-full">
            <a href="#">Chat Rooms</a>
          </Button>
          <Button asChild variant="default" className="justify-start w-full">
            <a href="#">Leaderboard</a>
          </Button>
          <Button asChild variant="default" className="justify-start w-full">
            <a href="#">Community Forum</a>
          </Button>
          <Button asChild variant="default" className="justify-start w-full">
            <a href="#">Challenge Others</a>
          </Button>
        </nav>

        {/* Sign Out, Reset & Theme Switcher */}
        <div className="mt-auto space-y-2">
          {/* Reset Questionnaire Button (Testing) */}
          {resetQuestionnaireAction && questionnaireCompleted && (
            <form action={resetQuestionnaireAction} className="w-full">
              <Button 
                type="submit" 
                variant="outline" 
                className="w-full justify-start text-amber-500 hover:text-amber-600"
                size="sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Reset Questionnaire
              </Button>
            </form>
          )}
          
          {/* Sign Out Button */}
          <form action="/auth/signout" method="POST" className="w-full">
            <Button 
              type="submit" 
              variant="outline" 
              className="w-full justify-start"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </form>

          {/* Theme Toggle */}
          <ModeToggle />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {userData.full_name}!
          </h1>
          <p className="text-muted-foreground">
            Ready to continue your coding journey?
          </p>
        </div>

        {/* Questionnaire Status Pill - Like your original */}
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              questionnaireCompleted
                ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                : "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
            }`}
          >
            {questionnaireCompleted ? "Questionnaire: Completed ✅" : "Questionnaire: Not completed"}
          </span>
          {!questionnaireCompleted && (
            <Link href="/questionnaire">
              <Button size="sm" variant="secondary">
                <User className="w-4 h-4 mr-2" />
                Finish now
              </Button>
            </Link>
          )}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card className="items-center text-center">
            <CardHeader className="flex flex-col items-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <CardTitle className="text-2xl font-bold">
                {userDashboard?.problems_solved ?? 0}
              </CardTitle>
              <CardDescription>Problems Solved</CardDescription>
            </CardHeader>
          </Card>

          <Card className="items-center text-center">
            <CardHeader className="flex flex-col items-center gap-2">
              <BookOpen className="w-8 h-8 text-blue-500" />
              <CardTitle className="text-2xl font-bold">
                #{userDashboard?.university_rank ?? "-"}
              </CardTitle>
              <CardDescription>University Rank</CardDescription>
            </CardHeader>
          </Card>

          <Card className="items-center text-center">
            <CardHeader className="flex flex-col items-center gap-2">
              <Target className="w-8 h-8 text-green-500" />
              <CardTitle className="text-2xl font-bold">
                {userDashboard?.mock_interviews ?? 0}
              </CardTitle>
              <CardDescription>Mock Interviews</CardDescription>
            </CardHeader>
          </Card>

          <Card className="items-center text-center">
            <CardHeader className="flex flex-col items-center gap-2">
              <Flame className="w-8 h-8 text-red-500" />
              <CardTitle className="text-2xl font-bold">
                {userDashboard?.day_streak ?? 0}
              </CardTitle>
              <CardDescription>Day Streak</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✅ Solved Two Sum (Easy)</li>
              <li>💬 Mock Interview with Alex</li>
              <li>🏆 Achievement: 50 problems solved</li>
            </ul>
          </CardContent>
        </Card>

        {/* Continue Learning */}
        <Card>
          <CardHeader>
            <CardTitle>Continue Learning</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>📘 Arrays & Strings</li>
              <li>📘 Binary Trees</li>
              <li>📘 Dynamic Programming</li>
            </ul>
          </CardContent>
        </Card>

        {/* Recommended Section */}
        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Recommended for You</CardTitle>
            <CardAction>
              <Button size="sm">Solve</Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <span className="text-sm">Valid Parentheses (Easy)</span>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}