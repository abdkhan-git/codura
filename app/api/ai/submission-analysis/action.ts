// app/api/ai/submission-analysis/actions.ts
"use server";

import { createClient } from "@/utils/supabase/server";

type AssistanceType = 'understanding' | 'debugging' | 'explanation' | 'optimization';

interface AnalyzeSubmissionParams {
  problemId: number;
  problemDescription: string;
  submissionCode: string;
  language: string;
  assistanceType: AssistanceType;
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  testsPassed: number;
  totalTests: number;
  judge?: {
    stdout?: string;
    stderr?: string;
    testResults?: Array<{
      name?: string;
      input?: string;
      expected?: string;
      got?: string;
      passed?: boolean;
      error?: string;
    }>;
    runtimeMs?: number;
    memoryKb?: number;
  };
}

// ---------- Shared helpers (mirror the API route) ----------
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
    const looksCode = /^[\s]*([A-Za-z_][A-Za-z0-9_]*\s*\(|if|for|while|return|let|const|var|=>|=|;|\{|\}|\[|\]|\(|\))/.test(lines[i]);
    if (looksCode) streak++;
    else streak = 0;
    if (streak >= 4) lines[i] = "[code pattern replaced with hint]";
  }
  out = lines.join("\n");
  return out.slice(0, 1800);
}

function buildSystemPrompt(assistanceType: AssistanceType, problemDescription: string): string {
  const baseRules = `You are an expert coding mentor and tutor. Your role is to guide students to discover solutions themselves, NOT to provide direct answers.

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. NEVER provide complete solutions or working code
2. NEVER write code that directly solves the problem
3. NEVER reveal the exact algorithm or data structure needed
4. ALWAYS respond with questions, hints, and conceptual guidance
5. Guide students through logical reasoning
6. Encourage them to think about edge cases
7. Be patient, encouraging, and supportive

Problem Context: ${problemDescription}`;

  const typeSpecificPrompts = {
    understanding: `${baseRules}

ASSISTANCE TYPE: Problem Understanding

Focus on:
- Breaking down the problem into smaller parts
- Clarifying requirements and constraints
- Suggesting simple test cases to work through
- Asking questions that reveal problem patterns
- Never explaining the full solution approach`,

    debugging: `${baseRules}

ASSISTANCE TYPE: Debugging Help

Focus on:
- Asking about edge cases they might have missed
- Suggesting areas of code to examine closely
- Recommending debugging techniques (print statements, step-through)
- Asking questions about their logic at specific points
- Never pointing directly to the bug or fixing it for them`,

    explanation: `${baseRules}

ASSISTANCE TYPE: Code Explanation

Focus on:
- Asking them to explain their approach in their own words
- Questioning the time/space complexity
- Prompting them to consider alternative approaches
- Discussing trade-offs in their design decisions
- Never providing the optimal solution`,

    optimization: `${baseRules}

ASSISTANCE TYPE: Optimization Help

Focus on:
- Asking about current time/space complexity
- Suggesting general optimization patterns (without specifics)
- Prompting them to identify bottlenecks
- Asking if certain operations could be reduced or eliminated
- Never providing the optimized algorithm directly`
  };

  return typeSpecificPrompts[assistanceType];
}

