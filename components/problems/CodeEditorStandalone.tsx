'use client'

/**
 * Standalone CodeEditor Component
 *
 * This component can work in two modes:
 * 1. Controlled: Pass code, language, and onChange handlers
 * 2. Uncontrolled: Component manages its own state
 *
 * Usage examples:
 *
 * // Standalone (manages its own state)
 * <CodeEditorStandalone
 *   onRun={(code, langId) => console.log(code)}
 *   onSubmit={(code, langId) => console.log(code)}
 * />
 *
 * // Controlled (you manage the state)
 * <CodeEditorStandalone
 *   code={myCode}
 *   language={myLanguage}
 *   onCodeChange={setMyCode}
 *   onLanguageChange={setMyLanguage}
 *   onRun={handleRun}
 * />
 *
 * // With problem starter code
 * <CodeEditorStandalone
 *   problem={problemData}
 *   onSubmit={handleSubmit}
 * />
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Play, CloudUploadIcon, RotateCcw, Loader2 } from 'lucide-react'
import Editor, { useMonaco } from '@monaco-editor/react'
import { LANGUAGES } from '@/utils/languages'

interface Language {
  id: number
  name: string
  value: string
}

interface CodeSnippet {
  code: string
  lang: string
  langSlug: string
}

interface ProblemData {
  id: number
  code_snippets?: CodeSnippet[]
}

export interface CodeEditorStandaloneProps {
  // Optional: Problem data for starter code
  problem?: ProblemData | null

  // Controlled mode: external state
  code?: string
  language?: Language

  // Callbacks for controlled mode
  onCodeChange?: (code: string) => void
  onLanguageChange?: (language: Language) => void

  // Execution handlers (optional)
  onRun?: (code: string, languageId: number) => Promise<void> | void
  onSubmit?: (code: string, languageId: number) => Promise<void> | void
  onAiChat?: (code: string, languageId: number) => Promise<void> | void

  // UI customization
  defaultLanguage?: Language
  defaultCode?: string
  hideRunButton?: boolean
  hideSubmitButton?: boolean
  hideLanguageSelector?: boolean
  height?: string
  className?: string
}

const DEFAULT_LANGUAGE: Language = {
  id: 92,
  name: "Python (3.11.2)",
  value: "python"
}

export function CodeEditorStandalone({
  problem,
  code: externalCode,
  language: externalLanguage,
  onCodeChange,
  onLanguageChange,
  onRun,
  onSubmit,
  onAiChat,
  defaultLanguage = DEFAULT_LANGUAGE,
  defaultCode = '# Write your code here',
  hideRunButton = false,
  hideSubmitButton = false,
  hideLanguageSelector = false,
  height = '100%',
  className = '',
}: CodeEditorStandaloneProps) {
  const monaco = useMonaco()

  // Internal state (used when not controlled)
  const [internalLanguage, setInternalLanguage] = useState<Language>(defaultLanguage)
  const [internalCode, setInternalCode] = useState<string>(defaultCode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  // Determine if component is controlled
  const isControlled = externalCode !== undefined
  const currentCode = isControlled ? externalCode : internalCode
  const currentLanguage = externalLanguage || internalLanguage

  // Define Monaco theme
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
        snippet.langSlug === currentLanguage.value
      )
      return snippet?.code || defaultCode
    }
    return defaultCode
  }

  // Update code when language changes (only if using problem starter code)
  useEffect(() => {
    if (problem && !isControlled) {
      setInternalCode(getStarterCode())
    }
  }, [currentLanguage, problem])

  // Handle code change
  const handleCodeChangeInternal = (value: string | undefined) => {
    const newCode = value || ''
    if (isControlled) {
      onCodeChange?.(newCode)
    } else {
      setInternalCode(newCode)
    }
  }

  // Handle language change
  const handleLanguageChangeInternal = (value: string) => {
    const selectedLang = LANGUAGES.find(lang => lang.value === value)
    if (selectedLang) {
      if (externalLanguage) {
        onLanguageChange?.(selectedLang)
      } else {
        setInternalLanguage(selectedLang)
      }
    }
  }

  // Handle Submit
  const handleSubmit = async () => {
    if (!currentCode.trim()) return

    setIsSubmitting(true)
    try {
      // Call onSubmit first to generate actual submission results
      if (onSubmit) {
        await onSubmit(currentCode, currentLanguage.id)
      }
      // Then call onAiChat to unlock the AI panel
      if (onAiChat) {
        await onAiChat(currentCode, currentLanguage.id)
      }
      if (!onSubmit && !onAiChat) {
        console.warn('No submit handlers provided')
      }
    } catch (error) {
      console.error('Submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Run
  const handleRun = async () => {
    if (!currentCode.trim()) return

    setIsRunning(true)
    try {
      if (onRun) {
        await onRun(currentCode, currentLanguage.id)
      } else {
        console.warn('No run handler provided')
      }
    } catch (error) {
      console.error('Run error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  // Handle Reset
  const handleReset = () => {
    const resetCode = getStarterCode()
    if (isControlled) {
      onCodeChange?.(resetCode)
    } else {
      setInternalCode(resetCode)
    }
  }

  return (
    <div className={`h-full flex flex-col ${className}`} style={{ height }}>
      {/* Toolbar */}
      <div className="flex justify-between border-b">
        <div className="p-2 flex items-center gap-3">
          {/* Language Selector */}
          {!hideLanguageSelector && (
            <Select
              value={currentLanguage.value}
              onValueChange={handleLanguageChangeInternal}
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
          )}

          {/* Run Button */}
          {!hideRunButton && onRun && (
            <Button
              size="sm"
              onClick={handleRun}
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
          )}

          {/* Submit Button */}
          {!hideSubmitButton && (onSubmit || onAiChat) && (
            <Button
              size="sm"
              onClick={handleSubmit}
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
          )}
        </div>

        {/* Reset Button */}
        <div className="flex items-center p-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className='cursor-pointer'
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
            language={currentLanguage.value}
            value={currentCode}
            theme="caffeine-dark"
            onChange={handleCodeChangeInternal}
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
