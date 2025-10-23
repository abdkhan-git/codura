# Modular Problem Components - Usage Guide

This guide shows you how to use the modular problem-solving components in any combination and layout.

## Available Components

1. **CodeEditorStandalone** - Standalone code editor with optional execution
2. **ProblemDescription** - Problem details and submission history
3. **TestCases** - Test case display and results
4. **AIChatbot** - AI assistant for hints and help
5. **ProblemWorkspace** - Composition helper for combining components

## Quick Start Examples

### Example 1: Just the Code Editor

Perfect for a simple code playground or editor-only view.

```tsx
import { CodeEditorStandalone } from '@/components/problems/CodeEditorStandalone'

export default function SimpleEditor() {
  return (
    <div className="h-screen">
      <CodeEditorStandalone
        defaultCode="print('Hello World')"
        onRun={(code, langId) => console.log('Running:', code)}
      />
    </div>
  )
}
```

### Example 2: Editor + Test Cases (Vertical Split)

Great for practice problems where you want to see test results below the editor.

```tsx
import { CodeEditorStandalone } from '@/components/problems/CodeEditorStandalone'
import { TestCases } from '@/components/problems/TestCases'
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable'
import { useState } from 'react'

export default function EditorWithTests() {
  const [testResult, setTestResult] = useState()
  const [testCases] = useState([
    { input: '5', expectedOutput: '120' },
    { input: '3', expectedOutput: '6' },
  ])

  const handleRun = async (code: string, langId: number) => {
    // Run code against judge
    const result = await fetch('/api/run', {
      method: 'POST',
      body: JSON.stringify({ code, language_id: langId })
    }).then(r => r.json())

    setTestResult(result)
  }

  return (
    <ResizablePanelGroup direction="vertical" className="h-screen">
      <ResizablePanel defaultSize={65}>
        <CodeEditorStandalone onRun={handleRun} />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={35}>
        <TestCases
          testcases={testCases}
          submissionResult={testResult}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
```

### Example 3: Problem Description + Editor (Horizontal Split)

Perfect for leetcode-style problems without test execution.

```tsx
import { CodeEditorStandalone } from '@/components/problems/CodeEditorStandalone'
import { ProblemDescription } from '@/components/problems/ProblemDescription'
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable'

export default function ProblemView({ problem }) {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      <ResizablePanel defaultSize={40}>
        <ProblemDescription problem={problem} />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={60}>
        <CodeEditorStandalone
          problem={problem}
          onSubmit={(code) => console.log('Submitted:', code)}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
```

### Example 4: Full Layout with All Components

Complete leetcode-style layout with description, editor, tests, and AI chat.

```tsx
import { CodeEditorStandalone } from '@/components/problems/CodeEditorStandalone'
import { ProblemDescription } from '@/components/problems/ProblemDescription'
import { TestCases } from '@/components/problems/TestCases'
import AIChatbot from '@/components/problems/AIChatbot'
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable'
import { useState } from 'react'

export default function FullProblemPage({ problem }) {
  const [runResult, setRunResult] = useState()
  const [submissions, setSubmissions] = useState([])
  const [testCases] = useState(parseExamples(problem.examples))

  const handleRun = async (code: string, langId: number) => {
    const result = await runCode(code, langId)
    setRunResult(result)
  }

  const handleSubmit = async (code: string, langId: number) => {
    const result = await submitCode(code, langId)
    setSubmissions([result, ...submissions])
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      {/* Left: Problem Description */}
      <ResizablePanel defaultSize={30} minSize={20}>
        <ProblemDescription
          problem={problem}
          submissionHistory={submissions}
        />
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Middle: Editor + Test Cases */}
      <ResizablePanel defaultSize={45} minSize={30}>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={65}>
            <CodeEditorStandalone
              problem={problem}
              onRun={handleRun}
              onSubmit={handleSubmit}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={35}>
            <TestCases
              testcases={testCases}
              submissionResult={runResult}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right: AI Chatbot */}
      <ResizablePanel defaultSize={25} minSize={20}>
        <AIChatbot
          problemId={problem.id}
          problemTitle={problem.title}
          problemDescription={problem.description}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
```

### Example 5: Using ProblemWorkspace Helper (Easiest)

The `ProblemWorkspace` component provides automatic state management between components.

```tsx
import { ProblemWorkspace } from '@/components/problems/ProblemWorkspace'
import { ResizablePanel, ResizableHandle } from '@/components/ui/resizable'

export default function EasyFullLayout({ problem }) {
  const handleRun = async (code, langId) => {
    return await fetch('/api/run', {
      method: 'POST',
      body: JSON.stringify({ code, language_id: langId })
    }).then(r => r.json())
  }

  const handleSubmit = async (code, langId) => {
    return await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify({ code, language_id: langId })
    }).then(r => r.json())
  }

  return (
    <ProblemWorkspace
      layout="three-panel"
      problem={problem}
      onRun={handleRun}
      onSubmit={handleSubmit}
    >
      <ResizablePanel defaultSize={30}>
        <ProblemWorkspace.Description problem={problem} />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={45}>
        <ProblemWorkspace.CodeEditor problem={problem} />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={25}>
        <ProblemWorkspace.AIChat problemId={problem.id} />
      </ResizablePanel>
    </ProblemWorkspace>
  )
}
```

### Example 6: Editor Only (No Layout Components)

Simplest possible usage - just drop in the editor.

```tsx
import { CodeEditorStandalone } from '@/components/problems/CodeEditorStandalone'

export default function MinimalEditor() {
  return (
    <CodeEditorStandalone
      defaultCode="# Your code here"
      hideLanguageSelector={false}
      onRun={(code) => alert(code)}
    />
  )
}
```

### Example 7: Controlled Editor with External State