async function logAIInteraction(
  userId: string,
  problemId: number,
  assistanceType: string,
  ai_response?: string,
  user_message?: string
) {
  try {
    const supabase = await createClient();
    await supabase.from('ai_interactions').insert({
      user_id: userId,
      problem_id: problemId,
      assistance_type: assistanceType,
      user_message,
      ai_response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to log AI interaction:", error);
  }
}

// ---------- Server Actions ----------
export async function analyzeSubmission(params: AnalyzeSubmissionParams) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

  const systemPrompt = buildSystemPrompt(params.assistanceType, params.problemDescription);

  // Safely clamp large content so you don't blow token limits
  const clamp = (s: string, max = 4000) =>
    s && s.length > max ? s.slice(0, Math.floor(max * 0.6)) + "\n...\n" + s.slice(-Math.floor(max * 0.4)) : s || "";

  const jr = params.judge;
  const failing = (jr?.testResults || []).filter(t => t?.passed === false).slice(0, 5);
  const judgeSummary =
    jr
      ? [
          `Tests Passed: ${params.testsPassed}/${params.totalTests}`,
          `Runtime (ms): ${jr.runtimeMs ?? 'n/a'}, Memory (KB): ${jr.memoryKb ?? 'n/a'}`,
          jr.stdout ? `STDOUT (clamped):\n${clamp(jr.stdout, 1500)}` : null,
          jr.stderr ? `STDERR (clamped):\n${clamp(jr.stderr, 1500)}` : null,
          failing.length
            ? `Failing samples (up to 5):\n${failing.map((t, i) =>
                `#${i+1} name:${t.name ?? 'n/a'}\ninput:${t.input ?? 'n/a'}\nexpected:${t.expected ?? 'n/a'}\ngot:${t.got ?? 'n/a'}\nerror:${t.error ?? 'n/a'}`
              ).join("\n\n")}`
            : "No explicit failing test details."
        ].filter(Boolean).join("\n\n")
      : `No judge results available.\nTests Passed: ${params.testsPassed}/${params.totalTests}`;

  const userPrompt = `
Student's Question:
${params.userMessage}

Language: ${params.language}

IMPORTANT CONTEXT:
- Use the student's code as the primary source of truth.
- Judge output may be noisy or incomplete; only use it if it aligns with code logic.
- If judge output and code conflict, prefer reasoning from the code and known constraints.

Problem (abbrev):
${clamp(params.problemDescription, 1800)}

Student's Code (${params.language}, clamped):
\`\`\`${params.language}
${clamp(params.submissionCode, 4000)}
\`\`\`

Judge Summary:
${judgeSummary}

Your task:
- Provide hints and guiding questions ONLY (no solutions, no full working code).
- Identify likely logic or edge-case issues from the code.
- Tailor guidance to assistance type: ${params.assistanceType}.
`.trim();

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...params.conversationHistory.slice(-6).map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: clamp(m.content, 1500)
      })),
      { role: 'user', content: userPrompt }
    ];

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
      console.error('OpenAI error:', text);
      throw new Error('AI provider error');
    }

    const data = await resp.json();
    const raw =
      data?.choices?.[0]?.message?.content ??
      "I'm not sure—could you restate that with the specific case you're testing?";
    const text = sanitizeToHintsOnly(raw);

    await logAIInteraction(user.id, params.problemId, params.assistanceType, text, params.userMessage);

    // Match API route shape:
    return { ok: true, text };
  } catch (error) {
    console.error("Submission Analysis Error:", error);
    return { ok: false, text: "I'm having trouble analyzing your submission. Please try again." };
  }
}

/**
 * Initial analysis when submission is first received
 */
export async function initialSubmissionAnalysis(params: {
  problemId: number;
  problemDescription: string;
  submissionCode: string;
  language: string;
  testsPassed: number;
  totalTests: number;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

  const systemPrompt = `You are a supportive coding mentor analyzing a student's submission.

Rules:
- Be encouraging and positive
- HINTS ONLY, never solutions
- <150 words
- Suggest which help mode might fit (Understanding / Debugging / Explanation / Optimization)
`;

  const userPrompt = `
Problem (abbrev):
${params.problemDescription.slice(0, 1200)}

Student's Code (${params.language}):
\`\`\`${params.language}
${params.submissionCode.slice(0, 3500)}
\`\`\`

Result: ${params.testsPassed}/${params.totalTests} tests passed

Provide a short, encouraging analysis and suggest next steps. Hints only.`.trim();

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.5,
        max_tokens: 300,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('OpenAI error:', text);
      throw new Error('AI provider error');
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "Thanks for submitting your solution!";
    const text = sanitizeToHintsOnly(raw);

    await logAIInteraction(user.id, params.problemId, 'initial_analysis', text, 'Initial submission analysis');

    // Match API route shape:
    return { ok: true, text };
  } catch (error) {
    console.error("Initial Analysis Error:", error);
    return { ok: false, text: "I'm having trouble analyzing your submission. Please try again." };
  }
}