#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

let fixedCount = 0;

/**
 * Fix all imports with uppercase letters in a file
 */
function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Pattern 1: from './Something' -> from './something'
  content = content.replace(/from ['"](\.\/)([A-Z][a-zA-Z0-9_-]*)/g, (match, prefix, name) => {
    return `from '${prefix}${name.toLowerCase()}`;
  });

  // Pattern 2: from '../Something' -> from '../something'
  content = content.replace(/from ['"](\.\.\/)([A-Z][a-zA-Z0-9_-]*)/g, (match, prefix, name) => {
    return `from '${prefix}${name.toLowerCase()}`;
  });

  // Pattern 3: from './path/Something' -> from './path/something'
  content = content.replace(/from ['"](\.\.[\/a-z0-9_-]*\/)([A-Z][a-zA-Z0-9_-]*)/g, (match, path, name) => {
    return `from '${path}${name.toLowerCase()}`;
  });

  content = content.replace(/from ['"](\.[\/a-z0-9_-]*\/)([A-Z][a-zA-Z0-9_-]*)/g, (match, path, name) => {
    return `from '${path}${name.toLowerCase()}`;
  });

  // Pattern 4: import('./Something') -> import('./something')
  content = content.replace(/import\(['"](\.\/)([A-Z][a-zA-Z0-9_-]*)['"]\)/g, (match, prefix, name) => {
    return `import('${prefix}${name.toLowerCase()}')`;
  });

  content = content.replace(/import\(['"](\.\.\/)([A-Z][a-zA-Z0-9_-]*)['"]\)/g, (match, prefix, name) => {
    return `import('${prefix}${name.toLowerCase()}')`;
  });

  // Pattern 5: export ... from './Something'
  content = content.replace(/export .* from ['"](\.\/)([A-Z][a-zA-Z0-9_-]*)/g, (match, prefix, name) => {
    const beforeFrom = match.substring(0, match.lastIndexOf('from'));
    return `${beforeFrom}from '${prefix}${name.toLowerCase()}`;
  });

  content = content.replace(/export .* from ['"](\.\.\/)([A-Z][a-zA-Z0-9_-]*)/g, (match, prefix, name) => {
    const beforeFrom = match.substring(0, match.lastIndexOf('from'));
    return `${beforeFrom}from '${prefix}${name.toLowerCase()}`;
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
  console.log('=== Fixing all imports with uppercase letters ===');
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
