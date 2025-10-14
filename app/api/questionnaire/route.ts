// app/api/questionnaire/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load all 4 active questions (positions 1-4)
    const { data: questions, error: qErr } = await supabase
      .from("questions")
      .select("question_id, prompt, allows_multiple, position")
      .eq("is_active", true)
      .in("position", [1, 2, 3, 4])
      .order("position", { ascending: true });

    if (qErr || !questions?.length) {
      return NextResponse.json({ error: 'Could not load questions' }, { status: 500 });
    }

    const ids = questions.map((q) => q.question_id);

    // Load all options for those questions
    const { data: options, error: oErr } = await supabase
      .from("question_options")
      .select("question_id, label, value, position")
      .in("question_id", ids)
      .order("position", { ascending: true });

    if (oErr) {
      return NextResponse.json({ error: 'Could not load options' }, { status: 500 });
    }

    // Group options by question
    const grouped = new Map<number, { label: string; value: string; position: number }[]>();
    for (const opt of options ?? []) {
      const list = grouped.get(opt.question_id) ?? [];
      list.push(opt);
      grouped.set(opt.question_id, list);
    }

    // Shape props for the client component with maxChoices per question
    const items = questions.map((q) => ({
      question_id: q.question_id,
      prompt: q.prompt,
      allows_multiple: q.allows_multiple,
      position: q.position,
      options: grouped.get(q.question_id) ?? [],
      // Set per-question caps based on question type
      maxChoices: q.allows_multiple ? (q.position === 1 ? 3 : q.position === 4 ? 5 : 6) : 1,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching questionnaire:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

