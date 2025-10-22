"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Paperclip,
  X,
  Image as ImageIcon,
  File,
  Download,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  sender: "self" | "partner";
  senderName: string;
  timestamp: Date;
  type: "text" | "image" | "file" | "link";
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}

interface ChatBoxProps {
  sessionId: string;
  user: {
    name: string;
    email: string;
    avatar: string;
    user_id?: string;
  };
  onClose?: () => void;
}

export function ChatBox({ sessionId, user, onClose }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simulated real-time messaging
  // In production, use WebSocket or Supabase Realtime
  useEffect(() => {
    // Placeholder for real-time message listener
    // const subscription = supabase
    //   .channel(`session:${sessionId}`)
    //   .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'session_messages' }, handleNewMessage)
    //   .subscribe();

    return () => {
      // subscription.unsubscribe();
    };
  }, [sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !selectedFile) return;

    let newMessage: Message;

    if (selectedFile) {
      // Handle file upload
      newMessage = {
        id: `msg-${Date.now()}`,
        content: selectedFile.name,
        sender: "self",
        senderName: user.name,
        timestamp: new Date(),
        type: selectedFile.type.startsWith("image/") ? "image" : "file",
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileUrl: URL.createObjectURL(selectedFile), // In production, upload to storage first
      };

      // In production, upload file to Supabase Storage
      // const { data, error } = await supabase.storage
      //   .from('session-files')
      //   .upload(`${sessionId}/${selectedFile.name}`, selectedFile);

      setSelectedFile(null);
      toast.success("File sent!");
    } else {
      // Handle text message
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const isLink = urlRegex.test(inputValue);

      newMessage = {
        id: `msg-${Date.now()}`,
        content: inputValue,
        sender: "self",
        senderName: user.name,
        timestamp: new Date(),
        type: isLink ? "link" : "text",
      };
    }

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");

    // In production, save to database
    // await fetch('/api/mock-interview/messages', {
    //   method: 'POST',
    //   body: JSON.stringify({ sessionId, message: newMessage }),
    // });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Card className="h-full flex flex-col border-2 border-border/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="border-b border-border/20 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Chat
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <p>No messages yet</p>
                <p className="text-xs mt-1">Send a message to start the conversation</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.sender === "self" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] space-y-1",
                      message.sender === "self" ? "items-end" : "items-start"
                    )}
                  >
                    {/* Sender Name & Time */}
                    <div
                      className={cn(
                        "flex items-center gap-2 text-xs text-muted-foreground px-1",
                        message.sender === "self" ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <span className="font-medium">{message.senderName}</span>
                      <span>{formatTime(message.timestamp)}</span>
                    </div>

                    {/* Message Content */}
                    {message.type === "text" && (
                      <div
                        className={cn(
                          "px-4 py-2 rounded-2xl break-words",
                          message.sender === "self"
                            ? "bg-gradient-to-r from-brand to-blue-600 text-white"
                            : "bg-muted text-foreground"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    )}

                    {message.type === "link" && (
                      <div
                        className={cn(
                          "px-4 py-2 rounded-2xl break-words",
                          message.sender === "self"
                            ? "bg-gradient-to-r from-brand to-blue-600 text-white"
                            : "bg-muted text-foreground"
                        )}
                      >
                        <a
                          href={message.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline hover:no-underline flex items-center gap-1"
                        >
                          {message.content}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {message.type === "image" && (
                      <div className="rounded-lg overflow-hidden border border-border/20 max-w-xs">
                        <img
                          src={message.fileUrl}
                          alt={message.fileName}
                          className="w-full h-auto"
                        />
                        <div className="bg-muted p-2 flex items-center justify-between">
                          <span className="text-xs truncate">{message.fileName}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            asChild
                          >
                            <a href={message.fileUrl} download={message.fileName}>
                              <Download className="w-3 h-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}

                    {message.type === "file" && (
                      <div
                        className={cn(
                          "px-4 py-3 rounded-2xl border flex items-center gap-3 min-w-[240px]",
                          message.sender === "self"
                            ? "bg-brand/10 border-brand/20"
                            : "bg-muted border-border/20"
                        )}
                      >
                        <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                          <File className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{message.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {message.fileSize && formatFileSize(message.fileSize)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          asChild
                        >
                          <a href={message.fileUrl} download={message.fileName}>
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Typing Indicator */}
        {isTyping && (
          <div className="px-4 py-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="animate-bounce">•</span>
              <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>
                •
              </span>
              <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>
                •
              </span>
            </span>
          </div>
        )}

        {/* File Preview */}
        {selectedFile && (
          <div className="px-4 py-2 border-t border-border/20">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                {selectedFile.type.startsWith("image/") ? (
                  <ImageIcon className="w-5 h-5 text-brand" />
                ) : (
                  <File className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => setSelectedFile(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-border/20">
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </Button>

            <div className="flex-1 relative">
              <Input
                placeholder="Type a message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pr-12"
              />
            </div>

            <Button
              size="icon"
              className="h-10 w-10 flex-shrink-0 bg-gradient-to-r from-brand to-blue-600"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() && !selectedFile}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
