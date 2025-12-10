// components/QuestionnaireForm.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { saveQuestionnaireAndComplete } from "@/app/questionnaire/submit/actions";

type Option = { label: string; value: string; position: number };
type Item = {
  question_id: number;
  prompt: string;
  allows_multiple: boolean;
  position: number;
  options: Option[];
  maxChoices: number;
};

export default function QuestionnaireForm({ items }: { items: Item[] }) {
  const { theme } = useTheme();
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, string[]>>(
    Object.fromEntries(items.map((i) => [i.question_id, []]))
  );
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const [isPending, startTransition] = useTransition();

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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    setErrMsg("");

    const payload = items.map((i) => ({
      questionId: i.question_id,
      values: answers[i.question_id] ?? [],
    }));

    startTransition(async () => {
      const res = await saveQuestionnaireAndComplete({ responses: payload });
      if (!res?.ok) {
        setStatus("error");
        setErrMsg(res?.message || "Save failed");
        return;
      }
      router.push("/dashboard");
    });
  };

  // Check if all questions have at least one answer
  const anyEmpty = items.some((i) => (answers[i.question_id]?.length ?? 0) === 0);
  const disabled = isPending || status === "saving" || anyEmpty;

  return (
    <div className={`min-h-screen transition-colors duration-500 py-12 px-4 ${
      theme === "light" 
        ? "bg-gradient-to-br from-white via-gray-50 to-blue-50" 
        : "bg-zinc-950"
    }`}>
      <div className="max-w-6xl mx-auto">
        <form onSubmit={onSubmit} className="space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-3 mb-12">
            <div className="inline-block px-4 py-1.5 bg-gray-800/50 rounded-full border border-gray-700/50 mb-4">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Algorithm Analysis
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              Tell us your interests
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Pick your top choices for each section to personalize your learning experience
            </p>
          </div>

          {/* Questions Grid - Dynamic layout based on allows_multiple */}
          <div className="grid gap-8">
            {items.map((i) => {
              // Single choice questions get full width, multiple choice get 2 columns
              const isSingleChoice = !i.allows_multiple;
              
              return (
                <div
                  key={i.question_id}
                  className={`relative ${isSingleChoice ? 'max-w-3xl mx-auto' : ''}`}
                >
                  {/* Wrapper for gradient border effect */}
                  <div className="group relative">
                    {/* Card with gradient border effect */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-700 to-gray-800 rounded-2xl opacity-50 group-hover:opacity-100 transition-opacity blur"></div>
                    
                    <div className="relative bg-[#111111] rounded-2xl p-8 border border-gray-800/50 hover:border-gray-700/50 transition-all">
                      {/* Question Header */}
                      <div className="mb-6">
                        <h2 className="text-xl font-semibold text-white mb-2">
                          {i.prompt}
                        </h2>
                        {i.allows_multiple ? (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">
                              Select up to {i.maxChoices}
                            </span>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-400">
                              {(answers[i.question_id]?.length ?? 0)}/{i.maxChoices} selected
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            Select one option
                          </div>
                        )}
                      </div>

                      {/* Options Grid - Different layouts for single vs multiple choice */}
                      <div className={`grid gap-3 ${isSingleChoice ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                        {i.options.map((opt) => {
                          const selected = (answers[i.question_id] ?? []).includes(opt.value);
                          const capReached =
                            i.allows_multiple &&
                            (answers[i.question_id]?.length ?? 0) >= i.maxChoices &&
                            !selected;

                          return (
                            <label
                              key={opt.value}
                              className={`
                                flex items-center gap-4 rounded-xl p-4 cursor-pointer transition-all duration-200
                                ${selected 
                                  ? "bg-gradient-to-r from-gray-800 to-gray-800/50 border-gray-600 shadow-lg" 
                                  : "bg-gray-900/50 border-gray-800/50 hover:bg-gray-900 hover:border-gray-700/50"
                                }
                                ${capReached ? "opacity-40 cursor-not-allowed" : ""}
                                border
                              `}
                            >
                              {/* Custom Checkbox/Radio */}
                              <div className="relative flex-shrink-0">
                                <input
                                  type={i.allows_multiple ? "checkbox" : "radio"}
                                  name={`question_${i.question_id}`}
                                  value={opt.value}
                                  checked={selected}
                                  onChange={() =>
                                    toggle(i.question_id, opt.value, i.allows_multiple, i.maxChoices)
                                  }
                                  disabled={capReached}
                                  className="sr-only"
                                />
                                <div className={`
                                  w-5 h-5 flex items-center justify-center transition-all
                                  ${i.allows_multiple ? 'rounded-md' : 'rounded-full'}
                                  ${selected 
                                    ? "bg-white border-2 border-white" 
                                    : "border-2 border-gray-600 bg-transparent"
                                  }
                                `}>
                                  {selected && (
                                    i.allows_multiple ? (
                                      <svg 
                                        className="w-3 h-3 text-black" 
                                        fill="none" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth="3" 
                                        viewBox="0 0 24 24" 
                                        stroke="currentColor"
                                      >
                                        <path d="M5 13l4 4L19 7"></path>
                                      </svg>
                                    ) : (
                                      <div className="w-2.5 h-2.5 rounded-full bg-black"></div>
                                    )
                                  )}
                                </div>
                              </div>

                              {/* Label */}
                              <span className={`
                                text-base leading-snug transition-colors
                                ${selected ? "text-white font-medium" : "text-gray-300"}
                              `}>
                                {opt.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit Section */}
          <div className="max-w-md mx-auto pt-8">
            <button
              type="submit"
              disabled={disabled}
              className={`
                w-full rounded-xl px-8 py-4 font-semibold text-lg
                transition-all duration-200 transform
                ${disabled
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-white text-black hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                }
              `}
            >
              {isPending || status === "saving" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                      fill="none"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit & Continue to Dashboard"
              )}
            </button>

            {status === "error" && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm text-center">
                  {errMsg || "An error occurred. Please try again."}
                </p>
              </div>
            )}

            {anyEmpty && (
              <p className="mt-3 text-gray-500 text-sm text-center">
                Please select at least one option for each question
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}