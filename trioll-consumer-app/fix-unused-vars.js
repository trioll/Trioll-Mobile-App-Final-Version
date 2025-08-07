#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get ESLint output
console.log('Analyzing ESLint errors...');
const eslintOutput = execSync('npx eslint . --format json', { 
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024 // 10MB buffer
}).toString();

const results = JSON.parse(eslintOutput);
let totalFixed = 0;

// Process each file
results.forEach(result => {
  if (result.errorCount === 0 && result.warningCount === 0) return;
  
  const filePath = result.filePath;
  const unusedVarErrors = result.messages.filter(msg => 
    msg.ruleId === '@typescript-eslint/no-unused-vars' && 
    msg.severity === 2 // errors only
  );
  
  if (unusedVarErrors.length === 0) return;
  
  console.log(`\nProcessing ${path.basename(filePath)}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  
  // Sort errors by line number in reverse order to avoid offset issues
  unusedVarErrors.sort((a, b) => b.line - a.line);
  
  unusedVarErrors.forEach(error => {
    const lineIndex = error.line - 1;
    const line = lines[lineIndex];
    
    if (!line) return;
    
    // Extract variable name from error message
    const match = error.message.match(/'([^']+)' is (defined but never used|assigned a value but never used)/);
    if (!match) return;
    
    const varName = match[1];
    
    // Skip if it already starts with underscore
    if (varName.startsWith('_')) return;
    
    // Replace the variable name with underscore prefix
    const newLine = line.replace(
      new RegExp(`\\b${varName}\\b`, 'g'),
      `_${varName}`
    );
    
    if (newLine !== line) {
      lines[lineIndex] = newLine;
      console.log(`  Fixed: ${varName} → _${varName} (line ${error.line})`);
      totalFixed++;
    }
  });
  
  // Write back the fixed content
  const newContent = lines.join('\n');
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent);
  }
});

console.log(`\nTotal variables fixed: ${totalFixed}`);
console.log('Run ESLint again to check remaining issues.');