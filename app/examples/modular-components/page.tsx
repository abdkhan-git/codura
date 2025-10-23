'use client'

/**
 * Example Page: Modular Component Usage
 *
 * This page demonstrates different ways to use the modular problem components.
 * Switch between examples using the tabs at the top.
 */

import { useState } from 'react'
import { CodeEditorStandalone } from '@/components/problems/CodeEditorStandalone'
import { ProblemDescription } from '@/components/problems/ProblemDescription'
import { TestCases } from '@/components/problems/TestCases'
import { ProblemWorkspace } from '@/components/problems/ProblemWorkspace'
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ModularComponentsExample() {
  const [runResult, setRunResult] = useState<any>()
  const [submissions, setSubmissions] = useState<any[]>([])

  // Mock problem data
  const mockProblem = {
    id: 1,
    leetcode_id: 1,
    title: "Two Sum",
    title_slug: "two-sum",
    difficulty: "Easy" as const,
    description: "<p>Given an array of integers, return indices of the two numbers such that they add up to a specific target.</p>",
    examples: [
      { id: 1, content: "Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]" }
    ],
    constraints: ["2 <= nums.length <= 10^4"],
    topic_tags: [{ name: "Array", slug: "array" }, { name: "Hash Table", slug: "hash-table" }],
    acceptance_rate: 49.5,
    code_snippets: [
      { code: "def twoSum(nums, target):\n    # Your code here\n    pass", lang: "Python", langSlug: "python" },
      { code: "function twoSum(nums, target) {\n  // Your code here\n}", lang: "JavaScript", langSlug: "javascript" }
    ]
  }

  const testCases = [
    { input: "[2,7,11,15], 9", expectedOutput: "[0,1]" },
    { input: "[3,2,4], 6", expectedOutput: "[1,2]" }
  ]

  // Mock handlers
  const handleRun = async (code: string, langId: number) => {
    console.log('Running code:', code, 'Language:', langId)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    const result = {
      status: "Accepted",
      description: "All test cases passed!",
      totalTests: 2,
      passedTests: 2,
      runtime: "0.05s",
      memory: "256 KB",
      timestamp: new Date(),
      testResults: [
        { testCaseIndex: 0, passed: true, input: "[2,7,11,15], 9", expectedOutput: "[0,1]", actualOutput: "[0,1]" },
        { testCaseIndex: 1, passed: true, input: "[3,2,4], 6", expectedOutput: "[1,2]", actualOutput: "[1,2]" }
      ]
    }
    setRunResult(result)
  }

  const handleSubmit = async (code: string, langId: number) => {
    console.log('Submitting code:', code, 'Language:', langId)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    const result = {
      status: "Accepted",
      description: "Submission successful!",
      totalTests: 10,
      passedTests: 10,
      runtime: "0.08s",
      memory: "512 KB",
      timestamp: new Date(),
      language: String(langId)
    }
    setSubmissions([result, ...submissions])
  }

  return (
    <div className="h-screen w-full bg-background p-4">
      <Tabs defaultValue="editor-only" className="h-full flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">Modular Component Examples</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Explore different ways to compose CodeEditor, TestCases, ProblemDescription, and AI components.
          </p>
          <TabsList>
            <TabsTrigger value="editor-only">Editor Only</TabsTrigger>
            <TabsTrigger value="editor-tests">Editor + Tests</TabsTrigger>
            <TabsTrigger value="problem-editor">Problem + Editor</TabsTrigger>
            <TabsTrigger value="full-layout">Full Layout</TabsTrigger>
            <TabsTrigger value="workspace">ProblemWorkspace</TabsTrigger>
          </TabsList>
        </div>

        {/* Example 1: Editor Only */}
        <TabsContent value="editor-only" className="flex-1">
          <div className="h-full border rounded-lg overflow-hidden">
            <CodeEditorStandalone
              defaultCode="# Just a simple code editor\nprint('Hello World!')"
              onRun={handleRun}
              onSubmit={handleSubmit}
            />
          </div>
        </TabsContent>

        {/* Example 2: Editor + Test Cases */}
        <TabsContent value="editor-tests" className="flex-1">
          <ResizablePanelGroup direction="vertical" className="h-full border rounded-lg">
            <ResizablePanel defaultSize={65}>
              <CodeEditorStandalone
                problem={mockProblem}
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
        </TabsContent>

        {/* Example 3: Problem + Editor */}
        <TabsContent value="problem-editor" className="flex-1">
          <ResizablePanelGroup direction="horizontal" className="h-full border rounded-lg">
            <ResizablePanel defaultSize={40}>
              <ProblemDescription
                problem={mockProblem}
                submissionHistory={submissions}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={60}>
              <CodeEditorStandalone
                problem={mockProblem}
                onRun={handleRun}
                onSubmit={handleSubmit}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </TabsContent>

        {/* Example 4: Full Layout (Manual) */}
        <TabsContent value="full-layout" className="flex-1">
          <ResizablePanelGroup direction="horizontal" className="h-full border rounded-lg">
            <ResizablePanel defaultSize={30} minSize={20}>
              <ProblemDescription
                problem={mockProblem}
                submissionHistory={submissions}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={50} minSize={30}>
              <ResizablePanelGroup direction="vertical">
                <ResizablePanel defaultSize={65}>
                  <CodeEditorStandalone
                    problem={mockProblem}
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

            <ResizablePanel defaultSize={20} minSize={15}>
              <div className="h-full bg-muted/30 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">AI Chat Placeholder</p>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </TabsContent>

        {/* Example 5: Using ProblemWorkspace */}
        <TabsContent value="workspace" className="flex-1">
          <div className="h-full border rounded-lg overflow-hidden">
            <ProblemWorkspace
              problem={mockProblem}
              onRun={handleRun}
              onSubmit={handleSubmit}
              layout="horizontal"
            >
              <ResizablePanel defaultSize={40}>
                <ProblemWorkspace.Description problem={mockProblem} />
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={60}>
                <ResizablePanelGroup direction="vertical">
                  <ResizablePanel defaultSize={65}>
                    <ProblemWorkspace.CodeEditor problem={mockProblem} />
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  <ResizablePanel defaultSize={35}>
                    <ProblemWorkspace.TestCases testcases={testCases} />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ProblemWorkspace>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
