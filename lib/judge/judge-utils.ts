import { createClient } from '@/utils/supabase/server';

// ==================== TYPE DEFINITIONS ====================

export interface ComplexityResult {
  timeComplexity: string;
  spaceComplexity: string;
  confidence: number;
  spaceConfidence: number;
  analysis: string;
  spaceAnalysis: string;
  timeSnippets: string[];
  spaceSnippets: string[];
  details: {
    loops: number;
    nestedLoops: number;
    recursiveCalls: number;
    maxNestingDepth: number;
  };
  spaceDetails: {
    variables: number;
    arrays: number;
    objects: number;
    recursionDepth: number;
    auxiliaryStructures: number;
  };
}

export interface ProblemMetadata {
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  function_name: string;
  parameters: string[];
  return_type: string;
  comparison_type: string;
  input_transformers?: Record<string, string>;
  custom_comparison?: string;
  starter_code_python?: string;
}

export interface TestCase {
  input: Record<string, any>;
  expected: any;
}

export interface ProblemDefinition {
  metadata: ProblemMetadata;
  visible: TestCase[];
  hidden: TestCase[];
}

// Language ID mapping for Judge0
export const LANGUAGE_IDS: Record<string, number> = {
  python: 71,
  java: 62,
  javascript: 63,
  typescript: 74,
  cpp: 54,
  csharp: 51,
  go: 60
};

// ==================== MAIN UTILITY FUNCTIONS ====================

export async function getProblemMetadata(problemSlug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('problems_metadata')
    .select('*')
    .eq('slug', problemSlug)
    .single();

  if (error || !data) {
    console.error('Error fetching metadata:', error);
    return null;
  }

  return {
    slug: data.slug,
    functionName: data.function_name,
    parameters: data.parameters,
    returnType: data.return_type,
    comparisonType: data.comparison_type,
    customComparison: data.custom_comparison,
    inputTransformers: data.input_transformers,
    outputTransformer: data.output_transformer
  };
}

export async function getTestCasesForProblem(problemSlug: string, includeHidden: boolean) {
  const supabase = await createClient();
  const { data: metadata } = await supabase
    .from('problems_metadata')
    .select('problem_id')
    .eq('slug', problemSlug)
    .single();

  if (!metadata) {
    console.error('Problem not found:', problemSlug);
    return [];
  }

  let query = supabase
    .from('problems_test_cases')
    .select('input, expected, is_hidden, display_order')
    .eq('problem_id', metadata.problem_id)
    .order('display_order');

  if (!includeHidden) {
    query = query.eq('is_hidden', false);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Error fetching test cases:', error);
    return [];
  }

  return data.map(tc => ({
    input: tc.input,
    expected: tc.expected
  }));
}

