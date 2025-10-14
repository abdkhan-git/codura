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

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json())

app.get('/', (req: any, res: any) => {
    res.send('backend server works');
});

app.post('/api/problems/run', async (req: any, res: any) => {
   const { problem_title_slug, source_code, language_id, stdin } = req.body;
   console.log(problem_title_slug, source_code, language_id, stdin)

   try {
    const testcases = getTestCasesForProblem(problem_title_slug, false)
    const wrappedCode = wrapCodeWithTestcases(source_code, testcases, problem_title_slug, language_id)

    const body = { source_code: wrappedCode, language_id, stdin }
    const response = await fetch(`https://${process.env.RAPIDAPI_HOST}/submissions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-rapidapi-host': process.env.RAPIDAPI_HOST,
            'x-rapidapi-key': process.env.RAPIDAPI_KEY
        },
        body: JSON.stringify(body)
    })
     
    const data = await response.json()
    const token = data.token

    const judge0Result = await pollSubmissionStatus(token)
    const testcaseResults = parseTestResults(judge0Result, testcases) // returns an object
    
    res.status(200).json( { judge0Result, testcaseResults })
  
   } catch (error) {
    res.status(500).json({ error: error })
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

   try {
    const testcases = getTestCasesForProblem(problem_title_slug, true)
    const wrappedCode = wrapCodeWithTestcases(source_code, testcases, problem_title_slug, language_id)

    const body = { 
        source_code: wrappedCode, 
        language_id, 
        stdin 
    }

    const response = await fetch(`https://${process.env.RAPIDAPI_HOST}/submissions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-rapidapi-host': process.env.RAPIDAPI_HOST,
            'x-rapidapi-key': process.env.RAPIDAPI_KEY
        },
        body: JSON.stringify(body)
    })
     
    const data = await response.json()
    const token = data.token

    const judge0Result = await pollSubmissionStatus(token)
    const testcaseResults = parseTestResults(judge0Result, testcases) // returns an object
    const savedSubmission = await storeSubmission(user_id, problem_id, problem_title, problem_difficulty, language, judge0Result, testcaseResults.label, source_code, submitted_at)
    
    res.status(200).json( { judge0Result, testcaseResults, savedSubmission })
  
   } catch (error) {
    res.status(500).json({ error: error })
   }
   
});

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

async function storeSubmission(userId: any, problemId: number, problemTitle: string, difficulty: string, language: string, judge0Result: any, status: string, sourceCode: string, submittedAt: any) {    
    const { data, error } = await supabase
    .from('submissions')
    .insert({ 
        user_id: userId,
        problem_id: problemId,
        problem_title: problemTitle,
        difficulty,
        status,
        language: language.charAt(0).toUpperCase() + language.slice(1),
        code: sourceCode,
        runtime: judge0Result.time,
        memory: judge0Result.memory,
        submitted_at: submittedAt,
    })
    .select()

    if (error) {
        throw error
    }

    return data[0]
}

