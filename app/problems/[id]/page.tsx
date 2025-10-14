'use client'
/**
 * This is the main problem page component that displays the problem description,
 * code editor, test cases, and an AI chatbot for assistance.
 * It uses a three-panel layout with resizable panels.
 * 
 * The left panel contains tabs for problem description, solution, discussion, community solutions, and submissions.
 * The middle panel contains a code editor with language selection and test case management.
 * The right panel contains an AI chatbot that can assist with problem understanding and coding help.
 * 
 * The component fetches problem data from Supabase based on the problem ID from the URL parameters.
 * It also defines a custom Monaco theme to match the Caffeine theme used in the app.
 */
import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Play, Send, RotateCcw, Loader2 } from 'lucide-react'
import Editor, { useMonaco } from '@monaco-editor/react'
import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'

// Add custom styles for tab scrolling
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

/**
 * ProblemData interface defines the structure of the problem data fetched from Supabase.
 * In other words, it's an object that contains all the relevant information about a coding problem,
 * including its ID, title, difficulty, description, examples, constraints, topic tags, acceptance rate,
 * and optional starter code in various programming languages.
 */
interface ProblemData {
    id: number
    leetcode_id: number
    title: string
    title_slug: string
    difficulty: 'Easy' | 'Medium' | 'Hard'
    description: string
    examples: Array<{
        input: string
        output: string
        explanation?: string
    }>
    constraints: string[]
    topic_tags: Array<{ name: string; slug: string }>
    acceptance_rate: number
    starter_code?: {
        [language: string]: string
    }
}