export async function wrapCodeWithTestcases(
  userCode: string,
  problemSlug: string,
  includeHidden: boolean,
  language: string
): Promise<string> {
  const metadata = await getProblemMetadata(problemSlug);
  if (!metadata) {
    throw new Error(`Unknown problem: ${problemSlug}`);
  }

  const testCases = await getTestCasesForProblem(problemSlug, includeHidden);
  if (testCases.length === 0) {
    throw new Error(`No test cases found for problem: ${problemSlug}`);
  }

  // Route to appropriate language harness generator
  switch (language.toLowerCase()) {
    case 'python':
      return generatePythonTestHarness(userCode, testCases, metadata);
    case 'java':
      return generateJavaTestHarness(userCode, testCases, metadata);
    case 'javascript':
      return generateJavaScriptTestHarness(userCode, testCases, metadata);
    case 'typescript':
      return generateTypeScriptTestHarness(userCode, testCases, metadata);
    case 'cpp':
    case 'c++':
      return generateCppTestHarness(userCode, testCases, metadata);
    case 'csharp':
    case 'c#':
      return generateCSharpTestHarness(userCode, testCases, metadata);
    case 'go':
      return generateGoTestHarness(userCode, testCases, metadata);
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

export async function storeSubmission(
  user_id: string,
  problem_id: number,
  problem_title: string,
  problem_difficulty: string,
  language: string,
  judge0Result: any,
  status: string,
  source_code: string,
  submitted_at: string,
  complexityResult?: ComplexityResult
) {
  const supabase = await createClient();
  const submissionData: any = {
    user_id,
    problem_id,
    problem_title,
    difficulty: problem_difficulty,
    language,
    status,
    code: source_code,
    submitted_at,
    runtime: judge0Result.time,
    memory: judge0Result.memory
  };

  // Add complexity fields if analysis was successful
  if (complexityResult) {
    submissionData.time_complexity = complexityResult.timeComplexity;
    submissionData.complexity_confidence = complexityResult.confidence;
    submissionData.complexity_analysis = complexityResult.analysis;
    submissionData.space_complexity = complexityResult.spaceComplexity;
    submissionData.space_complexity_analysis = complexityResult.spaceAnalysis;

    // Add AI-generated code snippets from complexityResult
    if (complexityResult.timeSnippets && complexityResult.spaceSnippets) {
      submissionData.time_complexity_snippets = complexityResult.timeSnippets;
      submissionData.space_complexity_snippets = complexityResult.spaceSnippets;
    }
  }

  const { data, error } = await supabase
    .from('submissions')
    .insert(submissionData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Combined AI complexity analysis function (replaces heuristic + snippet generation)
export async function analyzeComplexityWithAI(
  code: string,
  language: string
): Promise<ComplexityResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('[analyzeComplexityWithAI] Missing OPENAI_API_KEY');
    return null;
  }

  const systemPrompt = `You are an expert algorithm complexity analyzer. Analyze the provided code and:

1. Determine time complexity (Big O notation)
2. Determine space complexity (Big O notation)
3. Provide confidence scores (0.0-1.0) for each
4. Write brief explanations
5. Identify EXACTLY 2 code snippets that contribute to time complexity
6. Identify EXACTLY 2 code snippets that contribute to space complexity

CRITICAL RULES:
- Understand language-specific operations:
  * Python: dict/set lookup is O(1), list append is O(1) amortized
  * JavaScript: Map/Set is O(1), array push is O(1) amortized
  * Consider DOMINANT operations (worst-case scenario)
- For snippets: Show actual code lines that cause the complexity
- Format: "This code snippet results in the overall {complexity} {type} complexity: \`code here\`"

COMPLEXITY NOTATION FORMAT (use EXACTLY these strings):
- Use "O(1)" for constant time
- Use "O(log n)" for logarithmic time
- Use "O(n)" for linear time
- Use "O(n log n)" for linearithmic time
- Use "O(n²)" for quadratic time (with superscript ²)
- Use "O(2ⁿ)" for exponential time (with superscript ⁿ)
- Use "O(n³)" for cubic time (with superscript ³)

Return ONLY valid JSON with this exact structure:
{
  "timeComplexity": "O(n²)",
  "spaceComplexity": "O(n)",
  "confidence": 0.95,
  "spaceConfidence": 0.90,
  "analysis": "Nested loops result in O(n²) time complexity",
  "spaceAnalysis": "Array grows linearly with input size",
  "timeSnippets": [
    "This code snippet results in the overall O(n²) time complexity: \`for i in range(len(nums)):\`",
    "This code snippet results in the overall O(n²) time complexity: \`for j in range(i+1, len(nums)):\`"
  ],
  "spaceSnippets": [
    "This code snippet results in the overall O(n) space complexity: \`result = []\`",
    "This code snippet results in the overall O(n) space complexity: \`result.append(item)\`"
  ]
}`;

  const userPrompt = `Analyze this ${language} code and determine its time/space complexity with code snippets:

\`\`\`${language}
${code}
\`\`\`

Return only valid JSON.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.error('[analyzeComplexityWithAI] OpenAI API error:', response.status);
      return null;
    }

    const data: any = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error('[analyzeComplexityWithAI] Empty response from OpenAI');
      return null;
    }

    const parsed = JSON.parse(aiResponse);

    // Validate required fields
    if (!parsed.timeComplexity || !parsed.spaceComplexity) {
      console.error('[analyzeComplexityWithAI] Missing complexity values in response');
      return null;
    }

    // Return full ComplexityResult with defaults for missing fields
    return {
      timeComplexity: normalizeComplexityNotation(parsed.timeComplexity),
      spaceComplexity: normalizeComplexityNotation(parsed.spaceComplexity),
      confidence: parsed.confidence || 0.7,
      spaceConfidence: parsed.spaceConfidence || 0.7,
      analysis: parsed.analysis || 'Complexity detected via AI analysis',
      spaceAnalysis: parsed.spaceAnalysis || 'Space complexity detected via AI analysis',
      timeSnippets: Array.isArray(parsed.timeSnippets) ? parsed.timeSnippets.slice(0, 2) : [],
      spaceSnippets: Array.isArray(parsed.spaceSnippets) ? parsed.spaceSnippets.slice(0, 2) : [],
      details: { loops: 0, nestedLoops: 0, recursiveCalls: 0, maxNestingDepth: 0 },
      spaceDetails: { variables: 0, arrays: 0, objects: 0, recursionDepth: 0, auxiliaryStructures: 0 }
    };
  } catch (error) {
    console.error('[analyzeComplexityWithAI] Error:', error);
    return null;
  }
}

// Normalize complexity notation to match frontend's expected format
export function normalizeComplexityNotation(notation: string): string {
  // Map common AI outputs to frontend's expected format with superscripts
  const normalizationMap: Record<string, string> = {
    'O(n^2)': 'O(n²)',
    'O(n**2)': 'O(n²)',
    'O(n2)': 'O(n²)',
    'O(2^n)': 'O(2ⁿ)',
    'O(2**n)': 'O(2ⁿ)',
    'O(n^3)': 'O(n³)',
    'O(n**3)': 'O(n³)',
    'O(n3)': 'O(n³)',
  };

  return normalizationMap[notation] || notation;
}

export async function pollSubmissionStatus(token: string) {
  const submissionUri = `https://${process.env.RAPIDAPI_HOST}/submissions/${token}?base64_encoded=false`
  const maxAttempts = 20
  const initialPollInterval = 100 // Start with 100ms
  const maxPollInterval = 1000 // Max 1 second between polls

  let attempts = 0
  let pollInterval = initialPollInterval

  // Terminal statuses that mean we're done
  const terminalStatuses = [
    'Accepted',
    'Wrong Answer',
    'Runtime Error (NZEC)',
    'Runtime Error (SIGSEGV)',
    'Runtime Error (SIGXFSZ)',
    'Runtime Error (SIGFPE)',
    'Runtime Error (SIGABRT)',
    'Runtime Error (Other)',
    'Compilation Error',
    'Time Limit Exceeded',
    'Internal Error',
    'Exec Format Error'
  ]

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(submissionUri, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': process.env.RAPIDAPI_HOST!,
          'x-rapidapi-key': process.env.RAPIDAPI_KEY!
        },
      })

      if (!response.ok) {
        console.log(`Received ${response.status} -- trying again in ${pollInterval} ms`)
        await sleep(pollInterval)
        attempts++
        continue
      }

      const data = await response.json()
      const status = data.status?.description
      const statusId = data.status?.id
      console.log(`[Poll ${attempts + 1}] Status: ${status} (ID: ${statusId})`)

      // Check if we're done (status ID 3 = Accepted, 4-14 are various errors)
      if (terminalStatuses.includes(status) || (statusId && statusId >= 3)) {
        console.log(`✅ Terminal status reached: ${status}`)
        return data
      }

      // Still processing (status ID 1 = In Queue, 2 = Processing)
      if (attempts < maxAttempts) {
        attempts++
        await sleep(pollInterval)
        // Exponential backoff: gradually increase polling interval
        pollInterval = Math.min(pollInterval * 1.5, maxPollInterval)
      }

    } catch (error) {
      console.error('Polling error:', error)
      return error
    }
  }

  console.warn('⚠️ Max polling attempts reached')
  return null
}