function getTestCasesForProblem(problemSlug: string, includeHidden: boolean) {
    const testCaseMap: Record<string, { visible: any[], hidden: any[] }> = {
        'two-sum': {
            visible: [
                { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
                { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
                { input: { nums: [3, 3], target: 6 }, expected: [0, 1] }
            ],
            hidden: [
                { input: { nums: [1, 2, 3, 4, 5], target: 9 }, expected: [3, 4] },
                { input: { nums: [-1, -2, -3, -4, -5], target: -8 }, expected: [2, 4] },
                { input: { nums: [0, 4, 3, 0], target: 0 }, expected: [0, 3] },
                { input: { nums: [1, 1, 1, 1, 1, 4, 1, 1, 1, 1, 1, 7, 1, 1, 1, 1, 1], target: 11 }, expected: [5, 11] },
                { input: { nums: [-3, 4, 3, 90], target: 0 }, expected: [0, 2] },
                { input: { nums: [5, -5, 10, -10, 3], target: 0 }, expected: [0, 1] },
                { input: { nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 19], target: 28 }, expected: [8, 9] },
                { input: { nums: [5, 5], target: 10 }, expected: [0, 1] },
                { input: { nums: [7, 2, 7, 15], target: 14 }, expected: [0, 2] },
            ]
        },
        // need to add more problems later for manual testing
    };

  const problemTests = testCaseMap[problemSlug];
    if (!problemTests) return [];
    
    // If includeHidden is true, return both visible and hidden test cases
    return includeHidden 
        ? [...problemTests.visible, ...problemTests.hidden]
        : problemTests.visible;
}

function wrapCodeWithTestcases(userCode: string, testcases: any[], problemSlug: string, languageId: number) {
    if (languageId == 92) {
        return wrapPythonCode(userCode, testcases, problemSlug)
    }
    // just handling python for now...
}

// !! WARNING: DO NOT CHANGE THE INDENTATION FOR THE TEST HARNESS STRINGS BELOW --- PYTHON IS WHITESPACE-SENSITIVE
// For clarification: indenting the test harness code will treat it as if it was inside the class definition and thereby not execute it at all
function wrapPythonCode(userCode: string, testCases: any[], problemSlug: string) {
  if (problemSlug === 'two-sum') {
    const cleanedCode = userCode.trim();
    const hasClass = cleanedCode.includes('class Solution');
    
    let finalCode;
    
    if (hasClass) {
      // User provided the full class, just append test harness
      finalCode = `${cleanedCode}

# Test harness
solution = Solution()
test_cases = ${JSON.stringify(testCases)}

for i, test in enumerate(test_cases):
    try:
        result = solution.twoSum(test['input']['nums'], test['input']['target'])
        expected = test['expected']
        
        # Sort both arrays for comparison (since order might vary)
        if sorted(result) == sorted(expected):
            print(f"Test {i + 1}: PASS")
        else:
            print(f"Test {i + 1}: FAIL - Expected {expected}, got {result}")
    except Exception as e:
        print(f"Test {i + 1}: ERROR - {str(e)}")
`;
    } else {
      // User only provided the method, wrap it in a class
      finalCode = `class Solution:
${cleanedCode.split('\n').map(line => '    ' + line).join('\n')}

# Test harness
solution = Solution()
test_cases = ${JSON.stringify(testCases)}

for i, test in enumerate(test_cases):
    try:
        result = solution.twoSum(test['input']['nums'], test['input']['target'])
        expected = test['expected']
        
        if sorted(result) == sorted(expected):
            print(f"Test {i + 1}: PASS")
        else:
            print(f"Test {i + 1}: FAIL - Expected {expected}, got {result}")
    except Exception as e:
        print(f"Test {i + 1}: ERROR - {str(e)}")
`;
    }
    
    console.log('=== GENERATED PYTHON CODE ===');
    console.log(finalCode);
    console.log('=== END PYTHON CODE ===');
    
    return finalCode;
  }
  
  throw new Error('Unsupported problem');
}

function parseTestResults(submissionResult: any, testCases: any[]) {
  const output = submissionResult.stdout || '';
  const lines = output.split('\n').filter((line: string) => line.trim());
  let passedTestcases = 0;
  
  const results = lines.map((line: string, index: number) => {
    const testCase = testCases[index] || {};
    
    if (line.includes('PASS')) {
      passedTestcases++
      const testNumMatch = line.match(/Test (\d+)/);
      const testNumber = testNumMatch ? parseInt(testNumMatch[1]) : index + 1;
      
      return { 
        testNumber,
        status: 'pass',
        input: testCase.input,
        expected: testCase.expected,
        actual: testCase.expected,
        message: 'Test passed'
      };
    } else if (line.includes('FAIL')) {
      const testNumMatch = line.match(/Test (\d+)/);
      const testNumber = testNumMatch ? parseInt(testNumMatch[1]) : index + 1;
      
      const expectedMatch = line.match(/Expected (\[.*?\])/);
      const gotMatch = line.match(/got (\[.*?\])/);
      
      const expected = expectedMatch ? JSON.parse(expectedMatch[1]) : testCase.expected;
      const actual = gotMatch ? JSON.parse(gotMatch[1]) : null;
      
      return { 
        testNumber,
        status: 'fail',
        input: testCase.input,
        expected,
        actual,
        message: line
      };
    } else if (line.includes('ERROR')) {
      const testNumMatch = line.match(/Test (\d+)/);
      const testNumber = testNumMatch ? parseInt(testNumMatch[1]) : index + 1;
      
      const errorMatch = line.match(/ERROR - (.+)/);
      const errorMessage = errorMatch ? errorMatch[1] : 'Unknown error';
      
      return { 
        testNumber,
        status: 'error',
        input: testCase.input,
        expected: testCase.expected,
        actual: null,
        message: errorMessage
      };
    }
    
    return { 
      testNumber: index + 1,
      status: 'unknown', 
      input: testCase.input,
      expected: testCase.expected,
      actual: null,
      message: line 
    };
  });
  
  return { results, label: passedTestcases === testCases.length ? 'Accepted' : 'Wrong Answer' };
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}


app.listen(PORT, () => {
    console.log(`Backend server started @ port ${PORT}`);
})