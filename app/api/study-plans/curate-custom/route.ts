import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Topic keywords and their associated problem tags
const TOPIC_KEYWORDS: Record<string, { tags: string[]; difficulty_progression: string[] }> = {
  "dynamic programming": {
    tags: ["dynamic-programming", "dp"],
    difficulty_progression: ["Easy", "Medium", "Hard"],
  },
  "dp": {
    tags: ["dynamic-programming", "dp"],
    difficulty_progression: ["Easy", "Medium", "Hard"],
  },
  "graph": {
    tags: ["graph", "depth-first-search", "breadth-first-search"],
    difficulty_progression: ["Easy", "Medium", "Hard"],
  },
  "tree": {
    tags: ["tree", "binary-tree", "binary-search-tree"],
    difficulty_progression: ["Easy", "Medium", "Hard"],
  },
  "array": {
    tags: ["array"],
    difficulty_progression: ["Easy", "Medium", "Hard"],
  },
  "string": {
    tags: ["string"],
    difficulty_progression: ["Easy", "Medium", "Hard"],
  },
  "linked list": {
    tags: ["linked-list"],
    difficulty_progression: ["Easy", "Medium", "Hard"],
  },
  "backtracking": {
    tags: ["backtracking"],
    difficulty_progression: ["Easy", "Medium", "Hard"],
  },
  "greedy": {
    tags: ["greedy"],
    difficulty_progression: ["Easy", "Medium", "Hard"],
  },
  "heap": {
    tags: ["heap", "priority-queue"],
    difficulty_progression: ["Easy", "Medium", "Hard"],
  },
  "sliding window": {
    tags: ["sliding-window"],
    difficulty_progression: ["Easy", "Medium", "Hard"],
  },
  "two pointers": {
    tags: ["two-pointers"],
    difficulty_progression: ["Easy", "Medium", "Hard"],
  },
};

// Extract topic from study plan name
function extractTopic(planName: string): string | null {
  const lowerName = planName.toLowerCase();
  
  for (const [keyword, config] of Object.entries(TOPIC_KEYWORDS)) {
    if (lowerName.includes(keyword)) {
      return keyword;
    }
  }
  
  return null;
}

// Determine if it's a "0 to hero" or beginner-friendly plan
function isBeginnerPlan(planName: string): boolean {
  const lowerName = planName.toLowerCase();
  return (
    lowerName.includes("0 to hero") ||
    lowerName.includes("beginner") ||
    lowerName.includes("fundamentals") ||
    lowerName.includes("basics")
  );
}

