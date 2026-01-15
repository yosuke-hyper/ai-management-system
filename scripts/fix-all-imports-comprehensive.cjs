#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

let fixedCount = 0;

/**
 * Fix all imports with uppercase letters (including camelCase) in a file
 */
function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Replace any import path segment that contains uppercase letters to all lowercase
  // This will catch both PascalCase and camelCase

  // Pattern 1: from './something' or from '../something' - any part with uppercase
  content = content.replace(/from ['"](\.\.\?\/[a-zA-Z0-9_\/-]+)['"]/g, (match, importPath) => {
    const lowerPath = importPath.toLowerCase();
    if (importPath !== lowerPath) {
      return `from '${lowerPath}'`;
    }
    return match;
  });

  // Pattern 2: import('./something') or import('../something')
  content = content.replace(/import\(['"](\.\.\?\/[a-zA-Z0-9_\/-]+)['"]\)/g, (match, importPath) => {
    const lowerPath = importPath.toLowerCase();
    if (importPath !== lowerPath) {
      return `import('${lowerPath}')`;
    }
    return match;
  });

  // Pattern 3: export ... from './something' or export ... from '../something'
  content = content.replace(/export .* from ['"](\.\.\?\/[a-zA-Z0-9_\/-]+)['"]/g, (match, importPath) => {
    const lowerPath = importPath.toLowerCase();
    if (importPath !== lowerPath) {
      const beforeFrom = match.substring(0, match.lastIndexOf('from'));
      return `${beforeFrom}from '${lowerPath}'`;
    }
    return match;
  });

  // Pattern 4: @/ absolute imports - convert entire path to lowercase
  content = content.replace(/@\/([a-zA-Z0-9_\/-]+)/g, (match, importPath) => {
    const lowerPath = importPath.toLowerCase();
    if (importPath !== lowerPath) {
      return `@/${lowerPath}`;
    }
    return match;
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
      if (fixImportsInFile(fullPath)) {
        fixedCount++;
      }
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('=== Fixing all imports comprehensively (including camelCase) ===');
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
