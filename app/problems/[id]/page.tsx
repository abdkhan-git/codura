'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMonaco } from '@monaco-editor/react'

// Import separated components
import AIChatbot from '@/components/problems/AIChatbot'
import CodeEditorPanel from '@/components/problems/CodeEditorPanel'
import ProblemDescriptionPanel from '@/components/problems/ProblemDescriptionPanel'

// Custom styles for tab scrolling
const tabScrollStyles = `
  .tab-scroll-container {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    transition: scrollbar-color 0.3s ease;
  }
  .tab-scroll-container:hover { scrollbar-color: rgba(0, 0, 0, 0.2) transparent; }
  .dark .tab-scroll-container:hover { scrollbar-color: rgba(255, 255, 255, 0.2) transparent; }
  .tab-scroll-container::-webkit-scrollbar { height: 4px; }
  .tab-scroll-container::-webkit-scrollbar-track { background: transparent; }
  .tab-scroll-container::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 2px;
    transition: background 0.3s ease;
  }
  .tab-scroll-container:hover::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.2); }
  .dark .tab-scroll-container:hover::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); }
`

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
  examples: Array<{ id: number; content: string }>
  constraints: string[]
  topic_tags: Array<{ name: string; slug: string }>
  acceptance_rate: number
  code_snippets: Array<{
    code: string
    lang: string
    langSlug: string
  }>
}

interface Example { id: number; content: string }

interface TestCase {
  input: string
  expectedOutput: string
  explanation?: string
}

// NOTE: Removed stray top-level async/try block that caused a parse error.

interface Submission {
  code: string
  language: string
  timestamp: Date
  testsPassed: number
  totalTests: number
  status?: string
  runtime?: string
  memory?: string
}

// ============================================
// HELPERS
// ============================================

