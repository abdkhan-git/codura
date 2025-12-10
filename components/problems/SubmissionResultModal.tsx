import React from 'react';
import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import ComplexityResultDisplay from '@/components/ui/complexity-result-display';

// Type definitions matching the SubmissionResult from CodeEditorPanel
interface TestcaseResult {
  actual?: any;
  actualOutput?: any;
  expected?: any;
  expectedOutput?: any;
  input?: any;
  message?: string;
  status?: 'pass' | 'fail' | 'error';
  passed?: boolean;
  testNumber?: number;
  executionTime?: number | string;
  stdout?: string;
  stderr?: string;
  error?: string;
}

interface SubmissionResult {
  status: string;
  description: string;
  testResults?: TestcaseResult[];
  totalTests?: number;
  passedTests?: number;
  memory?: string;
  runtime?: string;
  timeComplexity?: string;
  complexityConfidence?: number;
  complexityAnalysis?: string;
  spaceComplexity?: string;
  spaceConfidence?: number;
  spaceAnalysis?: string;
  timeComplexitySnippets?: string[];
  spaceComplexitySnippets?: string[];
}

interface SubmissionResultModalProps {
  submissionResult: SubmissionResult;
  isOpen: boolean;
  onClose: () => void;
}

export default function SubmissionResultModal({
  submissionResult,
  isOpen,
  onClose
}: SubmissionResultModalProps) {
  if (!isOpen) return null;

  const isSuccess =
    submissionResult.status === 'Accepted' ||
    submissionResult.passedTests === submissionResult.totalTests;

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

  const isPassed = (r: TestcaseResult) => {
    if (typeof r.passed === 'boolean') return r.passed;
    if (typeof r.status === 'string') return r.status === 'pass';
    return false;
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={onClose}
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
              {getStatusIcon(submissionResult.status)}
              <div>
                <h3 className="text-xl font-bold text-white">
                  Submission Result
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {submissionResult.passedTests || 0} / {submissionResult.totalTests || 0} test cases passed
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
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
            isSuccess
              ? "bg-green-500/10 border-green-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}>
            <p className={`text-lg font-semibold ${getStatusColor(submissionResult.status)}`}>
              {submissionResult.status}
            </p>
            {submissionResult.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {submissionResult.description}
              </p>
            )}
          </div>

          {/* Time Complexity Analysis */}
          {submissionResult.timeComplexity && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-white">Time Complexity Analysis</h4>
              <ComplexityResultDisplay
                detectedComplexity={submissionResult.timeComplexity}
                confidence={submissionResult.complexityConfidence}
                analysis={submissionResult.complexityAnalysis}
                layout="horizontal"
                animated={true}
                complexitySnippets={submissionResult.timeComplexitySnippets}
              />
            </div>
          )}

          {/* Space Complexity Analysis */}
          {submissionResult.spaceComplexity && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-white">Space Complexity Analysis</h4>
              <ComplexityResultDisplay
                detectedComplexity={submissionResult.spaceComplexity}
                confidence={submissionResult.spaceConfidence}
                analysis={submissionResult.spaceAnalysis}
                layout="horizontal"
                animated={true}
                complexityType="space"
                complexitySnippets={submissionResult.spaceComplexitySnippets}
              />
            </div>
          )}

          {/* Test Case Results */}
          {submissionResult.testResults && submissionResult.testResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-white">Test Case Results:</h4>
              {submissionResult.testResults.map((result, index) => (
                <TestResultCard key={index} result={result} index={index} isPassed={isPassed(result)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TestResultCardProps {
  result: TestcaseResult;
  index: number;
  isPassed: boolean;
}

function TestResultCard({ result, index, isPassed }: TestResultCardProps) {
  return (
    <div
      className={`p-3 rounded-lg border ${
        isPassed ? 'bg-green-950/20 border-green-900/50' : 'bg-red-950/20 border-red-900/50'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isPassed ?
            <CheckCircle className="w-4 h-4 text-green-500" /> :
            <XCircle className="w-4 h-4 text-red-500" />
          }
          <span className="text-sm font-semibold text-white">Test Case {index + 1}</span>
        </div>
        {result.executionTime && (
          <span className="text-xs text-muted-foreground">{result.executionTime}ms</span>
        )}
      </div>

      <div className="space-y-2 text-xs">
        {result.input && (
          <div>
            <span className="text-zinc-400">Input: </span>
            <span className="font-mono text-white">{JSON.stringify(result.input)}</span>
          </div>
        )}

        {(result.expectedOutput || result.expected) && (
          <div>
            <span className="text-zinc-400">Expected: </span>
            <span className="font-mono text-green-400">
              {JSON.stringify(result.expectedOutput ?? result.expected)}
            </span>
          </div>
        )}

        {(result.actualOutput || result.actual) && (
          <div>
            <span className="text-zinc-400">Got: </span>
            <span className={`font-mono ${isPassed ? 'text-green-400' : 'text-red-400'}`}>
              {JSON.stringify(result.actualOutput ?? result.actual)}
            </span>
          </div>
        )}

        {result.stdout && (
          <div>
            <span className="text-zinc-400">Stdout: </span>
            <span className="font-mono text-white">{result.stdout}</span>
          </div>
        )}

        {result.stderr && (
          <div>
            <span className="text-zinc-400">Stderr: </span>
            <span className="font-mono text-white">{result.stderr}</span>
          </div>
        )}

        {result.error && (
          <div className="mt-2 p-2 bg-red-950/30 rounded text-red-400">
            <span className="font-semibold">Error: </span>
            {result.error}
          </div>
        )}
      </div>
    </div>
  );
}
