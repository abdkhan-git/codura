"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { saveEducationChoice } from "./actions";

type School = {
  code: string;
  name: string;
  city?: string | null;
  state?: string | null;
};

export default function SchoolSearchStep() {
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<School[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<School | null>(null);
  const [selectedMajor, setSelectedMajor] = useState("");
  const [customMajor, setCustomMajor] = useState("");
  const [showCustomMajor, setShowCustomMajor] = useState(false);
  const [age, setAge] = useState<number | "">("");
  const [academicYear, setAcademicYear] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Search using our secure API route
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setSelected(null);
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

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

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
            { code: "002132", name: "Massachusetts Institute of Technology", city: "Cambridge", state: "MA" },
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
    if (value === 'Other') {
      setShowCustomMajor(true);
    } else {
      setShowCustomMajor(false);
      setCustomMajor("");
    }
  };

  const getFinalMajor = () => {
    if (selectedMajor === 'Other' && customMajor.trim()) {
      return customMajor.trim();
    }
    return selectedMajor;
  };

  const handleSchoolSubmit = async (formData: FormData) => {
    const code = formData.get("school_code") as string;
    const major = getFinalMajor();
    
    if (!code) {
      alert("Please select a school first.");
      return;
    }
    
    if (!major) {
      alert("Please select your major/field of study.");
      return;
    }

    if (!age || age < 13 || age > 100) {
      alert("Please enter a valid age (13-100).");
      return;
    }

    if (!academicYear) {
      alert("Please select your academic year/status.");
      return;
    }
    
    try {
      await saveEducationChoice({ 
        kind: "college", 
        code, 
        major, 
        age: Number(age), 
        academicYear 
      });
    } catch (error) {
      console.error("Error saving school choice:", error);
    }
  };

  const handleNoSchoolSubmit = async () => {
    const major = getFinalMajor();

    if (!age || age < 13 || age > 100) {
      alert("Please enter a valid age (13-100).");
      return;
    }

    if (!academicYear) {
      alert("Please select your status/level.");
      return;
    }
    
    try {
      await saveEducationChoice({ 
        kind: "no_school", 
        major: major || null, 
        age: Number(age), 
        academicYear 
      });
    } catch (error) {
      console.error("Error saving no school choice:", error);
    }
  };

  const isSchoolFormValid = () => {
    return selected && getFinalMajor().length > 0 && age && age >= 13 && age <= 100 && academicYear;
  };

  const isNoSchoolFormValid = () => {
    return age && age >= 13 && age <= 100 && academicYear;
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 py-12 px-4 ${
      theme === "light" 
        ? "bg-gradient-to-br from-white via-gray-50 to-blue-50" 
        : "bg-zinc-950"
    }`}>
      <div className="max-w-2xl mx-auto">
        {/* Header Section */}
        <div className="text-center space-y-3 mb-12">
          <div className="inline-block px-4 py-1.5 bg-gray-800/50 rounded-full border border-gray-700/50 mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Step 1 of 2
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Tell us about your education
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Enter your school and field of study, or choose "No school" if you're self-taught
          </p>
        </div>

        {/* Main Form Card */}
        <div className="relative group mb-8">
          {/* Gradient border effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-700 to-gray-800 rounded-2xl opacity-50 group-hover:opacity-100 transition-opacity blur"></div>
          
          <div className="relative bg-[#111111] rounded-2xl p-8 border border-gray-800/50">
            <div className="space-y-6">
              {/* School Search Section */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  School name
                  <span className="text-xs text-gray-500 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelected(null);
                    }}
                    placeholder="Start typing (e.g., 'Harvard', 'MIT', 'Stanford')"
                    className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent transition-all"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={open}
                    aria-controls="school-results"
                  />
                  {loading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Results Dropdown */}
              {open && results.length > 0 && (
                <div
                  id="school-results"
                  role="listbox"
                  className="border border-gray-800 rounded-xl max-h-64 overflow-auto bg-gray-900/90 backdrop-blur-sm shadow-2xl"
                >
                  {results.map((s, idx) => (
                    <button
                      key={s.code}
                      type="button"
                      role="option"
                      aria-selected={selected?.code === s.code}
                      onClick={() => {
                        setSelected(s);
                        setQuery(`${s.name}${s.city ? ` — ${s.city}, ${s.state ?? ""}` : ""}`);
                        setOpen(false);
                      }}
                      className={`
                        w-full text-left px-4 py-3 transition-all
                        ${idx !== results.length - 1 ? 'border-b border-gray-800/50' : ''}
                        ${selected?.code === s.code 
                          ? "bg-gray-700/50 text-white" 
                          : "text-gray-300 hover:bg-gray-800/50"
                        }
                      `}
                    >
                      <div className="font-medium text-white">{s.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {s.city ?? ""}{s.city && s.state ? ", " : ""}{s.state ?? ""} • Code {s.code}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Major Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  Major / Field of Study
                  <span className="text-xs text-gray-500 font-normal">(required for school selection)</span>
                </label>
                <select
                  value={selectedMajor}
                  onChange={(e) => handleMajorChange(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1rem center',
                  }}
                >
                  <option value="" className="bg-gray-900">Select your major or field of study</option>
                  <optgroup label="Technology" className="bg-gray-900">
                    <option value="Computer Science" className="bg-gray-900">Computer Science</option>
                    <option value="Software Engineering" className="bg-gray-900">Software Engineering</option>
                    <option value="Data Science" className="bg-gray-900">Data Science</option>
                    <option value="Information Technology" className="bg-gray-900">Information Technology</option>
                    <option value="Web Development" className="bg-gray-900">Web Development</option>
                    <option value="Cybersecurity" className="bg-gray-900">Cybersecurity</option>
                  </optgroup>
                  <optgroup label="Engineering" className="bg-gray-900">
                    <option value="Mechanical Engineering" className="bg-gray-900">Mechanical Engineering</option>
                    <option value="Electrical Engineering" className="bg-gray-900">Electrical Engineering</option>
                    <option value="Civil Engineering" className="bg-gray-900">Civil Engineering</option>
                    <option value="Chemical Engineering" className="bg-gray-900">Chemical Engineering</option>
                  </optgroup>
                  <optgroup label="Business" className="bg-gray-900">
                    <option value="Business Administration" className="bg-gray-900">Business Administration</option>
                    <option value="Marketing" className="bg-gray-900">Marketing</option>
                    <option value="Finance" className="bg-gray-900">Finance</option>
                    <option value="Accounting" className="bg-gray-900">Accounting</option>
                    <option value="Economics" className="bg-gray-900">Economics</option>
                  </optgroup>
                  <optgroup label="Sciences" className="bg-gray-900">
                    <option value="Biology" className="bg-gray-900">Biology</option>
                    <option value="Chemistry" className="bg-gray-900">Chemistry</option>
                    <option value="Physics" className="bg-gray-900">Physics</option>
                    <option value="Mathematics" className="bg-gray-900">Mathematics</option>
                    <option value="Psychology" className="bg-gray-900">Psychology</option>
                  </optgroup>
                  <optgroup label="Liberal Arts" className="bg-gray-900">
                    <option value="English" className="bg-gray-900">English</option>
                    <option value="History" className="bg-gray-900">History</option>
                    <option value="Political Science" className="bg-gray-900">Political Science</option>
                    <option value="Communications" className="bg-gray-900">Communications</option>
                  </optgroup>
                  <optgroup label="Health" className="bg-gray-900">
                    <option value="Nursing" className="bg-gray-900">Nursing</option>
                    <option value="Pre-Med" className="bg-gray-900">Pre-Med</option>
                    <option value="Public Health" className="bg-gray-900">Public Health</option>
                  </optgroup>
                  <optgroup label="Creative" className="bg-gray-900">
                    <option value="Graphic Design" className="bg-gray-900">Graphic Design</option>
                    <option value="UX/UI Design" className="bg-gray-900">UX/UI Design</option>
                    <option value="Fine Arts" className="bg-gray-900">Fine Arts</option>
                  </optgroup>
                  <optgroup label="Other" className="bg-gray-900">
                    <option value="Undecided" className="bg-gray-900">Undecided</option>
                    <option value="Self-Taught" className="bg-gray-900">Self-Taught</option>
                    <option value="Bootcamp Graduate" className="bg-gray-900">Bootcamp Graduate</option>
                    <option value="Other" className="bg-gray-900">Other (specify below)</option>
                  </optgroup>
                </select>
              </div>

              {/* Custom Major Input */}
              {showCustomMajor && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300">Please specify your major/field</label>
                  <input
                    type="text"
                    value={customMajor}
                    onChange={(e) => setCustomMajor(e.target.value)}
                    placeholder="Enter your specific major or field of study"
                    className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent transition-all"
                    required
                  />
                </div>
              )}

              {/* Two Column Layout for Age and Academic Year */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Age Input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                    Age
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="13"
                    max="100"
                    value={age}
                    onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Enter your age"
                    className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent transition-all"
                    required
                  />
                </div>

                {/* Academic Year Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                    Academic Status
                    <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent transition-all appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 1rem center',
                    }}
                    required
                  >
                    <option value="" className="bg-gray-900">Select your status</option>
                    <optgroup label="Current Students" className="bg-gray-900">
                      <option value="freshman" className="bg-gray-900">Freshman (1st year)</option>
                      <option value="sophomore" className="bg-gray-900">Sophomore (2nd year)</option>
                      <option value="junior" className="bg-gray-900">Junior (3rd year)</option>
                      <option value="senior" className="bg-gray-900">Senior (4th year)</option>
                      <option value="graduate" className="bg-gray-900">Graduate Student</option>
                    </optgroup>
                    <optgroup label="Non-Students" className="bg-gray-900">
                      <option value="recent_graduate" className="bg-gray-900">Recent Graduate (0-2 years)</option>
                      <option value="working_professional" className="bg-gray-900">Working Professional</option>
                      <option value="career_changer" className="bg-gray-900">Career Changer</option>
                      <option value="self_taught" className="bg-gray-900">Self-Taught Learner</option>
                      <option value="bootcamp_student" className="bg-gray-900">Bootcamp Student</option>
                      <option value="bootcamp_graduate" className="bg-gray-900">Bootcamp Graduate</option>
                      <option value="high_school" className="bg-gray-900">High School Student</option>
                      <option value="other" className="bg-gray-900">Other</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                {/* Submit with School */}
                <form action={handleSchoolSubmit}>
                  <input type="hidden" name="school_code" value={selected?.code ?? ""} />
                  <button
                    type="submit"
                    disabled={!isSchoolFormValid()}
                    className={`
                      w-full rounded-xl px-6 py-4 font-semibold text-lg
                      transition-all duration-200 transform
                      ${!isSchoolFormValid()
                        ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                        : "bg-white text-black hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                      }
                    `}
                  >
                    {selected ? `Continue with ${selected.name}` : "Continue with selected school"}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-800"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-[#111111] text-gray-500">or</span>
                  </div>
                </div>

                {/* Submit without School */}
                <form action={handleNoSchoolSubmit}>
                  <button
                    type="submit"
                    disabled={!isNoSchoolFormValid()}
                    className={`
                      w-full rounded-xl px-6 py-4 font-semibold text-lg
                      transition-all duration-200
                      ${!isNoSchoolFormValid()
                        ? "border-2 border-gray-800 text-gray-600 cursor-not-allowed"
                        : "border-2 border-gray-700 text-gray-300 hover:bg-gray-900/50 hover:border-gray-600"
                      }
                    `}
                  >
                    Continue without school
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Helper Text */}
        <p className="text-center text-sm text-gray-500">
          All information is kept private and secure
        </p>
      </div>
    </div>
  );
}