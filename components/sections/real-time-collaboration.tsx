// src/components/sections/real-time-collaboration.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mockUsers = [
  {
    id: 1,
    name: "Sarah Chen",
    avatar: "https://images.pexels.com/photos/5876695/pexels-photo-5876695.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
    university: "MIT",
    status: "online",
    cursorColor: "#10b981"
  },
  {
    id: 2,
    name: "Alex Rivera",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    university: "Stanford",
    status: "online",
    cursorColor: "#3b82f6"
  },
  {
    id: 3,
    name: "Jordan Kim",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face",
    university: "UC Berkeley",
    status: "typing",
    cursorColor: "#f59e0b"
  }
];

// Define the collaborative editing sequence
const editingSequence = [
  {
    type: "type",
    user: 1,
    delay: 1000,
    text: `def two_sum(nums, target):
    # TODO: Implement this function
    pass`,
    cursorPos: { x: 15, y: 15 }
  },
  {
    type: "chat",
    user: 1,
    delay: 1500,
    message: "Let's start with the basic function structure"
  },
  {
    type: "delete",
    user: 1,
    delay: 2000,
    deleteText: "# TODO: Implement this function",
    cursorPos: { x: 15, y: 25 }
  },
  {
    type: "type",
    user: 1,
    delay: 500,
    text: "# Sarah: Let's start with a brute force approach",
    cursorPos: { x: 15, y: 25 }
  },
  {
    type: "delete",
    user: 1,
    delay: 1000,
    deleteText: "pass",
    cursorPos: { x: 15, y: 35 }
  },
  {
    type: "type",
    user: 1,
    delay: 500,
    text: `for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []`,
    cursorPos: { x: 15, y: 35 }
  },
  {
    type: "chat",
    user: 2,
    delay: 2000,
    message: "That works but it's O(n²). Can we optimize it?"
  },
  {
    type: "type",
    user: 2,
    delay: 1000,
    text: `
    # Alex: This is O(n²) - we can do better with a hash map`,
    cursorPos: { x: 15, y: 30 }
  },
  {
    type: "chat",
    user: 1,
    delay: 1500,
    message: "Good point! Let me refactor this"
  },
  {
    type: "delete",
    user: 1,
    delay: 2000,
    deleteText: `for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]`,
    cursorPos: { x: 15, y: 45 }
  },
  {
    type: "type",
    user: 1,
    delay: 500,
    text: `seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i`,
    cursorPos: { x: 15, y: 45 }
  },
  {
    type: "type",
    user: 2,
    delay: 1000,
    text: "  # Alex: Store the value and its index",
    cursorPos: { x: 25, y: 75 }
  },
  {
    type: "chat",
    user: 3,
    delay: 1500,
    message: "Nice! Should we add some test cases?"
  },
  {
    type: "type",
    user: 3,
    delay: 2000,
    text: `

# Jordan: Let's add test cases to verify our solution
def test_two_sum():
    assert two_sum([2, 7, 11, 15], 9) == [0, 1]
    assert two_sum([3, 2, 4], 6) == [1, 2]
    assert two_sum([3, 3], 6) == [0, 1]
    print("All tests passed!")`,
    cursorPos: { x: 30, y: 85 }
  },
  {
    type: "chat",
    user: 1,
    delay: 1000,
    message: "Perfect! Now we have O(n) time complexity"
  },
  {
    type: "chat",
    user: 2,
    delay: 800,
    message: "Great collaboration team! 🎉"
  }
];

const initialChatMessages = [
  { id: 1, user: "System", message: "Collaborative session started", time: "2:30 PM", type: "system" }
];

