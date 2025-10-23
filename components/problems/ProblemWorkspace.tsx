'use client'

/**
 * ProblemWorkspace - Flexible composition component
 *
 * This component allows you to compose CodeEditor, TestCases, ProblemDescription,
 * and AIChatbot in any combination and layout.
 *
 * Usage examples:
 *
 * // Just code editor
 * <ProblemWorkspace>
 *   <ProblemWorkspace.CodeEditor />
 * </ProblemWorkspace>
 *
 * // Editor + Test Cases
 * <ProblemWorkspace layout="vertical">
 *   <ProblemWorkspace.CodeEditor />
 *   <ProblemWorkspace.TestCases />
 * </ProblemWorkspace>
 *
 * // Full layout (like current page)
 * <ProblemWorkspace layout="three-panel">
 *   <ProblemWorkspace.Description />
 *   <ProblemWorkspace.CodeEditor />
 *   <ProblemWorkspace.TestCases />
 *   <ProblemWorkspace.AIChat />
 * </ProblemWorkspace>
 */

import React, { createContext, useContext, ReactNode } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useProblemState, UseProblemState } from '@/hooks/useProblemState'
import { CodeEditorStandalone } from './CodeEditorStandalone'
import { TestCases } from './TestCases'
import { ProblemDescription } from './ProblemDescription'
import AIChatbot from './AIChatbot'

// Context for sharing state between composed components
const ProblemWorkspaceContext = createContext<UseProblemState | null>(null)

export function useProblemWorkspace() {
  const context = useContext(ProblemWorkspaceContext)
  if (!context) {
    throw new Error('useProblemWorkspace must be used within ProblemWorkspace')
  }
  return context
}

interface ProblemWorkspaceProps {
  children: ReactNode
  layout?: 'vertical' | 'horizontal' | 'three-panel' | 'custom'
  problem?: any
  onRun?: (code: string, languageId: number) => Promise<any>
  onSubmit?: (code: string, languageId: number) => Promise<any>
  className?: string
}

export function ProblemWorkspace({
  children,
  layout = 'custom',
  problem,
  onRun,
  onSubmit,
  className = '',
}: ProblemWorkspaceProps) {
  const problemState = useProblemState()

  // Wrap handlers to update state
  const handleRun = async (code: string, languageId: number) => {
    problemState.setIsRunning(true)
    try {
      const result = onRun ? await onRun(code, languageId) : null
      if (result) {
        problemState.handleRunResult(result)
      }
    } finally {
      problemState.setIsRunning(false)
    }
  }

  const handleSubmit = async (code: string, languageId: number) => {
    problemState.setIsSubmitting(true)
    try {
      const result = onSubmit ? await onSubmit(code, languageId) : null
      if (result) {
        problemState.addSubmission(result)
      }
    } finally {
      problemState.setIsSubmitting(false)
    }
  }

  const renderLayout = () => {
    switch (layout) {
      case 'vertical':
        return (
          <ResizablePanelGroup direction="vertical" className="h-full">
            {React.Children.map(children, (child, index) => (
              <>
                <ResizablePanel defaultSize={100 / React.Children.count(children)}>
                  {child}
                </ResizablePanel>
                {index < React.Children.count(children) - 1 && <ResizableHandle withHandle />}
              </>
            ))}
          </ResizablePanelGroup>
        )

      case 'horizontal':
        return (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {React.Children.map(children, (child, index) => (
              <>
                <ResizablePanel defaultSize={100 / React.Children.count(children)}>
                  {child}
                </ResizablePanel>
                {index < React.Children.count(children) - 1 && <ResizableHandle withHandle />}
              </>
            ))}
          </ResizablePanelGroup>
        )

      case 'three-panel':
        // Default three-panel layout (like current implementation)
        return (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {children}
          </ResizablePanelGroup>
        )

      default:
        return <div className="h-full">{children}</div>
    }
  }

  return (
    <ProblemWorkspaceContext.Provider value={problemState}>
      <div className={`h-full ${className}`}>
        {renderLayout()}
      </div>
    </ProblemWorkspaceContext.Provider>
  )
}

// Sub-components that automatically connect to workspace context
ProblemWorkspace.CodeEditor = function WorkspaceCodeEditor(props: any) {
  const workspace = useProblemWorkspace()
  return (
    <CodeEditorStandalone
      code={workspace.code}
      onCodeChange={workspace.setCode}
      language={workspace.languageId as any}
      onLanguageChange={(lang) => workspace.setLanguageId(lang.id)}
      {...props}
    />
  )
}

ProblemWorkspace.TestCases = function WorkspaceTestCases(props: any) {
  const workspace = useProblemWorkspace()
  return (
    <TestCases
      submissionResult={workspace.latestRunResult}
      {...props}
    />
  )
}

ProblemWorkspace.Description = function WorkspaceDescription(props: any) {
  const workspace = useProblemWorkspace()
  return (
    <ProblemDescription
      submissionHistory={workspace.submissionHistory}
      activeTab={workspace.activeTab}
      onTabChange={workspace.setActiveTab}
      {...props}
    />
  )
}

ProblemWorkspace.AIChat = function WorkspaceAIChat(props: any) {
  const workspace = useProblemWorkspace()
  return (
    <AIChatbot
      {...props}
    />
  )
}

// Export type for external use
export type { UseProblemState }
