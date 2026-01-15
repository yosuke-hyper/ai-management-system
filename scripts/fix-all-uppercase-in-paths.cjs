#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

let fixedCount = 0;

/**
 * Convert a path segment to lowercase if it contains uppercase letters
 */
function convertPathToLowercase(importPath) {
  // Split by / and convert each segment to lowercase
  return importPath.split('/').map(segment => segment.toLowerCase()).join('/');
}

/**
 * Fix all imports with any uppercase letters in paths
 */
function fixAllImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Match all import/from/export statements with paths
  // Pattern: from 'path' or import('path') or export ... from 'path'
  const patterns = [
    // from './...' or from '../...'
    /(from\s+['"])(\.[^'"]+)(['"])/g,
    // import('...')
    /(import\s*\(\s*['"])(\.[^'"]+)(['"])/g,
    // export ... from '...'
    /(export\s+.*\s+from\s+['"])(\.[^'"]+)(['"])/g,
  ];

  patterns.forEach(pattern => {
    content = content.replace(pattern, (match, prefix, importPath, suffix) => {
      const lowerPath = convertPathToLowercase(importPath);
      if (importPath !== lowerPath) {
        return `${prefix}${lowerPath}${suffix}`;
      }
      return match;
    });
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
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
      if (fixAllImportsInFile(fullPath)) {
        fixedCount++;
      }
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('=== Fixing ALL imports with uppercase letters in paths ===');
  console.log(`Source directory: ${srcDir}\n`);

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
