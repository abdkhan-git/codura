# Modular Problem Components

A flexible, composable set of React components for building coding problem interfaces.

## 🎯 Quick Start

```tsx
// Just a code editor
import { CodeEditorStandalone } from '@/components/problems'

<CodeEditorStandalone
  onRun={(code, langId) => console.log(code)}
/>
```

```tsx
// Editor + Tests (vertical split)
import { CodeEditorStandalone, TestCases } from '@/components/problems'

<div className="flex flex-col h-screen">
  <CodeEditorStandalone onRun={handleRun} />
  <TestCases testcases={tests} submissionResult={result} />
</div>
```

```tsx
// Full layout with workspace helper
import { ProblemWorkspace } from '@/components/problems'

<ProblemWorkspace onRun={handleRun} onSubmit={handleSubmit}>
  <ProblemWorkspace.Description problem={problem} />
  <ProblemWorkspace.CodeEditor problem={problem} />
  <ProblemWorkspace.TestCases testcases={tests} />
</ProblemWorkspace>
```

## 📦 What's Included

### Components

| Component | Purpose | Works Standalone |
|-----------|---------|------------------|
| `CodeEditorStandalone` | Monaco code editor with language selection & execution | ✅ Yes |
| `ProblemDescription` | Problem statement, examples, constraints, submission history | ✅ Yes |
| `TestCases` | Display test cases and execution results | ✅ Yes |
| `AIChatbot` | AI assistant for hints and help | ✅ Yes |
| `ProblemWorkspace` | Composition helper with automatic state management | 🔄 Container |

### Hooks

| Hook | Purpose |
|------|---------|
| `useProblemState` | Centralized state management for code, submissions, and UI |
| `useProblemWorkspace` | Access workspace context (use inside ProblemWorkspace) |

## 🏗️ Architecture

### Three Ways to Use Components

1. **Standalone** - Each component works independently
   ```tsx
   <CodeEditorStandalone onRun={handleRun} />
   ```

2. **Manual Composition** - Compose components with your own state
   ```tsx
   const [result, setResult] = useState()
   <CodeEditorStandalone onRun={(code) => { setResult(runCode(code)) }} />
   <TestCases submissionResult={result} />
   ```

3. **ProblemWorkspace** - Automatic state management
   ```tsx
   <ProblemWorkspace onRun={handleRun}>
     <ProblemWorkspace.CodeEditor />
     <ProblemWorkspace.TestCases />
   </ProblemWorkspace>
   ```

## 📖 Documentation

- **[Full Usage Guide](./COMPONENT_USAGE.md)** - Comprehensive examples and patterns
- **[Live Examples](/examples/modular-components)** - Interactive demo page
- **[API Reference](./COMPONENT_USAGE.md#component-props-reference)** - Complete prop documentation

## 🎨 Common Layouts

### Editor Only
```tsx
<CodeEditorStandalone />
```

### Vertical Split (Editor + Tests)
```tsx
<ResizablePanelGroup direction="vertical">
  <ResizablePanel><CodeEditorStandalone /></ResizablePanel>
  <ResizablePanel><TestCases /></ResizablePanel>
</ResizablePanelGroup>
```

### Horizontal Split (Problem + Editor)
```tsx
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel><ProblemDescription /></ResizablePanel>
  <ResizablePanel><CodeEditorStandalone /></ResizablePanel>
</ResizablePanelGroup>
```

### Full Layout (3-panel)
```tsx
<ProblemWorkspace layout="three-panel">
  <ResizablePanel><ProblemWorkspace.Description /></ResizablePanel>
  <ResizablePanel><ProblemWorkspace.CodeEditor /></ResizablePanel>
  <ResizablePanel><ProblemWorkspace.AIChat /></ResizablePanel>
</ProblemWorkspace>
```

## 🔧 Component Features

### CodeEditorStandalone
- ✅ Controlled or uncontrolled mode
- ✅ Multiple language support
- ✅ Optional Run/Submit buttons
- ✅ Starter code from problem data
- ✅ Monaco editor with syntax highlighting
- ✅ Customizable theme

### ProblemDescription
- ✅ Problem details and examples
- ✅ Submission history with expandable rows
- ✅ Multiple tabs (description, solution, discussion, etc.)
- ✅ Controlled tab switching
- ✅ Topics and acceptance rate

### TestCases
- ✅ Display test case inputs/outputs
- ✅ Show execution results
- ✅ Pass/fail status with colors
- ✅ Error messages
- ✅ Multiple test case tabs

### ProblemWorkspace
- ✅ Automatic state management
- ✅ Flexible layouts (vertical, horizontal, custom)
- ✅ Shared context between components
- ✅ Submission history tracking
- ✅ Run vs Submit separation

## 🚀 Migration Guide

### From Original CodeEditor

```tsx
// Before
import { CodeEditor } from '@/components/problems/CodeEditor'
<CodeEditor problem={problem} onSubmit={onSubmit} onRun={onRun} />

// After
import { CodeEditorStandalone } from '@/components/problems'
<CodeEditorStandalone problem={problem} onSubmit={onSubmit} onRun={onRun} />
// Props are compatible! Just change the import.
```

### From Page Layout

```tsx
// Before: Manual state management in page
const [result, setResult] = useState()
const [submissions, setSubmissions] = useState([])
// ... lots of state and handlers

// After: Use ProblemWorkspace
<ProblemWorkspace onRun={handleRun} onSubmit={handleSubmit}>
  {/* Components share state automatically */}
</ProblemWorkspace>
```

## 💡 Best Practices

1. **Start Simple** - Begin with just the components you need
2. **Use ProblemWorkspace for Full Layouts** - Handles state automatically
3. **Keep Components Controlled** - Easier to debug and test
4. **Leverage Composition** - Build custom layouts by mixing components
5. **Check Examples** - Visit `/examples/modular-components` for live demos

## 🎯 Design Principles

- **Modularity** - Each component works independently
- **Flexibility** - Use any combination of components
- **Progressive Enhancement** - Start simple, add features as needed
- **Type Safety** - Full TypeScript support
- **Developer Experience** - Easy to use, hard to misuse

## 📝 License

Part of the Codura project.
