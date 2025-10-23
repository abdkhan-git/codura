'use client'

import React, { useState, useEffect } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Import all separated components
import AIChatbot from '@/components/problems/AIChatbot'
import { CodeEditor } from '@/components/problems/CodeEditor'
import { TestCases, parseExamplesToTestCases } from '@/components/problems/TestCases'
import { ProblemDescription } from '@/components/problems/ProblemDescription'

// Custom styles for tab scrolling
const tabScrollStyles = `
  .tab-scroll-container {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    transition: scrollbar-color 0.3s ease;
  }

  .tab-scroll-container:hover {
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  }

  .dark .tab-scroll-container:hover {
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }

  .tab-scroll-container::-webkit-scrollbar {
    height: 4px;
  }

  .tab-scroll-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .tab-scroll-container::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 2px;
    transition: background 0.3s ease;
  }

  .tab-scroll-container:hover::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
  }

  .dark .tab-scroll-container:hover::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }
`

// Judge configuration
const JUDGE_URL = (process.env.NEXT_PUBLIC_JUDGE_URL ?? 'http://localhost:8080').trim();
const JUDGE_RUN_PATH = (process.env.NEXT_PUBLIC_JUDGE_RUN_PATH ?? '').trim();
const JUDGE_SUBMIT_PATH = (process.env.NEXT_PUBLIC_JUDGE_SUBMIT_PATH ?? '').trim();
const joinUrl = (base: string, path: string) => {
  const b = (base || '').replace(/\/+$/, '');
  const p = (path || '').replace(/^\/+/, '');
  return `${b}/${p}`;
};

// Try multiple judge endpoint variants to be compatible with different deployments
const postToFirstAvailable = async (paths: string[], body: any) => {
  const errors: Array<{ url: string; status: number; text?: string }> = [];
  for (const path of paths) {
    const url = joinUrl(JUDGE_URL, path);
    console.debug('[judge] trying:', url);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) return res;
      const text = await res.text().catch(() => '');
      errors.push({ url, status: res.status, text });
      // If it's a 404, try the next variant; if it's something else, continue but log
      if (res.status !== 404) {
        console.warn('[judge] non-404 error at', url, res.status, text);
      } else {
        console.debug('[judge] 404 at', url);
      }
    } catch (e) {
      errors.push({ url, status: -1, text: (e as Error)?.message });
    }
  }
  // Nothing worked — surface the most relevant info
  const summary = errors.map(e => `${e.url} -> ${e.status}${e.text ? ' ' + e.text : ''}`).join(' | ');
  throw new Error(`All judge endpoints failed: ${summary}`);
};

// ============================================
// INTERFACES
// ============================================

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
  code_snippets: Array<{
    code: string
    lang: string 
    langSlug: string
  }>
}

interface TestCase {
  input: string
  expectedOutput: string
  explanation?: string
}

interface SubmissionResult {
  status: string
  description: string
  testResults?: any[]
  totalTests?: number
  passedTests?: number
  memory?: string
  runtime?: string
  timestamp?: Date
  language?: string
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProblemPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  // State management
  const [problem, setProblem] = useState<ProblemData | null>(null)
  const [testcases, setTestcases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult[]>([])
  const [latestRunResult, setLatestRunResult] = useState<SubmissionResult | undefined>()
  const [activeDescriptionTab, setActiveDescriptionTab] = useState<string>("description")
  // Mock submission for AIChatbot (temporary for testing)
  const [aiSubmission, setAiSubmission] = useState<{
    code: string
    language: string
    timestamp: Date
    testsPassed: number
    totalTests: number
  } | null>(null)
  // ============================================
  // DATA FETCHING
  // ============================================

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setLoading(true)

        const { data, error } = await supabase
          .from('problems')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) throw error

        if (!data) {
          setError('Problem not found')
          return
        }

