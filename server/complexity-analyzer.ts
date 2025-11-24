import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

interface ComplexityResult {
  timeComplexity: string;
  confidence: number;
  analysis: string;
  details: {
    loops: number;
    nestedLoops: number;
    recursiveCalls: number;
    maxNestingDepth: number;
  };
}

/**
 * Analyzes code complexity using heuristic-based AST parsing
 * Supports JavaScript, TypeScript, Python (regex-based)
 */
export async function analyzeComplexity(
  sourceCode: string,
  language: string
): Promise<ComplexityResult> {
  try {
    const languageLower = language.toLowerCase();

    if (languageLower === 'javascript' || languageLower === 'typescript') {
      return analyzeJavaScriptComplexity(sourceCode);
    } else if (languageLower === 'python') {
      return analyzePythonComplexity(sourceCode);
    } else {
      // Fallback for unsupported languages
      return {
        timeComplexity: 'O(n)',
        confidence: 0.3,
        analysis: `Complexity analysis not yet supported for ${language}. Assuming linear time.`,
        details: {
          loops: 0,
          nestedLoops: 0,
          recursiveCalls: 0,
          maxNestingDepth: 0,
        },
      };
    }
  } catch (error: any) {
    console.error('Error analyzing complexity:', error.message);
    return {
      timeComplexity: 'O(n)',
      confidence: 0.1,
      analysis: 'Unable to analyze complexity due to parsing error.',
      details: {
        loops: 0,
        nestedLoops: 0,
        recursiveCalls: 0,
        maxNestingDepth: 0,
      },
    };
  }
}

/**
 * Analyzes JavaScript/TypeScript code using Acorn AST parser
 */
function analyzeJavaScriptComplexity(sourceCode: string): ComplexityResult {
  try {
    // Parse code to AST
    const ast = acorn.parse(sourceCode, {
      ecmaVersion: 2020,
      sourceType: 'module',
      allowReturnOutsideFunction: true,
    });

    let loops = 0;
    let nestedLoops = 0;
    let recursiveCalls = 0;
    let maxNestingDepth = 0;
    let currentDepth = 0;
    let functionName: string | null = null;

    // Track loop nesting
    const loopStack: number[] = [];

    walk.ancestor(ast, {
      // Detect function declarations to track recursion
      FunctionDeclaration(node: any) {
        if (node.id && node.id.name) {
          functionName = node.id.name;
        }
      },

      // Detect arrow functions and function expressions
      ArrowFunctionExpression() {},
      FunctionExpression() {},

      // Detect loops
      ForStatement() {
        loops++;
        currentDepth++;
        loopStack.push(currentDepth);
        maxNestingDepth = Math.max(maxNestingDepth, currentDepth);
        if (currentDepth > 1) {
          nestedLoops++;
        }
      },

      WhileStatement() {
        loops++;
        currentDepth++;
        loopStack.push(currentDepth);
        maxNestingDepth = Math.max(maxNestingDepth, currentDepth);
        if (currentDepth > 1) {
          nestedLoops++;
        }
      },

      DoWhileStatement() {
        loops++;
        currentDepth++;
        loopStack.push(currentDepth);
        maxNestingDepth = Math.max(maxNestingDepth, currentDepth);
        if (currentDepth > 1) {
          nestedLoops++;
        }
      },

      ForInStatement() {
        loops++;
        currentDepth++;
        loopStack.push(currentDepth);
        maxNestingDepth = Math.max(maxNestingDepth, currentDepth);
        if (currentDepth > 1) {
          nestedLoops++;
        }
      },

      ForOfStatement() {
        loops++;
        currentDepth++;
        loopStack.push(currentDepth);
        maxNestingDepth = Math.max(maxNestingDepth, currentDepth);
        if (currentDepth > 1) {
          nestedLoops++;
        }
      },

      // Detect recursive calls
      CallExpression(node: any) {
        if (
          functionName &&
          node.callee.type === 'Identifier' &&
          node.callee.name === functionName
        ) {
          recursiveCalls++;
        }
      },
    });

    // Exit loop tracking
    walk.ancestor(ast, {
      'ForStatement:exit': () => { currentDepth--; },
      'WhileStatement:exit': () => { currentDepth--; },
      'DoWhileStatement:exit': () => { currentDepth--; },
      'ForInStatement:exit': () => { currentDepth--; },
      'ForOfStatement:exit': () => { currentDepth--; },
    });

    return determineComplexity({
      loops,
      nestedLoops,
      recursiveCalls,
      maxNestingDepth,
    });
  } catch (error: any) {
    // If parsing fails, try regex-based heuristic
    return analyzeWithRegex(sourceCode, 'javascript');
  }
}

/**
 * Analyzes Python code using regex-based heuristics
 */
