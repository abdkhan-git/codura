// ============================================================================
// SIMPLE METADATA EXTRACTOR
// Save as: scripts/extract-metadata.ts
// Run: npx ts-node scripts/extract-metadata.ts 20
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  'https://prxtkrteujbptauwhnxs.supabase.co/',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByeHRrcnRldWpicHRhdXdobnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1Mzk2MywiZXhwIjoyMDcyOTI5OTYzfQ.72o4LIM5PoJ_kzQLymgZZgZOG-cOIaAyU0KklSewkUQ',
)

// Change this to your actual problems table name!
const PROBLEMS_TABLE = 'problems'; // ← CHANGE THIS if different

async function extractMetadata() {
  const limit = parseInt(process.argv[2]) || 20;
  
  console.log(`\n🔍 Extracting metadata for ${limit} problems...\n`);
  
  // Fetch problems
  const { data: problems, error } = await supabase
    .from(PROBLEMS_TABLE)
    .select('*')
    .eq('is_premium', false)
    .order('leetcode_id')
    .limit(limit);

  if (error || !problems) {
    console.error('❌ Error fetching problems:', error);
    return;
  }

  console.log(`✓ Found ${problems.length} problems\n`);

  for (let i = 0; i < problems.length; i++) {
    const problem = problems[i];
    
    try {
      console.log(`[${i + 1}/${problems.length}] ${problem.title}`);
      
      // Parse code snippets - check if it's already an object
      const snippets = typeof problem.code_snippets === 'string' 
        ? JSON.parse(problem.code_snippets)
        : problem.code_snippets;
      
      const python = snippets.find((s: any) => s.langSlug === 'python3');
      
      if (!python) {
        console.log('  ⊗ No Python snippet, skipping\n');
        continue;
      }

      // Extract function details
      const code = python.code;
      const funcMatch = code.match(/def\s+(\w+)\s*\(/);
      const functionName = funcMatch ? funcMatch[1] : 'solution';
      
      const paramsMatch = code.match(/def\s+\w+\s*\(self,?\s*([^)]*)\)/);
      const paramsStr = paramsMatch ? paramsMatch[1] : '';
      const parameters = paramsStr
        .split(',')
        .map((p: any) => p.trim().split(':')[0].trim())
        .filter((p: any) => p.length > 0);
      
      const returnMatch = code.match(/->\s*([^:]+):/);
      const returnHint = returnMatch ? returnMatch[1].trim() : '';
      
      // Determine return type and comparison
      let returnType = 'array';
      let comparisonType = 'exact';
      let inputTransformers: any = {};
      let customComparison: string | undefined;
      
      if (returnHint.includes('ListNode')) {
        returnType = 'listnode';
        comparisonType = 'custom';
        customComparison = 'listnode_to_array';
      } else if (returnHint.includes('TreeNode')) {
        returnType = 'treenode';
        comparisonType = 'custom';
        customComparison = 'treenode_to_array';
      } else if (returnHint.includes('int')) {
        returnType = 'number';
      } else if (returnHint.includes('float')) {
        returnType = 'number';
        comparisonType = 'float';
      } else if (returnHint.includes('str')) {
        returnType = 'string';
      } else if (returnHint.includes('bool')) {
        returnType = 'boolean';
      } else if (returnHint.includes('List[List')) {
        returnType = 'array';
        comparisonType = 'unordered';
      } else if (returnHint.includes('List')) {
        returnType = 'array';
        if (problem.title.toLowerCase().includes('two sum')) {
          comparisonType = 'sorted';
        }
      }
      
      // Check parameters for special types
      for (const param of parameters) {
        const paramMatch = code.match(new RegExp(`${param}:\\s*([^,)]+)`));
        const paramType = paramMatch ? paramMatch[1].trim() : '';
        
        if (paramType.includes('ListNode')) {
          inputTransformers[param] = 'array_to_listnode';
        } else if (paramType.includes('TreeNode')) {
          inputTransformers[param] = 'array_to_treenode';
        }
      }
      
      // Parse test cases from examples - check if already an object
      const examples = typeof problem.examples === 'string'
        ? JSON.parse(problem.examples)
        : problem.examples;
      
      const testCases: any[] = [];
      
      for (const example of examples) {
        const content = example.content;
        
        // Clean HTML entities first
        const cleanContent = content
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&nbsp;/g, ' ');
        
        const inputMatch = cleanContent.match(/Input:(.*?)(?:Output:|$)/s);
        const outputMatch = cleanContent.match(/Output:(.*?)(?:Explanation:|$)/s);
        
        if (!inputMatch || !outputMatch) continue;
        
        const inputStr = inputMatch[1].trim();
        const outputStr = outputMatch[1].trim();
        
        const input: any = {};
        
        // Parse each parameter with improved regex
        for (const param of parameters) {
          // Match "param = value" where value can be complex
          const regex = new RegExp(`${param}\\s*=\\s*([^\\n]+?)(?:,\\s*\\w+\\s*=|\\n|$)`);
          const match = inputStr.match(regex);
          
          if (match) {
            let value = match[1].trim();
            
            // Remove trailing comma if exists
            value = value.replace(/,\s*$/, '').trim();
            
            try {
              input[param] = JSON.parse(value);
            } catch {
              // Handle edge cases
              if (value === 'true') input[param] = true;
              else if (value === 'false') input[param] = false;
              else if (value === 'null') input[param] = null;
              else if (value.startsWith('"') && value.endsWith('"')) {
                input[param] = value.slice(1, -1);
              } else if (!isNaN(Number(value))) {
                input[param] = Number(value);
              } else {
                // Try to fix common issues
                if (value.startsWith('[') && !value.endsWith(']')) {
                  // Incomplete array, skip this test case
                  continue;
                }
                input[param] = value;
              }
            }
          }
        }
        
        // Parse expected output with better error handling
        let expected: any;
        let outputValue = outputStr.trim().replace(/,\s*$/, '');
        
        try {
          expected = JSON.parse(outputValue);
        } catch {
          if (outputValue === 'true') expected = true;
          else if (outputValue === 'false') expected = false;
          else if (outputValue === 'null') expected = null;
          else if (outputValue.startsWith('"') && outputValue.endsWith('"')) {
            expected = outputValue.slice(1, -1);
          } else if (!isNaN(Number(outputValue))) {
            expected = Number(outputValue);
          } else {
            // Skip malformed outputs
            continue;
          }
        }
        
        // Only add if we have all parameters and valid expected value
        if (Object.keys(input).length === parameters.length && expected !== undefined) {
          testCases.push({ input, expected });
        }
      }
      
      // Insert metadata
      const { error: metaError } = await supabase
        .from('problems_metadata')
        .upsert({
          problem_id: problem.id,
          slug: problem.title_slug,
          function_name: functionName,
          parameters,
          return_type: returnType,
          comparison_type: comparisonType,
          custom_comparison: customComparison,
          input_transformers: Object.keys(inputTransformers).length > 0 ? inputTransformers : null,
          starter_code_python: code
        }, { onConflict: 'slug' });

      if (metaError) {
        console.log(`  ✗ Metadata error: ${metaError.message}`);
      }
      
      // Insert test cases
      if (testCases.length > 0) {
        // Delete old test cases first
        await supabase
          .from('problems_test_cases')
          .delete()
          .eq('problem_id', problem.id);
        
        const inserts = testCases.map((tc, idx) => ({
          problem_id: problem.id,
          input: tc.input,
          expected: tc.expected,
          is_hidden: idx >= 3,
          display_order: idx + 1
        }));
        
        const { error: testError } = await supabase
          .from('problems_test_cases')
          .insert(inserts);
        
        if (testError) {
          console.log(`  ✗ Test case error: ${testError.message}`);
        } else {
          console.log(`  ✓ ${testCases.length} test cases`);
        }
      } else {
        console.log(`  ⚠ No test cases parsed`);
      }
      
      console.log('');
      
    } catch (error: any) {
      console.log(`  ✗ Error: ${error.message}\n`);
    }
  }
  
  console.log('✅ Extraction complete!\n');
}

extractMetadata().catch(console.error);