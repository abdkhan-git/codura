import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, language, timeComplexity, spaceComplexity } = body;

    // Validate inputs
    if (!code || !language || !timeComplexity || !spaceComplexity) {
      return NextResponse.json(
        { error: "Missing required fields: code, language, timeComplexity, spaceComplexity" },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[analyze-complexity-snippets] Missing OPENAI_API_KEY");
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Construct the system prompt
    const systemPrompt = `You are a code complexity analyzer. Your task is to identify the EXACT code snippets that contribute to the detected time and space complexities.

STRICT RULES:
1. Identify exactly 2 code snippets for time complexity
2. Identify exactly 2 code snippets for space complexity
3. Each snippet must be an actual line or block of code from the user's submission
4. Format each snippet as: "This code snippet results in the overall {complexity} {type} complexity: \`{actual code}\`"
5. Be specific and accurate - only show the code that directly causes the complexity
6. Return ONLY a JSON object with this structure:
{
  "timeSnippets": ["snippet 1", "snippet 2"],
  "spaceSnippets": ["snippet 1", "snippet 2"]
}`;

    // Construct the user prompt
    const userPrompt = `Analyze this ${language} code and identify the code snippets that contribute to its complexities:

**Detected Time Complexity:** ${timeComplexity}
**Detected Space Complexity:** ${spaceComplexity}

**Code:**
\`\`\`${language}
${code}
\`\`\`

Identify exactly 2 code snippets that contribute to the ${timeComplexity} time complexity and 2 code snippets that contribute to the ${spaceComplexity} space complexity.

Format each snippet exactly as:
"This code snippet results in the overall ${timeComplexity} time complexity: \`actual code here\`"
"This code snippet results in the overall ${spaceComplexity} space complexity: \`actual code here\`"

Return only valid JSON.`;

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent output
        max_tokens: 800,
        response_format: { type: "json_object" }, // Enforce JSON response
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[analyze-complexity-snippets] OpenAI API error:", errorText);
      return NextResponse.json(
        { error: "Failed to analyze code snippets" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error("[analyze-complexity-snippets] Empty response from OpenAI");
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let snippetsData;
    try {
      snippetsData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error("[analyze-complexity-snippets] Failed to parse AI response:", aiResponse);
      return NextResponse.json(
        { error: "Invalid response format from AI" },
        { status: 500 }
      );
    }

    // Validate the response structure
    if (!snippetsData.timeSnippets || !snippetsData.spaceSnippets) {
      console.error("[analyze-complexity-snippets] Missing snippets in response:", snippetsData);
      return NextResponse.json(
        { error: "Invalid snippets structure" },
        { status: 500 }
      );
    }

    // Ensure we have exactly 2 snippets for each
    const timeSnippets = Array.isArray(snippetsData.timeSnippets)
      ? snippetsData.timeSnippets.slice(0, 2)
      : [];
    const spaceSnippets = Array.isArray(snippetsData.spaceSnippets)
      ? snippetsData.spaceSnippets.slice(0, 2)
      : [];

    return NextResponse.json({
      success: true,
      timeSnippets,
      spaceSnippets,
    });

  } catch (error) {
    console.error("[analyze-complexity-snippets] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