export function parseTestResults(judge0Result: any, testcases: any[]) {
  const stdout = judge0Result.stdout || '';
  const stderr = judge0Result.stderr || '';
  const compile_output = judge0Result.compile_output || '';

  const lines = stdout.split('\n').filter((line: string) => line.trim());

  const results = testcases.map((testcase, index) => {
    const testLine = lines.find((line: string) =>
      line.includes(`Test ${index + 1}:`)
    );

    let status = 'pending';
    let actual = null;
    let error = null;

    if (testLine) {
      if (testLine.includes('PASS')) {
        status = 'passed';
        actual = testcase.expected;
      } else if (testLine.includes('FAIL')) {
        status = 'failed';
        const actualMatch = testLine.match(/got (.+)$/);
        if (actualMatch) {
          try {
            actual = JSON.parse(actualMatch[1]);
          } catch {
            actual = actualMatch[1];
          }
        }
      } else if (testLine.includes('ERROR')) {
        status = 'error';
        const errorMatch = testLine.match(/ERROR - (.+)$/);
        error = errorMatch ? errorMatch[1] : 'Runtime error';
      }
    }

    return {
      testcase_number: index + 1,
      input: testcase.input,
      expected: testcase.expected,
      actual,
      status,
      error,
      passed: status === 'passed'
    };
  });

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const errors = results.filter(r => r.status === 'error').length;
  const total = testcases.length;

  let label = 'Accepted';

  // Safely check judge0Result.status
  const statusId = judge0Result.status?.id;

  if (statusId === 6) {
    label = 'Compilation Error';
  } else if (statusId === 5) {
    label = 'Time Limit Exceeded';
  } else if (statusId === 11 || statusId === 12) {
    label = 'Runtime Error';
  } else if (statusId === 3 || !statusId) {
    // If statusId is undefined or 3 (Accepted), determine from test results
    if (passed === total) {
      label = 'Accepted';
    } else if (errors > 0) {
      label = 'Runtime Error';
    } else {
      label = 'Wrong Answer';
    }
  }

  return {
    label,
    passed,
    failed,
    errors,
    total,
    results,
    stdout,
    stderr,
    compile_output,
    runtime: judge0Result.time,
    memory: judge0Result.memory
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ==================== PYTHON ====================

const PYTHON_DATA_STRUCTURES: Record<string, string> = {
  ListNode: `# Definition for singly-linked list.
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next`,

  TreeNode: `# Definition for a binary tree node.
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right`,

  Node: `# Definition for a Node.
class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []`
};

const PYTHON_HELPER_FUNCTIONS: Record<string, string> = {
  array_to_listnode: `def array_to_listnode(arr):
    if not arr:
        return None
    head = ListNode(arr[0])
    current = head
    for val in arr[1:]:
        current.next = ListNode(val)
        current = current.next
    return head`,

  listnode_to_array: `def listnode_to_array(node):
    arr = []
    while node:
        arr.append(node.val)
        node = node.next
    return arr`,

  array_to_treenode: `def array_to_treenode(arr):
    if not arr:
        return None
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    while queue and i < len(arr):
        node = queue.pop(0)
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            queue.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            queue.append(node.right)
        i += 1
    return root`,

  treenode_to_array: `def treenode_to_array(root):
    if not root:
        return []
    result = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node:
            result.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            result.append(None)
    while result and result[-1] is None:
        result.pop()
    return result`
};

function generatePythonTestHarness(
  userCode: string,
  testCases: any[],
  metadata: any
): string {
  const cleanedCode = userCode.trim();
  const wrappedCode = wrapInClass(cleanedCode);
  const dataStructures = getRequiredDataStructures(metadata);
  const transformerCode = generateTransformers(metadata);
  const comparisonCode = generateComparisonLogic(metadata);
  const paramExtraction = generateParamExtraction(metadata);
  const functionCall = `solution.${metadata.functionName}(${metadata.parameters.join(', ')})`;
  const pythonTestCases = convertToPythonFormat(testCases);

  return `${dataStructures}

${wrappedCode}

${transformerCode}

${comparisonCode}

# Test harness
solution = Solution()
test_cases = ${pythonTestCases}

for i, test in enumerate(test_cases):
    try:
        ${paramExtraction}
        result = ${functionCall}
        expected = test['expected']

        if result is None and expected is not None:
            print(f"Test {i + 1}: FAIL - Expected {expected}, got None")
        elif compare_results(result, expected):
            print(f"Test {i + 1}: PASS")
        else:
            result_str = str(result) if result is not None else "None"
            expected_str = str(expected) if expected is not None else "None"
            print(f"Test {i + 1}: FAIL - Expected {expected_str}, got {result_str}")
    except Exception as e:
        import traceback
        error_msg = str(e)
        if len(error_msg) > 200:
            error_msg = error_msg[:200] + "..."
        print(f"Test {i + 1}: ERROR - {error_msg}")
`;
}

function convertToPythonFormat(obj: any): string {
  if (obj === null) return 'None';
  if (obj === true) return 'True';
  if (obj === false) return 'False';
  if (typeof obj === 'string') return JSON.stringify(obj);
  if (typeof obj === 'number') return String(obj);
  if (Array.isArray(obj)) {
    const items = obj.map(item => convertToPythonFormat(item));
    return `[${items.join(', ')}]`;
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj).map(([key, value]) => {
      return `"${key}": ${convertToPythonFormat(value)}`;
    });
    return `{${entries.join(', ')}}`;
  }
  return String(obj);
}

function wrapInClass(code: string): string {
  const hasClass = code.includes('class Solution');
  return hasClass
    ? code
    : `class Solution:\n${code.split('\n').map(line => '    ' + line).join('\n')}`;
}

function getRequiredDataStructures(metadata: any): string {
  const structures = new Set<string>();

  if (metadata.returnType === 'listnode') structures.add('ListNode');
  if (metadata.returnType === 'treenode') structures.add('TreeNode');

  if (metadata.inputTransformers) {
    for (const transformer of Object.values(metadata.inputTransformers)) {
      if (typeof transformer === 'string' &&
          (transformer.includes('ListNode') || transformer === 'array_to_listnode')) {
        structures.add('ListNode');
      }
      if (typeof transformer === 'string' &&
          (transformer.includes('TreeNode') || transformer === 'array_to_treenode')) {
        structures.add('TreeNode');
      }
    }
  }

  const definitions: string[] = [];
  for (const structure of structures) {
    if (PYTHON_DATA_STRUCTURES[structure]) {
      definitions.push(PYTHON_DATA_STRUCTURES[structure]);
    }
  }

  return definitions.join('\n\n');
}

function generateTransformers(metadata: any): string {
  if (!metadata.inputTransformers) return '';

  let code = '# Input transformers\n';
  const requiredHelpers = new Set<string>();

  for (const [param, transformerName] of Object.entries(metadata.inputTransformers)) {
    if (typeof transformerName === 'string' && PYTHON_HELPER_FUNCTIONS[transformerName]) {
      requiredHelpers.add(transformerName);
    }
  }

  for (const helperName of requiredHelpers) {
    code += PYTHON_HELPER_FUNCTIONS[helperName] + '\n\n';
  }

  return code;
}

function generateComparisonLogic(metadata: any): string {
  if (metadata.customComparison && PYTHON_HELPER_FUNCTIONS[metadata.customComparison]) {
    return `${PYTHON_HELPER_FUNCTIONS[metadata.customComparison]}

def compare_results(result, expected):
    return ${metadata.customComparison}(result) == expected
`;
  }

  const comparisons: Record<string, string> = {
    sorted: `
def compare_results(result, expected):
    try:
        return sorted(result) == sorted(expected)
    except:
        return result == expected
`,
    unordered: `
def compare_results(result, expected):
    try:
        if result is None or expected is None:
            return result == expected
        if not isinstance(result, list) or not isinstance(expected, list):
            return result == expected
        if len(result) != len(expected):
            return False
        sorted_result = sorted([sorted(r) if isinstance(r, list) else r for r in result])
        sorted_expected = sorted([sorted(e) if isinstance(e, list) else e for e in expected])
        return sorted_result == sorted_expected
    except Exception as e:
        return result == expected
`,
    float: `
def compare_results(result, expected):
    try:
        return abs(result - expected) < 1e-5
    except:
        return result == expected
`,
    exact: `
def compare_results(result, expected):
    return result == expected
`
  };

  return comparisons[metadata.comparisonType] || comparisons.exact;
}

function generateParamExtraction(metadata: any): string {
  return metadata.parameters
    .map((param: string) => {
      const transformerNameOrCode = metadata.inputTransformers?.[param];
      if (!transformerNameOrCode) {
        return `${param} = test['input']['${param}']`;
      }

      if (PYTHON_HELPER_FUNCTIONS[transformerNameOrCode]) {
        return `${param} = ${transformerNameOrCode}(test['input']['${param}'])`;
      } else {
        return `${param} = transform_${param}(test['input']['${param}'])`;
      }
    })
    .join('\n        ');
}

// ==================== JAVA ====================

function generateJavaTestHarness(
  userCode: string,
  testCases: any[],
  metadata: any
): string {
  const dataStructures = getJavaDataStructures(metadata);
  const helpers = getJavaHelpers(metadata);
  const comparison = getJavaComparison(metadata);
  const testCode = generateJavaTests(testCases, metadata);

  return `${dataStructures}

${userCode}

${helpers}

${comparison}

public class Main {
    ${testCode}
}`;
}

function getJavaDataStructures(metadata: any): string {
  let code = '';

  if (needsListNode(metadata)) {
    code += `class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

`;
  }

  if (needsTreeNode(metadata)) {
    code += `class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

`;
  }

  return code;
}

function getJavaHelpers(metadata: any): string {
  let code = '';

  if (needsListNode(metadata)) {
    code += `class Helpers {
    static ListNode arrayToListNode(int[] arr) {
        if (arr == null || arr.length == 0) return null;
        ListNode head = new ListNode(arr[0]);
        ListNode current = head;
        for (int i = 1; i < arr.length; i++) {
            current.next = new ListNode(arr[i]);
            current = current.next;
        }
        return head;
    }

    static int[] listNodeToArray(ListNode node) {
        java.util.List<Integer> list = new java.util.ArrayList<>();
        while (node != null) {
            list.add(node.val);
            node = node.next;
        }
        return list.stream().mapToInt(i -> i).toArray();
    }

`;
  } else {
    code += 'class Helpers {\n';
  }

  if (needsTreeNode(metadata)) {
    code += `    static TreeNode arrayToTreeNode(Integer[] arr) {
        if (arr == null || arr.length == 0 || arr[0] == null) return null;
        TreeNode root = new TreeNode(arr[0]);
        java.util.Queue<TreeNode> queue = new java.util.LinkedList<>();
        queue.offer(root);
        int i = 1;
        while (!queue.isEmpty() && i < arr.length) {
            TreeNode node = queue.poll();
            if (i < arr.length && arr[i] != null) {
                node.left = new TreeNode(arr[i]);
                queue.offer(node.left);
            }
            i++;
            if (i < arr.length && arr[i] != null) {
                node.right = new TreeNode(arr[i]);
                queue.offer(node.right);
            }
            i++;
        }
        return root;
    }
`;
  }

  code += '}\n\n';
  return code;
}

function getJavaComparison(metadata: any): string {
  const compType = metadata.comparisonType || 'exact';

  const comparisons: Record<string, string> = {
    exact: `class Comparison {
    static boolean compare(Object result, Object expected) {
        if (result == null && expected == null) return true;
        if (result == null || expected == null) return false;
        if (result instanceof int[] && expected instanceof int[]) {
            return java.util.Arrays.equals((int[])result, (int[])expected);
        }
        if (result instanceof int[][] && expected instanceof int[][]) {
            return java.util.Arrays.deepEquals((int[][])result, (int[][])expected);
        }
        return result.equals(expected);
    }
}`,
    sorted: `class Comparison {
    static boolean compare(Object result, Object expected) {
        if (result == null && expected == null) return true;
        if (result == null || expected == null) return false;
        if (result instanceof int[] && expected instanceof int[]) {
            int[] r = ((int[])result).clone();
            int[] e = ((int[])expected).clone();
            java.util.Arrays.sort(r);
            java.util.Arrays.sort(e);
            return java.util.Arrays.equals(r, e);
        }
        return result.equals(expected);
    }
}`,
    unordered: `class Comparison {
    static boolean compare(Object result, Object expected) {
        if (result == null && expected == null) return true;
        if (result == null || expected == null) return false;
        if (result instanceof java.util.List && expected instanceof java.util.List) {
            java.util.List<?> r = new java.util.ArrayList<>((java.util.List<?>)result);
            java.util.List<?> e = new java.util.ArrayList<>((java.util.List<?>)expected);
            if (r.size() != e.size()) return false;
            java.util.Collections.sort(r, (a, b) -> a.toString().compareTo(b.toString()));
            java.util.Collections.sort(e, (a, b) -> a.toString().compareTo(b.toString()));
            return r.equals(e);
        }
        return result.equals(expected);
    }
}`,
    float: `class Comparison {
    static boolean compare(Object result, Object expected) {
        if (result == null && expected == null) return true;
        if (result == null || expected == null) return false;

        // Handle numeric comparisons with tolerance
        double r = 0, e = 0;
        boolean isNumeric = false;

        if (result instanceof Number && expected instanceof Number) {
            r = ((Number)result).doubleValue();
            e = ((Number)expected).doubleValue();
            isNumeric = true;
        }

        if (isNumeric) {
            return Math.abs(r - e) < 1e-5;
        }

        return result.equals(expected);
    }
}`
  };

  return comparisons[compType] || comparisons.exact;
}

function generateJavaTests(testCases: any[], metadata: any): string {
  const functionName = metadata.functionName;
  const params = metadata.parameters;

  let code = 'public static void main(String[] args) {\n';
  code += '        Solution solution = new Solution();\n\n';

  testCases.forEach((tc, idx) => {
    code += `        // Test ${idx + 1}\n`;
    code += '        try {\n';

    // Generate parameter assignments
    params.forEach((param: string) => {
      const value = tc.input[param];
      const transformer = metadata.inputTransformers?.[param];

      if (transformer === 'array_to_listnode') {
        code += `            ListNode ${param} = Helpers.arrayToListNode(new int[]{${value.join(', ')}});\n`;
      } else if (transformer === 'array_to_treenode') {
        const nullableArray = value.map((v: any) => v === null ? 'null' : v).join(', ');
        code += `            TreeNode ${param} = Helpers.arrayToTreeNode(new Integer[]{${nullableArray}});\n`;
      } else if (Array.isArray(value)) {
        if (value.length > 0 && Array.isArray(value[0])) {
          code += `            int[][] ${param} = ${convertToJavaArray2D(value)};\n`;
        } else {
          code += `            int[] ${param} = new int[]{${value.join(', ')}};\n`;
        }
      } else if (typeof value === 'string') {
        code += `            String ${param} = "${value}";\n`;
      } else {
        code += `            int ${param} = ${value};\n`;
      }
    });

    code += `            Object result = solution.${functionName}(${params.join(', ')});\n`;
    code += `            Object expected = ${convertToJavaLiteral(tc.expected)};\n`;
    code += '            if (Comparison.compare(result, expected)) {\n';
    code += `                System.out.println("Test ${idx + 1}: PASS");\n`;
    code += '            } else {\n';
    code += `                System.out.println("Test ${idx + 1}: FAIL - Expected " + expected + ", got " + result);\n`;
    code += '            }\n';
    code += '        } catch (Exception e) {\n';
    code += `            System.out.println("Test ${idx + 1}: ERROR - " + e.getMessage());\n`;
    code += '        }\n\n';
  });

  code += '    }';
  return code;
}

function convertToJavaArray2D(arr: any[][]): string {
  const rows = arr.map(row => `{${row.join(', ')}}`).join(', ');
  return `new int[][]{${rows}}`;
}

function convertToJavaLiteral(value: any): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length > 0 && Array.isArray(value[0])) {
      return convertToJavaArray2D(value);
    }
    return `new int[]{${value.join(', ')}}`;
  }
  return 'null';
}

