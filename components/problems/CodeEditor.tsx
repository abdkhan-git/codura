'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Play, CloudUploadIcon, RotateCcw, Loader2 } from 'lucide-react'
import Editor, { useMonaco } from '@monaco-editor/react'
import { LANGUAGES } from '@/utils/languages'

const JUDGE_URL = (process.env.NEXT_PUBLIC_JUDGE_URL ?? 'http://localhost:8080').trim();
const JUDGE_RUN_PATH = (process.env.NEXT_PUBLIC_JUDGE_RUN_PATH ?? '').trim();
const JUDGE_SUBMIT_PATH = (process.env.NEXT_PUBLIC_JUDGE_SUBMIT_PATH ?? '').trim();
const joinUrl = (base, path) => {
  const b = (base || '').replace(/\/+$/, '');
  const p = (path || '').replace(/^\/+/, '');
  return `${b}/${p}`;
};

interface CodeSnippet {
  code: string
  lang: string 
  langSlug: string
}

interface ProblemData {
  id: number
  code_snippets?: CodeSnippet[]
}

interface CodeEditorProps {
  problem: ProblemData | null
  onSubmit?: (code: string, languageId: number) => Promise<void>
  onRun?: (code: string, languageId: number) => Promise<void>
  onAiChat?: (code: string, languageId: number) => Promise<void> // ← add this
}

export function CodeEditor({ problem, onSubmit, onRun, onAiChat }: CodeEditorProps) {
    const monaco = useMonaco()
  
  const [userLang, setUserLang] = useState({
    id: 92,
    name: "Python (3.11.2)",
    value: "python"
  })
  const [usersCode, setUsersCode] = useState<string>('# Write your code below')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  // Define custom Monaco theme matching Caffeine theme
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
        }
      })
      monaco.editor.setTheme('caffeine-dark')
    }
  }, [monaco])

  // Get starter code for selected language
  const getStarterCode = () => {
    if (problem?.code_snippets) {
      const snippet = problem.code_snippets.find(snippet => 
        snippet.langSlug === userLang.value
      )
      return snippet?.code || '// Write your code here'
    }
    return '// Write your code here'
  }

  // Update code when language changes
  useEffect(() => {
    if (problem) {
      setUsersCode(getStarterCode())
    }
  }, [userLang, problem])

  const handleSubmit = async () => {
    if (!usersCode.trim()) return

    setIsSubmitting(true)
    try {
      console.debug('[judge] base:', JUDGE_URL, 'submit:', joinUrl(JUDGE_URL, JUDGE_SUBMIT_PATH || '/submit'));
      // Call onSubmit first to generate actual submission results
      if (onSubmit) {
        await onSubmit(usersCode, userLang.id)
      }
      // Then call onAiChat to unlock the AI panel
      if (onAiChat) {
        await onAiChat(usersCode, userLang.id)
      }
      if (!onSubmit && !onAiChat) {
        alert('No submit handlers provided. Wire up onAiChat or onSubmit.')
      }
    } catch (error) {
      console.error('Submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRun = async () => {
    if (!usersCode.trim()) return
    
    setIsRunning(true)
    try {
      console.debug('[judge] base:', JUDGE_URL, 'run:', joinUrl(JUDGE_URL, JUDGE_RUN_PATH || '/run'));
      if (onRun) {
        await onRun(usersCode, userLang.id)
      }
    } catch (error) {
      console.error('Run error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const handleReset = () => {
    setUsersCode(getStarterCode())
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar - Language Selector and Action Buttons */}
      <EditorToolbar
        userLang={userLang}
        setUserLang={setUserLang}
        isRunning={isRunning}
        isSubmitting={isSubmitting}
        onRun={handleRun}
        onSubmit={handleSubmit}
        onReset={handleReset}
      />

      {/* Code Editor Area */}
      <div className="flex-1 bg-muted/30 p-4">
        <div className="h-full border rounded-lg bg-background/50 overflow-hidden">
          <Editor
            height="100%"
            language={userLang.value}
            value={usersCode}
            theme="caffeine-dark"
            onChange={(value) => setUsersCode(value || '')}
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
              suggest: {
                showKeywords: true,
                showSnippets: true,
              },
              quickSuggestions: {
                other: true,
                comments: false,
                strings: false,
              },
              tabSize: 4,
              insertSpaces: true,
              detectIndentation: false,
              bracketPairColorization: {
                enabled: true,
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface Language {
  id: number
  name: string
  value: string
}

interface EditorToolbarProps {
  userLang: Language
  setUserLang: (lang: Language) => void
  isRunning: boolean
  isSubmitting: boolean
  onRun: () => void
  onSubmit: () => void
  onReset: () => void
}

function EditorToolbar({
  userLang,
  setUserLang,
  isRunning,
  isSubmitting,
  onRun,
  onSubmit,
  onReset,
}: EditorToolbarProps) {
  return (
    <div className="flex justify-between border-b">
      <div className="p-2 flex items-center gap-3">
        {/* Language Selector */}
        <Select 
          value={userLang.value} 
          onValueChange={(value) => {
            const selectedLang = LANGUAGES.find(lang => lang.value === value)
            if (selectedLang) {
              setUserLang(selectedLang)
            }
          }}
        >
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

        {/* Run Button */}
        <Button 
          size="sm" 
          onClick={onRun}
          disabled={isRunning || isSubmitting}
          className="cursor-pointer font-weight-300 text-sm text-zinc-300 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run
            </>
          )}
        </Button>

        {/* Submit Button */}
        <Button 
          size="sm" 
          onClick={onSubmit}
          disabled={isSubmitting || isRunning}
          className="cursor-pointer font-weight-300 text-sm bg-green-500 hover:bg-green-400 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            <>
              <CloudUploadIcon className="w-5 h-5 mr-2" />
              Submit
            </>
          )}
        </Button>
      </div>

      {/* Reset Button */}
      <div className="flex items-center p-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onReset}
          className='cursor-pointer'
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  )
}