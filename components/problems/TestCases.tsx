'use client'

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CopyCheck, ListChecks, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TestCase {
  input: string
  expectedOutput: string
  explanation?: string
}

interface TestResult {
  testCaseIndex: number
  passed: boolean
  input: string
  expectedOutput: string
  actualOutput?: string
  executionTime?: number
  error?: string
}

interface SubmissionResult {
  status: string
  description: string
  testResults?: TestResult[]
  totalTests?: number
  passedTests?: number
  memory?: string
  runtime?: string
}

interface TestCasesProps {
  testcases?: TestCase[]
  submissionResult?: SubmissionResult | string
}

export function TestCases({ testcases = [], submissionResult }: TestCasesProps) {
  return (
    <div className="h-full border-t">
      <Tabs defaultValue="testcases" className="w-full h-full flex flex-col">
        <TestCasesTabs />

        {/* Test Cases Tab */}
        <TabsContent value="testcases" className="flex-1 overflow-auto flex flex-col m-0">
          <TestCasesList testcases={testcases} />
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="p-4 flex-1 overflow-auto m-0">
          <ResultsDisplay submissionResult={submissionResult} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================
// SUB-COMPONENTS
// ============================================

function TestCasesTabs() {
  return (
    <div className="border-b overflow-x-auto tab-scroll-container">
      <TabsList className="inline-flex w-auto justify-start h-10 bg-transparent">
        <TabsTrigger 
          value="testcases" 
          className="px-4 flex-shrink-0 cursor-pointer !text-zinc-500 data-[state=active]:!text-white"
        >
          <CopyCheck className="text-green-600 mr-2 w-4 h-4" />
          Testcases
        </TabsTrigger>
        <TabsTrigger 
          value="results" 
          className="px-4 flex-shrink-0 cursor-pointer !text-zinc-500 data-[state=active]:!text-white"
        >
          <ListChecks className="text-green-600 mr-2 w-4 h-4" />
          Results
        </TabsTrigger>
      </TabsList>
    </div>
  )
}

function TestCasesList({ testcases }: { testcases: TestCase[] }) {
  if (!testcases || testcases.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">No test cases available</p>
      </div>
    )
  }

  return (
    <Tabs defaultValue="case-0" className="flex-1 flex flex-col">
      {/* Test case tabs */}
      <TabsList className="justify-start rounded-none bg-transparent px-1 h-auto">
        {testcases.map((_, index) => (
          <TabsTrigger
            key={index}
            value={`case-${index}`}
            className="cursor-pointer rounded-xl border-none border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            Case {index + 1}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Test case content */}
      {testcases.map((tc, index) => (
        <TabsContent 
          key={index} 
          value={`case-${index}`} 
          className="flex-1 overflow-auto p-4 space-y-3"
        >
          <TestCaseContent testCase={tc} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function TestCaseContent({ testCase }: { testCase: TestCase }) {
  // Parse input parameters
  const params = testCase.input.split(', ')
  
  return (
    <>
      {/* Input Parameters */}
      {params.map((param, i) => {
        const [name, value] = param.split(' = ')
        return (
          <div key={i} className="space-y-1">
            <div className="text-sm text-zinc-400">{name}</div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2.5 font-mono text-[15px] text-white">
              {value}
            </div>
          </div>
        )
      })}

      {/* Expected Output */}
      {testCase.expectedOutput && (
        <div className="space-y-1 mt-4">
          <div className="text-sm text-zinc-400">Expected Output</div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2.5 font-mono text-[15px] text-white">
            {testCase.expectedOutput}
          </div>
        </div>
      )}

      {/* Explanation */}
      {testCase.explanation && (
        <div className="space-y-1 mt-4">
          <div className="text-sm text-zinc-400">Explanation</div>
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-md px-3 py-2.5 text-sm text-zinc-300">
            {testCase.explanation}
          </div>
        </div>
      )}
    </>
  )
}

function ResultsDisplay({ submissionResult }: { submissionResult?: SubmissionResult | string }) {
  if (!submissionResult) {
    return (
      <div className="bg-muted p-3 rounded text-sm">
        <p className="text-muted-foreground">Run your code to see results here</p>
      </div>
    )
  }

  // Handle string results (legacy format)
  if (typeof submissionResult === 'string') {
    return (
      <div className="space-y-4">
        <div className="bg-muted p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Submission Result</h3>
          <p className="text-sm">{submissionResult}</p>
        </div>
      </div>
    )
  }

  // Handle structured results
  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <ResultStatus result={submissionResult} />

      {/* Performance Metrics */}
      {(submissionResult.runtime || submissionResult.memory) && (
        <PerformanceMetrics 
          runtime={submissionResult.runtime} 
          memory={submissionResult.memory} 
        />
      )}

      {/* Individual Test Results */}
      {submissionResult.testResults && submissionResult.testResults.length > 0 && (
        <TestResultsList testResults={submissionResult.testResults} />
      )}
    </div>
  )
}

function ResultStatus({ result }: { result: SubmissionResult }) {
  const isSuccess = result.status === 'Accepted' || result.passedTests === result.totalTests
  
  return (
    <div className={`p-4 rounded-lg border ${
      isSuccess 
        ? 'bg-green-950/30 border-green-900' 
        : 'bg-red-950/30 border-red-900'
    }`}>
      <div className="flex items-center gap-3 mb-2">
        {isSuccess ? (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        ) : (
          <XCircle className="w-6 h-6 text-red-500" />
        )}
        <h3 className={`text-lg font-bold ${
          isSuccess ? 'text-green-400' : 'text-red-400'
        }`}>
          {result.status}
        </h3>
      </div>
      
      {result.description && (
        <p className="text-sm text-muted-foreground mb-2">{result.description}</p>
      )}
      
      {result.totalTests && (
        <div className="flex items-center gap-2">
          <Badge variant={isSuccess ? "default" : "destructive"}>
            {result.passedTests} / {result.totalTests} test cases passed
          </Badge>
        </div>
      )}
    </div>
  )
}

function PerformanceMetrics({ runtime, memory }: { runtime?: string; memory?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {runtime && (
        <div className="bg-muted p-3 rounded-lg border">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-zinc-400">Runtime</span>
          </div>
          <p className="text-sm font-mono font-semibold">{runtime}</p>
        </div>
      )}
      
      {memory && (
        <div className="bg-muted p-3 rounded-lg border">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-zinc-400">Memory</span>
          </div>
          <p className="text-sm font-mono font-semibold">{memory}</p>
        </div>
      )}
    </div>
  )
}

function TestResultsList({ testResults }: { testResults: TestResult[] }) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm">Test Case Results:</h4>
      {testResults.map((result, index) => (
        <TestResultCard key={index} result={result} />
      ))}
    </div>
  )
}

function TestResultCard({ result }: { result: TestResult }) {
  return (
    <div className={`p-3 rounded-lg border ${
      result.passed 
        ? 'bg-green-950/20 border-green-900/50' 
        : 'bg-red-950/20 border-red-900/50'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {result.passed ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
          <span className="text-sm font-semibold">
            Test Case {result.testCaseIndex + 1}
          </span>
        </div>
        {result.executionTime && (
          <span className="text-xs text-muted-foreground">
            {result.executionTime}ms
          </span>
        )}
      </div>
      
      <div className="space-y-2 text-xs">
        <div>
          <span className="text-zinc-400">Input: </span>
          <span className="font-mono">{result.input}</span>
        </div>
        
        <div>
          <span className="text-zinc-400">Expected: </span>
          <span className="font-mono text-green-400">{result.expectedOutput}</span>
        </div>
        
        {result.actualOutput && (
          <div>
            <span className="text-zinc-400">Got: </span>
            <span className={`font-mono ${
              result.passed ? 'text-green-400' : 'text-red-400'
            }`}>
              {result.actualOutput}
            </span>
          </div>
        )}
        
        {result.error && (
          <div className="mt-2 p-2 bg-red-950/30 rounded text-red-400">
            <span className="font-semibold">Error: </span>
            {result.error}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// HELPER FUNCTION (Export for use in parent)
// ============================================

export function parseExamplesToTestCases(examples: Array<{ id: number; content: string }> | undefined): TestCase[] {
  if (!examples) {
    return []
  }

  return examples.map(example => {
    const content = example.content
      .replace(/&nbsp;/g, '')
      .trim()
    
    // Extract input
    const inputMatch = content.match(/Input:\s*(.+?)(?=\nOutput:|$)/s)
    const input = inputMatch ? inputMatch[1].trim() : ''
    
    // Extract output
    const outputMatch = content.match(/Output:\s*(.+?)(?=\nExplanation:|$)/s)
    const expectedOutput = outputMatch ? outputMatch[1].trim() : ''
    
    // Extract explanation (optional)
    const explanationMatch = content.match(/Explanation:\s*(.+?)$/s)
    const explanation = explanationMatch ? explanationMatch[1].trim() : undefined
    
    return {
      input,
      expectedOutput,
      explanation
    }
  })
}