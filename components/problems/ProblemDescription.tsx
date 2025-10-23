'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, Tag, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface ProblemData {
  id: number
  leetcode_id: number
  title: string
  title_slug: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  description: string
  examples: Array<{
    id: number
    content: string
  }>
  constraints: string[]
  topic_tags: Array<{ name: string; slug: string }>
  acceptance_rate: number
}

interface MiniTestResult {
  testCaseIndex: number
  passed: boolean
  input?: string
  expectedOutput?: string
  actualOutput?: string
  error?: string
}
interface MiniSubmissionResult {
  status?: string
  description?: string
  totalTests?: number
  passedTests?: number
  memory?: string
  runtime?: string
  timestamp?: Date
  language?: string
  testResults?: MiniTestResult[]
}
interface ProblemDescriptionProps {
  problem: ProblemData | null
  loading?: boolean
  submissionResult?: MiniSubmissionResult[]
  activeTab?: string
  onTabChange?: (tab: string) => void
}

export function ProblemDescription({ problem, loading, submissionResult, activeTab, onTabChange }: ProblemDescriptionProps) {
  const [showTags, setShowTags] = useState(false)
  const [showAcceptanceRate, setShowAcceptanceRate] = useState(false)
  const [internalActiveTab, setInternalActiveTab] = useState("description")

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading problem...</p>
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">No problem data available</p>
      </div>
    )
  }

  const currentTab = activeTab ?? internalActiveTab

  const handleTabChange = (newTab: string) => {
    setInternalActiveTab(newTab)
    onTabChange?.(newTab)
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs value={currentTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        {/* Tab Navigation */}
        <TabNavigation />

        <ScrollArea className="flex-1">
          {/* Description Tab */}
          <TabsContent value="description" className="p-4 mt-0">
            <DescriptionContent 
              problem={problem}
              showTags={showTags}
              setShowTags={setShowTags}
              showAcceptanceRate={showAcceptanceRate}
              setShowAcceptanceRate={setShowAcceptanceRate}
            />
          </TabsContent>

          {/* Solution Tab */}
          <TabsContent value="solution" className="p-4 mt-0">
            <SolutionContent />
          </TabsContent>

          {/* Discussion Tab */}
          <TabsContent value="discussion" className="p-4 mt-0">
            <DiscussionContent />
          </TabsContent>

          {/* Community Solutions Tab */}
          <TabsContent value="community" className="p-4 mt-0">
            <CommunityContent />
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions" className="p-4 mt-0">
            <SubmissionsContent submissionResult={submissionResult} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}

// ============================================
// SUB-COMPONENTS
// ============================================

function TabNavigation() {
  return (
    <div className="border-b overflow-x-auto tab-scroll-container">
      <TabsList className="inline-flex w-auto min-w-full justify-start h-12 px-2 bg-transparent">
        <TabsTrigger value="description" className="flex-shrink-0">
          Description
        </TabsTrigger>
        <TabsTrigger value="solution" className="flex-shrink-0">
          Solution
        </TabsTrigger>
        <TabsTrigger value="discussion" className="flex-shrink-0">
          Discussion
        </TabsTrigger>
        <TabsTrigger value="community" className="flex-shrink-0">
          Community
        </TabsTrigger>
        <TabsTrigger value="submissions" className="flex-shrink-0">
          Submissions
        </TabsTrigger>
      </TabsList>
    </div>
  )
}

interface DescriptionContentProps {
  problem: ProblemData
  showTags: boolean
  setShowTags: (show: boolean) => void
  showAcceptanceRate: boolean
  setShowAcceptanceRate: (show: boolean) => void
}

function DescriptionContent({ 
  problem, 
  showTags, 
  setShowTags, 
  showAcceptanceRate, 
  setShowAcceptanceRate 
}: DescriptionContentProps) {
  return (
    <div className="space-y-4">
      {/* Title and Difficulty */}
      <ProblemHeader 
        problem={problem}
        showAcceptanceRate={showAcceptanceRate}
        setShowAcceptanceRate={setShowAcceptanceRate}
      />

      {/* Topics */}
      {problem.topic_tags && problem.topic_tags.length > 0 && (
        <TopicTags 
          tags={problem.topic_tags}
          showTags={showTags}
          setShowTags={setShowTags}
        />
      )}

      {/* Description */}
      <ProblemDescriptionText description={problem.description} />

      {/* Examples */}
      {problem.examples && problem.examples.length > 0 && (
        <ExamplesList examples={problem.examples} />
      )}

      {/* Constraints */}
      {problem.constraints && problem.constraints.length > 0 && (
        <ConstraintsList constraints={problem.constraints} />
      )}
    </div>
  )
}

interface ProblemHeaderProps {
  problem: ProblemData
  showAcceptanceRate: boolean
  setShowAcceptanceRate: (show: boolean) => void
}

function ProblemHeader({ problem, showAcceptanceRate, setShowAcceptanceRate }: ProblemHeaderProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-950 text-green-400 !border-green-900'
      case 'Medium':
        return 'bg-yellow-950 text-yellow-400 !border-yellow-900'
      case 'Hard':
        return 'bg-red-950 text-red-400 !border-red-900'
      default:
        return 'bg-zinc-900 text-zinc-400 !border-zinc-900'
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Link
          href="/problems"
          className="flex items-center gap-1 text-green-500 hover:text-green-400 transition-colors text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Problem List</span>
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">
        {problem.leetcode_id}. {problem.title}
      </h1>
      <div className="flex items-center gap-2">
        <Badge 
          variant="default" 
          className={`${getDifficultyColor(problem.difficulty)} border-1`}
        >
          {problem.difficulty}
        </Badge>
        
        <div 
          className="relative cursor-pointer group ml-2"
          onClick={() => setShowAcceptanceRate(true)}
        >
          <div className={`text-sm transition-all ${showAcceptanceRate ? '' : 'blur-sm select-none'}`}>
            <span className="text-zinc-400">Acceptance: </span>
            <span className="text-sm text-muted-foreground">
              {problem.acceptance_rate.toFixed(1)}%
            </span>
          </div>
          {!showAcceptanceRate && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500 group-hover:text-zinc-300">
              Reveal Acceptance %
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface TopicTagsProps {
  tags: Array<{ name: string; slug: string }>
  showTags: boolean
  setShowTags: (show: boolean) => void
}

function TopicTags({ tags, showTags, setShowTags }: TopicTagsProps) {
  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowTags(!showTags)}
        className="cursor-pointer text-sm text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1 border-1 px-2 py-1 rounded-lg"
      >
        <Tag className="w-3 h-3 mr-1 text-primary" />
        {showTags ? 'Hide Topics' : 'View Topics'}
        {showTags ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      {showTags && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag.slug} variant="secondary" className="text-xs">
              {tag.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function ProblemDescriptionText({ description }: { description: string }) {
  return (
    <div className="space-y-2">
      <div
        className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: description }}
      />
    </div>
  )
}

function ExamplesList({ examples }: { examples: Array<{ id: number; content: string }> }) {
  return (
    <div className="space-y-4">
      {examples.map((example, index) => (
        <div key={example.id} className="space-y-2">
          <h3 className="font-semibold">Example {index + 1}:</h3>
          <div className="bg-muted p-3 rounded text-sm font-mono">
            <pre className="whitespace-pre-wrap">{example.content}</pre>
          </div>
        </div>
      ))}
    </div>
  )
}

function ConstraintsList({ constraints }: { constraints: string[] }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Constraints:</h3>
      <div className="bg-green-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <ul className="space-y-1 text-sm font-mono text-slate-700 dark:text-slate-300">
          {constraints.map((constraint, index) => (
            <li key={index}>{constraint}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ============================================
// PLACEHOLDER TABS (To be implemented later)
// ============================================

function SolutionContent() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Solution Approach</h2>
      <div className="bg-muted/50 border border-border rounded-lg p-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Official solution coming soon!
        </p>
        <p className="text-xs text-muted-foreground">
          This will include optimal approaches, time complexity analysis, and step-by-step explanations.
        </p>
      </div>
    </div>
  )
}

function DiscussionContent() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Discussion</h2>
      <div className="bg-muted/50 border border-border rounded-lg p-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">
          No discussions yet
        </p>
        <p className="text-xs text-muted-foreground">
          Community discussions will appear here once available.
        </p>
      </div>
    </div>
  )
}

function CommunityContent() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Community Solutions</h2>
      <div className="bg-muted/50 border border-border rounded-lg p-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">
          No community solutions yet
        </p>
        <p className="text-xs text-muted-foreground">
          Top community solutions will be displayed here once submitted.
        </p>
      </div>
    </div>
  )
}

function SubmissionsContent({ submissionResult }: { submissionResult?: MiniSubmissionResult[] }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  if (!submissionResult || submissionResult.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">My Submissions</h2>
        <div className="bg-muted/50 border border-border rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            No submissions yet
          </p>
          <p className="text-xs text-muted-foreground">
            Your submission history will appear here after you submit solutions.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">My Submissions</h2>

      {/* Submission list */}
      <div className="space-y-2">
        {submissionResult.map((submission, idx) => {
          const isSuccess = submission.status === 'Accepted'
            || (submission.passedTests != null
                && submission.totalTests != null
                && submission.passedTests === submission.totalTests)
          const isExpanded = expandedIndex === idx

          return (
            <div key={idx} className="border rounded-lg overflow-hidden">
              {/* Submission Row - Clickable */}
              <div
                className={`p-3 cursor-pointer hover:bg-muted/30 transition-colors ${
                  isSuccess ? 'bg-green-950/20 border-green-900/30' : 'bg-red-950/20 border-red-900/30'
                }`}
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`text-sm font-semibold ${
                      isSuccess ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {submission.status || 'Submitted'}
                    </div>
                    {(submission.passedTests != null && submission.totalTests != null) && (
                      <div className="text-xs text-muted-foreground">
                        {submission.passedTests}/{submission.totalTests} passed
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {submission.timestamp && (
                      <span>{formatTimestamp(submission.timestamp)}</span>
                    )}
                    {submission.runtime && <span>{submission.runtime}</span>}
                    {submission.memory && <span>{submission.memory}</span>}
                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="p-4 bg-muted/20 border-t space-y-3">
                  {submission.description && (
                    <div className="text-sm">
                      <span className="text-zinc-400">Status: </span>
                      <span>{submission.description}</span>
                    </div>
                  )}

                  {/* Test results */}
                  {submission.testResults && submission.testResults.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Test Cases</h4>
                      {submission.testResults.map((tr, trIdx) => (
                        <div
                          key={trIdx}
                          className={`p-3 rounded border ${
                            tr.passed ? 'bg-green-950/20 border-green-900/50' : 'bg-red-950/20 border-red-900/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-semibold">Case {tr.testCaseIndex + 1}</div>
                            <div className="text-xs">{tr.passed ? '✓ Passed' : '✗ Failed'}</div>
                          </div>
                          <div className="text-xs space-y-1">
                            {tr.input && (<div><span className="text-zinc-400">Input: </span><span className="font-mono">{tr.input}</span></div>)}
                            {tr.expectedOutput && (<div><span className="text-zinc-400">Expected: </span><span className="font-mono">{tr.expectedOutput}</span></div>)}
                            {tr.actualOutput && (<div><span className="text-zinc-400">Got: </span><span className="font-mono">{tr.actualOutput}</span></div>)}
                            {tr.error && (<div className="mt-1 text-red-400">Error: {tr.error}</div>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Helper function to format timestamp
function formatTimestamp(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}