function needsListNode(metadata: any): boolean {
  if (metadata.returnType === 'listnode') return true;
  if (metadata.inputTransformers) {
    return Object.values(metadata.inputTransformers).some(
      (t: any) => t === 'array_to_listnode'
    );
  }
  return false;
}

function needsTreeNode(metadata: any): boolean {
  if (metadata.returnType === 'treenode') return true;
  if (metadata.inputTransformers) {
    return Object.values(metadata.inputTransformers).some(
      (t: any) => t === 'array_to_treenode'
    );
  }
  return false;
}

// ==================== JAVASCRIPT/TYPESCRIPT ====================

function generateJavaScriptTestHarness(
  userCode: string,
  testCases: any[],
  metadata: any
): string {
  return generateJSTypeTestHarness(userCode, testCases, metadata, false);
}

function generateTypeScriptTestHarness(
  userCode: string,
  testCases: any[],
  metadata: any
): string {
  return generateJSTypeTestHarness(userCode, testCases, metadata, true);
}

function generateJSTypeTestHarness(
  userCode: string,
  testCases: any[],
  metadata: any,
  isTypeScript: boolean
): string {
  const dataStructures = getJSDataStructures(metadata, isTypeScript);
  const helpers = getJSHelpers(metadata);
  const comparison = getJSComparison(metadata);
  const testCode = generateJSTests(testCases, metadata);

  return `${dataStructures}

${userCode}

${helpers}

${comparison}

${testCode}`;
}

