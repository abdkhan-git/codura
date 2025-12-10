// app/questionnaire/page.tsx
import { createClient } from "@/utils/supabase/server";
import  QuestionnaireForm from "@/components/QuestionnaireForm"

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const supabase = await createClient();

  // Load all 4 active questions (positions 1-4)
  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select("question_id, prompt, allows_multiple, position")
    .eq("is_active", true)
    .in("position", [1, 2, 3, 4])
    .order("position", { ascending: true });

  if (qErr || !questions?.length) {
    return <div className="text-red-500 p-6">Couldn't load questions.</div>;
  }

  const ids = questions.map((q) => q.question_id);

  // Load all options for those questions
  const { data: options, error: oErr } = await supabase
    .from("question_options")
    .select("question_id, label, value, position")
    .in("question_id", ids)
    .order("position", { ascending: true });

  if (oErr) {
    return <div className="text-red-500 p-6">Couldn't load options.</div>;
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

  return (
    <div className="caffeine-theme bg-background min-h-screen">
      <div className="max-w-6xl mx-auto p-6">
        <QuestionnaireForm items={items} />
      </div>
    </div>
  );
}