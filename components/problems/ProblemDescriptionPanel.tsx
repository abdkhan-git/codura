// components/problem/ProblemDescriptionPanel.tsx
'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tag, ChevronDown, ChevronUp, AlignLeft } from 'lucide-react'
import SubmissionHistory from './SubmissionHistory'
import { Slider } from '@/components/ui/slider'

interface ProblemDescriptionPanelProps {
    problem: any
    allOfUsersSubmissions: any[]
    onCopyToEditor?: (code: string) => void 
}

export default function ProblemDescriptionPanel({
    problem,
    allOfUsersSubmissions,
    onCopyToEditor
}: ProblemDescriptionPanelProps) {
    const [showTags, setShowTags] = useState(false)
    const [showAcceptanceRate, setShowAcceptanceRate] = useState(false)
    const [activeTab, setActiveTab] = useState('description')
    const [maxWidth, setMaxWidth] = useState(100) // Percentage of container width

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Easy':
                return 'bg-green-950 text-green-400 !border-green-900'
            case 'Medium':
                return 'bg-yellow-950 text-yellow-400 !border-yellow-900'
            case 'Hard':
                return 'bg-red-950 text-red-400 !border-red-900'
            default:
                return 'bg-zinc-900 text-zinc-400 !border-zinc-900'
        }
    }

    return (
        <div className="h-full flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="border-b border-zinc-800/50 overflow-x-scroll">
                    <TabsList className="inline-flex w-auto min-w-full justify-start h-auto px-6 bg-transparent gap-6">
                        {['Description', 'Solution', 'Community', 'Submissions'].map(tab => (
                            <TabsTrigger 
                                key={tab.toLowerCase()}
                                value={tab.toLowerCase()} 
                                className="cursor-pointer relative flex-shrink-0 !bg-transparent data-[state=active]:!bg-transparent border-0 rounded-none px-3 pb-3 pt-4 !text-zinc-500 data-[state=active]:!text-white hover:!text-zinc-300 transition-all font-medium after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gradient-to-r after:from-transparent after:via-white after:to-transparent after:opacity-0 data-[state=active]:after:opacity-80 after:transition-opacity after:shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                            >
                                {tab}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <ScrollArea className="flex-1">
                    <TabsContent value="description" className="p-4 mt-0">
                        <div className="space-y-4">
                            <div>
                                <button
                                  onClick={() => window.location.href = '/problems'}
                                  className="mb-4 text-sm text-green-400 hover:text-green-300 flex items-center gap-2 transition-colors"
                                >
                                  ← Back to Problems
                                </button>
                                <h1 className="text-2xl font-bold mb-5">
                                    {problem.leetcode_id}. {problem.title}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <Badge variant="default" className={`${getDifficultyColor(problem.difficulty)} border-1`}>
                                        {problem.difficulty}
                                    </Badge>
                                    
                                    <div 
                                        className="relative cursor-pointer group ml-2"
                                        onClick={() => setShowAcceptanceRate(true)}
                                    >
                                        <div className={`text-sm transition-all ${showAcceptanceRate ? '' : 'blur-sm select-none'}`}>
                                            <span className="text-zinc-400">Acceptance: </span>
                                            <span className="text-sm text-muted-foreground">
                                                {problem.acceptance_rate.toFixed(1)}%
                                            </span>
                                        </div>
                                        {!showAcceptanceRate && (
                                            <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500 group-hover:text-zinc-300">
                                                Reveal Acceptance %
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {problem.topic_tags && problem.topic_tags.length > 0 && (
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setShowTags(!showTags)}
                                        className="cursor-pointer text-sm text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1 border-1 px-2 py-1 rounded-lg"
                                    >
                                        <Tag className="w-3 h-3 mr-1 text-primary" />
                                        {showTags ? 'Hide Topics' : 'View Topics'}
                                        {showTags ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>

                                    {showTags && (
                                        <div className="flex flex-wrap gap-2">
                                            {problem.topic_tags.map((tag: any) => (
                                                <Badge key={tag.slug} variant="secondary" className="text-xs">
                                                    {tag.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Text Width Control */}
                            <div className="space-y-2 py-2 border-y border-zinc-800/50">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm text-zinc-400">Text Width: {maxWidth}%</label>
                                </div>
                                <Slider
                                    value={[maxWidth]}
                                    onValueChange={(value) => setMaxWidth(value[0])}
                                    min={30}
                                    max={100}
                                    step={5}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-zinc-500">
                                    <span>Narrow</span>
                                    <span>Full Width</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div
                                    className="text-sm text-muted-foreground prose prose-sm dark:prose-invert transition-all duration-300"
                                    style={{ maxWidth: `${maxWidth}%` }}
                                    dangerouslySetInnerHTML={{ __html: problem.description }}
                                />
                            </div>

                            {problem.constraints && problem.constraints.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="font-semibold">Constraints:</h3>
                                    <div className="bg-card/50 border-2 border-border/20 rounded-xl p-4 backdrop-blur-sm shadow-md hover:border-brand/30 transition-all duration-300">
                                        <ul className="space-y-1 text-sm font-mono text-foreground">
                                            {problem.constraints.map((constraint: string, index: number) => (
                                                <li key={index}>{constraint}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="solution" className="p-4 mt-0">
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold">Solution Approach</h2>
                            <p className="text-sm text-muted-foreground">
                                The solution content will go here.
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="community" className="p-4 mt-0">
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold">Community Solutions</h2>
                            <p className="text-sm text-muted-foreground">
                                Top community solutions will be displayed here.
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="submissions" className="p-4 mt-0 h-[100vh] overflow-y-scroll">
                        <h2 className="text-xl font-bold mb-3">My Submissions</h2>
                        <SubmissionHistory 
                            allOfUsersSubmissions={allOfUsersSubmissions}
                            onCopyToEditor={onCopyToEditor}  // Add this line
                        />
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </div>
    )
}