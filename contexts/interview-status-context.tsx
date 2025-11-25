"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

/**
 * Interview Status States:
 * - idle: No active interview (Red)
 * - pending: Interview session created, waiting for connection (Yellow)
 * - active: Interview is live with participants connected (Green)
 */
export type InterviewStatus = "idle" | "pending" | "active";

interface InterviewStatusContextType {
  status: InterviewStatus;
  setStatus: (status: InterviewStatus) => void;
  getStatusColor: () => string;
}

const InterviewStatusContext = createContext<InterviewStatusContextType | undefined>(undefined);

export function InterviewStatusProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage if available
  const [status, setStatusState] = useState<InterviewStatus>(() => {
    if (typeof window === 'undefined') return 'idle';
    const stored = localStorage.getItem('interviewStatus');
    if (stored && ['idle', 'pending', 'active'].includes(stored)) {
      return stored as InterviewStatus;
    }
    return 'idle';
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('interviewStatus', status);
  }, [status]);

  const setStatus = (newStatus: InterviewStatus) => {
    setStatusState(newStatus);
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'idle':
        return 'red'; // Red - Waiting/No active interview
      case 'pending':
        return 'yellow'; // Yellow - Session created, waiting for connection
      case 'active':
        return 'green'; // Green - Live interview
      default:
        return 'gray';
    }
  };

  return (
    <InterviewStatusContext.Provider
      value={{
        status,
        setStatus,
        getStatusColor,
      }}
    >
      {children}
    </InterviewStatusContext.Provider>
  );
}

export function useInterviewStatus() {
  const context = useContext(InterviewStatusContext);
  if (!context) {
    throw new Error('useInterviewStatus must be used within InterviewStatusProvider');
  }
  return context;
}
