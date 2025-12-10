/**
 * LeetCode GraphQL API Fetcher
 * Fetches problems from LeetCode's unofficial GraphQL API
 */

const LEETCODE_GRAPHQL_ENDPOINT = 'https://leetcode.com/graphql';

export interface LeetCodeProblem {
  acRate: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  frontendQuestionId: string;
  title: string;
  titleSlug: string;
  topicTags: Array<{
    name: string;
    id: string;
    slug: string;
  }>;
  isPaidOnly: boolean;
  hasSolution: boolean;
  hasVideoSolution: boolean;
  status: string | null;
}

export interface LeetCodeProblemDetail {
  questionId: string;
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  content: string;
  difficulty: string;
  likes: number;
  dislikes: number;
  similarQuestions: string;
  exampleTestcases: string;
  categoryTitle: string;
  topicTags: Array<{
    name: string;
    slug: string;
  }>;
  companyTagStats: string | null;
  codeSnippets: Array<{
    lang: string;
    langSlug: string;
    code: string;
  }>;
  stats: string;
  hints: string[];
  solution: any | null;
  status: string | null;
  sampleTestCase: string;
  metaData: string;
  judgerAvailable: boolean;
  judgeType: string;
  mysqlSchemas: string[];
  enableRunCode: boolean;
  enableTestMode: boolean;
  enableDebugger: boolean;
  envInfo: string;
  libraryUrl: string | null;
}

/**
 * Fetch all problems from LeetCode
 */
export async function fetchAllProblems(
  limit: number = 3000,
  skip: number = 0
): Promise<{ total: number; problems: LeetCodeProblem[] }> {
  const query = `
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        total: totalNum
        questions: data {
          acRate
          difficulty
          frontendQuestionId: questionFrontendId
          title
          titleSlug
          topicTags {
            name
            id
            slug
          }
          isPaidOnly
          hasSolution
          hasVideoSolution
          status
        }
      }
    }
  `;

  const variables = {
    categorySlug: 'all-code-essentials',
    skip,
    limit,
    filters: {},
  };

  try {
    const response = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com/problemset/all/',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
    }

    return {
      total: data.data.problemsetQuestionList.total,
      problems: data.data.problemsetQuestionList.questions,
    };
  } catch (error) {
    console.error('Error fetching problems from LeetCode:', error);
    throw error;
  }
}

/**
 * Fetch detailed information for a specific problem
 */
export async function fetchProblemDetail(
  titleSlug: string
): Promise<LeetCodeProblemDetail> {
  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        questionFrontendId
        title
        titleSlug
        content
        difficulty
        likes
        dislikes
        similarQuestions
        exampleTestcases
        categoryTitle
        topicTags {
          name
          slug
        }
        companyTagStats
        codeSnippets {
          lang
          langSlug
          code
        }
        stats
        hints
        solution {
          id
          canSeeDetail
          paidOnly
          hasVideoSolution
          paidOnlyVideo
        }
        status
        sampleTestCase
        metaData
        judgerAvailable
        judgeType
        mysqlSchemas
        enableRunCode
        enableTestMode
        enableDebugger
        envInfo
        libraryUrl
      }
    }
  `;

  const variables = {
    titleSlug,
  };

  try {
    const response = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': `https://leetcode.com/problems/${titleSlug}/`,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
    }

    return data.data.question;
  } catch (error) {
    console.error(
      `Error fetching problem detail for ${titleSlug}:`,
      error
    );
    throw error;
  }
}

/**
 * Fetch problems in batches to avoid overwhelming the API
 */
export async function fetchProblemsInBatches(
  batchSize: number = 100,
  totalProblems?: number
): Promise<LeetCodeProblem[]> {
  let allProblems: LeetCodeProblem[] = [];
  let skip = 0;
  let total = totalProblems || 0;

  // First request to get the total count if not provided
  if (!totalProblems) {
    const firstBatch = await fetchAllProblems(1, 0);
    total = firstBatch.total;
  }

  console.log(`Fetching ${total} problems in batches of ${batchSize}...`);

  while (skip < total) {
    console.log(
      `Fetching problems ${skip + 1} to ${Math.min(skip + batchSize, total)}...`
    );

    const { problems } = await fetchAllProblems(batchSize, skip);
    allProblems = allProblems.concat(problems);

    skip += batchSize;

    // Add a small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`Successfully fetched ${allProblems.length} problems`);
  return allProblems;
}

/**
 * Transform LeetCode problem to database format
 */
export function transformProblemForDB(problem: LeetCodeProblem) {
  return {
    leetcode_id: parseInt(problem.frontendQuestionId),
    title: problem.title,
    title_slug: problem.titleSlug,
    difficulty: problem.difficulty,
    acceptance_rate: problem.acRate,
    topic_tags: problem.topicTags,
    is_premium: problem.isPaidOnly,
    has_solution: problem.hasSolution,
    has_video_solution: problem.hasVideoSolution,
  };
}

/**
 * Transform detailed problem to database format
 */
export function transformProblemDetailForDB(detail: LeetCodeProblemDetail) {
  let examples: any[] = [];
  try {
    // Parse examples from content (simplified - you may need better parsing)
    const exampleMatches = detail.content.match(
      /<strong[^>]*>Example \d+:<\/strong>[\s\S]*?(?=<strong[^>]*>Example \d+:<\/strong>|<p><strong[^>]*>Constraints:|$)/g
    );
    if (exampleMatches) {
      examples = exampleMatches.map((ex, i) => ({
        id: i + 1,
        content: ex.replace(/<[^>]*>/g, '').trim(),
      }));
    }
  } catch (e) {
    console.error('Error parsing examples:', e);
  }

  let stats: any = {};
  try {
    stats = JSON.parse(detail.stats);
  } catch (e) {
    console.error('Error parsing stats:', e);
  }

  return {
    leetcode_id: parseInt(detail.questionFrontendId),
    title: detail.title,
    title_slug: detail.titleSlug,
    difficulty: detail.difficulty,
    description: detail.content,
    topic_tags: detail.topicTags,
    hints: detail.hints,
    code_snippets: detail.codeSnippets,
    examples,
    total_submissions: stats.totalSubmission || 0,
    total_accepted: stats.totalAccepted || 0,
    acceptance_rate: stats.acRate
      ? parseFloat(stats.acRate)
      : null,
  };
}