function getJSDataStructures(metadata: any, isTypeScript: boolean): string {
  let code = '';

  if (needsListNode(metadata)) {
    code += isTypeScript
      ? `class ListNode {
    val: number;
    next: ListNode | null;
    constructor(val?: number, next?: ListNode | null) {
        this.val = (val===undefined ? 0 : val);
        this.next = (next===undefined ? null : next);
    }
}

`
      : `class ListNode {
    constructor(val, next) {
        this.val = (val===undefined ? 0 : val);
        this.next = (next===undefined ? null : next);
    }
}

`;
  }

  if (needsTreeNode(metadata)) {
    code += isTypeScript
      ? `class TreeNode {
    val: number;
    left: TreeNode | null;
    right: TreeNode | null;
    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {
        this.val = (val===undefined ? 0 : val);
        this.left = (left===undefined ? null : left);
        this.right = (right===undefined ? null : right);
    }
}

`
      : `class TreeNode {
    constructor(val, left, right) {
        this.val = (val===undefined ? 0 : val);
        this.left = (left===undefined ? null : left);
        this.right = (right===undefined ? null : right);
    }
}

`;
  }

  return code;
}

function getJSHelpers(metadata: any): string {
  let code = '';

  if (needsListNode(metadata)) {
    code += `function arrayToListNode(arr) {
    if (!arr || arr.length === 0) return null;
    let head = new ListNode(arr[0]);
    let current = head;
    for (let i = 1; i < arr.length; i++) {
        current.next = new ListNode(arr[i]);
        current = current.next;
    }
    return head;
}

function listNodeToArray(node) {
    let arr = [];
    while (node) {
        arr.push(node.val);
        node = node.next;
    }
    return arr;
}

`;
  }

  if (needsTreeNode(metadata)) {
    code += `function arrayToTreeNode(arr) {
    if (!arr || arr.length === 0 || arr[0] === null) return null;
    let root = new TreeNode(arr[0]);
    let queue = [root];
    let i = 1;
    while (queue.length > 0 && i < arr.length) {
        let node = queue.shift();
        if (i < arr.length && arr[i] !== null) {
            node.left = new TreeNode(arr[i]);
            queue.push(node.left);
        }
        i++;
        if (i < arr.length && arr[i] !== null) {
            node.right = new TreeNode(arr[i]);
            queue.push(node.right);
        }
        i++;
    }
    return root;
}

`;
  }

  return code;
}

function getJSComparison(metadata: any): string {
  const compType = metadata.comparisonType || 'exact';

  const comparisons: Record<string, string> = {
    exact: `function compareResults(result, expected) {
    return JSON.stringify(result) === JSON.stringify(expected);
}`,
    sorted: `function compareResults(result, expected) {
    try {
        if (Array.isArray(result) && Array.isArray(expected)) {
            return JSON.stringify([...result].sort()) === JSON.stringify([...expected].sort());
        }
        return JSON.stringify(result) === JSON.stringify(expected);
    } catch {
        return result === expected;
    }
}`,
    unordered: `function compareResults(result, expected) {
    try {
        if (!Array.isArray(result) || !Array.isArray(expected)) {
            return JSON.stringify(result) === JSON.stringify(expected);
        }
        if (result.length !== expected.length) return false;

        const sortedResult = result.map(r =>
            Array.isArray(r) ? [...r].sort() : r
        ).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

        const sortedExpected = expected.map(e =>
            Array.isArray(e) ? [...e].sort() : e
        ).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

        return JSON.stringify(sortedResult) === JSON.stringify(sortedExpected);
    } catch {
        return JSON.stringify(result) === JSON.stringify(expected);
    }
}`,
    float: `function compareResults(result, expected) {
    try {
        return Math.abs(result - expected) < 1e-5;
    } catch {
        return result === expected;
    }
}`
  };

  return comparisons[compType] || comparisons.exact;
}

function generateJSTests(testCases: any[], metadata: any): string {
  const functionName = metadata.functionName;
  const params = metadata.parameters;

  let code = '// Test harness\n';
  code += 'const testCases = ' + JSON.stringify(testCases, null, 2) + ';\n\n';
  code += 'testCases.forEach((test, i) => {\n';
  code += '    try {\n';

  // Generate parameter extraction
  params.forEach((param: string) => {
    const transformer = metadata.inputTransformers?.[param];
    if (transformer === 'array_to_listnode') {
      code += `        const ${param} = arrayToListNode(test.input.${param});\n`;
    } else if (transformer === 'array_to_treenode') {
      code += `        const ${param} = arrayToTreeNode(test.input.${param});\n`;
    } else {
      code += `        const ${param} = test.input.${param};\n`;
    }
  });

  code += `        const result = ${functionName}(${params.join(', ')});\n`;
  code += '        const expected = test.expected;\n';
  code += '        \n';
  code += '        if (result === null && expected !== null) {\n';
  code += '            console.log(`Test ${i + 1}: FAIL - Expected ${expected}, got null`);\n';
  code += '        } else if (compareResults(result, expected)) {\n';
  code += '            console.log(`Test ${i + 1}: PASS`);\n';
  code += '        } else {\n';
  code += '            console.log(`Test ${i + 1}: FAIL - Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);\n';
  code += '        }\n';
  code += '    } catch (e) {\n';
  code += '        const errorMsg = e.message.length > 200 ? e.message.substring(0, 200) + "..." : e.message;\n';
  code += '        console.log(`Test ${i + 1}: ERROR - ${errorMsg}`);\n';
  code += '    }\n';
  code += '});\n';

  return code;
}

// ==================== C++ ====================

function generateCppTestHarness(
  userCode: string,
  testCases: any[],
  metadata: any
): string {
  const dataStructures = getCppDataStructures(metadata);
  const helpers = getCppHelpers(metadata);
  const comparison = getCppComparison(metadata);
  const testCode = generateCppTests(testCases, metadata);

  return `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <queue>
#include <cmath>
using namespace std;

${dataStructures}

${userCode}

${helpers}

${comparison}

int main() {
${testCode}
    return 0;
}`;
}

