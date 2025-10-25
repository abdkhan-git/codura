// components/problem/CodeEditorPanel.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Play, RotateCcw, Loader2, CloudUploadIcon } from 'lucide-react'
import Editor, { useMonaco } from '@monaco-editor/react'
import { LANGUAGES } from '@/utils/languages'
import TestCasesSection from './TestCasesSection'
import { createClient } from '@/utils/supabase/client'

// ============================================
// INTERFACES
// ============================================

export interface Submission {
  code: string
  language: string
  timestamp: Date
  testsPassed: number
  totalTests: number
  status?: string
  runtime?: string
  memory?: string
}

interface SubmissionResult {
  status: string
  description: string
  testResults?: any[]
  totalTests?: number
  passedTests?: number
  memory?: string
  runtime?: string
}

interface CodeEditorPanelProps {
  problem: any
  testcases: any[] | undefined
  userLang: any
  setUserLang: (lang: any) => void
  usersCode: string | undefined
  setUsersCode: (code: string | undefined) => void
  getStarterCode: () => string

  // required to unlock the AIChatbot in the parent
  onSubmissionComplete: (submission: Submission) => void

  // optional hooks (parent-owned panel state, savedSubmission, etc.)
  onSetActiveLeftPanelTab?: (tab: string) => void
  onSavedSubmission?: (saved: any) => void

  // optional legacy callbacks
  onSubmit?: (code: string, languageId: number) => Promise<void>
  onRun?: (code: string, languageId: number) => Promise<void>
  onAiChat?: (code: string, languageId: number) => Promise<void>
}

