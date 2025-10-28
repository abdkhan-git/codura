'use client'

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RotateCcw, Clipboard, CheckCircle } from 'lucide-react'
import { LANGUAGES } from '@/utils/languages'

interface CollaborativeCodeEditorProps {
  onCodeChange?: (code: string, language: string) => void
  onLanguageChange?: (language: string) => void
  sendDataMessage?: (message: any) => void
  initialCode?: string
  initialLanguage?: string
  readOnly?: boolean
}

export interface CollaborativeCodeEditorHandle {
  applyRemoteChange: (code: string, language?: string) => void
}

export const CollaborativeCodeEditor = forwardRef<CollaborativeCodeEditorHandle, CollaborativeCodeEditorProps>(({
  onCodeChange,
  onLanguageChange,
  sendDataMessage,
  initialCode = '',
  initialLanguage = 'python',
  readOnly = false,
}, ref) => {
  const monaco = useMonaco()
  const editorRef = useRef<any>(null)
  const [code, setCode] = useState(initialCode)
  const [language, setLanguage] = useState(() => {
    return LANGUAGES.find((lang) => lang.value === initialLanguage) || LANGUAGES[0]
  })
  const [copied, setCopied] = useState(false)
  const isRemoteChangeRef = useRef(false)

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

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    applyRemoteChange,
  }), [applyRemoteChange])

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

      {/* Editor */}
      <div className="flex-1 bg-muted/30 p-4">
        <div className="h-full border rounded-lg bg-background/50 overflow-hidden">
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
      </div>
    </div>
  )
})

CollaborativeCodeEditor.displayName = 'CollaborativeCodeEditor'

export default CollaborativeCodeEditor
