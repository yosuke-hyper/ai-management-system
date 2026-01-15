#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

let fixedCount = 0;

/**
 * Fix relative imports with uppercase letters in a file
 */
function fixRelativeImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern to match relative imports with uppercase letters
  // Matches: from './Something' or from '../Something' or from './path/Something'
  const patterns = [
    // Match from './Name' or from '../Name'
    /from ['"](\.\.\?\/[A-Z][a-zA-Z0-9]*)['"]/g,
    // Match from './path/Name'
    /from ['"](\.\.\?\/[a-z][a-zA-Z0-9]*\/[A-Z][a-zA-Z0-9]*)['"]/g,
    // Match import statements with uppercase
    /import\(['"](\.\.\?\/[A-Z][a-zA-Z0-9]*)['"]/g,
  ];

  // Replace uppercase imports with lowercase
  const lines = content.split('\n');
  const newLines = lines.map(line => {
    let newLine = line;

    // Check if line contains an import statement
    if (line.includes('from ') || line.includes('import(')) {
      // Find all relative import paths with uppercase letters
      const regex = /(['"])(\.\.\?\/[^'"]+)(['"])/g;
      newLine = line.replace(regex, (match, quote1, importPath, quote2) => {
        // Check if the last segment has uppercase letters
        const segments = importPath.split('/');
        const lastSegment = segments[segments.length - 1];

        // If last segment starts with uppercase, convert to lowercase
        if (/^[A-Z]/.test(lastSegment)) {
          const lowerSegment = lastSegment.toLowerCase();
          segments[segments.length - 1] = lowerSegment;
          const newImportPath = segments.join('/');
          return `${quote1}${newImportPath}${quote2}`;
        }

        return match;
      });

      if (newLine !== line) {
        modified = true;
      }
    }

    return newLine;
  });

  if (modified) {
    const newContent = newLines.join('\n');
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`  Fixed: ${path.relative(projectRoot, filePath)}`);
    return true;
  }

  return false;
}

/**
 * Process all TypeScript/JavaScript files
 */
function processDirectory(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      if (!item.name.startsWith('.') && item.name !== 'node_modules') {
        processDirectory(fullPath);
      }
    } else if (item.isFile() && /\.(tsx?|jsx?)$/.test(item.name)) {
      if (fixRelativeImportsInFile(fullPath)) {
        fixedCount++;
      }
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('=== Fixing relative imports with uppercase letters ===');
  console.log(`Source directory: ${srcDir}`);
  console.log();

  processDirectory(srcDir);

  console.log();
  if (fixedCount > 0) {
    console.log(`✓ Fixed imports in ${fixedCount} files`);
  } else {
    console.log('✓ No files needed fixing');
  }
}

try {
  main();
} catch (error) {
  console.error('✗ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