Full control over editor state from parent component.

```tsx
import { CodeEditorStandalone } from '@/components/problems/CodeEditorStandalone'
import { useState } from 'react'

export default function ControlledEditor() {
  const [code, setCode] = useState('print("hello")')
  const [language, setLanguage] = useState({ id: 92, name: 'Python', value: 'python' })

  return (
    <div>
      <div className="p-4">
        <h2>Current Language: {language.name}</h2>
        <button onClick={() => setCode('')}>Clear Code</button>
      </div>

      <CodeEditorStandalone
        code={code}
        language={language}
        onCodeChange={setCode}
        onLanguageChange={setLanguage}
        onRun={(code) => console.log('Run:', code)}
      />
    </div>
  )
}
```

### Example 8: Custom Hook Integration

Use the shared hook for complex state management across multiple views.

```tsx
import { useProblemState } from '@/hooks/useProblemState'
import { CodeEditorStandalone } from '@/components/problems/CodeEditorStandalone'
import { TestCases } from '@/components/problems/TestCases'

export default function CustomIntegration() {
  const problemState = useProblemState({
    trackSubmissions: true,
    separateRunResults: true,
    maxSubmissionHistory: 20
  })

  const handleRun = async (code: string, langId: number) => {
    const result = await runCode(code, langId)
    problemState.handleRunResult(result)
  }

  return (
    <div className="h-screen flex flex-col">
      <CodeEditorStandalone
        code={problemState.code}
        onCodeChange={problemState.setCode}
        onRun={handleRun}
      />

      <TestCases submissionResult={problemState.latestRunResult} />

      <div className="p-4">
        <h3>Submission History ({problemState.submissionHistory.length})</h3>
        <button onClick={problemState.clearSubmissionHistory}>
          Clear History
        </button>
      </div>
    </div>
  )
}
```

## Component Props Reference

### CodeEditorStandalone

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `problem` | `ProblemData` | No | Problem data for starter code |
| `code` | `string` | No | Controlled code value |
| `language` | `Language` | No | Controlled language value |
| `onCodeChange` | `(code: string) => void` | No | Code change callback |
| `onLanguageChange` | `(lang: Language) => void` | No | Language change callback |
| `onRun` | `(code, langId) => Promise<void>` | No | Run button handler |
| `onSubmit` | `(code, langId) => Promise<void>` | No | Submit button handler |
| `onAiChat` | `(code, langId) => Promise<void>` | No | AI chat trigger handler |
| `hideRunButton` | `boolean` | No | Hide run button |
| `hideSubmitButton` | `boolean` | No | Hide submit button |
| `hideLanguageSelector` | `boolean` | No | Hide language selector |
| `defaultLanguage` | `Language` | No | Default language (Python) |
| `defaultCode` | `string` | No | Default code content |

### ProblemDescription

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `problem` | `ProblemData` | Yes | Problem data |
| `submissionHistory` | `SubmissionResult[]` | No | Array of submissions |
| `activeTab` | `string` | No | Controlled active tab |
| `onTabChange` | `(tab: string) => void` | No | Tab change callback |

### TestCases

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `testcases` | `TestCase[]` | No | Test case data |
| `submissionResult` | `SubmissionResult` | No | Latest execution result |

### useProblemState Hook

```tsx
const problemState = useProblemState({
  trackSubmissions: true,        // Track submission history
  separateRunResults: true,      // Separate Run from Submit
  maxSubmissionHistory: 50       // Max submissions to keep
})

// Available state and methods:
problemState.code
problemState.setCode(code)
problemState.languageId
problemState.setLanguageId(id)
problemState.latestRunResult
problemState.submissionHistory
problemState.handleRunResult(result)
problemState.addSubmission(result)
problemState.clearSubmissionHistory()
problemState.activeTab
problemState.setActiveTab(tab)
```

## Migration from Existing Code

If you have existing code using the non-modular components, you can:

1. **Keep using the existing components** - They still work as before
2. **Gradually migrate** - Replace components one at a time with standalone versions
3. **Use both** - Mix standalone and original components as needed

Example migration:

```tsx
// Before
import { CodeEditor } from '@/components/problems/CodeEditor'

// After
import { CodeEditorStandalone as CodeEditor } from '@/components/problems/CodeEditorStandalone'
// Props are mostly compatible!
```

## Best Practices

1. **Use ProblemWorkspace for complex layouts** - It handles state management automatically
2. **Use standalone components for simple cases** - When you only need one or two components
3. **Use the hook for custom integrations** - When you need fine-grained control
4. **Keep components controlled when possible** - Easier to debug and test
5. **Leverage composition** - Mix and match components to create custom layouts

## Common Patterns

### Pattern 1: Editor-First Design
Start with just the editor, add features as needed:
```tsx
// v1: Just editor
<CodeEditorStandalone />

// v2: Add test cases
<div>
  <CodeEditorStandalone onRun={handleRun} />
  <TestCases submissionResult={result} />
</div>

// v3: Add problem description
<ProblemWorkspace>
  <ProblemWorkspace.Description />
  <ProblemWorkspace.CodeEditor />
  <ProblemWorkspace.TestCases />
</ProblemWorkspace>
```

### Pattern 2: Custom Dashboard
Create a custom view with multiple editors:
```tsx
<div className="grid grid-cols-2 gap-4 h-screen">
  <CodeEditorStandalone language="python" />
  <CodeEditorStandalone language="javascript" />
</div>
```

### Pattern 3: Mobile-First
Stack components vertically for mobile:
```tsx
<div className="flex flex-col h-screen">
  <ProblemDescription problem={problem} />
  <CodeEditorStandalone problem={problem} />
  <TestCases testcases={tests} />
</div>
```

Happy coding! 🚀