function getCppDataStructures(metadata: any): string {
  let code = '';

  if (needsListNode(metadata)) {
    code += `struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

`;
  }

  if (needsTreeNode(metadata)) {
    code += `struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

`;
  }

  return code;
}

function getCppHelpers(metadata: any): string {
  let code = '';

  if (needsListNode(metadata)) {
    code += `ListNode* arrayToListNode(vector<int>& arr) {
    if (arr.empty()) return nullptr;
    ListNode* head = new ListNode(arr[0]);
    ListNode* current = head;
    for (int i = 1; i < arr.size(); i++) {
        current->next = new ListNode(arr[i]);
        current = current->next;
    }
    return head;
}

vector<int> listNodeToArray(ListNode* node) {
    vector<int> arr;
    while (node) {
        arr.push_back(node->val);
        node = node->next;
    }
    return arr;
}

`;
  }

  if (needsTreeNode(metadata)) {
    code += `TreeNode* arrayToTreeNode(vector<int>& arr) {
    if (arr.empty() || arr[0] == -1) return nullptr;
    TreeNode* root = new TreeNode(arr[0]);
    queue<TreeNode*> q;
    q.push(root);
    int i = 1;
    while (!q.empty() && i < arr.size()) {
        TreeNode* node = q.front();
        q.pop();
        if (i < arr.size() && arr[i] != -1) {
            node->left = new TreeNode(arr[i]);
            q.push(node->left);
        }
        i++;
        if (i < arr.size() && arr[i] != -1) {
            node->right = new TreeNode(arr[i]);
            q.push(node->right);
        }
        i++;
    }
    return root;
}

`;
  }

  return code;
}

function getCppComparison(metadata: any): string {
  const compType = metadata.comparisonType || 'exact';

  const comparisons: Record<string, string> = {
    exact: `template<typename T>
bool compareResults(T result, T expected) {
    return result == expected;
}

bool compareResults(bool result, int expected) {
    return (result ? 1 : 0) == expected;
}

bool compareResults(int result, bool expected) {
    return result == (expected ? 1 : 0);
}

bool compareResults(vector<int> result, vector<int> expected) {
    return result == expected;
}

bool compareResults(vector<vector<int>> result, vector<vector<int>> expected) {
    return result == expected;
}

bool compareResults(string result, string expected) {
    return result == expected;
}

bool compareResults(const char* result, const char* expected) {
    return string(result) == string(expected);
}`,
    sorted: `bool compareResults(vector<int> result, vector<int> expected) {
    sort(result.begin(), result.end());
    sort(expected.begin(), expected.end());
    return result == expected;
}

bool compareResults(string result, string expected) {
    return result == expected;
}`,
    unordered: `bool compareResults(vector<vector<int>> result, vector<vector<int>> expected) {
    if (result.size() != expected.size()) return false;
    for (auto& v : result) sort(v.begin(), v.end());
    for (auto& v : expected) sort(v.begin(), v.end());
    sort(result.begin(), result.end());
    sort(expected.begin(), expected.end());
    return result == expected;
}

bool compareResults(string result, string expected) {
    return result == expected;
}`,
    float: `template<typename T>
bool compareResults(T result, T expected) {
    if constexpr (std::is_floating_point<T>::value) {
        return abs(result - expected) < 1e-5;
    }
    return result == expected;
}

bool compareResults(double result, int expected) {
    return abs(result - expected) < 1e-5;
}

bool compareResults(int result, double expected) {
    return abs(result - expected) < 1e-5;
}

bool compareResults(float result, int expected) {
    return abs(result - expected) < 1e-5;
}

bool compareResults(int result, float expected) {
    return abs(result - expected) < 1e-5;
}`
  };

  return comparisons[compType] || comparisons.exact;
}

function generateCppTests(testCases: any[], metadata: any): string {
  const functionName = metadata.functionName;
  const params = metadata.parameters;

  let code = '    Solution solution;\n\n';

  testCases.forEach((tc, idx) => {
    code += `    // Test ${idx + 1}\n`;
    code += '    try {\n';

    // Generate parameter assignments
    params.forEach((param: string) => {
      const value = tc.input[param];
      const transformer = metadata.inputTransformers?.[param];

      if (transformer === 'array_to_listnode') {
        code += `        vector<int> ${param}_arr = {${value.join(', ')}};\n`;
        code += `        ListNode* ${param} = arrayToListNode(${param}_arr);\n`;
      } else if (transformer === 'array_to_treenode') {
        const nullableArray = value.map((v: any) => v === null ? -1 : v).join(', ');
        code += `        vector<int> ${param}_arr = {${nullableArray}};\n`;
        code += `        TreeNode* ${param} = arrayToTreeNode(${param}_arr);\n`;
      } else if (Array.isArray(value)) {
        if (value.length > 0 && Array.isArray(value[0])) {
          code += `        vector<vector<int>> ${param} = ${convertToCppVector2D(value)};\n`;
        } else if (value.length > 0 && typeof value[0] === 'string') {
          // Handle string arrays
          const stringArray = value.map((v: string) => `"${v}"`).join(', ');
          code += `        vector<string> ${param} = {${stringArray}};\n`;
        } else {
          code += `        vector<int> ${param} = {${value.join(', ')}};\n`;
        }
      } else if (typeof value === 'string') {
        code += `        string ${param} = "${value}";\n`;
      } else {
        code += `        int ${param} = ${value};\n`;
      }
    });

    code += `        auto result = solution.${functionName}(${params.join(', ')});\n`;
    code += `        auto expected = ${convertToCppLiteral(tc.expected)};\n`;
    code += '        if (compareResults(result, expected)) {\n';
    code += `            cout << "Test ${idx + 1}: PASS" << endl;\n`;
    code += '        } else {\n';
    code += `            cout << "Test ${idx + 1}: FAIL" << endl;\n`;
    code += '        }\n';
    code += '    } catch (exception& e) {\n';
    code += `        cout << "Test ${idx + 1}: ERROR - " << e.what() << endl;\n`;
    code += '    }\n\n';
  });

  return code;
}

function convertToCppVector2D(arr: any[][]): string {
  const rows = arr.map(row => `{${row.join(', ')}}`).join(', ');
  return `{{${rows}}}`;
}

function convertToCppLiteral(value: any): string {
  if (value === null) return '0';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value.length > 0 && Array.isArray(value[0])) {
      return convertToCppVector2D(value);
    }
    if (value.length > 0 && typeof value[0] === 'string') {
      // Handle string arrays
      const stringArray = value.map((v: string) => `"${v}"`).join(', ');
      return `vector<string>{${stringArray}}`;
    }
    return `vector<int>{${value.join(', ')}}`;
  }
  return '0';
}

// ==================== C# ====================

function generateCSharpTestHarness(
  userCode: string,
  testCases: any[],
  metadata: any
): string {
  const dataStructures = getCSharpDataStructures(metadata);
  const helpers = getCSharpHelpers(metadata);
  const comparison = getCSharpComparison(metadata);
  const testCode = generateCSharpTests(testCases, metadata);

  return `using System;
using System.Collections.Generic;
using System.Linq;

${dataStructures}

${userCode}

${helpers}

${comparison}

class Program {
    static void Main() {
${testCode}
    }
}`;
}

