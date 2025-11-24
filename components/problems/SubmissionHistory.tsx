import React, { useState, useEffect } from 'react';
import { X, Clock, Cpu, HardDrive, Calendar, CheckCircle, XCircle, AlertCircle, Code, Copy } from 'lucide-react';
import ComplexityResultDisplay from '@/components/ui/complexity-result-display';

// Type definitions
interface Submission {
  id: string;
  problem_id: string;
  problem_title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  status: 'Accepted' | 'Wrong Answer' | string;
  submitted_at: string;
  runtime?: number;
  memory?: number;
  language?: string;
  code?: string;
  time_complexity?: string;
  complexity_confidence?: number;
  complexity_analysis?: string;
}

interface SubmissionWithNumber extends Submission {
  number: number;
}

interface SubmissionHistoryProps {
  allOfUsersSubmissions: Submission[];
  onCopyToEditor?: (code: string) => void;
}

// Extend Window interface for Prism
declare global {
  interface Window {
    Prism?: {
      highlightAll: () => void;
    };
  }
}

export default function SubmissionHistory({ allOfUsersSubmissions, onCopyToEditor }: SubmissionHistoryProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithNumber | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    // Load Prism.js CSS and JS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js';
    script.async = true;
    document.body.appendChild(script);

    // Load language components
    const languages = ['python', 'javascript', 'typescript', 'java', 'c', 'cpp', 'csharp', 'go', 'rust'];
    const languageScripts = languages.map(lang => {
      const langScript = document.createElement('script');
      langScript.src = `https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-${lang}.min.js`;
      langScript.async = true;
      document.body.appendChild(langScript);
      return langScript;
    });

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
      languageScripts.forEach(s => document.body.removeChild(s));
    };
  }, []);

  useEffect(() => {
    // Highlight code when modal opens
    if (selectedSubmission && window.Prism) {
      
      // Small delay to ensure Prism and language components are loaded
      setTimeout(() => {
        window.Prism?.highlightAll();
      }, 100);
    }
  }, [selectedSubmission]);

  const handleCopyToEditor = () => {
    if (selectedSubmission?.code && onCopyToEditor) {
      onCopyToEditor(selectedSubmission.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusIcon = (status: string): React.ReactElement => {
    if (status === "Accepted") return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (status === "Wrong Answer") return <XCircle className="w-5 h-5 text-red-400" />;
    return <AlertCircle className="w-5 h-5 text-yellow-400" />;
  };

  const getStatusColor = (status: string): string => {
    if (status === "Accepted") return "text-green-400";
    if (status === "Wrong Answer") return "text-red-400";
    return "text-yellow-400";
  };

  const getDifficultyColor = (difficulty: string): string => {
    if (difficulty === "Easy") return "text-green-400";
    if (difficulty === "Medium") return "text-yellow-400";
    if (difficulty === "Hard") return "text-red-400";
    return "text-gray-400";
  };

  return (
    <div className="space-y-4">
      {allOfUsersSubmissions && allOfUsersSubmissions.length > 0 ? (
        allOfUsersSubmissions.map((submission, index) => {
          const submissionNumber = allOfUsersSubmissions.length - index;
          return (
            <div
              key={submission.id}
              onClick={() => setSelectedSubmission({ ...submission, number: submissionNumber })}
              className="relative border border-zinc-800/50 rounded-xl p-5 bg-zinc-900/40 backdrop-blur-sm hover:bg-zinc-800/50 hover:border-zinc-700/50 transition-all duration-300 cursor-pointer group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300" />
              
              <div className="relative flex justify-between items-center">
                <div className="flex items-center gap-4">
                  {getStatusIcon(submission.status)}
                  <div className="flex flex-col gap-1">
                    <span className="text-base font-semibold text-white">
                      Submission #{submissionNumber}
                    </span>
                  <span className="text-xs text-gray-500">
                    {submission.submitted_at
                      ? new Date(submission.submitted_at).toLocaleString()
                      : "Date not available"}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <span className={`text-sm font-semibold ${getStatusColor(submission.status)}`}>
                  {submission.status || "Unknown"}
                </span>
                {submission.time_complexity && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                      {submission.time_complexity}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{submission.runtime ? submission.runtime.toFixed(3) : "N/A"}s</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <HardDrive className="w-4 h-4" />
                  <span className="text-sm">{submission.memory ? (submission.memory / 1024).toFixed(2) : "N/A"} MB</span>
                </div>
              </div>
            </div>
          </div>
        )})
      ) : (
        <p className="text-sm text-gray-500 text-center py-8">
          Your submission history will appear here.
        </p>
      )}

      {/* Glassmorphism Modal */}
      {selectedSubmission && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setSelectedSubmission(null)}
        >
          <div 
            className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 rounded-2xl pointer-events-none" />
            
            {/* Header */}
            <div className="relative sticky top-0 bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800/50 p-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(selectedSubmission.status)}
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Submission #{selectedSubmission.number}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {selectedSubmission.problem_title} • <span className={getDifficultyColor(selectedSubmission.difficulty)}>{selectedSubmission.difficulty}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(selectedSubmission.submitted_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-2 hover:bg-zinc-800/50 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400 hover:text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="relative p-6 space-y-6">
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border ${
                selectedSubmission.status === "Accepted" 
                  ? "bg-green-500/10 border-green-500/30" 
                  : selectedSubmission.status === "Wrong Answer"
                  ? "bg-red-500/10 border-red-500/30"
                  : "bg-yellow-500/10 border-yellow-500/30"
              }`}>
                <p className={`text-lg font-semibold ${getStatusColor(selectedSubmission.status)}`}>
                  {selectedSubmission.status}
                </p>
              </div>

              {/* Complexity Analysis */}
              {selectedSubmission.time_complexity && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-white">Algorithm Complexity Analysis:</h4>
                  <ComplexityResultDisplay
                    detectedComplexity={selectedSubmission.time_complexity}
                    confidence={selectedSubmission.complexity_confidence}
                    analysis={selectedSubmission.complexity_analysis}
                    layout="horizontal"
                    animated={true}
                  />
                </div>
              )}

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard
                  icon={<Clock className="w-5 h-5" />}
                  label="Runtime"
                  value={`${selectedSubmission.runtime ? selectedSubmission.runtime.toFixed(3) : "N/A"}s`}
                />
                <StatCard
                  icon={<HardDrive className="w-5 h-5" />}
                  label="Memory"
                  value={`${selectedSubmission.memory ? (selectedSubmission.memory / 1024).toFixed(2) : "N/A"} MB`}
                  subtext={`${selectedSubmission.memory || "N/A"} KB`}
                />
                <StatCard
                  icon={<Code className="w-5 h-5" />}
                  label="Language"
                  value={selectedSubmission.language || "N/A"}
                />
              </div>

              {/* Code Section */}
              {selectedSubmission.code && (
                <div className="border border-zinc-700/30 bg-zinc-800/30 rounded-xl overflow-hidden">
                  <div className="bg-zinc-800/50 px-4 py-3 border-b border-zinc-700/30 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">Submitted Code</h4>
                    <button
                      onClick={handleCopyToEditor}
                      className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 rounded-lg text-purple-400 hover:text-purple-300 text-sm font-medium transition-all duration-200"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy to Editor
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-4 overflow-x-auto">
                    <pre className="!bg-transparent !m-0 !p-0">
                      <code className={`language-${selectedSubmission.language?.toLowerCase() || 'python'}`}>
                        {selectedSubmission.code}
                      </code>
                    </pre>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t border-zinc-800/50 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Submission ID:</span>
                  <p className="font-mono text-gray-400 mt-1">{selectedSubmission.id}</p>
                </div>
                <div>
                  <span className="text-gray-500">Problem ID:</span>
                  <p className="font-mono text-gray-400 mt-1">{selectedSubmission.problem_id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactElement;
  label: string;
  value: string;
  subtext?: string;
}

function StatCard({ icon, label, value, subtext }: StatCardProps) {
  return (
    <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-purple-400">{icon}</div>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <p className="text-xl font-semibold text-white">{value}</p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}