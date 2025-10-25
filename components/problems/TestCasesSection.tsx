// components/problem/TestCasesSection.tsx
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CopyCheck, ListChecks, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TestCase {
  input: string
  expectedOutput: string
  explanation?: string
}

interface TestcaseResult {
  actual?: any
  actualOutput?: any
  expected?: any
  expectedOutput?: any
  input?: any
  message?: string
  status?: 'pass' | 'fail' | 'error'
  passed?: boolean
  testNumber?: number
  executionTime?: number | string
  stdout?: string
  stderr?: string
  error?: string
}

interface SubmissionResult {
  status: string
  description: string
  testResults?: TestcaseResult[]
  totalTests?: number
  passedTests?: number
  memory?: string
  runtime?: string
}

type BottomTab = 'testcases' | 'results'

interface TestCasesSectionProps {
  testcases: TestCase[] | undefined
  testcaseResults?: TestcaseResult[] | undefined
  activeBottomTab: BottomTab
  setActiveBottomTab: (tab: BottomTab) => void
  submissionResult?: SubmissionResult
}

export default function TestCasesSection({
  testcases,
  testcaseResults,
  activeBottomTab,
  setActiveBottomTab,
  submissionResult,
}: TestCasesSectionProps) {
  return (
    <div className="h-full border-t flex flex-col">
      <Tabs
        value={activeBottomTab}
        onValueChange={(v) => setActiveBottomTab((v as BottomTab) || 'testcases')}
        defaultValue="testcases"
        className="w-full h-full flex flex-col"
      >
        <div className="border-b overflow-x-auto tab-scroll-container shrink-0">
          <TabsList className="inline-flex w-auto justify-start h-10">
            <TabsTrigger value="testcases" className="px-4 flex-shrink-0 cursor-pointer !text-zinc-500 data-[state=active]:!text-white">
              <CopyCheck className="text-green-600 w-4 h-4 mr-2" />
              Test Cases
            </TabsTrigger>
            <TabsTrigger value="results" className="px-4 flex-shrink-0 cursor-pointer !text-zinc-500 data-[state=active]:!text-white">
              <ListChecks className="text-green-600 w-4 h-4 mr-2" />
              Results
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Test Cases Tab */}
        <TabsContent value="testcases" className="flex-1 overflow-y-auto flex flex-col m-0 min-h-0">
          {testcases && testcases.length > 0 ? (
            <Tabs defaultValue="case-0" className="flex-1 flex flex-col min-h-0">
              {/* per-case tabs */}
              <TabsList className="justify-start rounded-none bg-transparent px-1 h-auto shrink-0">
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

              {/* content */}
              {testcases.map((tc, index) => (
                <TabsContent key={index} value={`case-${index}`} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  <TestCaseContent testCase={tc} />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <p className="text-sm text-muted-foreground">No test cases available</p>
            </div>
          )}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="flex-1 overflow-y-auto flex flex-col m-0 min-h-0">
          {/* Priority: submissionResult > testcaseResults > empty */}
          {submissionResult ? (
            <SubmissionResultDisplay submissionResult={submissionResult} />
          ) : testcaseResults && testcaseResults.length > 0 ? (
            <TestcaseResultsDisplay testcaseResults={testcaseResults} />
          ) : (
            <div className="p-4">
              <div className="bg-muted p-3 rounded text-sm">
                <p className="text-muted-foreground">Run or submit your code to see results here.</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================
// SUB-COMPONENTS
// ============================================

function TestCaseContent({ testCase }: { testCase: TestCase }) {
  // Parse "x = 1, y = 2" style inputs but stay safe if format differs
  const raw = testCase.input?.trim() ?? ''
  const parts = raw ? raw.split(', ') : []
  return (
    <>
      {/* Inputs */}
      {parts.length > 0 ? (
        parts.map((param, i) => {
          const [name, value] = param.split(' = ')
          return (
            <div key={i} className="space-y-1">
              <div className="text-sm text-zinc-400">{name || `arg${i}`}</div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2.5 font-mono text-[15px] text-white">
                {value ?? param}
              </div>
            </div>
          )
        })
      ) : (
        <div className="space-y-1">
          <div className="text-sm text-zinc-400">Input</div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2.5 font-mono text-[15px] text-white">
            {testCase.input}
          </div>
        </div>
      )}

      {/* Expected */}
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

// ============================================
// TESTCASE RESULTS DISPLAY (raw judge format)
// ============================================

function TestcaseResultsDisplay({ testcaseResults }: { testcaseResults: TestcaseResult[] }) {
  const passCount = testcaseResults.filter((r) => isPassed(r)).length
  const total = testcaseResults.length
  const allPassed = passCount === total && total > 0

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Overall Status */}
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full ${allPassed ? 'bg-green-500' : 'bg-red-500'} flex items-center justify-center`}>
            {allPassed ? (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <span className={`font-semibold ${allPassed ? 'text-green-500' : 'text-red-500'}`}>
            {allPassed ? 'Accepted' : 'Wrong Answer'}
          </span>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          {passCount} / {total} test cases passed
        </div>
      </div>

      {/* Per-case tabs */}
      <Tabs defaultValue="case-0" className="flex-1 flex flex-col min-h-0">
        <TabsList className="justify-start rounded-none bg-transparent px-1 h-auto border-b shrink-0">
          {testcaseResults.map((_, index) => (
            <TabsTrigger
              key={index}
              value={`case-${index}`}
              className="cursor-pointer rounded-xl border-none border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              <span className="flex items-center gap-2">
                Case {index + 1}
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPassed(testcaseResults[index]) ? 'bg-green-500' : isError(testcaseResults[index]) ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                />
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {testcaseResults.map((result, index) => (
          <TabsContent key={index} value={`case-${index}`} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {/* Status */}
            <div className="mb-2">
              <StatusPill result={result} />
            </div>

            {/* Input */}
            {result.input && Object.entries(result.input).map(([key, value]) => (
              <KVLine key={key} label={`${key} =`} value={value} mono />
            ))}

            {/* Outputs */}
            {isPassed(result) ? (
              <KVLine label="Expected" value={coalesce(result.expectedOutput, result.expected)} mono success />
            ) : (
              <>
                <KVLine label="Expected" value={coalesce(result.expectedOutput, result.expected)} mono success />
                <KVLine label="Got" value={coalesce(result.actualOutput, result.actual)} mono danger />
              </>
            )}

            {/* Stdout/Stderr or message */}
            {result.stdout && <KVLine label="Stdout" value={result.stdout} mono />}
            {result.stderr && <KVLine label="Stderr" value={result.stderr} mono />}
            {result.message && !isPassed(result) && !isError(result) && (
              <KVLine label="Message" value={result.message} />
            )}
            {result.error && (
              <div className="mt-2 p-2 bg-red-950/30 rounded text-red-400 text-xs">
                <span className="font-semibold">Error: </span>
                {result.error}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

// ============================================
// SUBMISSION RESULT DISPLAY (normalized AI format)
// ============================================

function SubmissionResultDisplay({ submissionResult }: { submissionResult: SubmissionResult }) {
  const isSuccess =
    submissionResult.status === 'Accepted' ||
    submissionResult.passedTests === submissionResult.totalTests

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Overall */}
      <div
        className={`p-4 rounded-lg border ${
          isSuccess ? 'bg-green-950/30 border-green-900' : 'bg-red-950/30 border-red-900'
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          {isSuccess ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <XCircle className="w-6 h-6 text-red-500" />}
          <h3 className={`text-lg font-bold ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>{submissionResult.status}</h3>
        </div>

        {submissionResult.description && (
          <p className="text-sm text-muted-foreground mb-2">{submissionResult.description}</p>
        )}

        {typeof submissionResult.totalTests !== 'undefined' && (
          <div className="flex items-center gap-2">
            <Badge variant={isSuccess ? 'default' : 'destructive'}>
              {submissionResult.passedTests || 0} / {submissionResult.totalTests} test cases passed
            </Badge>
          </div>
        )}
      </div>

      {/* Perf */}
      {(submissionResult.runtime || submissionResult.memory) && (
        <div className="grid grid-cols-2 gap-3">
          {submissionResult.runtime && (
            <MetricCard label="Runtime" value={submissionResult.runtime} />
          )}
          {submissionResult.memory && (
            <MetricCard label="Memory" value={submissionResult.memory} />
          )}
        </div>
      )}

      {/* Per-case */}
      {submissionResult.testResults?.length ? (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Test Case Results:</h4>
          {submissionResult.testResults.map((r, i) => (
            <TestResultCard key={i} result={r} index={i} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ============================================
// SMALL UI HELPERS
// ============================================

function StatusPill({ result }: { result: TestcaseResult }) {
  const passed = isPassed(result)
  const errored = isError(result)
  if (passed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-sm font-medium">
        <CheckCircle2 className="w-4 h-4" />
        Passed
      </span>
    )
  }
  if (errored) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-sm font-medium">
        Error
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-sm font-medium">
      <XCircle className="w-4 h-4" />
      Failed
    </span>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted p-3 rounded-lg border">
      <div className="flex items-center gap-2 mb-1">
        {label.toLowerCase() === 'runtime' && <Clock className="w-4 h-4 text-blue-400" />}
        <span className="text-xs text-zinc-400">{label}</span>
      </div>
      <p className="text-sm font-mono font-semibold">{value}</p>
    </div>
  )
}

function KVLine({
  label,
  value,
  mono,
  success,
  danger,
}: {
  label: string
  value: any
  mono?: boolean
  success?: boolean
  danger?: boolean
}) {
  return (
    <div className="space-y-1">
      <div className="text-sm text-zinc-400">{label}</div>
      <div
        className={[
          'bg-zinc-950 border rounded-md px-3 py-2.5 text-[13px]',
          mono ? 'font-mono' : '',
          success ? 'border-green-500/50 text-green-400' : '',
          danger ? 'border-red-500/50 text-red-400' : 'border-zinc-800 text-white',
        ].join(' ')}
      >
        {typeof value === 'string' ? value : JSON.stringify(value)}
      </div>
    </div>
  )
}

function TestResultCard({ result, index }: { result: TestcaseResult; index: number }) {
  const passed = isPassed(result)
  return (
    <div
      className={`p-3 rounded-lg border ${
        passed ? 'bg-green-950/20 border-green-900/50' : 'bg-red-950/20 border-red-900/50'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {passed ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
          <span className="text-sm font-semibold">Test Case {index + 1}</span>
        </div>
        {result.executionTime && (
          <span className="text-xs text-muted-foreground">{result.executionTime}ms</span>
        )}
      </div>

      <div className="space-y-2 text-xs">
        {result.input && (
          <div>
            <span className="text-zinc-400">Input: </span>
            <span className="font-mono">{JSON.stringify(result.input)}</span>
          </div>
        )}

        {(result.expectedOutput || result.expected) && (
          <div>
            <span className="text-zinc-400">Expected: </span>
            <span className="font-mono text-green-400">
              {JSON.stringify(result.expectedOutput ?? result.expected)}
            </span>
          </div>
        )}

        {(result.actualOutput || result.actual) && (
          <div>
            <span className="text-zinc-400">Got: </span>
            <span className={`font-mono ${passed ? 'text-green-400' : 'text-red-400'}`}>
              {JSON.stringify(result.actualOutput ?? result.actual)}
            </span>
          </div>
        )}

        {result.stdout && (
          <div>
            <span className="text-zinc-400">Stdout: </span>
            <span className="font-mono">{result.stdout}</span>
          </div>
        )}

        {result.stderr && (
          <div>
            <span className="text-zinc-400">Stderr: </span>
            <span className="font-mono">{result.stderr}</span>
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
// RESULT HELPERS
// ============================================

function isPassed(r: TestcaseResult) {
  if (typeof r.passed === 'boolean') return r.passed
  if (typeof r.status === 'string') return r.status === 'pass'
  return false
}

function isError(r: TestcaseResult) {
  return r.status === 'error' || !!r.error
}

function coalesce<T>(a: T | undefined, b: T | undefined): T | undefined {
  return typeof a !== 'undefined' ? a : b
}