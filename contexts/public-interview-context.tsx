"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface PublicInterviewSession {
  // UUID for the row in public_interview_sessions
  publicSessionId: string;
  // Session code used by the mock interview (study_pod_sessions.metadata.session_id)
  sessionCode: string | null;
  role: "host" | "participant";
  isConnected: boolean;
  hasPendingRequests: boolean;
  // End time for the session (for timer)
  endTime?: string;
}

interface PublicJoinRequest {
  id: string;
  requesterName?: string;
  requesterUsername?: string;
  status: string;
  createdAt: string;
}

interface PublicInterviewContextType {
  activeSession: PublicInterviewSession | null;
  setActiveSession: (session: PublicInterviewSession | null) => void;
  isWindowOpen: boolean;
  setIsWindowOpen: (open: boolean) => void;
  toggleWindow: () => void;
  pendingRequests: PublicJoinRequest[];
}

const PublicInterviewContext = createContext<PublicInterviewContextType | undefined>(undefined);

export function PublicInterviewProvider({ children }: { children: React.ReactNode }) {
  // Initialize state from localStorage
  const [activeSession, setActiveSession] = useState<PublicInterviewSession | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('publicInterviewSession');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Backwards compatibility: old shape only stored sessionId (public session id)
        if (parsed && typeof parsed === 'object') {
          return {
            publicSessionId: parsed.publicSessionId || parsed.sessionId,
            sessionCode: parsed.sessionCode ?? null,
            role: parsed.role,
            isConnected: parsed.isConnected ?? false,
            hasPendingRequests: parsed.hasPendingRequests ?? false,
            endTime: parsed.endTime,
          } as PublicInterviewSession;
        }
      } catch (e) {
        localStorage.removeItem('publicInterviewSession');
        return null;
      }
    }
    return null;
  });

  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PublicJoinRequest[]>([]);

  // Persist to localStorage whenever activeSession changes
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem('publicInterviewSession', JSON.stringify(activeSession));
    } else {
      localStorage.removeItem('publicInterviewSession');
    }
  }, [activeSession]);

  const toggleWindow = () => {
    setIsWindowOpen(!isWindowOpen);
  };

  // Poll for pending requests when host has active session
  useEffect(() => {
    if (!activeSession || activeSession.role !== "host") {
      setPendingRequests([]);
      return;
    }

    const checkPendingRequests = async () => {
      try {
        const response = await fetch(
          `/api/mock-interview/public-sessions/requests?sessionId=${activeSession.publicSessionId}`
        );
        if (response.ok) {
          const data = await response.json();
          const pending = (data.requests || []).filter((r: any) => r.status === 'pending');
          setPendingRequests(pending);

          const hasPending = pending.length > 0;

          // Update if pending status changed
          setActiveSession((current) => {
            if (!current) return null;
            if (
              current.hasPendingRequests === hasPending &&
              current.publicSessionId === activeSession.publicSessionId
            ) {
              return current;
            }

            return {
              ...current,
              hasPendingRequests: hasPending,
            };
          });
        }
      } catch (error) {
        console.error('Error checking pending requests:', error);
      }
    };

    // Check immediately
    checkPendingRequests();

    // Then poll every 5 seconds
    const interval = setInterval(checkPendingRequests, 5000);
    return () => clearInterval(interval);
  }, [activeSession]);

  return (
    <PublicInterviewContext.Provider
      value={{
        activeSession,
        setActiveSession,
        isWindowOpen,
        setIsWindowOpen,
        toggleWindow,
        pendingRequests,
      }}
    >
      {children}
    </PublicInterviewContext.Provider>
  );
}

export function usePublicInterview() {
  const context = useContext(PublicInterviewContext);
  if (!context) {
    throw new Error('usePublicInterview must be used within PublicInterviewProvider');
  }
  return context;
}