function getCSharpDataStructures(metadata: any): string {
  let code = '';

  if (needsListNode(metadata)) {
    code += `public class ListNode {
    public int val;
    public ListNode next;
    public ListNode(int val=0, ListNode next=null) {
        this.val = val;
        this.next = next;
    }
}

`;
  }

  if (needsTreeNode(metadata)) {
    code += `public class TreeNode {
    public int val;
    public TreeNode left;
    public TreeNode right;
    public TreeNode(int val=0, TreeNode left=null, TreeNode right=null) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

`;
  }

  return code;
}

function getCSharpHelpers(metadata: any): string {
  let code = 'public class Helpers {\n';

  if (needsListNode(metadata)) {
    code += `    public static ListNode ArrayToListNode(int[] arr) {
        if (arr == null || arr.Length == 0) return null;
        ListNode head = new ListNode(arr[0]);
        ListNode current = head;
        for (int i = 1; i < arr.Length; i++) {
            current.next = new ListNode(arr[i]);
            current = current.next;
        }
        return head;
    }

    public static int[] ListNodeToArray(ListNode node) {
        List<int> list = new List<int>();
        while (node != null) {
            list.Add(node.val);
            node = node.next;
        }
        return list.ToArray();
    }

`;
  }

  if (needsTreeNode(metadata)) {
    code += `    public static TreeNode ArrayToTreeNode(int?[] arr) {
        if (arr == null || arr.Length == 0 || arr[0] == null) return null;
        TreeNode root = new TreeNode(arr[0].Value);
        Queue<TreeNode> queue = new Queue<TreeNode>();
        queue.Enqueue(root);
        int i = 1;
        while (queue.Count > 0 && i < arr.Length) {
            TreeNode node = queue.Dequeue();
            if (i < arr.Length && arr[i] != null) {
                node.left = new TreeNode(arr[i].Value);
                queue.Enqueue(node.left);
            }
            i++;
            if (i < arr.Length && arr[i] != null) {
                node.right = new TreeNode(arr[i].Value);
                queue.Enqueue(node.right);
            }
            i++;
        }
        return root;
    }
`;
  }

  code += '}\n\n';
  return code;
}

function getCSharpComparison(metadata: any): string {
  const compType = metadata.comparisonType || 'exact';

  const comparisons: Record<string, string> = {
    exact: `public class Comparison {
    public static bool Compare(object result, object expected) {
        if (result == null && expected == null) return true;
        if (result == null || expected == null) return false;
        if (result is int[] && expected is int[]) {
            return ((int[])result).SequenceEqual((int[])expected);
        }
        if (result is int[][] && expected is int[][]) {
            var r = (int[][])result;
            var e = (int[][])expected;
            if (r.Length != e.Length) return false;
            for (int i = 0; i < r.Length; i++) {
                if (!r[i].SequenceEqual(e[i])) return false;
            }
            return true;
        }
        return result.Equals(expected);
    }
}`,
    sorted: `public class Comparison {
    public static bool Compare(object result, object expected) {
        if (result == null && expected == null) return true;
        if (result == null || expected == null) return false;
        if (result is int[] && expected is int[]) {
            var r = ((int[])result).OrderBy(x => x).ToArray();
            var e = ((int[])expected).OrderBy(x => x).ToArray();
            return r.SequenceEqual(e);
        }
        return result.Equals(expected);
    }
}`,
    unordered: `public class Comparison {
    public static bool Compare(object result, object expected) {
        if (result == null && expected == null) return true;
        if (result == null || expected == null) return false;
        if (result is IList<IList<int>> && expected is IList<IList<int>>) {
            var r = (IList<IList<int>>)result;
            var e = (IList<IList<int>>)expected;
            if (r.Count != e.Count) return false;
            var sortedR = r.Select(x => x.OrderBy(y => y).ToList()).OrderBy(x => string.Join(",", x)).ToList();
            var sortedE = e.Select(x => x.OrderBy(y => y).ToList()).OrderBy(x => string.Join(",", x)).ToList();
            for (int i = 0; i < sortedR.Count; i++) {
                if (!sortedR[i].SequenceEqual(sortedE[i])) return false;
            }
            return true;
        }
        return result.Equals(expected);
    }
}`,
    float: `public class Comparison {
    public static bool Compare(object result, object expected) {
        if (result == null && expected == null) return true;
        if (result == null || expected == null) return false;

        // Handle numeric comparisons with tolerance
        try {
            double r = Convert.ToDouble(result);
            double e = Convert.ToDouble(expected);
            return Math.Abs(r - e) < 1e-5;
        } catch {
            return result.Equals(expected);
        }
    }
}`
  };

  return comparisons[compType] || comparisons.exact;
}

function generateCSharpTests(testCases: any[], metadata: any): string {
  const functionName = metadata.functionName;
  const params = metadata.parameters;

  let code = '        Solution solution = new Solution();\n\n';

  testCases.forEach((tc, idx) => {
    code += `        // Test ${idx + 1}\n`;
    code += '        try {\n';

    // Generate parameter assignments
    params.forEach((param: string) => {
      const value = tc.input[param];
      const transformer = metadata.inputTransformers?.[param];

      if (transformer === 'array_to_listnode') {
        code += `            ListNode ${param} = Helpers.ArrayToListNode(new int[]{${value.join(', ')}});\n`;
      } else if (transformer === 'array_to_treenode') {
        const nullableArray = value.map((v: any) => v === null ? 'null' : v).join(', ');
        code += `            TreeNode ${param} = Helpers.ArrayToTreeNode(new int?[]{${nullableArray}});\n`;
      } else if (Array.isArray(value)) {
        if (value.length > 0 && Array.isArray(value[0])) {
          code += `            int[][] ${param} = ${convertToCSharpArray2D(value)};\n`;
        } else {
          code += `            int[] ${param} = new int[]{${value.join(', ')}};\n`;
        }
      } else if (typeof value === 'string') {
        code += `            string ${param} = "${value}";\n`;
      } else {
        code += `            int ${param} = ${value};\n`;
      }
    });

    const capitalizedFunctionName = functionName.charAt(0).toUpperCase() + functionName.slice(1);
    code += `            var result = solution.${capitalizedFunctionName}(${params.join(', ')});\n`;
    code += `            var expected = ${convertToCSharpLiteral(tc.expected)};\n`;
    code += '            if (Comparison.Compare(result, expected)) {\n';
    code += `                Console.WriteLine("Test ${idx + 1}: PASS");\n`;
    code += '            } else {\n';
    code += `                Console.WriteLine("Test ${idx + 1}: FAIL");\n`;
    code += '            }\n';
    code += '        } catch (Exception e) {\n';
    code += `            Console.WriteLine("Test ${idx + 1}: ERROR - " + e.Message);\n`;
    code += '        }\n\n';
  });

  return code;
}

function convertToCSharpArray2D(arr: any[][]): string {
  const rows = arr.map(row => `new int[]{${row.join(', ')}}`).join(', ');
  return `new int[][]{${rows}}`;
}

