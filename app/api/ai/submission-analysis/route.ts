// app/api/ai/submission-analysis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const DEV_ALLOW_NO_SUBMISSION = process.env.ALLOW_NO_SUBMISSION === "true";

// ---- Guardrails: keep responses as hints-only (no runnable code)
function sanitizeToHintsOnly(text: string) {
  let out = text.replace(/```[\s\S]*?```/g, "[code block replaced with conceptual hint]");
  out = out.replace(/`[^`]{60,}`/g, "[code snippet redacted]");
  out = out.replace(
    /(def|function|public|private|class)\s+[a-zA-Z0-9_]+[^{\n]*\{[\s\S]*?\}/g,
    "[full function removed - think about the logic instead]"
  );
  const lines = out.split("\n");
  let streak = 0;
  for (let i = 0; i < lines.length; i++) {
    const looksCode = /^[\s]*([A-Za-z_][A-Za-z0-9_]*\s*\(|if|for|while|return|let|const|var|=>|=|;|\{|\}|\[|\]|\(|\))/.test(
      lines[i]
    );
    if (looksCode) streak++;
    else streak = 0;
    if (streak >= 4) lines[i] = "[code pattern replaced with hint]";
  }
  out = lines.join("\n");
  return out.slice(0, 1800);
}

// ---- Estimate judge reliability
function judgeReliabilitySignal(params: {
  testsPassed?: number;
  totalTests?: number;
  judge?: {
    stdout?: string;
    stderr?: string;
    testResults?: Array<{ passed?: boolean; error?: string }>;
  };
}) {
  const { testsPassed = 0, totalTests = 0, judge } = params;
  if (!totalTests) return { score: 0.3, notes: "No tests supplied." };
  let score = testsPassed / totalTests;
  const stderr = judge?.stderr?.toLowerCase() || "";
  if (stderr.includes("internal error") || stderr.includes("timeout") || stderr.includes("flaky"))
    score = Math.min(score, 0.25);
  const fails = totalTests - testsPassed;
  if (fails >= Math.ceil(totalTests * 0.6) && !stderr) score = Math.min(score, 0.4);
  score = Math.max(0.0, Math.min(1.0, score));
  return { score, notes: `Pass-rate ${testsPassed}/${totalTests}${stderr ? "; stderr present" : ""}` };
}

const SYSTEM_PROMPT = `
You are Codura's coding tutor. Your job is to give HINTS ONLY, never solutions.

Strict rules:
- Do NOT provide runnable or complete code.
- Keep replies conceptual and guiding.
- Use short questions, reasoning steps, and edge-case hints.
- If the judge seems wrong or no judge data available, work from the code itself.
- Always end with: "Want another hint or a nudge toward tests?"
`.trim();

export async function POST(req: NextRequest) {
  try {
    // AUTH CHECK
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log('🔵 Submission analysis request from user:', user.id);

    const {
      problemId,
      problemDescription,
      submissionCode,
      language,
      assistanceType,
      userMessage,
      conversationHistory = [],
      testsPassed = 0,
      totalTests = 0,
      status,
      runtime,
      memory,
      judge,
      nudges = [],
    } = body;

    // VALIDATION (dev-bypass aware)
    let usedDevBypass = false;
    if (!problemId || !submissionCode || !userMessage) {
      if (DEV_ALLOW_NO_SUBMISSION && submissionCode && userMessage) {
        // allow missing problemId/problemDescription in dev
        usedDevBypass = true;
        console.warn('⚠️ DEV BYPASS: proceeding without full required fields');
      } else {
        console.error('❌ Missing required fields');
        return NextResponse.json(
          { ok: false, error: "Missing required fields" },
          { status: 400 }
        );
      }
    }

    console.log('✅ Processing analysis:', { 
      problemId, 
      language, 
      assistanceType,
      testsPassed,
      totalTests 
    });

    // Normalize values for dev-bypass
    const safeProblemId = problemId ?? -1;
    const safeProblemDescription = typeof problemDescription === 'string' ? problemDescription.slice(0, 500) : '';
    const safeSubmissionCode = String(submissionCode ?? '');
    const safeLanguage = language || 'plaintext';

    // Build reliability summary (if judge data exists)
    const reliability = judgeReliabilitySignal({ testsPassed, totalTests, judge });
    const judgeSummary = judge ? [
      `Tests Passed: ${testsPassed}/${totalTests} (Reliability≈${reliability.score.toFixed(2)})`,
      `Status: ${status || 'Unknown'}`,
      runtime ? `Runtime: ${runtime}` : '',
      memory ? `Memory: ${memory}` : '',
      judge?.stderr ? `stderr: ${judge.stderr.slice(0, 300)}` : "",
      judge?.stdout ? `stdout: ${judge.stdout.slice(0, 300)}` : "",
    ].filter(Boolean).join("\n") : `Tests Passed: ${testsPassed}/${totalTests}\nStatus: ${status || 'Unknown'}`;

    const context = [
      `Problem ID: ${safeProblemId}`,
      `Language: ${safeLanguage}`,
      `Assistance type: ${assistanceType}`,
      `Problem (trunc 500): ${safeProblemDescription}`,
      `Submission (trunc 800): ${safeSubmissionCode.slice(0, 800)}`,
      judgeSummary,
      nudges.length ? `User nudges: ${nudges.join(", ")}` : "",
    ].join("\n\n");

    // Combine chat history into OpenAI format
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-6).map((m: any) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.content,
      })),
      {
        role: "user",
        content: [
          "Session context:",
          context,
          "",
          "User message:",
          userMessage,
          "",
          judge ? `Judge reliability: ${reliability.score.toFixed(2)} (${reliability.notes})` : "No judge data available - work from code logic.",
        ].join("\n"),
      },
    ];

    console.log('🤖 Calling OpenAI for analysis...');

    // ---- Call OpenAI
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 800,
        messages,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("❌ OpenAI error:", text);
      return NextResponse.json({ ok: false, error: "AI provider error" }, { status: 500 });
    }

    const data = await resp.json();
    const raw =
      data?.choices?.[0]?.message?.content ??
      "I couldn't generate a response this time.";
    const text = sanitizeToHintsOnly(raw);

    console.log('✅ AI response generated:', text.slice(0, 100) + '...');

    // TRY to log interaction (don't fail if it doesn't work)
    try {
      await supabase.from('ai_interactions').insert({
        user_id: user.id,
        problem_id: safeProblemId,
        assistance_type: assistanceType,
        user_message: userMessage,
        ai_response: text,
        dev_bypass: usedDevBypass ? true : null,
        created_at: new Date().toISOString()
      });
      console.log('✅ Interaction logged to database');
    } catch (dbError) {
      console.warn('⚠️ Could not log interaction:', dbError);
    }

    return NextResponse.json({ 
      ok: true, 
      text, 
      judgeReliability: judge ? reliability.score : null,
      devBypass: usedDevBypass || undefined
    });

  } catch (err: any) {
    console.error("❌ [/api/ai/submission-analysis] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}