        setProblem(data as ProblemData)
        setTestcases(parseExamplesToTestCases(data.examples))

      } catch (err) {
        console.error('Error fetching problem:', err)
        setError('Failed to load problem')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchProblem()
    }
  }, [params.id, supabase])

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * Handle code submission to judge server
   */
  const handleCodeSubmission = async (code: string, languageId: number) => {
    try {
      const body = {
        language_id: languageId,
        source_code: code,
        stdin: "test",
      }

      const submitPaths = [
        ...(JUDGE_SUBMIT_PATH ? [JUDGE_SUBMIT_PATH] : []),
        '/api/problems/submit',
        '/submit',
        '/problems/submit',
        '/v1/submit',
      ];
      const response = await postToFirstAvailable(submitPaths, body);
      const data = await response.json();
      
      // Map Judge0-style response into our UI shape
      const jr = data?.submissionResult || data; // support either shape
      const statusDesc = jr?.status?.description || 'Unknown';
      const stdout = (jr?.stdout || '').toString().trim();
      const stderr = (jr?.stderr || '').toString().trim();
      const time = jr?.time != null ? `${jr.time}s` : undefined;
      const memory = jr?.memory != null ? `${jr.memory} KB` : undefined;
      
      // Compare against first test case if available
      const expected = (testcases && testcases[0]?.expectedOutput)
        ? String(testcases[0].expectedOutput).trim()
        : undefined;
      const passed = expected != null ? (stdout === expected) : undefined;

      const newSubmission: SubmissionResult = {
        status: statusDesc,
        description: stderr ? `stderr: ${stderr}` : statusDesc,
        totalTests: expected != null ? 1 : undefined,
        passedTests: expected != null ? (passed ? 1 : 0) : undefined,
        memory,
        runtime: time,
        timestamp: new Date(),
        language: String(languageId),
        testResults: expected != null ? [{
          testCaseIndex: 0,
          passed: !!passed,
          input: testcases[0]?.input || '',
          expectedOutput: expected || '',
          actualOutput: stdout || undefined,
          error: stderr || undefined,
        }] : undefined,
      };

      setSubmissionResult(prev => [newSubmission, ...prev]);

      // Switch to submissions tab after submit
      setActiveDescriptionTab("submissions");

      // Also update AI submission (unlocks AI panel after Submit)
      setAiSubmission({
        code,
        language: String(languageId),
        timestamp: new Date(),
        testsPassed: data.passedTests ?? 0,
        totalTests: data.totalTests ?? 0,
      });
      console.log('Submission successful:', data)
    } catch (error) {
      console.error('Submission error:', error)
      setSubmissionResult(prev => [{
        status: 'Error',
        description: 'Failed to submit code. Please try again.',
        timestamp: new Date(),
      }, ...prev]);
      throw error
    }
  }

  /**
   * Handle running code with test cases (without official submission)
   */
  const handleCodeRun = async (code: string, languageId: number) => {
    try {
      // Use first test case input for quick run
      const testInput = testcases[0]?.input || ""

      const body = {
        language_id: languageId,
        source_code: code,
        stdin: testInput,
      }

      const runPaths = [
        ...(JUDGE_RUN_PATH ? [JUDGE_RUN_PATH] : []),
        ...(JUDGE_SUBMIT_PATH ? [JUDGE_SUBMIT_PATH] : []),
        '/api/problems/submit',
        '/submit',
        '/problems/submit',
        '/v1/submit',
      ];
      const response = await postToFirstAvailable(runPaths, body);
      const data = await response.json();

      // Map Judge0-style response into our UI shape (same as submit)
      const jr = data?.submissionResult || data; // support either shape
      const statusDesc = jr?.status?.description || 'Unknown';
      const stdout = (jr?.stdout || '').toString().trim();
      const stderr = (jr?.stderr || '').toString().trim();
      const time = jr?.time != null ? `${jr.time}s` : undefined;
      const memory = jr?.memory != null ? `${jr.memory} KB` : undefined;

      // Compare against first test case if available
      const expected = (testcases && testcases[0]?.expectedOutput)
        ? String(testcases[0].expectedOutput).trim()
        : undefined;
      const passed = expected != null ? (stdout === expected) : undefined;

      const runResult: SubmissionResult = {
        status: statusDesc,
        description: stderr ? `stderr: ${stderr}` : statusDesc,
        totalTests: expected != null ? 1 : undefined,
        passedTests: expected != null ? (passed ? 1 : 0) : undefined,
        memory,
        runtime: time,
        timestamp: new Date(),
        language: String(languageId),
        testResults: expected != null ? [{
          testCaseIndex: 0,
          passed: !!passed,
          input: testcases[0]?.input || '',
          expectedOutput: expected || '',
          actualOutput: stdout || undefined,
          error: stderr || undefined,
        }] : undefined,
      };

      // For Run, just update the latest run result (don't add to submission history)
      setLatestRunResult(runResult);

      console.log('Run successful:', data)
    } catch (error) {
      console.error('Run error:', error)
      const errorResult: SubmissionResult = {
        status: 'Error',
        description: 'Failed to run code. Please try again.',
        timestamp: new Date(),
      };
      setLatestRunResult(errorResult);
      throw error
    }
  }

  /**
   * Handle AI chat messages (for analytics/logging)
   */
  const handleAIChatMessage = (message: string) => {
    console.log('User asked AI:', message)
    // TODO: Track analytics, log to database, etc.
  }

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading problem...</p>
        </div>
      </div>
    )
  }

  // ============================================
  // ERROR STATE
  // ============================================

  if (error || !problem) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-xl text-destructive">{error || 'Problem not found'}</p>
          <Button onClick={() => router.push('/problems')}>
            Back to Problems
          </Button>
        </div>
      </div>
    )
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="caffeine-theme h-screen w-full bg-background p-2">
      <style jsx global>{tabScrollStyles}</style>
      
      <ResizablePanelGroup direction="horizontal" className="h-full">
        
        {/* LEFT PANEL - Problem Description */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <ProblemDescription
            problem={problem}
            loading={loading}
            submissionResult={submissionResult}
            activeTab={activeDescriptionTab}
            onTabChange={setActiveDescriptionTab}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* MIDDLE PANEL - Code Editor & Test Cases */}
        <ResizablePanel defaultSize={45} minSize={30}>
          <ResizablePanelGroup direction="vertical">
            
            {/* Code Editor */}
            <ResizablePanel defaultSize={65} minSize={30}>
            <CodeEditor 
              problem={problem}
              onAiChat={async (code, languageId) => {
                // This sets up a fake submission so the AI chat can open after Submit
                setAiSubmission({
                  code,
                  language: String(languageId),
                  timestamp: new Date(),
                  testsPassed: 0,
                  totalTests: 0,
                })
              }}
              onSubmit={handleCodeSubmission}  // keep for later Judge integration
              onRun={handleCodeRun}
            />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Test Cases & Results */}
            <ResizablePanel defaultSize={35} minSize={20}>
              <TestCases
                testcases={testcases}
                submissionResult={latestRunResult}
              />
            </ResizablePanel>
            
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* RIGHT PANEL - AI Chatbot */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
        <AIChatbot 
          problemId={problem.id}
          problemTitle={problem.title}
          problemDescription={problem.description}
          problemDifficulty={problem.difficulty}
          submission={aiSubmission}                 // ← now unlocks after Submit
          onMessageSent={handleAIChatMessage}
        />
        </ResizablePanel>
        
      </ResizablePanelGroup>
    </div>
  )
}