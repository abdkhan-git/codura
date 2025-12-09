'use client'

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RotateCcw, Clipboard, CheckCircle, Play, Loader2, X } from 'lucide-react'
import { LANGUAGES } from '@/utils/languages'
import { ScrollArea } from '@/components/ui/scroll-area'

interface CollaborativeCodeEditorProps {
  onCodeChange?: (code: string, language: string) => void
  onLanguageChange?: (language: string) => void
  sendDataMessage?: (message: any) => void
  initialCode?: string
  initialLanguage?: string
  readOnly?: boolean
  executeEndpoint?: string // Custom endpoint for code execution
}

export interface CollaborativeCodeEditorHandle {
  applyRemoteChange: (code: string, language?: string) => void
  applyRemoteOutput: (output: string) => void
}

export const CollaborativeCodeEditor = forwardRef<CollaborativeCodeEditorHandle, CollaborativeCodeEditorProps>(({
  onCodeChange,
  onLanguageChange,
  sendDataMessage,
  initialCode = '',
  initialLanguage = 'python',
  readOnly = false,
  executeEndpoint = '/api/code/execute',
}, ref) => {
  const monaco = useMonaco()
  const editorRef = useRef<any>(null)
  const [code, setCode] = useState(initialCode)
  const [language, setLanguage] = useState(() => {
    return LANGUAGES.find((lang) => lang.value === initialLanguage) || LANGUAGES[0]
  })
  const [copied, setCopied] = useState(false)
  const isRemoteChangeRef = useRef(false)
  const [output, setOutput] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [showOutput, setShowOutput] = useState(false)
  const executionInProgressRef = useRef(false)

  // Monaco theme setup
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

  // Handle editor mount
  const handleEditorMount = (editor: any) => {
    editorRef.current = editor
  }

  // Handle local code changes
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (isRemoteChangeRef.current) {
      isRemoteChangeRef.current = false
      return
    }

    const newCode = value || ''
    setCode(newCode)
    onCodeChange?.(newCode, language.value)

    // Send code change to remote peer via data channel
    if (sendDataMessage) {
      sendDataMessage({
        type: 'code-change',
        code: newCode,
        language: language.value,
      })
    }
  }, [language.value, onCodeChange, sendDataMessage])

  // Handle language change
  const handleLanguageChange = (value: string) => {
    const selectedLang = LANGUAGES.find((lang) => lang.value === value)
    if (selectedLang) {
      setLanguage(selectedLang)
      onLanguageChange?.(value)

      // Send language change to remote peer
      if (sendDataMessage) {
        sendDataMessage({
          type: 'language-change',
          language: value,
        })
      }
    }
  }

  // Handle reset
  const handleReset = () => {
    const starterCode = getStarterCode()
    setCode(starterCode)
    onCodeChange?.(starterCode, language.value)

    // Send reset to remote peer
    if (sendDataMessage) {
      sendDataMessage({
        type: 'code-change',
        code: starterCode,
        language: language.value,
      })
    }
  }

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  // Handle code execution
  const handleRunCode = async () => {
    // Prevent double execution
    if (executionInProgressRef.current) {
      console.log('[Code Execution] Already running, ignoring duplicate call')
      return
    }

    executionInProgressRef.current = true
    setIsRunning(true)
    setShowOutput(true)
    setOutput('Running code...')

    console.log('[Code Execution] Starting execution for language:', language.value)

    try {
      const response = await fetch(executeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language: language.value,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setOutput(`Error: ${data.error || 'Failed to execute code'}`)
      } else {
        const outputText = data.output || '(no output)'
        const errorText = data.error ? `\nError:\n${data.error}` : ''
        const finalOutput = outputText + errorText
        setOutput(finalOutput)

        console.log('[Code Execution] Execution complete, sending output to remote peer')

        // Send output to remote peer via data channel
        if (sendDataMessage) {
          sendDataMessage({
            type: 'code-output',
            output: finalOutput,
          })
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setOutput(`Error: ${errorMessage}`)
    } finally {
      setIsRunning(false)
      executionInProgressRef.current = false
      console.log('[Code Execution] Execution finished')
    }
  }

  // Get starter code for current language
  const getStarterCode = () => {
    const starters: Record<string, string> = {
      python: '# Write your code here\ndef solution():\n    pass\n',
      javascript: '// Write your code here\nfunction solution() {\n    \n}\n',
      typescript: '// Write your code here\nfunction solution(): void {\n    \n}\n',
      java: 'class Solution {\n    public void solution() {\n        // Write your code here\n    }\n}\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}\n',
      c: '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}\n',
      go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your code here\n}\n',
      rust: 'fn main() {\n    // Write your code here\n}\n',
    }
    return starters[language.value] || '// Write your code here\n'
  }

  // Public method to receive remote code changes
  const applyRemoteChange = useCallback((remoteCode: string, remoteLang?: string) => {
    isRemoteChangeRef.current = true
    setCode(remoteCode)

    if (remoteLang) {
      const lang = LANGUAGES.find((l) => l.value === remoteLang)
      if (lang) {
        setLanguage(lang)
      }
    }
  }, [])

  // Public method to receive remote output
  const applyRemoteOutput = useCallback((remoteOutput: string) => {
    console.log('[Code Execution] Received remote output from peer')
    setOutput(remoteOutput)
    setShowOutput(true)
  }, [])

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    applyRemoteChange,
    applyRemoteOutput,
  }), [applyRemoteChange, applyRemoteOutput])

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="border-b p-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={language.value} onValueChange={handleLanguageChange} disabled={readOnly}>
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
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={readOnly}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleRunCode}
            disabled={isRunning || readOnly}
            className="bg-green-600 hover:bg-green-700"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run
              </>
            )}
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Clipboard className="w-4 h-4 mr-2" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Editor and Output */}
      <div className="flex-1 bg-muted/30 p-4 flex flex-col gap-4">
        {/* Editor */}
        <div className={`${showOutput ? 'h-[60%]' : 'h-full'} border rounded-lg bg-background/50 overflow-hidden transition-all`}>
          <Editor
            height="100%"
            language={language.value}
            value={code}
            theme="caffeine-dark"
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
              readOnly: readOnly,
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                useShadows: false,
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
              suggest: { showKeywords: true, showSnippets: true },
              quickSuggestions: readOnly ? false : { other: true, comments: false, strings: false },
              tabSize: 4,
              insertSpaces: true,
              detectIndentation: false,
              bracketPairColorization: { enabled: true },
            }}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
          />
        </div>

        {/* Output Panel */}
        {showOutput && (
          <div className="h-[40%] border rounded-lg bg-background/50 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b p-2 bg-muted/50">
              <span className="text-sm font-medium">Output</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOutput(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <pre className="text-sm font-mono whitespace-pre-wrap break-words">{output}</pre>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  )
})

CollaborativeCodeEditor.displayName = 'CollaborativeCodeEditor'

export default CollaborativeCodeEditor
