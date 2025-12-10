import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

interface ComplexityResult {
  timeComplexity: string;
  spaceComplexity: string;
  confidence: number;
  spaceConfidence: number;
  analysis: string;
  spaceAnalysis: string;
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
        spaceComplexity: 'O(1)',
        confidence: 0.3,
        spaceConfidence: 0.3,
        analysis: `Complexity analysis not yet supported for ${language}. Assuming linear time.`,
        spaceAnalysis: 'Assuming constant space as a conservative estimate.',
        details: {
          loops: 0,
          nestedLoops: 0,
          recursiveCalls: 0,
          maxNestingDepth: 0,
        },
        spaceDetails: {
          variables: 0,
          arrays: 0,
          objects: 0,
          recursionDepth: 0,
          auxiliaryStructures: 0,
        },
      };
    }
  } catch (error: any) {
    console.error('Error analyzing complexity:', error.message);
    return {
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
      confidence: 0.1,
      spaceConfidence: 0.1,
      analysis: 'Unable to analyze complexity due to parsing error.',
      spaceAnalysis: 'Unable to analyze space complexity.',
      details: {
        loops: 0,
        nestedLoops: 0,
        recursiveCalls: 0,
        maxNestingDepth: 0,
      },
      spaceDetails: {
        variables: 0,
        arrays: 0,
        objects: 0,
        recursionDepth: 0,
        auxiliaryStructures: 0,
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

    // Space complexity tracking
    let arrays = 0;
    let objects = 0;
    let auxiliaryStructures = 0;
    const variableNames = new Set<string>();

    walk.simple(ast, {
      // Detect function declarations to track recursion
      FunctionDeclaration(node: any) {
        if (node.id && node.id.name) {
          functionName = node.id.name;
        }
      },

      // Detect loops
      ForStatement() {
        loops++;
        currentDepth++;
        maxNestingDepth = Math.max(maxNestingDepth, currentDepth);
        if (currentDepth > 1) {
          nestedLoops++;
        }
      },

      WhileStatement() {
        loops++;
        currentDepth++;
        maxNestingDepth = Math.max(maxNestingDepth, currentDepth);
        if (currentDepth > 1) {
          nestedLoops++;
        }
      },

      DoWhileStatement() {
        loops++;
        currentDepth++;
        maxNestingDepth = Math.max(maxNestingDepth, currentDepth);
        if (currentDepth > 1) {
          nestedLoops++;
        }
      },

      ForInStatement() {
        loops++;
        currentDepth++;
        maxNestingDepth = Math.max(maxNestingDepth, currentDepth);
        if (currentDepth > 1) {
          nestedLoops++;
        }
      },

      ForOfStatement() {
        loops++;
        currentDepth++;
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

        // Detect auxiliary structures (Map, Set, etc.)
        if (node.callee.type === 'NewExpression' ||
            (node.callee.type === 'Identifier' &&
             ['Map', 'Set', 'WeakMap', 'WeakSet'].includes(node.callee.name))) {
          auxiliaryStructures++;
        }
      },

      // Detect variable declarations
      VariableDeclarator(node: any) {
        if (node.id.type === 'Identifier') {
          variableNames.add(node.id.name);
        }

        // Detect array literals
        if (node.init && node.init.type === 'ArrayExpression') {
          arrays++;
        }

        // Detect object literals
        if (node.init && node.init.type === 'ObjectExpression') {
          objects++;
        }

        // Detect new Array() or Array.from()
        if (node.init && node.init.type === 'NewExpression' &&
            node.init.callee.name === 'Array') {
          arrays++;
        }

        // Detect new Object() or Object.create()
        if (node.init && node.init.type === 'NewExpression' &&
            node.init.callee.name === 'Object') {
          objects++;
        }
      },

      // Detect array/object expressions
      ArrayExpression() {
        arrays++;
      },

      ObjectExpression() {
        objects++;
      },
    });

    const spaceDetails = {
      variables: variableNames.size,
      arrays,
      objects,
      recursionDepth: recursiveCalls > 0 ? maxNestingDepth : 0,
      auxiliaryStructures,
    };

    return determineComplexity({
      loops,
      nestedLoops,
      recursiveCalls,
      maxNestingDepth,
    }, spaceDetails);
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

  // Space complexity tracking
  let arrays = 0;
  let objects = 0;
  let auxiliaryStructures = 0;

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

  // Space patterns
  const arrayPatterns: { [key: string]: RegExp[] } = {
    javascript: [/\[.*\]/, /new Array\(/, /Array\.from\(/],
    python: [/\[.*\]/, /list\(/],
  };

  const objectPatterns: { [key: string]: RegExp[] } = {
    javascript: [/\{.*\}/, /new Object\(/, /new Map\(/, /new Set\(/],
    python: [/\{.*\}/, /dict\(/],
  };

  const patterns = loopPatterns[language] || loopPatterns.javascript;
  const arrayPat = arrayPatterns[language] || arrayPatterns.javascript;
  const objectPat = objectPatterns[language] || objectPatterns.javascript;

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

    // Detect arrays
    if (arrayPat.some(p => p.test(line))) {
      arrays++;
    }

    // Detect objects/maps
    if (objectPat.some(p => p.test(line))) {
      objects++;
    }

    // Detect auxiliary structures
    if (/new (Map|Set|WeakMap|WeakSet)\(/.test(line)) {
      auxiliaryStructures++;
    }
  });

  const maxNestingDepth = Math.floor(maxIndent / 2);

  const spaceDetails = {
    variables: 0,
    arrays,
    objects,
    recursionDepth: recursiveCalls > 0 ? maxNestingDepth : 0,
    auxiliaryStructures,
  };

  return determineComplexity({
    loops,
    nestedLoops,
    recursiveCalls,
    maxNestingDepth,
  }, spaceDetails);
}

/**
 * Determines Big O complexity based on detected patterns
 */
function determineComplexity(
  details: {
    loops: number;
    nestedLoops: number;
    recursiveCalls: number;
    maxNestingDepth: number;
  },
  spaceDetails?: {
    variables: number;
    arrays: number;
    objects: number;
    recursionDepth: number;
    auxiliaryStructures: number;
  }
): ComplexityResult {
  const { loops, nestedLoops, recursiveCalls, maxNestingDepth } = details;

  // Default space details if not provided
  const space = spaceDetails || {
    variables: 0,
    arrays: 0,
    objects: 0,
    recursionDepth: 0,
    auxiliaryStructures: 0,
  };

  // Helper function to determine space complexity
  const determineSpaceComplexity = () => {
    const totalDataStructures = space.arrays + space.objects + space.auxiliaryStructures;

    // O(1) - No extra space
    if (totalDataStructures === 0 && space.recursionDepth === 0) {
      return {
        spaceComplexity: 'O(1)',
        spaceConfidence: 0.85,
        spaceAnalysis: 'No auxiliary data structures detected. Uses constant space.',
      };
    }

    // O(n²) - 2D arrays or nested structures
    if (space.arrays >= 2 || (space.arrays >= 1 && maxNestingDepth >= 2)) {
      return {
        spaceComplexity: 'O(n²)',
        spaceConfidence: 0.75,
        spaceAnalysis: `Multiple arrays or nested structures detected. Space grows quadratically.`,
      };
    }

    // O(log n) - Recursion with divide-and-conquer
    if (space.recursionDepth > 0 && recursiveCalls === 1) {
      return {
        spaceComplexity: 'O(log n)',
        spaceConfidence: 0.65,
        spaceAnalysis: 'Recursive call stack with divide-and-conquer pattern. Logarithmic stack space.',
      };
    }

    // O(n) - Single array or proportional structures
    if (totalDataStructures >= 1 || space.recursionDepth > 0) {
      return {
        spaceComplexity: 'O(n)',
        spaceConfidence: 0.8,
        spaceAnalysis: `${totalDataStructures} auxiliary data structure(s) detected. Space scales linearly with input size.`,
      };
    }

    // Default O(1)
    return {
      spaceComplexity: 'O(1)',
      spaceConfidence: 0.5,
      spaceAnalysis: 'Unable to determine exact space complexity. Assuming constant space.',
    };
  };

  const spaceResult = determineSpaceComplexity();

  // O(1) - Constant time
  if (loops === 0 && recursiveCalls === 0) {
    return {
      timeComplexity: 'O(1)',
      confidence: 0.9,
      analysis: 'No loops or recursion detected. Code runs in constant time.',
      details,
      ...spaceResult,
      spaceDetails: space,
    };
  }

  // O(2^n) - Exponential (recursive without memoization)
  if (recursiveCalls >= 2) {
    return {
      timeComplexity: 'O(2ⁿ)',
      confidence: 0.7,
      analysis: `Multiple recursive calls detected (${recursiveCalls}). This suggests exponential time complexity, typical of brute-force recursive solutions.`,
      details,
      ...spaceResult,
      spaceDetails: space,
    };
  }

  // O(log n) - Logarithmic (heuristic: divide-and-conquer pattern)
  if (recursiveCalls === 1 && loops === 0) {
    return {
      timeComplexity: 'O(log n)',
      confidence: 0.6,
      analysis: 'Single recursive call detected with no loops. This may indicate logarithmic complexity, common in binary search or divide-and-conquer algorithms.',
      details,
      ...spaceResult,
      spaceDetails: space,
    };
  }

  // O(n²) - Quadratic (nested loops)
  if (maxNestingDepth >= 2 || nestedLoops > 0) {
    return {
      timeComplexity: 'O(n²)',
      confidence: 0.85,
      analysis: `Nested loops detected (${nestedLoops} nested, max depth: ${maxNestingDepth}). Time complexity grows quadratically with input size.`,
      details,
      ...spaceResult,
      spaceDetails: space,
    };
  }

  // O(n log n) - Linearithmic (loop with recursive call or sorting patterns)
  if (loops > 0 && recursiveCalls === 1) {
    return {
      timeComplexity: 'O(n log n)',
      confidence: 0.65,
      analysis: 'Loop with recursive call detected. This pattern is common in efficient sorting algorithms like merge sort.',
      details,
      ...spaceResult,
      spaceDetails: space,
    };
  }

  // O(n) - Linear (single loop, no nesting)
  if (loops > 0 && nestedLoops === 0) {
    return {
      timeComplexity: 'O(n)',
      confidence: 0.8,
      analysis: `${loops} loop(s) detected without nesting. Time complexity scales linearly with input size.`,
      details,
      ...spaceResult,
      spaceDetails: space,
    };
  }

  // Default fallback
  return {
    timeComplexity: 'O(n)',
    confidence: 0.4,
    analysis: 'Unable to determine exact complexity. Assuming linear time as a conservative estimate.',
    details,
    ...spaceResult,
    spaceDetails: space,
  };
}