function convertToCSharpLiteral(value: any): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value.length > 0 && Array.isArray(value[0])) {
      return convertToCSharpArray2D(value);
    }
    return `new int[]{${value.join(', ')}}`;
  }
  return 'null';
}

// ==================== GO ====================

function generateGoTestHarness(
  userCode: string,
  testCases: any[],
  metadata: any
): string {
  const dataStructures = getGoDataStructures(metadata);
  const helpers = getGoHelpers(metadata);
  const comparison = getGoComparison(metadata);
  const testCode = generateGoTests(testCases, metadata);

  return `package main

import (
    "fmt"
    "math"
    "reflect"
)

${dataStructures}

${userCode}

${helpers}

${comparison}

func main() {
${testCode}
}`;
}

function getGoDataStructures(metadata: any): string {
  let code = '';

  if (needsListNode(metadata)) {
    code += `type ListNode struct {
    Val int
    Next *ListNode
}

`;
  }

  if (needsTreeNode(metadata)) {
    code += `type TreeNode struct {
    Val int
    Left *TreeNode
    Right *TreeNode
}

`;
  }

  return code;
}

function getGoHelpers(metadata: any): string {
  let code = '';

  if (needsListNode(metadata)) {
    code += `func arrayToListNode(arr []int) *ListNode {
    if len(arr) == 0 {
        return nil
    }
    head := &ListNode{Val: arr[0]}
    current := head
    for i := 1; i < len(arr); i++ {
        current.Next = &ListNode{Val: arr[i]}
        current = current.Next
    }
    return head
}

func listNodeToArray(node *ListNode) []int {
    arr := []int{}
    for node != nil {
        arr = append(arr, node.Val)
        node = node.Next
    }
    return arr
}

`;
  }

  if (needsTreeNode(metadata)) {
    code += `func arrayToTreeNode(arr []interface{}) *TreeNode {
    if len(arr) == 0 || arr[0] == nil {
        return nil
    }
    root := &TreeNode{Val: arr[0].(int)}
    queue := []*TreeNode{root}
    i := 1
    for len(queue) > 0 && i < len(arr) {
        node := queue[0]
        queue = queue[1:]
        if i < len(arr) && arr[i] != nil {
            node.Left = &TreeNode{Val: arr[i].(int)}
            queue = append(queue, node.Left)
        }
        i++
        if i < len(arr) && arr[i] != nil {
            node.Right = &TreeNode{Val: arr[i].(int)}
            queue = append(queue, node.Right)
        }
        i++
    }
    return root
}

`;
  }

  return code;
}

function getGoComparison(metadata: any): string {
  const compType = metadata.comparisonType || 'exact';

  const comparisons: Record<string, string> = {
    exact: `func compareResults(result, expected interface{}) bool {
    return reflect.DeepEqual(result, expected)
}`,
    sorted: `func compareResults(result, expected interface{}) bool {
    r, ok1 := result.([]int)
    e, ok2 := expected.([]int)
    if ok1 && ok2 {
        if len(r) != len(e) {
            return false
        }
        rCopy := make([]int, len(r))
        eCopy := make([]int, len(e))
        copy(rCopy, r)
        copy(eCopy, e)
        sort.Ints(rCopy)
        sort.Ints(eCopy)
        return reflect.DeepEqual(rCopy, eCopy)
    }
    return reflect.DeepEqual(result, expected)
}`,
    unordered: `func compareResults(result, expected interface{}) bool {
    r, ok1 := result.([][]int)
    e, ok2 := expected.([][]int)
    if ok1 && ok2 {
        if len(r) != len(e) {
            return false
        }
        // Sort inner arrays and outer array
        for i := range r {
            sort.Ints(r[i])
        }
        for i := range e {
            sort.Ints(e[i])
        }
        return reflect.DeepEqual(r, e)
    }
    return reflect.DeepEqual(result, expected)
}`,
    float: `func compareResults(result, expected interface{}) bool {
    // Try to convert both to float64 for numeric comparison
    var r, e float64
    var ok bool

    switch v := result.(type) {
    case float64:
        r = v
    case float32:
        r = float64(v)
    case int:
        r = float64(v)
    case int64:
        r = float64(v)
    default:
        return reflect.DeepEqual(result, expected)
    }

    switch v := expected.(type) {
    case float64:
        e = v
    case float32:
        e = float64(v)
    case int:
        e = float64(v)
    case int64:
        e = float64(v)
    default:
        return reflect.DeepEqual(result, expected)
    }

    ok = true
    if ok {
        return math.Abs(r-e) < 1e-5
    }
    return reflect.DeepEqual(result, expected)
}`
  };

  return comparisons[compType] || comparisons.exact;
}

function generateGoTests(testCases: any[], metadata: any): string {
  const functionName = metadata.functionName;
  const params = metadata.parameters;

  let code = '';

  testCases.forEach((tc, idx) => {
    code += `    // Test ${idx + 1}\n`;
    code += '    func() {\n';
    code += '        defer func() {\n';
    code += '            if r := recover(); r != nil {\n';
    code += `                fmt.Printf("Test ${idx + 1}: ERROR - %v\\n", r)\n`;
    code += '            }\n';
    code += '        }()\n';

    // Generate parameter assignments
    params.forEach((param: string) => {
      const value = tc.input[param];
      const transformer = metadata.inputTransformers?.[param];

      if (transformer === 'array_to_listnode') {
        code += `        ${param} := arrayToListNode([]int{${value.join(', ')}})\n`;
      } else if (transformer === 'array_to_treenode') {
        const nullableArray = value.map((v: any) => v === null ? 'nil' : v).join(', ');
        code += `        ${param} := arrayToTreeNode([]interface{}{${nullableArray}})\n`;
      } else if (Array.isArray(value)) {
        if (value.length > 0 && Array.isArray(value[0])) {
          code += `        ${param} := ${convertToGoSlice2D(value)}\n`;
        } else {
          code += `        ${param} := []int{${value.join(', ')}}\n`;
        }
      } else if (typeof value === 'string') {
        code += `        ${param} := "${value}"\n`;
      } else {
        code += `        ${param} := ${value}\n`;
      }
    });

    code += `        result := ${functionName}(${params.join(', ')})\n`;
    code += `        expected := ${convertToGoLiteral(tc.expected)}\n`;
    code += '        if compareResults(result, expected) {\n';
    code += `            fmt.Println("Test ${idx + 1}: PASS")\n`;
    code += '        } else {\n';
    code += `            fmt.Printf("Test ${idx + 1}: FAIL - Expected %v, got %v\\n", expected, result)\n`;
    code += '        }\n';
    code += '    }()\n\n';
  });

  return code;
}

function convertToGoSlice2D(arr: any[][]): string {
  const rows = arr.map(row => `{${row.join(', ')}}`).join(', ');
  return `[][]int{${rows}}`;
}

function convertToGoLiteral(value: any): string {
  if (value === null) return 'nil';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value.length > 0 && Array.isArray(value[0])) {
      return convertToGoSlice2D(value);
    }
    return `[]int{${value.join(', ')}}`;
  }
  return 'nil';
}
