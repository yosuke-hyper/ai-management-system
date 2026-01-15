#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

let fixedCount = 0;

/**
 * Fix absolute imports (@/) with uppercase letters in a file
 */
function fixAbsoluteImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Replace all segments in @/ imports to lowercase
  // Pattern: @/path/With/Uppercase -> @/path/with/uppercase
  content = content.replace(/@\/([a-zA-Z0-9_\/-]+)/g, (match, importPath) => {
    const lowerPath = importPath.toLowerCase();
    return `@/${lowerPath}`;
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
      if (fixAbsoluteImportsInFile(fullPath)) {
        fixedCount++;
      }
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('=== Fixing absolute imports (@/) with uppercase letters ===');
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
