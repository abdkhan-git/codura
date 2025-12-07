'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ThumbsUp, ThumbsDown, MessageSquare, Send, Edit2, Trash2, Check, X, ExternalLink, Eye, Code2, Search, Filter, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CommunitySolutionsProps {
    problemId: string
}

interface Solution {
    id: string
    user_id: string
    problem_id: string
    title: string
    description: string
    time_complexity: string
    space_complexity: string
    language_tags: string[]
    algorithm_tags: string[]
    upvotes: number
    downvotes: number
    created_at: string
    username?: string
    full_name?: string
    user_vote?: 'up' | 'down' | null
    comment_count?: number
}

interface Comment {
    id: string
    solution_id: string
    user_id: string
    content: string
    created_at: string
    username?: string
    full_name?: string
}

export default function CommunitySolutions({ problemId }: CommunitySolutionsProps) {
    const [solutions, setSolutions] = useState<Solution[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const [loading, setLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null)
    const [comments, setComments] = useState<Comment[]>([])
    const [newComment, setNewComment] = useState('')
    const [loadingComments, setLoadingComments] = useState(false)
    const [previewMode, setPreviewMode] = useState<'write' | 'preview'>('write')
    
    // Form state
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [timeComplexity, setTimeComplexity] = useState('O(n)')
    const [spaceComplexity, setSpaceComplexity] = useState('O(1)')
    const [languageTags, setLanguageTags] = useState<string[]>([])
    const [algorithmTags, setAlgorithmTags] = useState<string[]>([])
    const [sortBy, setSortBy] = useState<'top' | 'new'>('top')
    
    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedLanguageFilter, setSelectedLanguageFilter] = useState<string[]>([])
    const [selectedAlgorithmFilter, setSelectedAlgorithmFilter] = useState<string[]>([])
    const [showFilters, setShowFilters] = useState(false)

    // Tag options
    const languageOptions = [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 
        'Rust', 'Swift', 'Kotlin', 'PHP', 'Ruby', 'Scala'
    ]
    
    const algorithmOptions = [
        'Two Pointers', 'Sliding Window', 'Binary Search', 'DFS', 'BFS',
        'Dynamic Programming', 'Greedy', 'Backtracking', 'Divide and Conquer',
        'Hash Table', 'Stack', 'Queue', 'Heap', 'Trie', 'Union Find',
        'Monotonic Stack', 'Prefix Sum', 'Bit Manipulation', 'Math', 'Sorting'
    ]

    const supabase = createClient()

    useEffect(() => {
        fetchCurrentUser()
        fetchSolutions()
    }, [problemId, sortBy])

    const fetchCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)
    }

    const fetchSolutions = async () => {
        setLoading(true)
        try {
            // First, fetch basic solutions
            const { data: solutionsData, error: solutionsError } = await supabase
                .from('community_solutions')
                .select('*')
                .eq('problem_id', problemId)
                .order(sortBy === 'top' ? 'upvotes' : 'created_at', { ascending: false })

            if (solutionsError) {
                console.error('Error fetching solutions:', solutionsError)
                throw solutionsError
            }

            if (!solutionsData || solutionsData.length === 0) {
                setSolutions([])
                return
            }

            // Fetch user info (username, full_name) from your users table
            const userIds = [...new Set(solutionsData.map(s => s.user_id))]
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('user_id, username, full_name')
                .in('user_id', userIds)

            if (usersError) {
                console.error('Error fetching users:', usersError)
            }

            const userInfoMap = new Map(usersData?.map(u => [u.user_id, { username: u.username, full_name: u.full_name }]) || [])

            // Fetch votes for current user
            let userVotesMap = new Map()
            if (currentUser) {
                const { data: votesData, error: votesError } = await supabase
                    .from('solution_votes')
                    .select('solution_id, vote_type')
                    .eq('user_id', currentUser.id)
                    .in('solution_id', solutionsData.map(s => s.id))

                if (votesError) {
                    console.error('Error fetching votes:', votesError)
                } else {
                    userVotesMap = new Map(votesData?.map(v => [v.solution_id, v.vote_type]) || [])
                }
            }

            // Fetch comment counts
            const { data: commentsData, error: commentsError } = await supabase
                .from('solution_comments')
                .select('solution_id')
                .in('solution_id', solutionsData.map(s => s.id))

            if (commentsError) {
                console.error('Error fetching comment counts:', commentsError)
            }

            const commentCountsMap = new Map()
            commentsData?.forEach(c => {
                commentCountsMap.set(c.solution_id, (commentCountsMap.get(c.solution_id) || 0) + 1)
            })

            const processedSolutions = solutionsData.map((sol: any) => {
                const userInfo = userInfoMap.get(sol.user_id)
                return {
                    ...sol,
                    username: userInfo?.username,
                    full_name: userInfo?.full_name,
                    user_vote: userVotesMap.get(sol.id) || null,
                    comment_count: commentCountsMap.get(sol.id) || 0
                }
            })

            setSolutions(processedSolutions)
        } catch (error: any) {
            console.error('Error fetching solutions:', error)
            console.error('Error details:', {
                message: error?.message,
                details: error?.details,
                hint: error?.hint,
                code: error?.code
            })
        } finally {
            setLoading(false)
        }
    }

    const fetchComments = async (solutionId: string) => {
        setLoadingComments(true)
        try {
            const { data: commentsData, error: commentsError } = await supabase
                .from('solution_comments')
                .select('*')
                .eq('solution_id', solutionId)
                .order('created_at', { ascending: true })

            if (commentsError) {
                console.error('Error fetching comments:', commentsError)
                throw commentsError
            }

            // Fetch user info for comments
            const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])]
            if (userIds.length > 0) {
                const { data: usersData, error: usersError } = await supabase
                    .from('users')
                    .select('user_id, username, full_name')
                    .in('user_id', userIds)

                if (usersError) {
                    console.error('Error fetching users:', usersError)
                }

                const userInfoMap = new Map(usersData?.map(u => [u.user_id, { username: u.username, full_name: u.full_name }]) || [])

                const processedComments = commentsData?.map((comment: any) => {
                    const userInfo = userInfoMap.get(comment.user_id)
                    return {
                        ...comment,
                        username: userInfo?.username,
                        full_name: userInfo?.full_name
                    }
                }) || []

                setComments(processedComments)
            } else {
                setComments([])
            }
        } catch (error: any) {
            console.error('Error fetching comments:', error)
            console.error('Error details:', {
                message: error?.message,
                details: error?.details,
                hint: error?.hint
            })
        } finally {
            setLoadingComments(false)
        }
    }

    const openSolutionModal = (solution: Solution) => {
        setSelectedSolution(solution)
        setNewComment('')
        fetchComments(solution.id)
    }

    const closeSolutionModal = () => {
        setSelectedSolution(null)
        setComments([])
        setNewComment('')
    }

    const handleCreateSolution = async () => {
        if (!currentUser) {
            alert('Please sign in to submit a solution')
            return
        }

        if (!title.trim() || !description.trim()) {
            alert('Please fill in all fields')
            return
        }

        if (languageTags.length === 0) {
            alert('Please select at least one programming language')
            return
        }

        try {
            const { error } = await supabase
                .from('community_solutions')
                .insert({
                    user_id: currentUser.id,
                    problem_id: problemId,
                    title: title.trim(),
                    description: description.trim(),
                    time_complexity: timeComplexity,
                    space_complexity: spaceComplexity,
                    language_tags: languageTags,
                    algorithm_tags: algorithmTags,
                    upvotes: 0,
                    downvotes: 0
                })

            if (error) throw error

            setTitle('')
            setDescription('')
            setTimeComplexity('O(n)')
            setSpaceComplexity('O(1)')
            setLanguageTags([])
            setAlgorithmTags([])
            setIsCreating(false)
            fetchSolutions()
        } catch (error) {
            console.error('Error creating solution:', error)
            alert('Failed to submit solution')
        }
    }

    const handleVote = async (solutionId: string, voteType: 'up' | 'down') => {
        if (!currentUser) {
            alert('Please sign in to vote')
            return
        }

        try {
            const solution = solutions.find(s => s.id === solutionId)
            if (!solution) return

            // Check existing vote
            const { data: existingVote } = await supabase
                .from('solution_votes')
                .select('*')
                .eq('solution_id', solutionId)
                .eq('user_id', currentUser.id)
                .single()

            if (existingVote) {
                if (existingVote.vote_type === voteType) {
                    // Remove vote
                    await supabase
                        .from('solution_votes')
                        .delete()
                        .eq('solution_id', solutionId)
                        .eq('user_id', currentUser.id)

                    const updateField = voteType === 'up' ? 'upvotes' : 'downvotes'
                    await supabase
                        .from('community_solutions')
                        .update({ [updateField]: solution[updateField] - 1 })
                        .eq('id', solutionId)
                } else {
                    // Change vote
                    await supabase
                        .from('solution_votes')
                        .update({ vote_type: voteType })
                        .eq('solution_id', solutionId)
                        .eq('user_id', currentUser.id)

                    const increaseField = voteType === 'up' ? 'upvotes' : 'downvotes'
                    const decreaseField = voteType === 'up' ? 'downvotes' : 'upvotes'
                    await supabase
                        .from('community_solutions')
                        .update({
                            [increaseField]: solution[increaseField] + 1,
                            [decreaseField]: solution[decreaseField] - 1
                        })
                        .eq('id', solutionId)
                }
            } else {
                // New vote
                await supabase
                    .from('solution_votes')
                    .insert({
                        solution_id: solutionId,
                        user_id: currentUser.id,
                        vote_type: voteType
                    })

                const updateField = voteType === 'up' ? 'upvotes' : 'downvotes'
                await supabase
                    .from('community_solutions')
                    .update({ [updateField]: solution[updateField] + 1 })
                    .eq('id', solutionId)
            }

            fetchSolutions()
        } catch (error) {
            console.error('Error voting:', error)
        }
    }

    const toggleComments = (solutionId: string) => {
        // This function is no longer needed since we're using a modal
        // Kept for backwards compatibility
    }

    const handleAddComment = async () => {
        if (!currentUser) {
            alert('Please sign in to comment')
            return
        }

        if (!selectedSolution) return

        const content = newComment.trim()
        if (!content) return

        try {
            await supabase
                .from('solution_comments')
                .insert({
                    solution_id: selectedSolution.id,
                    user_id: currentUser.id,
                    content
                })

            setNewComment('')
            fetchComments(selectedSolution.id)
            
            // Update comment count in solutions list
            setSolutions(prev => prev.map(s => 
                s.id === selectedSolution.id 
                    ? { ...s, comment_count: (s.comment_count || 0) + 1 }
                    : s
            ))
        } catch (error) {
            console.error('Error adding comment:', error)
        }
    }

    const handleDeleteSolution = async (solutionId: string) => {
        if (!confirm('Are you sure you want to delete this solution?')) return

        try {
            await supabase
                .from('community_solutions')
                .delete()
                .eq('id', solutionId)

            fetchSolutions()
        } catch (error) {
            console.error('Error deleting solution:', error)
        }
    }

    const toggleTag = (tag: string, type: 'language' | 'algorithm') => {
        if (type === 'language') {
            setLanguageTags(prev => 
                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
            )
        } else {
            setAlgorithmTags(prev => 
                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
            )
        }
    }

    const toggleFilterTag = (tag: string, type: 'language' | 'algorithm') => {
        if (type === 'language') {
            setSelectedLanguageFilter(prev => 
                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
            )
        } else {
            setSelectedAlgorithmFilter(prev => 
                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
            )
        }
    }

    const clearFilters = () => {
        setSearchQuery('')
        setSelectedLanguageFilter([])
        setSelectedAlgorithmFilter([])
    }

    const getDisplayName = (solution: Solution | Comment) => {
        return solution.username || solution.full_name || 'Unknown User'
    }

    const getInitials = (displayName: string) => {
        if (!displayName || displayName === 'Unknown User') return '??'
        // If it's a username (single word), take first 2 chars
        if (!displayName.includes(' ')) {
            return displayName.slice(0, 2).toUpperCase()
        }
        // If it's a full name, take first letter of each word
        const words = displayName.split(' ')
        return (words[0][0] + (words[1]?.[0] || '')).toUpperCase()
    }

    const getCurrentUserDisplayName = () => {
        return currentUser?.user_metadata?.username || currentUser?.user_metadata?.full_name || currentUser?.email || 'You'
    }

    const getFilteredSolutions = () => {
        let filtered = [...solutions]

        // Search by title or username
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(solution => 
                solution.title.toLowerCase().includes(query) ||
                getDisplayName(solution).toLowerCase().includes(query)
            )
        }

        // Filter by language tags
        if (selectedLanguageFilter.length > 0) {
            filtered = filtered.filter(solution => 
                solution.language_tags?.some(tag => selectedLanguageFilter.includes(tag))
            )
        }

        // Filter by algorithm tags
        if (selectedAlgorithmFilter.length > 0) {
            filtered = filtered.filter(solution => 
                solution.algorithm_tags?.some(tag => selectedAlgorithmFilter.includes(tag))
            )
        }

        return filtered
    }

    const filteredSolutions = getFilteredSolutions()
    const activeFiltersCount = selectedLanguageFilter.length + selectedAlgorithmFilter.length

    const getComplexityColor = (complexity: string) => {
        if (complexity.includes('1')) return 'from-emerald-500/20 to-green-500/20 border-emerald-500/30 text-emerald-300 shadow-emerald-500/20'
        if (complexity.includes('log')) return 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-300 shadow-cyan-500/20'
        if (complexity.includes('n^2') || complexity.includes('n²')) return 'from-orange-500/20 to-amber-500/20 border-orange-500/30 text-orange-300 shadow-orange-500/20'
        if (complexity.includes('2^n')) return 'from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-300 shadow-rose-500/20'
        return 'from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-300 shadow-violet-500/20'
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-zinc-400">Loading solutions...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header with Sort and Create Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="top">Top Voted</SelectItem>
                            <SelectItem value="new">Most Recent</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="text-sm text-zinc-500">
                        {filteredSolutions.length} {filteredSolutions.length === 1 ? 'solution' : 'solutions'}
                        {filteredSolutions.length !== solutions.length && (
                            <span className="text-zinc-600"> (filtered from {solutions.length})</span>
                        )}
                    </span>
                </div>

                {!isCreating && (
                    <Button
                        onClick={() => setIsCreating(true)}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Share Your Solution
                    </Button>
                )}
            </div>

            {/* Search and Filter Bar */}
            <div className="space-y-3">
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search solutions by title or author..."
                            className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg focus:outline-none focus:border-green-600 text-white placeholder-zinc-500 text-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`border-zinc-700 relative ${activeFiltersCount > 0 ? 'border-green-600 text-green-400' : ''}`}
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                        {activeFiltersCount > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-green-600 text-white text-xs rounded-full">
                                {activeFiltersCount}
                            </span>
                        )}
                    </Button>
                    {(searchQuery || activeFiltersCount > 0) && (
                        <Button
                            variant="ghost"
                            onClick={clearFilters}
                            className="text-zinc-400 hover:text-white"
                        >
                            <X className="w-4 h-4 mr-1" />
                            Clear
                        </Button>
                    )}
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/30 space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-zinc-300">
                                Programming Languages
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {languageOptions.map(lang => (
                                    <button
                                        key={lang}
                                        type="button"
                                        onClick={() => toggleFilterTag(lang, 'language')}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                            selectedLanguageFilter.includes(lang)
                                                ? 'bg-green-600 text-white border-green-500'
                                                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-green-600'
                                        } border`}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-zinc-300">
                                Algorithms & Techniques
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {algorithmOptions.map(algo => (
                                    <button
                                        key={algo}
                                        type="button"
                                        onClick={() => toggleFilterTag(algo, 'algorithm')}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                            selectedAlgorithmFilter.includes(algo)
                                                ? 'bg-blue-600 text-white border-blue-500'
                                                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-blue-600'
                                        } border`}
                                    >
                                        {algo}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Solution Form */}
            {isCreating && (
                <div className="border-2 border-green-900/30 rounded-xl p-6 bg-gradient-to-br from-zinc-900/50 to-green-950/20 backdrop-blur-sm shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-green-400">Share Your Solution</h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsCreating(false)}
                            className="text-zinc-400 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-zinc-300">Solution Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Two Pointer Approach with HashMap"
                                className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg focus:outline-none focus:border-green-600 text-white placeholder-zinc-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-zinc-300">
                                    Programming Language <span className="text-red-400">*</span>
                                </label>
                                <div className="flex flex-wrap gap-2 p-3 bg-zinc-900/30 border border-zinc-700 rounded-lg max-h-32 overflow-y-auto">
                                    {languageOptions.map(lang => (
                                        <button
                                            key={lang}
                                            type="button"
                                            onClick={() => toggleTag(lang, 'language')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                                languageTags.includes(lang)
                                                    ? 'bg-green-600 text-white border-green-500'
                                                    : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-green-600'
                                            } border`}
                                        >
                                            {lang}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-zinc-300">
                                    Algorithms & Techniques
                                </label>
                                <div className="flex flex-wrap gap-2 p-3 bg-zinc-900/30 border border-zinc-700 rounded-lg max-h-32 overflow-y-auto">
                                    {algorithmOptions.map(algo => (
                                        <button
                                            key={algo}
                                            type="button"
                                            onClick={() => toggleTag(algo, 'algorithm')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                                algorithmTags.includes(algo)
                                                    ? 'bg-blue-600 text-white border-blue-500'
                                                    : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-blue-600'
                                            } border`}
                                        >
                                            {algo}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-zinc-300">Description & Approach</label>
                                <div className="flex items-center gap-1 text-xs text-zinc-500">
                                    <Code2 className="w-3 h-3" />
                                    Markdown supported
                                </div>
                            </div>
                            
                            <Tabs value={previewMode} onValueChange={(v: any) => setPreviewMode(v)} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-2 bg-zinc-900/50 p-1">
                                    <TabsTrigger value="write" className="data-[state=active]:bg-zinc-800">
                                        <Edit2 className="w-3 h-3 mr-2" />
                                        Write
                                    </TabsTrigger>
                                    <TabsTrigger value="preview" className="data-[state=active]:bg-zinc-800">
                                        <Eye className="w-3 h-3 mr-2" />
                                        Preview
                                    </TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="write" className="mt-0">
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Explain your solution approach, key insights, and implementation details...

**Tips:**
- Use `code` for inline code
- Use ```language for code blocks
- Use **bold** and *italic* for emphasis
- Use - or 1. for lists"
                                        className="min-h-48 bg-zinc-900/50 border-zinc-700 focus:border-green-600 font-mono text-sm"
                                    />
                                </TabsContent>
                                
                                <TabsContent value="preview" className="mt-0">
                                    <div className="min-h-48 bg-zinc-900/50 border border-zinc-700 rounded-lg p-4 overflow-auto">
                                        {description.trim() ? (
                                            <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800">
                                                <ReactMarkdown
                                                    components={{
                                                        code({ node, inline, className, children, ...props }) {
                                                            const match = /language-(\w+)/.exec(className || '')
                                                            return !inline && match ? (
                                                                <SyntaxHighlighter
                                                                    style={vscDarkPlus}
                                                                    language={match[1]}
                                                                    PreTag="div"
                                                                    customStyle={{
                                                                        margin: 0,
                                                                        padding: '1rem',
                                                                        borderRadius: '0.375rem',
                                                                        fontSize: '0.875rem'
                                                                    }}
                                                                    {...props}
                                                                >
                                                                    {String(children).replace(/\n$/, '')}
                                                                </SyntaxHighlighter>
                                                            ) : (
                                                                <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-green-400 text-xs font-mono" {...props}>
                                                                    {children}
                                                                </code>
                                                            )
                                                        }
                                                    }}
                                                >
                                                    {description}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p className="text-zinc-600 text-sm italic">Nothing to preview yet...</p>
                                        )}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-zinc-300">Time Complexity</label>
                                <Select value={timeComplexity} onValueChange={setTimeComplexity}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="O(1)">O(1) - Constant</SelectItem>
                                        <SelectItem value="O(log n)">O(log n) - Logarithmic</SelectItem>
                                        <SelectItem value="O(n)">O(n) - Linear</SelectItem>
                                        <SelectItem value="O(n log n)">O(n log n) - Linearithmic</SelectItem>
                                        <SelectItem value="O(n²)">O(n²) - Quadratic</SelectItem>
                                        <SelectItem value="O(2^n)">O(2^n) - Exponential</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-zinc-300">Space Complexity</label>
                                <Select value={spaceComplexity} onValueChange={setSpaceComplexity}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="O(1)">O(1) - Constant</SelectItem>
                                        <SelectItem value="O(log n)">O(log n) - Logarithmic</SelectItem>
                                        <SelectItem value="O(n)">O(n) - Linear</SelectItem>
                                        <SelectItem value="O(n²)">O(n²) - Quadratic</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                onClick={handleCreateSolution}
                                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                            >
                                <Check className="w-4 h-4 mr-2" />
                                Submit Solution
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setIsCreating(false)}
                                className="border-zinc-700 hover:bg-zinc-800"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Solutions List */}
            {filteredSolutions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                    {solutions.length === 0 ? (
                        <>
                            <p className="text-zinc-400 mb-2">No solutions yet</p>
                            <p className="text-sm text-zinc-600">Be the first to share your approach!</p>
                        </>
                    ) : (
                        <>
                            <p className="text-zinc-400 mb-2">No solutions match your filters</p>
                            <p className="text-sm text-zinc-600">Try adjusting your search or filters</p>
                            <Button
                                variant="outline"
                                onClick={clearFilters}
                                className="mt-4 border-zinc-700 hover:border-green-600"
                            >
                                Clear Filters
                            </Button>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredSolutions.map((solution) => (
                        <div
                            key={solution.id}
                            onClick={() => openSolutionModal(solution)}
                            className="border border-zinc-800 rounded-xl p-5 bg-gradient-to-br from-zinc-900/30 to-zinc-900/10 hover:border-zinc-700 transition-all backdrop-blur-sm cursor-pointer group"
                        >
                            {/* Solution Header */}
                            <div className="flex items-start gap-4 mb-3">
                                <Avatar className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600">
                                    <AvatarFallback className="text-white font-semibold">
                                        {getInitials(getDisplayName(solution))}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-medium text-zinc-300">
                                                    {getDisplayName(solution)}
                                                </span>
                                                <span className="text-xs text-zinc-600">•</span>
                                                <span className="text-xs text-zinc-500">
                                                    {formatDistanceToNow(new Date(solution.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-semibold text-white group-hover:text-green-400 transition-colors">
                                                {solution.title}
                                            </h3>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <Badge className={`bg-gradient-to-r ${getComplexityColor(solution.time_complexity)} backdrop-blur-sm border shadow-lg text-xs font-medium px-3 py-1`}>
                                                {solution.time_complexity}
                                            </Badge>
                                            <Badge className={`bg-gradient-to-r ${getComplexityColor(solution.space_complexity)} backdrop-blur-sm border shadow-lg text-xs font-medium px-3 py-1`}>
                                                {solution.space_complexity}
                                            </Badge>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-1.5">
                                        {solution.language_tags?.map(tag => (
                                            <Badge key={tag} variant="outline" className="text-xs bg-zinc-950 text-zinc-400 border-zinc-900">
                                                {tag}
                                            </Badge>
                                        ))}
                                        {solution.algorithm_tags?.map(tag => (
                                            <Badge key={tag} variant="outline" className="text-xs bg-zinc-950 text-zinc-400 border-zinc-900">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {currentUser?.id === solution.user_id && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteSolution(solution.id)
                                        }}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>

                            {/* Preview of Solution Content */}
                            <div className="mb-3 text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                                {solution.description.replace(/[#*`_~\[\]()]/g, '')}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-4 pt-3 border-t border-zinc-800">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleVote(solution.id, 'up')
                                        }}
                                        className={`${
                                            solution.user_vote === 'up'
                                                ? 'text-green-400 bg-green-950/30'
                                                : 'text-zinc-400 hover:text-green-400'
                                        }`}
                                    >
                                        <ThumbsUp className="w-4 h-4 mr-1" />
                                        {solution.upvotes}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleVote(solution.id, 'down')
                                        }}
                                        className={`${
                                            solution.user_vote === 'down'
                                                ? 'text-red-400 bg-red-950/30'
                                                : 'text-zinc-400 hover:text-red-400'
                                        }`}
                                    >
                                        <ThumbsDown className="w-4 h-4 mr-1" />
                                        {solution.downvotes}
                                    </Button>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-zinc-400 hover:text-white"
                                >
                                    <MessageSquare className="w-4 h-4 mr-1" />
                                    {solution.comment_count || 0}
                                </Button>

                                <div className="ml-auto text-xs text-zinc-600 flex items-center gap-1 group-hover:text-green-400 transition-colors">
                                    View Full Solution
                                    <ExternalLink className="w-3 h-3" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Solution Detail Modal */}
            <Dialog open={!!selectedSolution} onOpenChange={(open) => !open && closeSolutionModal()}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-zinc-950 border-zinc-800">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-800">
                        <div className="flex items-start gap-4">
                            <Avatar className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600">
                                <AvatarFallback className="text-white font-semibold">
                                    {selectedSolution && getInitials(getDisplayName(selectedSolution))}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <DialogTitle className="text-2xl font-bold text-white mb-2">
                                    {selectedSolution?.title}
                                </DialogTitle>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-sm text-zinc-400">
                                        by <span className="text-green-400 font-medium">{selectedSolution && getDisplayName(selectedSolution)}</span>
                                    </span>
                                    <span className="text-xs text-zinc-600">•</span>
                                    <span className="text-xs text-zinc-500">
                                        {selectedSolution && formatDistanceToNow(new Date(selectedSolution.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <Badge className={`bg-gradient-to-r ${selectedSolution && getComplexityColor(selectedSolution.time_complexity)} backdrop-blur-sm border shadow-lg text-xs font-medium px-3 py-1.5`}>
                                        Time: {selectedSolution?.time_complexity}
                                    </Badge>
                                    <Badge className={`bg-gradient-to-r ${selectedSolution && getComplexityColor(selectedSolution.space_complexity)} backdrop-blur-sm border shadow-lg text-xs font-medium px-3 py-1.5`}>
                                        Space: {selectedSolution?.space_complexity}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedSolution?.language_tags?.map(tag => (
                                        <Badge key={tag} variant="outline" className="text-xs bg-zinc-950 text-zinc-400 border-zinc-900">
                                            {tag}
                                        </Badge>
                                    ))}
                                    {selectedSolution?.algorithm_tags?.map(tag => (
                                        <Badge key={tag} variant="outline" className="text-xs bg-zinc-950 text-zinc-400 border-zinc-900">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-6">
                        {/* Full Solution Description */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Solution Approach</h3>
                            <div className="text-sm text-zinc-300 leading-relaxed bg-zinc-900/50 rounded-lg p-5 border border-zinc-800">
                                <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800 prose-pre:rounded-lg prose-headings:text-white prose-strong:text-white prose-code:text-green-400">
                                    <ReactMarkdown
                                        components={{
                                            code({ node, inline, className, children, ...props }) {
                                                const match = /language-(\w+)/.exec(className || '')
                                                return !inline && match ? (
                                                    <SyntaxHighlighter
                                                        style={vscDarkPlus}
                                                        language={match[1]}
                                                        PreTag="div"
                                                        customStyle={{
                                                            margin: '1rem 0',
                                                            padding: '1rem',
                                                            background: '#09090b',
                                                            border: '1px solid #27272a',
                                                            borderRadius: '0.5rem',
                                                            fontSize: '0.875rem'
                                                        }}
                                                        {...props}
                                                    >
                                                        {String(children).replace(/\n$/, '')}
                                                    </SyntaxHighlighter>
                                                ) : (
                                                    <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-green-400 text-xs font-mono" {...props}>
                                                        {children}
                                                    </code>
                                                )
                                            }
                                        }}
                                    >
                                        {selectedSolution?.description}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>

                        {/* Vote Actions */}
                        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-zinc-800">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => selectedSolution && handleVote(selectedSolution.id, 'up')}
                                className={`${
                                    selectedSolution?.user_vote === 'up'
                                        ? 'text-green-400 bg-green-950/30 border-green-900'
                                        : 'text-zinc-400 hover:text-green-400 border-zinc-800'
                                } border`}
                            >
                                <ThumbsUp className="w-4 h-4 mr-2" />
                                Upvote ({selectedSolution?.upvotes || 0})
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => selectedSolution && handleVote(selectedSolution.id, 'down')}
                                className={`${
                                    selectedSolution?.user_vote === 'down'
                                        ? 'text-red-400 bg-red-950/30 border-red-900'
                                        : 'text-zinc-400 hover:text-red-400 border-zinc-800'
                                } border`}
                            >
                                <ThumbsDown className="w-4 h-4 mr-2" />
                                Downvote ({selectedSolution?.downvotes || 0})
                            </Button>
                        </div>

                        {/* Comments Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-green-400" />
                                Discussion ({comments.length})
                            </h3>

                            {/* Add Comment */}
                            <div className="mb-6">
                                <div className="flex gap-3">
                                    <Avatar className="w-9 h-9 bg-gradient-to-br from-green-600 to-emerald-600">
                                        <AvatarFallback className="text-white text-xs font-semibold">
                                            {getInitials(getCurrentUserDisplayName())}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <Textarea
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && e.metaKey) {
                                                    handleAddComment()
                                                }
                                            }}
                                            placeholder="Share your thoughts..."
                                            className="min-h-20 bg-zinc-900/50 border-zinc-700 focus:border-green-600 resize-none mb-2"
                                        />
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-zinc-600">Cmd/Ctrl + Enter to post</span>
                                            <Button
                                                size="sm"
                                                onClick={handleAddComment}
                                                disabled={!newComment.trim()}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <Send className="w-3 h-3 mr-2" />
                                                Post Comment
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Comments List */}
                            {loadingComments ? (
                                <div className="text-center py-8 text-zinc-500">Loading comments...</div>
                            ) : comments.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500">
                                    No comments yet. Be the first to share your thoughts!
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {comments.map((comment) => (
                                        <div key={comment.id} className="flex gap-3">
                                            <Avatar className="w-9 h-9 bg-gradient-to-br from-zinc-600 to-zinc-700">
                                                <AvatarFallback className="text-white text-xs">
                                                    {getInitials(getDisplayName(comment))}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-sm font-medium text-zinc-300">
                                                            {getDisplayName(comment)}
                                                        </span>
                                                        <span className="text-xs text-zinc-600">
                                                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-zinc-400 leading-relaxed">{comment.content}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}