const parseExamplesToTestCases = (examples: Example[] | undefined): TestCase[] => {
  if (!examples) return [];
  
  return examples.map(example => {
    // Clean all HTML entities
    const content = example.content
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .trim();
    
    // Extract input - handle multi-line inputs
    const inputMatch = content.match(/Input:\s*([^\n]+(?:\n(?!Output:)[^\n]+)*)/);
    const input = inputMatch ? inputMatch[1].trim() : '';
    
    // Extract output - stop at Explanation or end
    const outputMatch = content.match(/Output:\s*([^\n]+)/);
    const expectedOutput = outputMatch ? outputMatch[1].trim() : '';
    
    // Extract explanation if exists
    const explanationMatch = content.match(/Explanation:\s*(.+?)$/s);
    const explanation = explanationMatch ? explanationMatch[1].trim() : undefined;
    
    return { 
      input, 
      expectedOutput, 
      explanation 
    };
  }).filter(tc => tc.input && tc.expectedOutput); // Filter out incomplete cases
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProblemPage() {
  const params = useParams()
  const router = useRouter()
  const monaco = useMonaco()
  const supabase = createClient()

  // State
  const [problem, setProblem] = useState<ProblemData | null>(null)
  const [testcases, setTestcases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allOfUsersSubmissions, setAllOfUsersSubmissions] = useState<any[]>([])
  const [latestUserSubmission, setLatestUserSubmission] = useState<any>(undefined)
  // page.tsx

  
  // Language & code
  const [userLang, setUserLang] = useState({
    id: 92,
    name: 'Python (3.11.2)',
    value: 'python',
  })
  const [usersCode, setUsersCode] = useState<string | undefined>(undefined)

  // AI
  const [aiSubmission, setAiSubmission] = useState<Submission | null>(null)

  // Proof of life
  useEffect(() => {
    console.log('🟢 PAGE.TSX mounted')
  }, [])

  // Monaco theme
  useEffect(() => {
    if (!monaco) return
    monaco.editor.defineTheme('caffeine-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'f2f2f2', background: '2d2d2d' },
        { token: 'comment', foreground: 'c5c5c5', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'f4d394' },
        { token: 'string', foreground: 'a8d191' },
        { token: 'number', foreground: 'd4a5c7' },
        { token: 'function', foreground: '8ec8d8' },
        { token: 'variable', foreground: 'f2f2f2' },
        { token: 'type', foreground: '8ec8d8' },
        { token: 'class', foreground: 'f4d394' },
      ],
      colors: {
        'editor.background': '#2d2d2d',
        'editor.foreground': '#f2f2f2',
        'editor.lineHighlightBackground': '#3a3a3a',
        'editorLineNumber.foreground': '#c5c5c5',
        'editorLineNumber.activeForeground': '#f2f2f2',
        'editor.selectionBackground': '#404040',
        'editor.inactiveSelectionBackground': '#353535',
        'editorCursor.foreground': '#f4d394',
        'editorWhitespace.foreground': '#404040',
        'editorIndentGuide.background': '#404040',
        'editorIndentGuide.activeBackground': '#505050',
      },
    })
    monaco.editor.setTheme('caffeine-dark')
  }, [monaco])

  // Fetch user's submissions for the left panel
  useEffect(() => {
    const fetchUsersSubmissions = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user?.id) return
        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('problem_id', params.id)
          .order('submitted_at', { ascending: false })
        if (error) throw error
        if (data) setAllOfUsersSubmissions(data)
      } catch (err) {
        console.error('Error fetching user submissions: ', err)
      }
    }
    fetchUsersSubmissions()
  }, [latestUserSubmission, params.id, supabase])

  // Fetch problem
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
        // Starter code for current lang
        if (!usersCode) {
          const starter = data.code_snippets?.find((s: any) => s.langSlug === userLang.value)?.code || ''
          setUsersCode(starter)
        }
      } catch (err) {
        console.error('Error fetching problem:', err)
        setError('Failed to load problem')
      } finally {
        setLoading(false)
      }
    }
    if (params.id) fetchProblem()
  }, [params.id, supabase])

  // Update starter code when language changes
  useEffect(() => {
    if (!problem?.code_snippets) return
    const starter = problem.code_snippets.find(s => s.langSlug === userLang.value)?.code || ''
    setUsersCode(starter)
  }, [userLang.value, problem])

  // Starter code getter (memoized)
  const getStarterCode = useCallback(() => {
    if (problem?.code_snippets) {
      return problem.code_snippets.find(snippet => snippet.langSlug === userLang.value)?.code || ''
    }
    return ''
  }, [problem?.code_snippets, userLang.value])

  // AI message analytics (optional)
  const handleAIChatMessage = (message: string) => {
    console.log('💬 AIChatbot user msg:', message)
  }

  // Receive normalized submission from editor → unlock AIChatbot
  const handleSubmissionComplete = async (submission: Submission) => {
    console.log('✅ handleSubmissionComplete:', {
      lang: submission.language,
      tests: `${submission.testsPassed}/${submission.totalTests}`,
      status: submission.status,
    })
    setAiSubmission(submission)
    // Trigger re-fetch of submissions list (left panel)
    setLatestUserSubmission({ _ts: Date.now() })
  }

  // Loading / Error UI
  if (loading) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-muted-foreground">Loading problem...</p>
        </div>
      </div>
    )
  }

  if (error || !problem) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-xl text-destructive">{error || 'Problem not found'}</p>
          <Button onClick={() => router.push('/problems')}>Back to Problems</Button>
        </div>
      </div>
    )
  }

  // Render
  return (
    <div className="caffeine-theme min-h-screen w-full bg-background p-2 pt-0 overflow-y-auto">
      <style jsx global>{tabScrollStyles}</style>
      <ResizablePanelGroup direction="horizontal" className="min-h-screen">
        {/* LEFT: Problem Description & history */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <ProblemDescriptionPanel
            problem={problem}
            allOfUsersSubmissions={allOfUsersSubmissions}
            onCopyToEditor={setUsersCode}  // Add this line
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* MIDDLE: Editor + Testcases UI (self-managed) */}
        <ResizablePanel defaultSize={65} minSize={30}>
          <CodeEditorPanel
            problem={problem}
            testcases={testcases}
            userLang={userLang}
            setUserLang={setUserLang}
            usersCode={usersCode}
            setUsersCode={setUsersCode}
            getStarterCode={getStarterCode}
            onSubmissionComplete={handleSubmissionComplete}
            // NOTE: Do NOT pass onRun/onSubmit/onAiChat here, so the panel uses its built-in judge flow
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* RIGHT: AI Chatbot – unlocks when onSubmissionComplete is called */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <AIChatbot
            problemId={problem.id}
            problemTitle={problem.title}
            problemDescription={problem.description}
            problemDifficulty={problem.difficulty}
            submission={aiSubmission}
            onMessageSent={handleAIChatMessage}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}