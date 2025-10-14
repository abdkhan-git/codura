"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { ChevronRight, ChevronLeft, Search, GraduationCap, CheckCircle2 } from "lucide-react";

type School = {
  code: string;
  name: string;
  city?: string | null;
  state?: string | null;
};

interface OnboardingModalProps {
  onComplete: () => void;
}

const MAJORS = [
  { category: "Technology", items: [
    "Computer Science", "Software Engineering", "Data Science", 
    "Information Technology", "Cybersecurity"
  ]},
  { category: "Engineering", items: [
    "Mechanical Engineering", "Electrical Engineering", "Civil Engineering"
  ]},
  { category: "Business", items: [
    "Business Administration", "Finance", "Marketing", "Accounting"
  ]},
  { category: "Sciences", items: [
    "Biology", "Chemistry", "Physics", "Mathematics"
  ]},
  { category: "Other", items: [
    "Undecided", "Self-Taught", "Other"
  ]}
];

const ACADEMIC_STATUSES = [
  { category: "Students", items: [
    { value: "freshman", label: "Freshman (1st year)" },
    { value: "sophomore", label: "Sophomore (2nd year)" },
    { value: "junior", label: "Junior (3rd year)" },
    { value: "senior", label: "Senior (4th year)" },
    { value: "graduate", label: "Graduate Student" }
  ]},
  { category: "Professionals", items: [
    { value: "working_professional", label: "Working Professional" },
    { value: "self_taught", label: "Self-Taught Learner" },
    { value: "bootcamp_graduate", label: "Bootcamp Graduate" },
    { value: "career_changer", label: "Career Changer" }
  ]}
];

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // School search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<School[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<School | null>(null);
  
  // Form state
  const [selectedMajor, setSelectedMajor] = useState("");
  const [customMajor, setCustomMajor] = useState("");
  const [showCustomMajor, setShowCustomMajor] = useState(false);
  const [age, setAge] = useState<number | "">("");
  const [academicYear, setAcademicYear] = useState("");
  
  // UI state
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? (resolvedTheme === 'dark' || theme === 'dark') : true;

  // Search schools
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setLoading(true);
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        const response = await fetch(
          `/api/schools?q=${encodeURIComponent(query)}`,
          { signal: ctrl.signal }
        );

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();
        const schools: School[] = Array.isArray(data) ? data : [];

        setResults(schools);
        setOpen(schools.length > 0);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error("School search error:", error);
          const mockSchools: School[] = [
            { code: "002546", name: "Harvard University", city: "Cambridge", state: "MA" },
            { code: "003285", name: "Stanford University", city: "Stanford", state: "CA" },
            { code: "002132", name: "MIT", city: "Cambridge", state: "MA" },
            { code: "004642", name: "SUNY Farmingdale", city: "Farmingdale", state: "NY" },
          ];
          
          const filteredResults = mockSchools.filter(school => 
            school.name.toLowerCase().includes(query.toLowerCase())
          );
          
          setResults(filteredResults);
          setOpen(filteredResults.length > 0);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [query]);

  const handleMajorChange = (value: string) => {
    setSelectedMajor(value);
    setShowCustomMajor(value === 'Other');
    if (value !== 'Other') setCustomMajor("");
  };

  const getFinalMajor = () => {
    if (selectedMajor === 'Other' && customMajor.trim()) {
      return customMajor.trim();
    }
    return selectedMajor;
  };

  const isStepValid = () => {
    if (currentStep === 0) return true; // School is optional
    if (currentStep === 1) return getFinalMajor().length > 0;
    if (currentStep === 2) return age && age >= 13 && age <= 100 && academicYear;
    return false;
  };

  const nextStep = () => {
    if (currentStep < 2) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    const code = selected?.code;
    const major = getFinalMajor();
    
    if (!major) {
      setErrMsg("Please select your major/field of study.");
      return;
    }

    if (!age || age < 13 || age > 100) {
      setErrMsg("Please enter a valid age (13-100).");
      return;
    }

    if (!academicYear) {
      setErrMsg("Please select your academic status.");
      return;
    }
    
    setStatus("saving");
    setErrMsg("");

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          kind: code ? "college" : "no_school", 
          code: code || null,
          major, 
          age: Number(age), 
          academicYear 
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save education info');
      }

      setStatus("idle");
      onComplete();
    } catch (error: any) {
      console.error("Error saving:", error);
      setStatus("error");
      setErrMsg(error.message || "Failed to save. Please try again.");
    }
  };

  const steps = [
    { label: "School", optional: true },
    { label: "Major", optional: false },
    { label: "Details", optional: false },
  ];

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
            {steps.map((step, idx) => (
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
              Step {currentStep + 1} of {steps.length}
            </div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {currentStep === 0 && "Your School"}
              {currentStep === 1 && "Field of Study"}
              {currentStep === 2 && "About You"}
            </h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
              {currentStep === 0 && "Search for your school or skip"}
              {currentStep === 1 && "What do you study?"}
              {currentStep === 2 && "Just a few more details"}
            </p>
          </div>
        </div>

        {/* Error Message */}
        {errMsg && (
          <div className="mx-6 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs">
            {errMsg}
          </div>
        )}

        {/* Step Content */}
        <div className="px-6 pb-6 max-h-[400px] overflow-y-auto">
          {/* Step 0: School Search */}
          {currentStep === 0 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  isDark ? 'text-zinc-500' : 'text-gray-400'
                }`} />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(null);
                  }}
                  placeholder="Type school name (optional)"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all ${
                    isDark 
                      ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400'
                  }`}
                  autoComplete="off"
                />
                {loading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                      isDark ? 'border-zinc-500' : 'border-gray-400'
                    }`} />
                  </div>
                )}
              </div>

              {/* Selected School Display */}
              {selected && !open && (
                <div className={`p-3 rounded-xl border flex items-start gap-3 ${
                  isDark ? 'bg-brand/5 border-brand/30' : 'bg-brand/5 border-brand/30'
                }`}>
                  <GraduationCap className="w-5 h-5 text-brand mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {selected.name}
                    </div>
                    <div className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                      {selected.city}, {selected.state} • {selected.code}
                    </div>
                  </div>
                </div>
              )}

              {/* Results Dropdown */}
              {open && results.length > 0 && (
                <div className={`border rounded-xl max-h-48 overflow-auto shadow-xl ${
                  isDark ? 'bg-zinc-800/95 border-zinc-700' : 'bg-white border-gray-200'
                }`}>
                  {results.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => {
                        setSelected(s);
                        setQuery(s.name);
                        setOpen(false);
                      }}
                      className={`
                        w-full text-left px-3 py-2.5 text-sm transition-colors
                        border-b last:border-b-0
                        ${isDark 
                          ? 'border-zinc-700/50 hover:bg-zinc-700/50' 
                          : 'border-gray-200/50 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {s.name}
                      </div>
                      <div className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                        {s.city}, {s.state} • Code {s.code}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className={`text-center text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                Can't find your school? You can skip this step
              </div>
            </div>
          )}

          {/* Step 1: Major */}
          {currentStep === 1 && (
            <div className="space-y-3 animate-in fade-in duration-300">
              {MAJORS.map((category) => (
                <div key={category.category}>
                  <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                    isDark ? 'text-zinc-500' : 'text-gray-500'
                  }`}>
                    {category.category}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {category.items.map((major) => {
                      const isSelected = selectedMajor === major;
                      return (
                        <button
                          key={major}
                          type="button"
                          onClick={() => handleMajorChange(major)}
                          className={`
                            text-left px-3 py-2.5 rounded-lg border-2 text-sm transition-all duration-200
                            flex items-center gap-2 group
                            ${isSelected
                              ? 'border-brand bg-brand/10 shadow-lg shadow-brand/10'
                              : isDark
                                ? 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`
                            w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                            ${isSelected
                              ? 'border-brand bg-brand'
                              : isDark
                                ? 'border-zinc-600 group-hover:border-zinc-500'
                                : 'border-gray-300 group-hover:border-gray-400'
                            }
                          `}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`font-medium ${
                            isSelected
                              ? 'text-brand'
                              : isDark
                                ? 'text-zinc-200 group-hover:text-white'
                                : 'text-gray-700 group-hover:text-gray-900'
                          }`}>
                            {major}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {showCustomMajor && (
                <input
                  type="text"
                  value={customMajor}
                  onChange={(e) => setCustomMajor(e.target.value)}
                  placeholder="Enter your field of study"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all mt-3 ${
                    isDark 
                      ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400'
                  }`}
                  autoFocus
                />
              )}
            </div>
          )}

          {/* Step 2: Age & Status */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div>
                <label className={`text-xs font-medium mb-2 block ${
                  isDark ? 'text-zinc-400' : 'text-gray-600'
                }`}>
                  Age <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="13"
                  max="100"
                  value={age}
                  onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Enter your age"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all ${
                    isDark 
                      ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400'
                  }`}
                />
              </div>

              <div>
                <label className={`text-xs font-medium mb-2 block ${
                  isDark ? 'text-zinc-400' : 'text-gray-600'
                }`}>
                  Academic Status <span className="text-red-400">*</span>
                </label>
                <div className="space-y-3">
                  {ACADEMIC_STATUSES.map((category) => (
                    <div key={category.category}>
                      <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                        isDark ? 'text-zinc-500' : 'text-gray-500'
                      }`}>
                        {category.category}
                      </div>
                      <div className="space-y-2">
                        {category.items.map((status) => {
                          const isSelected = academicYear === status.value;
                          return (
                            <button
                              key={status.value}
                              type="button"
                              onClick={() => setAcademicYear(status.value)}
                              className={`
                                w-full text-left px-3 py-2.5 rounded-lg border-2 text-sm transition-all duration-200
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
                                w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                                ${isSelected
                                  ? 'border-brand bg-brand'
                                  : isDark
                                    ? 'border-zinc-600 group-hover:border-zinc-500'
                                    : 'border-gray-300 group-hover:border-gray-400'
                                }
                              `}>
                                {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </div>
                              <span className={`font-medium ${
                                isSelected
                                  ? 'text-brand'
                                  : isDark
                                    ? 'text-zinc-200 group-hover:text-white'
                                    : 'text-gray-700 group-hover:text-gray-900'
                              }`}>
                                {status.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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

          {currentStep < 2 ? (
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
