"use client";
import { useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import { saveQuestionnaireAndComplete } from "@/app/questionnaire/submit/actions";

interface QuestionOption {
  label: string;
  value: string;
  position: number;
}

interface QuestionItem {
  question_id: number;
  prompt: string;
  allows_multiple: boolean;
  position: number;
  options: QuestionOption[];
  maxChoices: number;
}

interface QuestionnaireModalProps {
  items: QuestionItem[];
  onComplete: () => void;
}

export default function QuestionnaireModal({ items, onComplete }: QuestionnaireModalProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string[]>>(
    Object.fromEntries(items.map((i) => [i.question_id, []]))
  );
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? (resolvedTheme === 'dark' || theme === 'dark') : true;

  const toggle = (
    qid: number,
    val: string,
    allowsMultiple: boolean,
    maxChoices: number
  ) => {
    setAnswers((prev) => {
      const curr = prev[qid] ?? [];
      if (curr.includes(val)) return { ...prev, [qid]: curr.filter((v) => v !== val) };
      if (!allowsMultiple || maxChoices <= 1) return { ...prev, [qid]: [val] };
      if (curr.length < maxChoices) return { ...prev, [qid]: [...curr, val] };
      return prev;
    });
  };

  const currentQuestion = items[currentStep];
  const isStepValid = () => {
    return answers[currentQuestion.question_id]?.length > 0;
  };

  const nextStep = () => {
    if (currentStep < items.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const allAnswered = items.every(
      (item) => answers[item.question_id]?.length > 0
    );

    if (!allAnswered) {
      setErrMsg("Please answer all questions before submitting.");
      return;
    }

    setStatus("saving");
    setErrMsg("");

    const payload = items.map((i) => ({
      questionId: i.question_id,
      values: answers[i.question_id] ?? [],
    }));

    startTransition(async () => {
      try {
        const res = await saveQuestionnaireAndComplete({ responses: payload });
        if (!res?.ok) {
          setStatus("error");
          setErrMsg(res?.message || "Save failed");
          return;
        }
        onComplete();
      } catch (error: any) {
        console.error("Submit error:", error);
        setStatus("error");
        setErrMsg(error.message || "Something went wrong");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 px-4 pointer-events-none">
      {/* Glassmorphic backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md pointer-events-auto" />

      {/* Compact Modal */}
      <div className={`
        relative z-10 w-full max-w-md pointer-events-auto
        rounded-2xl border shadow-2xl overflow-hidden
        ${isDark 
          ? 'bg-zinc-900/95 border-zinc-700/50 backdrop-blur-2xl' 
          : 'bg-white/95 border-gray-200/50 backdrop-blur-2xl'
        }
      `}>
        {/* Progress Dots */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            {items.map((_, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className={`
                  relative h-2 rounded-full transition-all duration-300
                  ${idx === currentStep 
                    ? 'w-8 bg-brand' 
                    : idx < currentStep 
                      ? 'w-2 bg-brand/60' 
                      : 'w-2 bg-zinc-700/30'
                  }
                `}>
                  {idx === currentStep && (
                    <div className="absolute inset-0 bg-brand/30 rounded-full animate-pulse" />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <div className={`text-xs font-medium uppercase tracking-wider mb-2 ${
              isDark ? 'text-zinc-500' : 'text-gray-500'
            }`}>
              Question {currentStep + 1} of {items.length}
            </div>
            <h2 className={`text-lg font-bold leading-tight px-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {currentQuestion.prompt}
            </h2>
            {currentQuestion.allows_multiple && (
              <p className={`text-xs mt-2 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                Select up to {currentQuestion.maxChoices}
              </p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {errMsg && (
          <div className="mx-6 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs">
            {errMsg}
          </div>
        )}

        {/* Options */}
        <div className="px-6 pb-6 min-h-[280px] max-h-[400px] overflow-y-auto">
          <div className="space-y-2 animate-in fade-in duration-300">
            {currentQuestion.options.map((opt) => {
              const isSelected = answers[currentQuestion.question_id]?.includes(opt.value);

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    toggle(
                      currentQuestion.question_id,
                      opt.value,
                      currentQuestion.allows_multiple,
                      currentQuestion.maxChoices
                    )
                  }
                  className={`
                    w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200
                    flex items-center gap-3 group
                    ${isSelected
                      ? 'border-brand bg-brand/10 shadow-lg shadow-brand/10'
                      : isDark
                        ? 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                    ${isSelected
                      ? 'border-brand bg-brand'
                      : isDark
                        ? 'border-zinc-600 group-hover:border-zinc-500'
                        : 'border-gray-300 group-hover:border-gray-400'
                    }
                  `}>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <span className={`text-sm font-medium ${
                    isSelected
                      ? 'text-brand'
                      : isDark
                        ? 'text-zinc-200 group-hover:text-white'
                        : 'text-gray-700 group-hover:text-gray-900'
                  }`}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className={`border-t px-6 py-4 flex items-center justify-between ${
          isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-200 bg-gray-50/50'
        }`}>
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${currentStep === 0
                ? 'invisible'
                : isDark
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {currentStep < items.length - 1 ? (
            <button
              onClick={nextStep}
              disabled={!isStepValid()}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all
                ${isStepValid()
                  ? 'bg-brand text-white hover:bg-brand/90 shadow-lg shadow-brand/20'
                  : isDark
                    ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!isStepValid() || status === "saving"}
              className={`
                px-6 py-2 rounded-lg text-sm font-semibold transition-all
                ${isStepValid() && status !== "saving"
                  ? 'bg-brand text-white hover:bg-brand/90 shadow-lg shadow-brand/20'
                  : isDark
                    ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {status === "saving" ? "Saving..." : "Complete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