export default function RealTimeCollaboration({ className }: { className?: string }) {
  const [activeUsers, setActiveUsers] = useState(mockUsers);
  const [messages, setMessages] = useState(initialChatMessages);
  const [currentCode, setCurrentCode] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<number | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{x: number, y: number} | null>(null);
  const [currentlyTypingText, setCurrentlyTypingText] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [showNewMessageNotification, setShowNewMessageNotification] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Handle mouse move for ambient lighting
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Handle user sending a message
  const handleSendMessage = () => {
    if (!userMessage.trim()) return;

    const newMessage = {
      id: messages.length + Math.random(),
      user: "You",
      message: userMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: "message" as const,
      isUserMessage: true
    };

    setMessages(prev => [...prev, newMessage]);
    setUserMessage("");
    setShowNewMessageNotification(true);

    // Auto-hide notification after 3 seconds
    setTimeout(() => setShowNewMessageNotification(false), 3000);

    // Smooth scroll to bottom
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  // Smooth progressive character-by-character typing with RAF
  const typeTextProgressively = async (text: string, speed = 50) => {
    const baseCode = currentCode;
    setCurrentlyTypingText("");

    return new Promise<void>((resolve) => {
      let i = 0;
      const charsPerFrame = text.length > 100 ? 2 : 1; // Type faster for longer text

      const typeNextChars = () => {
        if (i >= text.length) {
          setCurrentCode(baseCode + text);
          setCurrentlyTypingText("");
          resolve();
          return;
        }

        // Type multiple characters per frame for smoother animation
        i += charsPerFrame;
        const typedSoFar = text.slice(0, Math.min(i, text.length));
        setCurrentlyTypingText(typedSoFar);

        // Use variable speed for natural typing rhythm
        const variance = Math.random() * 20 - 10;
        setTimeout(typeNextChars, speed + variance);
      };

      typeNextChars();
    });
  };

  // Smooth progressive character-by-character deletion
  const deleteTextProgressively = async (textToDelete: string, speed = 20) => {
    const codeBeforeDeletion = currentCode;
    const deleteStartIndex = codeBeforeDeletion.lastIndexOf(textToDelete);

    if (deleteStartIndex === -1) return;

    const beforeDeleteText = codeBeforeDeletion.slice(0, deleteStartIndex);
    const afterDeleteText = codeBeforeDeletion.slice(deleteStartIndex + textToDelete.length);

    return new Promise<void>((resolve) => {
      let i = textToDelete.length;
      const charsPerFrame = textToDelete.length > 50 ? 3 : 2; // Delete faster for longer text

      const deleteNextChars = () => {
        if (i <= 0) {
          setCurrentCode(beforeDeleteText + afterDeleteText);
          resolve();
          return;
        }

        i -= charsPerFrame;
        const remainingText = textToDelete.slice(0, Math.max(i, 0));
        setCurrentCode(beforeDeleteText + remainingText + afterDeleteText);

        setTimeout(deleteNextChars, speed);
      };

      deleteNextChars();
    });
  };

  // Execute the editing sequence
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const executeStep = async () => {
      if (currentStep >= editingSequence.length) {
        // Smooth reset with fade out
        setTimeout(() => {
          setIsTyping(false);
          setTypingUser(null);
          setCursorPosition(null);

          // Fade reset after a pause
          setTimeout(() => {
            setCurrentStep(0);
            setCurrentCode("");
            setMessages(initialChatMessages);
            setCurrentlyTypingText("");
          }, 500);
        }, 4000);
        return;
      }

      const step = editingSequence[currentStep];
      
      await new Promise(resolve => setTimeout(resolve, step.delay));

      if (step.type === "type") {
        setTypingUser(step.user);
        setCursorPosition(step.cursorPos || null);
        setIsTyping(true);

        // Update user status
        setActiveUsers(prev => prev.map(user => 
          user.id === step.user 
            ? { ...user, status: "typing" }
            : { ...user, status: "online" }
        ));

        await typeTextProgressively(step.text || '', 45);

        setIsTyping(false);
        setTypingUser(null);
        
        // Reset user status
        setActiveUsers(prev => prev.map(user => 
          ({ ...user, status: "online" })
        ));
      }
      else if (step.type === "delete") {
        setTypingUser(step.user);
        setCursorPosition(step.cursorPos || null);
        setIsTyping(true);

        // Update user status
        setActiveUsers(prev => prev.map(user =>
          user.id === step.user
            ? { ...user, status: "typing" }
            : { ...user, status: "online" }
        ));

        await deleteTextProgressively(step.deleteText || '', 18);

        setIsTyping(false);
        setTypingUser(null);
        
        // Reset user status
        setActiveUsers(prev => prev.map(user => 
          ({ ...user, status: "online" })
        ));
      }
      else if (step.type === "chat") {
        const newMessage = {
          id: messages.length + Math.random(),
          user: mockUsers.find(u => u.id === step.user)?.name || "Unknown",
          message: step.message || '',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: "message" as const,
          isUserMessage: false
        };
        setMessages(prev => [...prev, newMessage]);

        // Show notification for new messages
        setShowNewMessageNotification(true);
        setTimeout(() => setShowNewMessageNotification(false), 3000);

        // Smooth scroll to bottom when new message arrives
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
              top: chatContainerRef.current.scrollHeight,
              behavior: 'smooth'
            });
          }
        }, 100);
      }

      setCurrentStep(prev => prev + 1);
    };

    timeoutId = setTimeout(executeStep, 100);
    return () => clearTimeout(timeoutId);
  }, [currentStep, currentCode, messages.length]);

  return (
    <section className={cn("py-20 relative overflow-hidden", className)}>
      {/* Enhanced glassmorphism glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-[520px] h-[520px] bg-brand/9 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 right-1/3 w-[480px] h-[480px] bg-green-500/8 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '5s' }} />
        <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-blue-500/6 rounded-full blur-[80px] animate-float" style={{ animationDelay: '1s' }} />
      </div>

      {/* Animated beam lines */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-px bg-gradient-to-b from-transparent via-brand/30 to-transparent animate-pulse"
            style={{
              left: `${15 + i * 17}%`,
              height: '100%',
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${2 + i * 0.3}s`
            }}
          />
        ))}
      </div>

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,224,194,0.03)_0%,transparent_70%)]" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Enhanced Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <Badge className="mb-6 bg-brand/10 border-brand/20 text-brand hover:bg-brand/20 transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse" />
              Live Collaboration
            </div>
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground to-brand bg-clip-text text-transparent leading-tight">
            Code Together in Real-Time
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
            Practice with peers, conduct mock interviews, and solve problems together with live code sharing,
            real-time chat, and synchronized cursor tracking.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Enhanced Active Users Card */}
          <Card className="lg:col-span-1 relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-2xl overflow-hidden group hover:border-green-500/30 transition-all duration-500 shadow-xl">
            {/* Top gradient accent */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

            {/* Floating particles */}
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-green-500/30 rounded-full opacity-40 animate-float"
                style={{
                  left: `${30 + i * 40}%`,
                  top: `${20 + i * 30}%`,
                  animationDelay: `${i * 0.7}s`,
                  animationDuration: `${4 + i * 0.5}s`
                }}
              />
            ))}

            <CardHeader className="relative z-10">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <div className="relative">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse relative z-10" />
                  <div className="absolute inset-0 bg-green-500/30 rounded-full blur-md animate-pulse" />
                </div>
                <span>Online ({activeUsers.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 relative z-10">
              {activeUsers.map((user) => {
                const isCurrentlyTyping = typingUser === user.id;
                return (
                  <div
                    key={user.id}
                    className={cn(
                      "relative flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 overflow-hidden group/user",
                      isCurrentlyTyping
                        ? "bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/30"
                        : "bg-gradient-to-br from-muted/30 to-muted/10 border border-border/20 hover:border-brand/30"
                    )}
                  >
                    {isCurrentlyTyping && (
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent opacity-100 transition-opacity duration-300" />
                    )}

                    <div className="relative flex-shrink-0">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className={cn(
                          "w-11 h-11 rounded-full object-cover ring-2 transition-all duration-300",
                          isCurrentlyTyping ? "ring-orange-500/40 scale-105" : "ring-transparent group-hover/user:ring-brand/20"
                        )}
                      />
                      <div
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background transition-all duration-300",
                          isCurrentlyTyping ? "bg-orange-500 animate-pulse scale-110" : "bg-green-500"
                        )}
                        style={{
                          boxShadow: isCurrentlyTyping ? '0 0 10px rgba(249, 115, 22, 0.6)' : '0 0 6px rgba(34, 197, 94, 0.4)'
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="font-semibold text-sm">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.university}</div>
                      {isCurrentlyTyping && (
                        <div className="text-xs text-orange-500 mt-1.5 flex items-center gap-1.5 animate-in fade-in slide-in-from-left-1 duration-200 font-medium">
                          <div className="flex gap-0.5">
                            <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{ animationDuration: '0.6s' }} />
                            <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }} />
                            <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '0.6s' }} />
                          </div>
                          <span>typing...</span>
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <div
                        className="w-3 h-3 rounded-full ring-2 ring-background"
                        style={{ backgroundColor: user.cursorColor }}
                        title="Cursor color"
                      />
                      <div
                        className="absolute inset-0 rounded-full blur-sm opacity-50"
                        style={{ backgroundColor: user.cursorColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Enhanced Live Code Editor */}
          <Card className="lg:col-span-2 relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-2xl overflow-hidden group hover:border-blue-500/30 transition-all duration-500 shadow-xl">
            {/* Top gradient accent */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

            {/* Floating particles */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-blue-500/30 rounded-full opacity-40 animate-float"
                style={{
                  left: `${20 + i * 30}%`,
                  top: `${15 + i * 25}%`,
                  animationDelay: `${i * 0.7}s`,
                  animationDuration: `${4 + i * 0.5}s`
                }}
              />
            ))}

            <CardHeader className="pb-3 relative z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="relative">
                    <svg className="w-5 h-5 text-blue-500 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 3a1 1 0 0 0-1 1v3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-3V4a1 1 0 0 0-1-1H8zM9 5h6v2H9V5zm-4 4h14v6H5V9z"/>
                    </svg>
                    <div className="absolute inset-0 bg-blue-500/20 blur-lg" />
                  </div>
                  <span>two_sum.py</span>
                  {isTyping && (
                    <div className="flex items-center gap-1.5 ml-2 px-2 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                      <span className="text-xs text-orange-500 font-semibold">Live editing</span>
                    </div>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                  <div className="relative">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse relative z-10" />
                    <div className="absolute inset-0 bg-green-500/30 rounded-full blur-sm animate-pulse" />
                  </div>
                  <span className="text-xs text-green-500 font-semibold">Auto-sync</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="relative">
                {/* Enhanced Code Editor with FIXED HEIGHT to prevent jittering */}
                <div className="relative bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl p-5 border border-border/30 overflow-auto h-[450px] font-mono backdrop-blur-sm group/code hover:border-brand/20 transition-all duration-300">
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand/20 to-transparent opacity-0 group-hover/code:opacity-100 transition-opacity duration-500" />
                  <pre className="text-sm leading-relaxed whitespace-pre-wrap">
                    <code className="text-foreground">
                      {currentCode}
                      {currentlyTypingText && (
                        <span className="text-foreground">{currentlyTypingText}</span>
                      )}
                      {isTyping && (
                        <span className="inline-block w-0.5 h-4 bg-foreground align-middle animate-pulse ml-0.5" style={{ animationDuration: '1s' }}></span>
                      )}
                    </code>
                  </pre>

                  {/* Live cursor with smooth transitions */}
                  {typingUser && cursorPosition && (
                    <div
                      className="absolute pointer-events-none z-10 transition-all duration-200 ease-out"
                      style={{
                        left: `${cursorPosition.x}%`,
                        top: `${cursorPosition.y}%`,
                        transform: 'translate(-2px, -2px)',
                      }}
                    >
                      <div
                        className="w-0.5 h-5 rounded-full animate-pulse"
                        style={{
                          backgroundColor: mockUsers.find(u => u.id === typingUser)?.cursorColor,
                          boxShadow: `0 0 8px ${mockUsers.find(u => u.id === typingUser)?.cursorColor}40`
                        }}
                      />
                      <div
                        className="text-xs font-medium text-white px-2 py-0.5 rounded-md mt-1 whitespace-nowrap shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-1 duration-200"
                        style={{
                          backgroundColor: mockUsers.find(u => u.id === typingUser)?.cursorColor,
                          boxShadow: `0 2px 8px ${mockUsers.find(u => u.id === typingUser)?.cursorColor}60`
                        }}
                      >
                        {mockUsers.find(u => u.id === typingUser)?.name}
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced Action buttons */}
                <div className="flex items-center justify-between mt-5">
                  <div className="flex gap-3">
                    <button className="relative px-5 py-2.5 rounded-2xl font-semibold text-sm bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-500 border border-green-500/40 hover:border-green-500/60 transition-all duration-300 cursor-pointer hover:scale-[1.02] shadow-lg hover:shadow-green-500/20 overflow-hidden group/run">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-green-600/10 opacity-0 group-hover/run:opacity-100 transition-opacity duration-300" />
                      <span className="relative z-10 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                        Run Code
                      </span>
                    </button>
                    <button className="relative px-5 py-2.5 rounded-2xl font-semibold text-sm bg-gradient-to-r from-muted/30 to-muted/20 text-muted-foreground border border-border/30 hover:border-brand/30 transition-all duration-300 cursor-pointer hover:scale-[1.02] overflow-hidden group/voice">
                      <div className="absolute inset-0 bg-gradient-to-r from-brand/5 to-transparent opacity-0 group-hover/voice:opacity-100 transition-opacity duration-300" />
                      <span className="relative z-10 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                        </svg>
                        Voice Chat
                      </span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/40 backdrop-blur-sm border border-border/20 text-xs">
                    <div className="relative">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse relative z-10" />
                      <div className="absolute inset-0 bg-green-500/30 rounded-full blur-sm animate-pulse" />
                    </div>
                    <span className="text-muted-foreground font-medium">
                      {isTyping ? "Saving changes..." : "All changes saved"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Team Chat Section */}
        <Card
          ref={cardRef}
          onMouseMove={handleMouseMove}
          className="mt-8 max-w-6xl mx-auto relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-2xl overflow-hidden group hover:border-brand/30 transition-all duration-500 shadow-xl"
        >
          {/* Ambient light following cursor */}
          <div
            className="absolute w-96 h-96 rounded-full blur-3xl opacity-15 transition-all duration-300 pointer-events-none"
            style={{
              background: `radial-gradient(circle, rgba(255, 224, 194, 0.15) 0%, transparent 70%)`,
              left: mousePosition.x - 192,
              top: mousePosition.y - 192,
            }}
          />

          {/* Top gradient accent */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

          {/* Floating particles */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-brand/30 rounded-full opacity-40 animate-float"
              style={{
                left: `${25 + i * 30}%`,
                top: `${20 + i * 25}%`,
                animationDelay: `${i * 0.8}s`,
                animationDuration: `${4 + i * 0.6}s`
              }}
            />
          ))}

          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <div className="relative">
                  <svg className="w-5 h-5 text-brand relative z-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  <div className="absolute inset-0 bg-brand/20 blur-lg animate-pulse" />
                </div>
                <span>Team Chat</span>
                <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700 border-blue-300 text-xs">
                  {messages.length} messages
                </Badge>
              </CardTitle>

              {/* New Message Notification */}
              {showNewMessageNotification && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-brand/20 to-orange-300/20 border border-brand/40 animate-in slide-in-from-top-2 fade-in duration-300">
                  <div className="relative">
                    <div className="w-2 h-2 bg-brand rounded-full animate-ping absolute" />
                    <div className="w-2 h-2 bg-brand rounded-full" />
                  </div>
                  <span className="text-xs font-semibold text-brand">New message!</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div ref={chatContainerRef} className="space-y-2.5 max-h-64 overflow-y-auto scroll-smooth pr-2">
              {messages.map((msg, idx) => {
                const user = mockUsers.find(u => u.name === msg.user);
                const isUserMsg = (msg as any).isUserMessage;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "relative flex items-start gap-3 p-4 rounded-2xl transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-2 overflow-hidden group/msg",
                      msg.type === 'system'
                        ? "bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30"
                        : isUserMsg
                          ? "bg-gradient-to-br from-brand/10 to-orange-300/5 border border-brand/30"
                          : "bg-gradient-to-br from-muted/30 to-muted/10 border border-border/20 hover:border-brand/30"
                    )}
                    style={{
                      animationDelay: `${idx * 30}ms`,
                      animationDuration: '400ms',
                      animationFillMode: 'both'
                    }}
                  >
                    {/* Hover glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-brand/5 to-transparent opacity-0 group-hover/msg:opacity-100 transition-opacity duration-300" />

                    {msg.type !== 'system' && (user || isUserMsg) && (
                      <div className="relative">
                        {user && (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-brand/30 flex-shrink-0"
                          />
                        )}
                        {isUserMsg && (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-orange-300 flex items-center justify-center font-bold text-black text-sm ring-2 ring-brand/30">
                            Y
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={cn(
                          "font-semibold text-sm truncate",
                          msg.type === 'system' && "text-blue-500",
                          isUserMsg && "text-brand"
                        )}>
                          {msg.user}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{msg.time}</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Enhanced Message Input */}
            <div className="mt-5 pt-5 border-t border-border/20">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 text-sm bg-gradient-to-br from-muted/30 to-muted/10 border border-border/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all duration-300 backdrop-blur-sm placeholder:text-muted-foreground/50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!userMessage.trim()}
                  className="relative px-6 py-3 rounded-2xl font-semibold text-sm overflow-hidden transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg hover:shadow-xl hover:shadow-brand/30"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-brand to-orange-300" />
                  <div className="absolute inset-0 bg-gradient-to-r from-brand via-orange-300 to-brand opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[length:200%_100%] animate-shimmer" />
                  <span className="relative z-10 flex items-center gap-2 text-black">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                    Send
                  </span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Collaboration Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="m2 17 10 5 10-5"/>
                  <path d="m2 12 10 5 10-5"/>
                </svg>
              ),
              title: "Real-time Sync",
              description: "Changes appear instantly for all participants with zero lag",
              color: "from-blue-500/20 to-blue-600/10",
              iconColor: "text-blue-500",
              glowColor: "rgba(59, 130, 246, 0.15)"
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
              ),
              title: "Voice & Video",
              description: "Built-in communication tools for seamless pair programming",
              color: "from-green-500/20 to-emerald-500/10",
              iconColor: "text-green-500",
              glowColor: "rgba(34, 197, 94, 0.15)"
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              ),
              title: "Session Recording",
              description: "Save and review your practice sessions for continuous improvement",
              color: "from-purple-500/20 to-pink-500/10",
              iconColor: "text-purple-500",
              glowColor: "rgba(168, 85, 247, 0.15)"
            }
          ].map((feature, index) => (
            <Card
              key={index}
              className="relative border-2 border-border/20 bg-gradient-to-br from-card/40 via-card/20 to-transparent backdrop-blur-xl text-center p-8 group hover:border-brand/30 transition-all duration-500 overflow-hidden hover:scale-[1.02] shadow-lg hover:shadow-xl"
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              {/* Top gradient accent */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Background glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl"
                style={{ background: `radial-gradient(circle at center, ${feature.glowColor}, transparent 70%)` }}
              />

              {/* Icon */}
              <div className={cn(
                "relative w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-500 group-hover:scale-110",
                "bg-gradient-to-br backdrop-blur-lg border border-border/30 group-hover:border-brand/40",
                feature.color
              )}>
                <div className="relative z-10">
                  <div className={cn("relative", feature.iconColor)}>
                    {feature.icon}
                  </div>
                </div>
                {/* Icon glow */}
                <div
                  className="absolute inset-0 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ backgroundColor: feature.glowColor }}
                />
              </div>

              <div className="relative z-10">
                <h3 className="font-bold mb-3 text-lg group-hover:text-brand transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Bottom shine */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}