// Create structured milestones for a topic
function createMilestonesForTopic(
  topic: string,
  problems: any[],
  isBeginner: boolean
): Array<{
  title: string;
  description: string;
  learning_objectives: string[];
  problems: any[];
  estimated_hours: number;
}> {
  const config = TOPIC_KEYWORDS[topic];
  if (!config) return [];

  const milestones: Array<{
    title: string;
    description: string;
    learning_objectives: string[];
    problems: any[];
    estimated_hours: number;
  }> = [];

  // Group problems by difficulty
  const easyProblems = problems.filter((p) => p.difficulty === "Easy");
  const mediumProblems = problems.filter((p) => p.difficulty === "Medium");
  const hardProblems = problems.filter((p) => p.difficulty === "Hard");

  // Milestone 1: Fundamentals (Easy problems)
  if (easyProblems.length > 0) {
    const easyCount = isBeginner ? Math.min(5, easyProblems.length) : Math.min(3, easyProblems.length);
    milestones.push({
      title: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Fundamentals`,
      description: `Start with the basics. Master fundamental ${topic} concepts and patterns.`,
      learning_objectives: [
        `Understand basic ${topic} concepts`,
        `Solve simple ${topic} problems`,
        `Build problem-solving confidence`,
      ],
      problems: easyProblems.slice(0, easyCount),
      estimated_hours: easyCount * 1.5,
    });
  }

  // Milestone 2: Core Patterns (Medium problems)
  if (mediumProblems.length > 0) {
    const mediumCount = isBeginner ? Math.min(8, mediumProblems.length) : Math.min(10, mediumProblems.length);
    milestones.push({
      title: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Core Patterns`,
      description: `Dive deeper into ${topic} patterns and common problem types.`,
      learning_objectives: [
        `Master common ${topic} patterns`,
        `Apply patterns to solve medium problems`,
        `Understand problem variations`,
      ],
      problems: mediumProblems.slice(0, mediumCount),
      estimated_hours: mediumCount * 2,
    });
  }

  // Milestone 3: Advanced Applications (Hard problems + remaining medium)
  if (hardProblems.length > 0 || mediumProblems.length > (isBeginner ? 8 : 10)) {
    const remainingMedium = mediumProblems.slice(isBeginner ? 8 : 10);
    const hardCount = Math.min(5, hardProblems.length);
    const advancedProblems = [...remainingMedium, ...hardProblems.slice(0, hardCount)];
    
    if (advancedProblems.length > 0) {
      milestones.push({
        title: `Advanced ${topic.charAt(0).toUpperCase() + topic.slice(1)}`,
        description: `Tackle complex ${topic} problems and master advanced techniques.`,
        learning_objectives: [
          `Solve complex ${topic} problems`,
          `Master advanced techniques`,
          `Prepare for interview-level challenges`,
        ],
        problems: advancedProblems,
        estimated_hours: advancedProblems.length * 2.5,
      });
    }
  }

  return milestones;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { template_id, plan_name } = body;

    if (!template_id || !plan_name) {
      return NextResponse.json(
        { error: "template_id and plan_name are required" },
        { status: 400 }
      );
    }

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from("study_plan_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Extract topic from plan name
    const topic = extractTopic(plan_name);
    if (!topic) {
      return NextResponse.json(
        { error: "Could not identify topic from plan name. Please use keywords like 'DP', 'Graph', 'Tree', etc." },
        { status: 400 }
      );
    }

    const isBeginner = isBeginnerPlan(plan_name);
    const config = TOPIC_KEYWORDS[topic];

    // Fetch problems matching the topic tags
    // We'll search for problems that have any of the tags
    let allProblems: any[] = [];
    
    for (const tag of config.tags) {
      const { data: problems, error: problemsError } = await supabase
        .from("problems")
        .select("id, title, title_slug, difficulty, topic_tags, acceptance_rate, leetcode_id")
        .contains("topic_tags", [{ slug: tag }])
        .eq("is_premium", false) // Exclude premium problems
        .limit(100);

      if (!problemsError && problems) {
        // Add problems that aren't already in the list
        problems.forEach((p) => {
          if (!allProblems.find((existing) => existing.id === p.id)) {
            allProblems.push(p);
          }
        });
      }
    }

    if (allProblems.length === 0) {
      return NextResponse.json(
        { error: `No problems found for topic: ${topic}` },
        { status: 404 }
      );
    }

    // Sort problems by difficulty and acceptance rate (easier first)
    allProblems.sort((a, b) => {
      const difficultyOrder = { Easy: 1, Medium: 2, Hard: 3 };
      const diffCompare = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] - 
                          difficultyOrder[b.difficulty as keyof typeof difficultyOrder];
      if (diffCompare !== 0) return diffCompare;
      
      // If same difficulty, sort by acceptance rate (higher first = easier)
      return (b.acceptance_rate || 0) - (a.acceptance_rate || 0);
    });

    // Create milestones
    const milestoneConfigs = createMilestonesForTopic(topic, allProblems, isBeginner);

    if (milestoneConfigs.length === 0) {
      return NextResponse.json(
        { error: "Could not create milestones from available problems" },
        { status: 500 }
      );
    }

    // Delete existing milestones
    await supabase
      .from("study_plan_template_milestones")
      .delete()
      .eq("template_id", template_id);

    // Create milestones
    const milestonesData = milestoneConfigs.map((config, index) => ({
      template_id: template_id,
      title: config.title,
      description: config.description,
      learning_objectives: config.learning_objectives,
      milestone_order: index + 1,
      problem_ids: config.problems.map((p) => p.id),
      required_problems: Math.ceil(config.problems.length * 0.7),
      total_problems: config.problems.length,
      estimated_hours: config.estimated_hours,
    }));

    const { error: milestonesError } = await supabase
      .from("study_plan_template_milestones")
      .insert(milestonesData);

    if (milestonesError) {
      console.error("Error creating milestones:", milestonesError);
      return NextResponse.json(
        { error: "Failed to create milestones" },
        { status: 500 }
      );
    }

    // Calculate totals
    const totalProblems = milestonesData.reduce((sum, m) => sum + m.total_problems, 0);
    const easyCount = allProblems.filter((p) => p.difficulty === "Easy").length;
    const mediumCount = allProblems.filter((p) => p.difficulty === "Medium").length;
    const hardCount = allProblems.filter((p) => p.difficulty === "Hard").length;

    // Update template
    await supabase
      .from("study_plan_templates")
      .update({
        total_problems: totalProblems,
        total_milestones: milestonesData.length,
        easy_problems: easyCount,
        medium_problems: mediumCount,
        hard_problems: hardCount,
      })
      .eq("id", template_id);

    return NextResponse.json({
      success: true,
      message: `Created ${milestonesData.length} milestones with ${totalProblems} problems`,
      milestones_created: milestonesData.length,
      problems_added: totalProblems,
      topic: topic,
      is_beginner: isBeginner,
    });
  } catch (error) {
    console.error("Error in curate custom route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

