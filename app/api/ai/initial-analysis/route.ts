// app/api/ai/initial-analysis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const DEV_ALLOW_NO_SUBMISSION = process.env.ALLOW_NO_SUBMISSION === "true";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ✅ correct variable name (authError), and return a proper JSON response
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error in initial-analysis:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ parse body safely
    const body = await request.json();
    const {
      problemId,
      problemTitle,
      problemDescription,
      submissionCode,
      language,
      testsPassed,
      totalTests,
      // optional extras if you choose to pass them
      submissionId,
      raw, // judge0Result, testcaseResults, savedSubmission, etc.
    } = body || {};

    if (!problemId || !submissionCode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let usedDevBypass = false;

    // ✅ verify an existing submission for this user/problem (skippable in dev)
    let submissionRow: any = null;

    if (!DEV_ALLOW_NO_SUBMISSION) {
      if (submissionId) {
        const { data, error } = await supabase
          .from("submissions")
          .select("*")
          .eq("id", submissionId)
          .eq("user_id", user.id)
          .single();

        if (error || !data) {
          return NextResponse.json({ error: "Submission not found" }, { status: 403 });
        }
        submissionRow = data;
      } else {
        const { data, error } = await supabase
          .from("submissions")
          .select("*")
          .eq("user_id", user.id)
          .eq("problem_id", problemId)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !data) {
          return NextResponse.json({ error: "No submission found" }, { status: 403 });
        }
        submissionRow = data;
      }
    } else {
      // Dev bypass enabled — continue without requiring a DB submission row
      usedDevBypass = true;
    }

    // ✅ prompts
    const safeDescription =
      typeof problemDescription === "string" ? problemDescription.slice(0, 4000) : "";

    const systemPrompt = `You are a supportive coding mentor analyzing a student's code submission.

Your task:
1) Briefly acknowledge their submission (1 sentence)
2) If tests passed: congratulate
3) If tests failed: encourage and note progress
4) Suggest the best help type: Understanding, Debugging, Explanation, Optimization

RULES:
- Be encouraging and positive
- NEVER reveal solutions
- <= 150 words
- Focus on immediate next steps`;

    const passLine =
      typeof testsPassed === "number" && typeof totalTests === "number"
        ? `${testsPassed}/${totalTests} tests passed`
        : `Test results not available`;

    const userPrompt =
`Problem: ${problemTitle}
${safeDescription}

Student's Code (${language || "plaintext"}):
\`\`\`${language || "plaintext"}
${submissionCode}
\`\`\`

Result: ${passLine}

Provide an encouraging initial analysis and the next step.`.slice(0, 8000);

    // Optional compact judge context
    const rawContext = raw
      ? `\n\n(Additional judge context)\n- Label: ${raw?.testcaseResults?.label ?? "n/a"}\n- Total cases: ${raw?.testcaseResults?.results?.length ?? "n/a"}`
      : "";

    // ✅ guard for API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const aiResponse = await callOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt + rawContext },
    ]);

    // ✅ log interaction (don’t fail request if insert fails)
    try {
      await supabase.from("ai_interactions").insert({
        user_id: user.id,
        problem_id: problemId,
        assistance_type: "initial_analysis",
        user_message: "Initial submission analysis",
        ai_response: aiResponse,
        submission_id: submissionRow?.id ?? null,
        snippet: submissionCode.slice(0, 500),
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Could not log ai_interactions:", e);
    }

    return NextResponse.json({ success: true, message: aiResponse, devBypass: usedDevBypass });
  } catch (error) {
    console.error("Initial Analysis Error:", error);
    return NextResponse.json({ error: "Failed to analyze submission" }, { status: 500 });
  }
}

async function callOpenAI(messages: Array<{ role: string; content: string }>) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 300,
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI API error: ${resp.status}`);
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content ?? "I couldn't generate a response.";
}