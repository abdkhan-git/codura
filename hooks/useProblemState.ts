/**
 * Shared hook for managing problem-solving state
 * Use this hook to coordinate between CodeEditor, TestCases, ProblemDescription, etc.
 * Components can also work independently without this hook.
 */

import { useState, useCallback } from 'react'

export interface TestCase {
  input: string
  expectedOutput: string
  explanation?: string
}

export interface TestResult {
  testCaseIndex: number
  passed: boolean
  input?: string
  expectedOutput?: string
  actualOutput?: string
  error?: string
}

export interface SubmissionResult {
  status: string
  description: string
  testResults?: TestResult[]
  totalTests?: number
  passedTests?: number
  memory?: string
  runtime?: string
  timestamp?: Date
  language?: string
}

export interface CodeExecutionContext {
  code: string
  languageId: number
  timestamp: Date
}

export interface ProblemStateOptions {
  /** Whether to track submission history */
  trackSubmissions?: boolean
  /** Whether to track run results separately from submissions */
  separateRunResults?: boolean
  /** Maximum number of submissions to keep in history */
  maxSubmissionHistory?: number
}

export function useProblemState(options: ProblemStateOptions = {}) {
  const {
    trackSubmissions = true,
    separateRunResults = true,
    maxSubmissionHistory = 50,
  } = options

  // Code state
  const [code, setCode] = useState<string>('')
  const [languageId, setLanguageId] = useState<number>(92) // Python default

  // Execution results
  const [latestRunResult, setLatestRunResult] = useState<SubmissionResult | undefined>()
  const [submissionHistory, setSubmissionHistory] = useState<SubmissionResult[]>([])

  // UI state
  const [activeTab, setActiveTab] = useState<string>('description')
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Code execution handlers
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode)
  }, [])

  const handleLanguageChange = useCallback((newLanguageId: number) => {
    setLanguageId(newLanguageId)
  }, [])

  // Run result handler (for "Run" button - doesn't save to history)
  const handleRunResult = useCallback((result: SubmissionResult) => {
    if (separateRunResults) {
      setLatestRunResult(result)
    } else {
      // If not separating, treat run same as submission
      addSubmission(result)
    }
  }, [separateRunResults])

  // Submission handler (for "Submit" button - saves to history)
  const addSubmission = useCallback((result: SubmissionResult) => {
    if (!trackSubmissions) return

    setSubmissionHistory((prev) => {
      const newHistory = [result, ...prev]
      return newHistory.slice(0, maxSubmissionHistory)
    })

    // Auto-switch to submissions tab after submit
    setActiveTab('submissions')
  }, [trackSubmissions, maxSubmissionHistory])

  // Clear history
  const clearSubmissionHistory = useCallback(() => {
    setSubmissionHistory([])
  }, [])

  const clearRunResult = useCallback(() => {
    setLatestRunResult(undefined)
  }, [])

  return {
    // Code state
    code,
    languageId,
    setCode: handleCodeChange,
    setLanguageId: handleLanguageChange,

    // Execution results
    latestRunResult,
    submissionHistory,
    setLatestRunResult,
    handleRunResult,
    addSubmission,
    clearSubmissionHistory,
    clearRunResult,

    // UI state
    activeTab,
    setActiveTab,
    isRunning,
    setIsRunning,
    isSubmitting,
    setIsSubmitting,
  }
}

export type UseProblemState = ReturnType<typeof useProblemState>
