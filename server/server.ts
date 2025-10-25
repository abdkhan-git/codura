import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';


dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 8080;

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

interface LeetCodeProblem {
  id: number;
  leetcode_id: number;
  title: string;
  title_slug: string;
  difficulty: string;
  description: string;
  examples: string;
  code_snippets: string;
}

interface ProblemMetadata {
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

interface TestCase {
  input: Record<string, any>;
  expected: any;
}

// interface ProblemMetadata {
//   slug: string;
//   functionName: string;
//   parameters: string[];
//   returnType: 'array' | 'number' | 'string' | 'boolean' | 'listnode' | 'treenode' | 'void';
//   comparisonType: 'exact' | 'sorted' | 'unordered' | 'float' | 'custom';
//   customComparison?: string;
//   inputTransformers?: Record<string, string>;
//   outputTransformer?: string;
// }

export interface ProblemDefinition {
  metadata: ProblemMetadata;
  visible: TestCase[];
  hidden: TestCase[];
}

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json())

app.get('/', (req: any, res: any) => {
    res.send('backend server works');
});

async function getProblemMetadata(problemSlug: string) {
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

async function getTestCasesForProblem(problemSlug: string, includeHidden: boolean) {
  // First get the problem_id from metadata
  const { data: metadata } = await supabase
    .from('problems_metadata')
    .select('problem_id')
    .eq('slug', problemSlug)
    .single();

  if (!metadata) {
    console.error('Problem not found:', problemSlug);
    return [];
  }

  // Get test cases
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

async function wrapCodeWithTestcases(
  userCode: string,
  problemSlug: string,
  includeHidden: boolean
): Promise<string> {
  // Get metadata from database
  const metadata = await getProblemMetadata(problemSlug);
  if (!metadata) {
    throw new Error(`Unknown problem: ${problemSlug}`);
  }

  // Get test cases from database
  const testCases = await getTestCasesForProblem(problemSlug, includeHidden);
  if (testCases.length === 0) {
    throw new Error(`No test cases found for problem: ${problemSlug}`);
  }

  // Generate the test harness (use your existing generator function)
  return generatePythonTestHarness(userCode, testCases, metadata);
}


app.post('/api/problems/run', async (req: any, res: any) => {
  const { problem_title_slug, source_code, language_id, stdin } = req.body;
  console.log('Running:', problem_title_slug, 'Language:', language_id);

  try {
    // Get test cases from database (visible only)
    const testcases = await getTestCasesForProblem(problem_title_slug, false);
    
    if (testcases.length === 0) {
      return res.status(404).json({ 
        error: 'No test cases found. Run the metadata extractor first.' 
      });
    }

    // Wrap code with test harness
    const wrappedCode = await wrapCodeWithTestcases(
      source_code, 
      problem_title_slug, 
      false
    );
    
    console.log('Generated code length:', wrappedCode.length);

    // Submit to Judge0
    const body = { 
      source_code: wrappedCode, 
      language_id, 
      stdin 
    };

    const response = await fetch(`https://${process.env.RAPIDAPI_HOST}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': process.env.RAPIDAPI_HOST!,
        'x-rapidapi-key': process.env.RAPIDAPI_KEY!
      },
      body: JSON.stringify(body)
    });
     
    const data = await response.json();
    const token = data.token;

    // Poll for results
    const judge0Result = await pollSubmissionStatus(token);
    const testcaseResults = parseTestResults(judge0Result, testcases);
    
    res.status(200).json({ judge0Result, testcaseResults });
  
  } catch (error: any) {
    console.error('Error in /run:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.post('/api/problems/submit', async (req: any, res: any) => {
  const { 
    problem_title,
    problem_title_slug,
    problem_id,
    problem_difficulty,
    language,
    source_code, 
    language_id, 
    stdin, 
    user_id, 
    submitted_at 
  } = req.body;

  console.log('Submitting:', problem_title_slug, 'User:', user_id);

  try {
    // Get test cases from database (including hidden)
    const testcases = await getTestCasesForProblem(problem_title_slug, true);
    
    if (testcases.length === 0) {
      return res.status(404).json({ 
        error: 'No test cases found. Run the metadata extractor first.' 
      });
    }

    // Wrap code with test harness (include hidden tests)
    const wrappedCode = await wrapCodeWithTestcases(
      source_code, 
      problem_title_slug, 
      true
    );

    // Submit to Judge0
    const body = { 
      source_code: wrappedCode, 
      language_id, 
      stdin 
    };

    const response = await fetch(`https://${process.env.RAPIDAPI_HOST}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': process.env.RAPIDAPI_HOST!,
        'x-rapidapi-key': process.env.RAPIDAPI_KEY!
      },
      body: JSON.stringify(body)
    });
     
    const data = await response.json();
    const token = data.token;

    // Poll for results
    const judge0Result = await pollSubmissionStatus(token);
    const testcaseResults = parseTestResults(judge0Result, testcases);
    console.log('testcase results = ' + JSON.stringify(testcaseResults))
    
    // Save submission to database
    const savedSubmission = await storeSubmission(
      user_id, 
      problem_id, 
      problem_title, 
      problem_difficulty, 
      language, 
      judge0Result, 
      testcaseResults.label, 
      source_code, 
      submitted_at
    );
    
    res.status(200).json({ judge0Result, testcaseResults, savedSubmission });
  
  } catch (error: any) {
    console.error('Error in /submit:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});


async function storeSubmission(
  user_id: string,
  problem_id: number,
  problem_title: string,
  problem_difficulty: string,
  language: string,
  judge0Result: any,
  status: string,
  source_code: string,
  submitted_at: string
) {
  // Your existing storeSubmission logic
  const { data, error } = await supabase
    .from('submissions')
    .insert({
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
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// PASTE YOUR COMPLETE TEST HARNESS GENERATOR HERE
// (The code from the unified-test-system artifact with all the helper functions)
// ============================================================================

// Copy all the code from "unified-test-system" artifact here, including:
// - PYTHON_DATA_STRUCTURES
// - PYTHON_HELPER_FUNCTIONS
// - wrapInClass, getRequiredDataStructures, etc.
// - generatePythonTestHarness

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

  return `${dataStructures}

${wrappedCode}

${transformerCode}

${comparisonCode}

# Test harness
solution = Solution()
test_cases = ${JSON.stringify(testCases)}

for i, test in enumerate(test_cases):
    try:
        ${paramExtraction}
        result = ${functionCall}
        expected = test['expected']
        
        if compare_results(result, expected):
            print(f"Test {i + 1}: PASS")
        else:
            print(f"Test {i + 1}: FAIL - Expected {expected}, got {result}")
    except Exception as e:
        print(f"Test {i + 1}: ERROR - {str(e)}")
`;
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
    sorted: 'return sorted(result) == sorted(expected)',
    unordered: 'return sorted(map(sorted, result)) == sorted(map(sorted, expected))',
    float: 'return abs(result - expected) < 1e-5',
    exact: 'return result == expected'
  };

  const comparison = comparisons[metadata.comparisonType] || comparisons.exact;
  return `def compare_results(result, expected):\n    ${comparison}\n`;
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

async function pollSubmissionStatus(token: string) {
    const submissionUri = `https://${process.env.RAPIDAPI_HOST}/submissions/${token}`
    const maxAttempts = 10
    const pollInterval = 1000 // 1 second

    let attempts = 0
    while (attempts < maxAttempts) {
        try {
            // Now we need to periodically poll the token and check up on the status of our submission
            const response = await fetch(submissionUri, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-rapidapi-host': process.env.RAPIDAPI_HOST,
                    'x-rapidapi-key': process.env.RAPIDAPI_KEY
                },
            })
            
            // If response code is outside of 2xx range (ex: 404)
            if (!response.ok) {
                console.log(`Received ${response.status} -- trying again in ${pollInterval} ms`)
                await sleep(pollInterval)
            }
            
            // Check status.description field within the response body --> tells us whether or not code is accepted or not
            const data = await response.json()
            const status = data.status?.description
            console.log(`Current status = ${status}`)

            if (status === 'Accepted') {
                console.log('Submission has been accepted, returning response body.')
                return data
            }

            if (status === 'Wrong Answer' || status == 'Runtime Error (NZEC)' || status == 'Compilation Error' || status == 'Time Limit Exceeded') {
                console.log(`Submission failed with status: ${status}`)
                return data
            }
            
            // Continue polling
            if (attempts < maxAttempts) {
                attempts++
                await sleep(pollInterval)
            }

        } catch (error) {
            return error
        }
    }
}

function parseTestResults(judge0Result: any, testcases: any[]) {
  const stdout = judge0Result.stdout || '';
  const stderr = judge0Result.stderr || '';
  const compile_output = judge0Result.compile_output || '';
  
  // Parse test results from stdout
  const lines = stdout.split('\n').filter((line: string) => line.trim());
  
  // Create results array matching frontend expectations
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
        actual = testcase.expected; // If passed, actual equals expected
      } else if (testLine.includes('FAIL')) {
        status = 'failed';
        // Try to extract actual value from output
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
  
  // Count results
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const errors = results.filter(r => r.status === 'error').length;
  const total = testcases.length;
  
  // Determine overall label
  let label = 'Accepted';
  
  if (judge0Result.status.id === 6) {
    label = 'Compilation Error';
  } else if (judge0Result.status.id === 5) {
    label = 'Time Limit Exceeded';
  } else if (judge0Result.status.id === 11 || judge0Result.status.id === 12) {
    label = 'Runtime Error';
  } else if (judge0Result.status.id === 3) {
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
    results, // Array of individual test results
    stdout,
    stderr,
    compile_output,
    runtime: judge0Result.time,
    memory: judge0Result.memory
  };
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}


app.listen(PORT, () => {
    console.log(`Backend server started @ port ${PORT}`);
})