export default function CodeEditorPanel({
  problem,
  testcases,
  userLang,
  setUserLang,
  usersCode,
  setUsersCode,
  getStarterCode,
  onSubmissionComplete,
  onSetActiveLeftPanelTab,
  onSavedSubmission,
  onSubmit,
  onRun,
  onAiChat,
}: CodeEditorPanelProps) {
  const monaco = useMonaco()
  const supabase = createClient()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [submissionResultLabel, setSubmissionResultLabel] = useState('')
  const [testcaseResults, setTestcaseResults] = useState<any[] | undefined>(undefined)
  const [activeBottomTab, setActiveBottomTab] = useState<'testcases' | 'result'>('testcases')
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | undefined>()
  const [resultsVersion, setResultsVersion] = useState(0)

  useEffect(() => {
    if (testcaseResults?.length || submissionResult) {
      setActiveBottomTab('result');
    }
  }, [testcaseResults, submissionResult]);
  
  const JUDGE_URL = process.env.NEXT_PUBLIC_JUDGE_URL ?? '';
  const judgeDisabled = () => !JUDGE_URL.trim();

  // Monaco theme (Caffeine)
  useEffect(() => {
    if (monaco) {
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
    }
  }, [monaco])

  // Editor change
  const handleEditorChange = (value: string | undefined) => {
    setUsersCode(value)
  }

// Run (quick execute against first testcase)
const handleCodeRunning = async () => {
  if (!usersCode?.trim()) return

  setIsRunning(true)
  setActiveBottomTab('result')

  try {
    if (onRun) {
      await onRun(usersCode, userLang.id)
      return
    }

    // ---------- DEV path: if judge is disabled, don't call /run ----------
    if (judgeDisabled()) {
      console.warn('[DEV] Judge disabled — skipping /run')
      const label = 'Judge offline in dev'
      const results = (testcases || []).map((_, i) => ({
        status: 'error',
        message: 'Judge unavailable',
        testNumber: i + 1,
      }))
      setSubmissionResultLabel(label)
      setTestcaseResults(results)
      setResultsVersion(v => v + 1); setActiveBottomTab('result');
      setIsRunning(false)
      return
    }

    const body = {
      problem_title_slug: problem?.title_slug,
      language_id: userLang.id,
      source_code: usersCode,
      stdin: 'test',
    }

    // ✅ use the env-configured judge base URL
    const response = await fetch(`http://localhost:8080/api/problems/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    let results: any[] = []
    let label = ''

    if (data?.testcaseResults) {
      results = data.testcaseResults.results || []
      label = data.testcaseResults.label || ''
    } else if (data?.results) {
      results = data.results
      label = data.label || ''
    }

    setSubmissionResultLabel(label)
    setTestcaseResults(results)
    setResultsVersion(v => v + 1); setActiveBottomTab('result');
  } catch (e) {
    console.error('Run error:', e)
  } finally {
    setIsRunning(false)
  }
}

  // Submit (full judge) + unlock AI + optional raw POST to AI
  
const handleCodeSubmission = async () => {
  if (!usersCode?.trim()) return;

  setIsSubmitting(true);
  setActiveBottomTab('result');
  onSetActiveLeftPanelTab?.('submissions');

  try {
    const { data: { session } } = await supabase.auth.getSession();

    // ---------- 1) If judge is disabled, fabricate a minimal result and unlock AI ----------
    if (judgeDisabled()) {
      console.warn('[DEV] Judge disabled — skipping /submit');

      const testsPassed = 0;
      const totalTests = testcases?.length || 0;
      const status = 'Judge Offline';

      // bottom panel
      setSubmissionResultLabel('Judge offline in dev');
      setTestcaseResults((testcases || []).map((_, i) => ({
        status: 'error',
        message: 'Judge unavailable',
        testNumber: i + 1,
      })));
      setResultsVersion(v => v + 1); setActiveBottomTab('result');

      // unlock AI
      const submissionForAI: Submission = {
        code: usersCode || '',
        language: userLang.value,
        timestamp: new Date(),
        testsPassed,
        totalTests,
        status,
        runtime: undefined,
        memory: undefined,
      };
      onSubmissionComplete(submissionForAI);

      // don’t call /api/ai/initial-analysis here because your route verifies a real submission row
      // (it would 403 when judge is offline). You can enable a bypass flag on the route if you want.

      // call legacy hooks (optional) AFTER unlock so UI stays consistent
      if (onAiChat) await onAiChat(usersCode, userLang.id);
      if (onSubmit) await onSubmit(usersCode, userLang.id);
      return;
    }

    // ---------- 2) Normal path: call your judge service ----------
    const body = {
      problem_title: problem?.title,
      problem_title_slug: problem?.title_slug,
      problem_id: problem?.id,
      problem_difficulty: problem?.difficulty,
      language: userLang.value,
      language_id: userLang.id,
      source_code: usersCode,
      stdin: 'test',
      user_id: session?.user.id,
      submitted_at: new Date().toISOString(),
    };

   const resp = await fetch(`http://localhost:8080/api/problems/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`Submit failed: ${resp.status} ${t}`);
  }

  // Safely parse
  let responseData: any = null;
  try { 
    responseData = await resp.json(); 
  } catch { 
    throw new Error('Invalid JSON from judge /submit'); 
  }

  const { judge0Result, savedSubmission, testcaseResults } = responseData;

  // testcaseResults now has this structure:
// {
//   label: 'Accepted' | 'Wrong Answer' | 'Runtime Error' | etc.,
//   passed: 2,
//   failed: 1,
//   errors: 0,
//   total: 3,
//   results: [
//     {
//       testcase_number: 1,
//       input: { nums: [2,7,11,15], target: 9 },
//       expected: [0, 1],
//       actual: [0, 1],
//       status: 'passed',
//       error: null,
//       passed: true
//     },
//     // ... more results
//   ],
//   stdout: '...',
//   stderr: '...',
//   runtime: '0.023',
//   memory: 9216
// }

    console.log('Label:', testcaseResults.label);
    console.log('Results:', testcaseResults);
    console.log('Stats:', `${testcaseResults.passed}/${testcaseResults.total} passed`);

    // bottom panel
    setSubmissionResultLabel(testcaseResults.label);
    setTestcaseResults(testcaseResults.results);
    setResultsVersion(v => v + 1); setActiveBottomTab('result');
    onSavedSubmission?.(savedSubmission);

    // ---------- 3) Normalize for AI ----------
    const testsPassed = testcaseResults.results.filter((r: any) => r.status === 'pass').length;
    const totalTests = testcaseResults.results.length;
    const status =
      savedSubmission?.status ||
      (totalTests > 0 && testsPassed === totalTests ? 'Accepted' : 'Wrong Answer');

    const runtime = savedSubmission?.runtime ?? judge0Result?.time ?? undefined;
    const memory  = savedSubmission?.memory  ?? judge0Result?.memory ?? undefined;

    const submissionForAI: Submission = {
      code: usersCode || '',
      language: userLang.value,
      timestamp: new Date(),
      testsPassed,
      totalTests,
      status,
      runtime,
      memory,
    };

    // ---------- 4) Unlock chatbot FIRST (don’t early return before this) ----------
    onSubmissionComplete(submissionForAI);

    // ---------- 5) Optionally ping initial-analysis (now safe, DB has a submission row) ----------
    try {
      const aiInitRes = await fetch('/api/ai/initial-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem?.id,
          problemTitle: problem?.title,
          problemDifficulty: problem?.difficulty,
          problemDescription: (problem?.description || '').slice(0, 5000),

          // these are the flattened fields your route expects
          submissionCode: usersCode || '',
          language: userLang.value,
          testsPassed,
          totalTests,
          status,
          runtime,
          memory,

          // raw judge payload (optional, helpful context)
          raw: {
            judge0Result,
            testcaseResults: { results: testcaseResults.results, label: testcaseResults.label },
            savedSubmission,
            request: {
              language_id: userLang.id,
              language: userLang.value,
              stdin: 'test',
            },
          },
        }),
      });
      if (!aiInitRes.ok) {
        const t = await aiInitRes.text().catch(() => '');
        console.warn('AI initial-analysis non-OK:', aiInitRes.status, t);
      }
    } catch (e) {
      console.warn('AI initial-analysis POST failed (non-fatal):', e);
    }

    // compact display object
    setSubmissionResult({
      status,
      description: testcaseResults.label || '',
      testResults: testcaseResults.results,
      totalTests,
      passedTests: testsPassed,
      runtime,
      memory,
    });

    // ---------- 6) Call legacy hooks LAST (optional) ----------
    if (onAiChat) await onAiChat(usersCode, userLang.id);
    if (onSubmit) await onSubmit(usersCode, userLang.id);

  } catch (error) {
    console.error('Submit error:', error);

    // Always unlock bot so it can help recover
    onSubmissionComplete({
      code: usersCode || '',
      language: userLang.value,
      timestamp: new Date(),
      testsPassed: 0,
      totalTests: testcases?.length || 0,
      status: 'Error',
    });

    setSubmissionResultLabel('Submit failed');
    setTestcaseResults([{
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      testNumber: 1,
    }]);
    setResultsVersion(v => v + 1); setActiveBottomTab('result');
  } finally {
    setIsSubmitting(false);
  }
};

  const handleReset = () => {
    const starterCode = getStarterCode()
    setUsersCode(starterCode)
  }

  const handleLanguageChange = (value: string) => {
    const selectedLang = LANGUAGES.find((lang) => lang.value === value)
    if (selectedLang) setUserLang(selectedLang)
  }

  return (
    <ResizablePanelGroup direction="vertical">
      {/* Code Editor */}
      <ResizablePanel defaultSize={60} minSize={30}>
        <div className="h-full flex flex-col">
          <div className="flex justify-between">
            {/* Left: language + actions */}
            <div className="border-b p-2 flex items-center gap-3">
              <Select value={userLang.value} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.id} value={lang.value}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                className="cursor-pointer font-weight-300 text-sm text-zinc-300 bg-zinc-700 hover:bg-zinc-600"
                onClick={handleCodeRunning}
                disabled={isRunning || isSubmitting}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Run
                  </>
                )}
              </Button>

              <Button
                size="sm"
                className="cursor-pointer font-weight-300 text-sm bg-green-500 hover:bg-green-400"
                onClick={handleCodeSubmission}
                disabled={isSubmitting || isRunning}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CloudUploadIcon className="w-5 h-5" />
                    Submit
                  </>
                )}
              </Button>
            </div>

            {/* Right: reset */}
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer h-[70%]"
                onClick={handleReset}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 bg-muted/30 p-4">
            <div className="h-full border rounded-lg bg-background/50 overflow-hidden">
              <Editor
                height="100%"
                language={userLang.value}
                value={usersCode || getStarterCode()}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  renderLineHighlight: 'line',
                  cursorBlinking: 'blink',
                  cursorStyle: 'line',
                  smoothScrolling: true,
                  padding: { top: 12, bottom: 12 },
                  automaticLayout: true,
                  wordWrap: 'off',
                  lineDecorationsWidth: 8,
                  lineNumbersMinChars: 3,
                  glyphMargin: false,
                  folding: true,
                  renderWhitespace: 'none',
                  scrollbar: {
                    vertical: 'visible',
                    horizontal: 'visible',
                    useShadows: false,
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10,
                  },
                  suggest: { showKeywords: true, showSnippets: true },
                  quickSuggestions: { other: true, comments: false, strings: false },
                  tabSize: 4,
                  insertSpaces: true,
                  detectIndentation: false,
                  bracketPairColorization: { enabled: true },
                }}
                onChange={handleEditorChange}
              />
            </div>
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Bottom: Test Cases & Results */}
      <ResizablePanel defaultSize={40} minSize={20}>
        <TestCasesSection
          key={resultsVersion}
          testcases={testcases}
          testcaseResults={testcaseResults}
          activeBottomTab={activeBottomTab}
          setActiveBottomTab={setActiveBottomTab}
          submissionResult={submissionResult}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}