function analyzePythonComplexity(sourceCode: string): ComplexityResult {
  return analyzeWithRegex(sourceCode, 'python');
}

/**
 * Fallback regex-based analysis for when AST parsing fails
 */
function analyzeWithRegex(sourceCode: string, language: string): ComplexityResult {
  let loops = 0;
  let nestedLoops = 0;
  let recursiveCalls = 0;

  const lines = sourceCode.split('\n');
  let maxIndent = 0;
  let loopIndents: number[] = [];

  // Detect loops based on language
  const loopPatterns: { [key: string]: RegExp[] } = {
    javascript: [
      /\bfor\s*\(/,
      /\bwhile\s*\(/,
      /\bdo\s*\{/,
      /\.forEach\(/,
      /\.map\(/,
      /\.filter\(/,
      /\.reduce\(/,
    ],
    python: [
      /^\s*for\s+\w+\s+in\s+/,
      /^\s*while\s+/,
    ],
  };

  const patterns = loopPatterns[language] || loopPatterns.javascript;

  lines.forEach((line) => {
    // Calculate indentation level (approximation)
    const indent = line.search(/\S/);
    if (indent > maxIndent) {
      maxIndent = indent;
    }

    // Check for loops
    const hasLoop = patterns.some((pattern) => pattern.test(line));
    if (hasLoop) {
      loops++;

      // Check if this is a nested loop
      const isNested = loopIndents.some((prevIndent) => indent > prevIndent);
      if (isNested) {
        nestedLoops++;
      }

      loopIndents.push(indent);
    }

    // Detect recursive patterns (basic heuristic)
    if (/function\s+(\w+)/.test(line)) {
      const match = line.match(/function\s+(\w+)/);
      if (match) {
        const funcName = match[1];
        const regex = new RegExp(`\\b${funcName}\\s*\\(`);
        if (sourceCode.split(line)[1]?.match(regex)) {
          recursiveCalls++;
        }
      }
    }
  });

  const maxNestingDepth = Math.floor(maxIndent / 2);

  return determineComplexity({
    loops,
    nestedLoops,
    recursiveCalls,
    maxNestingDepth,
  });
}

/**
 * Determines Big O complexity based on detected patterns
 */
function determineComplexity(details: {
  loops: number;
  nestedLoops: number;
  recursiveCalls: number;
  maxNestingDepth: number;
}): ComplexityResult {
  const { loops, nestedLoops, recursiveCalls, maxNestingDepth } = details;

  // O(1) - Constant time
  if (loops === 0 && recursiveCalls === 0) {
    return {
      timeComplexity: 'O(1)',
      confidence: 0.9,
      analysis: 'No loops or recursion detected. Code runs in constant time.',
      details,
    };
  }

  // O(2^n) - Exponential (recursive without memoization)
  if (recursiveCalls >= 2) {
    return {
      timeComplexity: 'O(2ⁿ)',
      confidence: 0.7,
      analysis: `Multiple recursive calls detected (${recursiveCalls}). This suggests exponential time complexity, typical of brute-force recursive solutions.`,
      details,
    };
  }

  // O(log n) - Logarithmic (heuristic: divide-and-conquer pattern)
  if (recursiveCalls === 1 && loops === 0) {
    return {
      timeComplexity: 'O(log n)',
      confidence: 0.6,
      analysis: 'Single recursive call detected with no loops. This may indicate logarithmic complexity, common in binary search or divide-and-conquer algorithms.',
      details,
    };
  }

  // O(n²) - Quadratic (nested loops)
  if (maxNestingDepth >= 2 || nestedLoops > 0) {
    return {
      timeComplexity: 'O(n²)',
      confidence: 0.85,
      analysis: `Nested loops detected (${nestedLoops} nested, max depth: ${maxNestingDepth}). Time complexity grows quadratically with input size.`,
      details,
    };
  }

  // O(n log n) - Linearithmic (loop with recursive call or sorting patterns)
  if (loops > 0 && recursiveCalls === 1) {
    return {
      timeComplexity: 'O(n log n)',
      confidence: 0.65,
      analysis: 'Loop with recursive call detected. This pattern is common in efficient sorting algorithms like merge sort.',
      details,
    };
  }

  // O(n) - Linear (single loop, no nesting)
  if (loops > 0 && nestedLoops === 0) {
    return {
      timeComplexity: 'O(n)',
      confidence: 0.8,
      analysis: `${loops} loop(s) detected without nesting. Time complexity scales linearly with input size.`,
      details,
    };
  }

  // Default fallback
  return {
    timeComplexity: 'O(n)',
    confidence: 0.4,
    analysis: 'Unable to determine exact complexity. Assuming linear time as a conservative estimate.',
    details,
  };
}