export default function ProblemPage() {
    const params = useParams()
    const router = useRouter()
    const monaco = useMonaco()
    const supabase = createClient()

    // problem state will be used to store the fetched problem data from Supabase
    const [problem, setProblem] = useState<ProblemData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)



    // State for AI Chatbot that maintains chat messages and input
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'ai', content: string }>>([])
    const [chatInput, setChatInput] = useState('')
    const [selectedLanguage, setSelectedLanguage] = useState('python')



    // Fetch problem data from Supabase
    useEffect(() => {
        const fetchProblem = async () => {
            try {
                setLoading(true)

                // fetch problem data from Supabase using the problem ID from URL params
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

                // After fetching the problem data, this line sets the problem state
                setProblem(data as ProblemData)
            } catch (err) {
                console.error('Error fetching problem:', err)
                setError('Failed to load problem')
            } finally {
                setLoading(false)
            }
        }

        // Only fetch if params.id is available
        if (params.id) {
            fetchProblem()
        }
    }, [params.id])

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

    // Temporary function to simulate AI response
    const handleSendMessage = () => {
        if (chatInput.trim()) {
            // Add user message to setChatMessages array
            setChatMessages([...chatMessages, { role: 'user', content: chatInput }])
            setChatInput('')

            // Simulate AI response
            setTimeout(() => {
                setChatMessages(prev => [...prev, { role: 'ai', content: 'I can help you solve this problem. What would you like to know?' }])
            }, 1000)
        }
    }

    /**
     * Get the background color for the problem difficulty level.
     * @param difficulty - The difficulty level of the problem (Easy, Medium, Hard)
     * @returns 
     */
    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Easy':
                return 'bg-green-500'
            case 'Medium':
                return 'bg-yellow-500'
            case 'Hard':
                return 'bg-red-500'
            default:
                return 'bg-gray-500'
        }
    }


    /**
     * Get the starter code for the selected programming language.
     * @returns The getStarterCode function returns the starter code for the selected programming language.
     * If no starter code is available for the selected language, it returns a default comment.
     */
    const getStarterCode = () => {
        if (problem?.starter_code && problem.starter_code[selectedLanguage]) {
            return problem.starter_code[selectedLanguage]
        }
        return '# Write your code here'
    }


    // Render loading, error, or main content based on state
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

    // Render error message if there's an error or problem not found
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

    return (
        <div className="caffeine-theme h-screen w-full bg-background">
            <style jsx global>{tabScrollStyles}</style>
            <ResizablePanelGroup direction="horizontal" className="h-full">
                
                {/* Left Panel - Problem Description with Tabs */}
                <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
                    <div className="h-full flex flex-col">
                        <Tabs defaultValue="description" className="flex-1 flex flex-col">
                            <div className="border-b overflow-x-auto tab-scroll-container">
                                {/* Tab Lists */}
                                <TabsList className="inline-flex w-auto min-w-full justify-start h-12 px-2 bg-transparent">
                                    <TabsTrigger value="description" className="flex-shrink-0">Description</TabsTrigger>
                                    <TabsTrigger value="solution" className="flex-shrink-0">Solution</TabsTrigger>
                                    <TabsTrigger value="discussion" className="flex-shrink-0">Discussion</TabsTrigger>
                                    <TabsTrigger value="community" className="flex-shrink-0">Community</TabsTrigger>
                                    <TabsTrigger value="submissions" className="flex-shrink-0">Submissions</TabsTrigger>
                                </TabsList>
                            </div>

                            <ScrollArea className="flex-1">
                                {/* Description Tab */}
                                <TabsContent value="description" className="p-4 mt-0">
                                    <div className="space-y-4">
                                        <div>
                                            <h1 className="text-2xl font-bold mb-2">
                                                {problem.leetcode_id}. {problem.title}
                                            </h1>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="default" className={getDifficultyColor(problem.difficulty)}>
                                                    {problem.difficulty}
                                                </Badge>
                                                <span className="text-sm text-muted-foreground">
                                                    Acceptance: {problem.acceptance_rate.toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* Topics */}
                                        {problem.topic_tags && problem.topic_tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {problem.topic_tags.map((tag) => (
                                                    <Badge key={tag.slug} variant="secondary" className="text-xs">
                                                        {tag.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        {/* Description */}
                                        <div className="space-y-2">
                                            <div
                                                className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none"
                                                dangerouslySetInnerHTML={{ __html: problem.description }}
                                            />
                                        </div>

                                        {/* Examples */}
                                        {problem.examples && problem.examples.length > 0 && (
                                            <div className="space-y-4">
                                                {problem.examples.map((example, index) => (
                                                    <div key={index} className="space-y-2">
                                                        <h3 className="font-semibold">Example {index + 1}:</h3>
                                                        <div className="bg-muted p-3 rounded text-sm font-mono space-y-1">
                                                            <p><strong>Input:</strong> {example.input}</p>
                                                            <p><strong>Output:</strong> {example.output}</p>
                                                            {example.explanation && (
                                                                <p><strong>Explanation:</strong> {example.explanation}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Constraints */}
                                        {problem.constraints && problem.constraints.length > 0 && (
                                            <div className="space-y-2">
                                                <h3 className="font-semibold">Constraints:</h3>
                                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                                    {problem.constraints.map((constraint, index) => (
                                                        <li key={index}>{constraint}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                {/* Solution Tab */}
                                <TabsContent value="solution" className="p-4 mt-0">
                                    <div className="space-y-4">
                                        <h2 className="text-xl font-bold">Solution Approach</h2>
                                        <p className="text-sm text-muted-foreground">
                                            The solution content will go here. This could include optimal approaches, time complexity analysis, and step-by-step explanations.
                                        </p>
                                    </div>
                                </TabsContent>

                                {/* Community Discussions Tab */}
                                <TabsContent value="discussion" className="p-4 mt-0">
                                    <div className="space-y-4">
                                        <h2 className="text-xl font-bold">Discussion</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Community discussions will appear here.
                                        </p>
                                    </div>
                                </TabsContent>

                                {/* Community Solutions Tab */}
                                <TabsContent value="community" className="p-4 mt-0">
                                    <div className="space-y-4">
                                        <h2 className="text-xl font-bold">Community Solutions</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Top community solutions will be displayed here.
                                        </p>
                                    </div>
                                </TabsContent>

                                {/* User's Submissions Tab*/}
                                <TabsContent value="submissions" className="p-4 mt-0">
                                    <div className="space-y-4">
                                        <h2 className="text-xl font-bold">My Submissions</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Your submission history will appear here.
                                        </p>
                                    </div>
                                </TabsContent>
                            </ScrollArea>
                        </Tabs>
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Middle Panel - Code Editor and Test Cases */}
                <ResizablePanel defaultSize={45} minSize={30}>
                    <ResizablePanelGroup direction="vertical">
                        {/* Code Editor Section */}
                        <ResizablePanel defaultSize={65} minSize={30}>
                            <div className="h-full flex flex-col">
                                {/* Top Section - Language Selector and Action Buttons */}
                                <div className="border-b p-2 flex items-center justify-between">
                                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select Language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="python">Python</SelectItem>
                                            <SelectItem value="java">Java</SelectItem>
                                            <SelectItem value="cpp">C++</SelectItem>
                                            <SelectItem value="javascript">JavaScript</SelectItem>
                                            <SelectItem value="typescript">TypeScript</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm">
                                            <RotateCcw className="w-4 h-4 mr-2" />
                                            Reset
                                        </Button>
                                    </div>
                                </div>

                                {/* Code Editor Area */}
                                <div className="flex-1 bg-muted/30 p-4">
                                    <div className="h-full border rounded-lg bg-background/50 overflow-hidden">
                                        <Editor
                                            height={'100%'}
                                            language={selectedLanguage}
                                            value={getStarterCode()}
                                            theme="caffeine-dark"
                                            options={{
                                                fontSize: 14,
                                                fontFamily: 'var(--font-mono)',
                                                minimap: { enabled: false },
                                                scrollBeyondLastLine: false,
                                                lineNumbers: 'on',
                                                renderLineHighlight: 'all',
                                                cursorBlinking: 'smooth',
                                                cursorSmoothCaretAnimation: 'on',
                                                smoothScrolling: true,
                                                padding: { top: 16, bottom: 16 },
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        {/* Bottom Section - Test Cases */}
                        <ResizablePanel defaultSize={35} minSize={20}>
                            <div className="h-full border-t">
                                <Tabs defaultValue="testcases" className="w-full h-full flex flex-col">
                                    <div className="border-b overflow-x-auto tab-scroll-container">
                                        <TabsList className="inline-flex w-auto min-w-full justify-start h-12 px-2 bg-transparent">
                                            <TabsTrigger value="testcases" className="flex-shrink-0">Test Cases</TabsTrigger>
                                            <TabsTrigger value="result" className="flex-shrink-0">Result</TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <TabsContent value="testcases" className="p-4 space-y-3 flex-1 overflow-auto">
                                        {problem.examples && problem.examples.map((example, index) => (
                                            <div key={index} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">Test Case {index + 1}</span>
                                                    {index === 0 && (
                                                        <Button size="sm" variant="default">
                                                            <Play className="w-4 h-4 mr-2" />
                                                            Run Code
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="bg-muted p-3 rounded text-sm font-mono">
                                                    <p>{example.input}</p>
                                                </div>
                                            </div>
                                        ))}

                                        <Button variant="default" className="w-full">
                                            Submit Solution
                                        </Button>
                                    </TabsContent>

                                    <TabsContent value="result" className="p-4 flex-1 overflow-auto">
                                        <div className="bg-muted p-3 rounded text-sm">
                                            <p className="text-muted-foreground">Run your code to see results here</p>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right Panel - AI Chatbot */}
                <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
                    <Card className="h-full rounded-none border-0 flex flex-col">
                        {/* Codura A.I Card Header */}
                        <CardHeader className="border-b">
                            <CardTitle className="text-lg">Codura A.I</CardTitle>
                        </CardHeader>

                        {/* A.I Chat Bot Container */}
                        <CardContent className="flex-1 p-0 flex flex-col">
                            {/* Chat Messages */}
                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-4">
                                    {chatMessages.length === 0 ? (
                                        <div className="text-center text-muted-foreground text-sm py-8">
                                            <p>Ask me anything about this problem!</p>
                                            <p className="mt-2">I can help with:</p>
                                            <ul className="mt-2 space-y-1 text-xs">
                                                <li>• Understanding the problem</li>
                                                <li>• Approach suggestions</li>
                                                <li>• Code explanations</li>
                                                <li>• Debugging help</li>
                                            </ul>
                                        </div>
                                    ) : (
                                        chatMessages.map((message, index) => (
                                            <div
                                                key={index}
                                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[80%] rounded-lg p-3 text-sm ${message.role === 'user'
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted'
                                                        }`}
                                                >
                                                    {message.content}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>

                            {/* Chat Input */}
                            <div className="border-t p-4">
                                <div className="flex gap-2">
                                    <Textarea
                                        placeholder="Ask me anything..."
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault()
                                                handleSendMessage()
                                            }
                                        }}
                                        className="min-h-[60px] resize-none"
                                    />
                                    <Button onClick={handleSendMessage} size="icon" className="self-end">
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}
