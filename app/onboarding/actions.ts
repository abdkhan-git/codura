"use server";

import { redirect } from "next/navigation";

// Basic FAFSA/Title-IV code validation (6 alphanumeric characters)
const CODE_RE = /^[0-9A-Za-z]{6}$/;

// Optional: normalize to uppercase for consistency (kept local to avoid client imports)
function validateFederalSchoolCode(input: string) {
  const code = (input || "").trim().toUpperCase();
  if (!CODE_RE.test(code)) {
    return { ok: false as const, error: "FAFSA code must be 6 letters/numbers (e.g., 002546)." };
  }
  return { ok: true as const, code };
}

// Validate and clean major input
function validateMajor(input: string) {
  const major = (input || "").trim();
  if (!major || major.length < 2) {
    return { ok: false as const, error: "Please provide a valid major or field of study." };
  }
  if (major.length > 100) {
    return { ok: false as const, error: "Major name is too long (max 100 characters)." };
  }
  return { ok: true as const, major };
}

// Save the user's choice to Supabase (no userId in client; we read session server-side)
import { createClient } from "@/utils/supabase/server";

export async function saveEducationChoice(choice: { 
  kind: string; 
  code?: string; 
  major?: string | null;
  age?: number;
  academicYear?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  let federalSchoolCode: string | null = null;
  let major: string | null = null;
  let age: number | null = null;
  let academicYear: string | null = null;

  // Validate age (required)
  if (choice.age && choice.age >= 13 && choice.age <= 100) {
    age = choice.age;
  } else {
    throw new Error("Valid age (13-100) is required.");
  }

  // Validate academic year (required)
  if (choice.academicYear && choice.academicYear.trim()) {
    const validYears = [
      'freshman', 'sophomore', 'junior', 'senior', 'graduate',
      'recent_graduate', 'working_professional', 'career_changer',
      'self_taught', 'bootcamp_student', 'bootcamp_graduate', 
      'high_school', 'other'
    ];
    
    if (validYears.includes(choice.academicYear)) {
      academicYear = choice.academicYear;
    } else {
      throw new Error("Please select a valid academic year/status.");
    }
  } else {
    throw new Error("Academic year/status is required.");
  }

  // Validate major if provided
  if (choice.major && choice.major.trim()) {
    const majorValidation = validateMajor(choice.major);
    if (!majorValidation.ok) {
      throw new Error(majorValidation.error);
    }
    major = majorValidation.major;
  }

  // Handle school code validation if provided
  if (choice.kind === "college") {
    // For college choice, both school code and major are required
    if (!choice.code) {
      throw new Error("School selection is required.");
    }
    if (!major) {
      throw new Error("Major/field of study is required when selecting a school.");
    }
    
    const { ok, code, error } = validateFederalSchoolCode(choice.code);
    if (!ok || !code) throw new Error(error || "Invalid FAFSA code.");
    federalSchoolCode = code;
  } else {
    // For "no school" choice, major is optional
    federalSchoolCode = null;
  }
  
  try {
    const { error: upsertErr } = await supabase
      .from("users")
      .update({ 
        federal_school_code: federalSchoolCode,
        major: major,
        age: age,
        academic_year: academicYear
      })
      .eq("user_id", user.id);
      
    if (upsertErr) throw upsertErr;
  } catch (e) {
    // Swallow DB error to ensure redirect; you can read logs server-side
    console.error("saveEducationChoice update error:", e);
  } finally {
    // Redirect to dashboard where questionnaire modal will show
    redirect("/dashboard");
  }

  // Unreachable after redirect, but kept for type completeness if redirect is ever removed
  return { ok: true };
}