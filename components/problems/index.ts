/**
 * Modular Problem Components - Main Export
 *
 * This file provides easy imports for all modular problem components.
 *
 * Usage:
 *   import { CodeEditorStandalone, ProblemWorkspace, useProblemState } from '@/components/problems'
 */

// Standalone Components
export { CodeEditorStandalone } from './CodeEditorStandalone'
export type { CodeEditorStandaloneProps } from './CodeEditorStandalone'

// Original Components (still available)
export { CodeEditor } from './CodeEditor'
export { ProblemDescription } from './ProblemDescription'
export { TestCases, parseExamplesToTestCases } from './TestCases'
export { default as AIChatbot } from './AIChatbot'

// Composition Helper
export { ProblemWorkspace, useProblemWorkspace } from './ProblemWorkspace'
export type { UseProblemState } from './ProblemWorkspace'

// Shared Hook
export { useProblemState } from '@/hooks/useProblemState'
export type {
  TestCase,
  TestResult,
  SubmissionResult,
  CodeExecutionContext,
  ProblemStateOptions,
} from '@/hooks/useProblemState'
