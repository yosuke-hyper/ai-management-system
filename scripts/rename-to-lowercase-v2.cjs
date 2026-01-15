#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

// Store all renames to perform
const renames = {
  directories: [],
  files: []
};

// Map of old paths to new paths for updating imports
const pathMap = new Map();

/**
 * Recursively find all files and directories with uppercase letters
 */
function findUppercaseItems(dir, baseDir = dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });

  // Process directories first (depth-first)
  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (item.name.startsWith('.') || item.name === 'node_modules') {
        continue;
      }

      // Recurse into subdirectories first
      findUppercaseItems(fullPath, baseDir);

      // Check if directory name has uppercase
      const lowerName = item.name.toLowerCase();
      if (item.name !== lowerName) {
        const newPath = path.join(dir, lowerName);

        // Check if lowercase version already exists
        if (fs.existsSync(newPath)) {
          console.log(`  WARNING: ${newPath} already exists, will merge ${fullPath} into it`);
          // We'll handle merging later
          renames.directories.push({ old: fullPath, new: newPath, merge: true });
        } else {
          renames.directories.push({ old: fullPath, new: newPath, merge: false });
        }

        // Add to path map for import updates
        const relativeOld = path.relative(baseDir, fullPath);
        const relativeNew = path.relative(baseDir, newPath);
        pathMap.set(relativeOld, relativeNew);
      }
    } else if (item.isFile()) {
      // Check if file name has uppercase
      const lowerName = item.name.toLowerCase();
      if (item.name !== lowerName) {
        const newPath = path.join(dir, lowerName);

        // Check if lowercase version already exists
        if (fs.existsSync(newPath)) {
          console.log(`  WARNING: ${newPath} already exists, will be overwritten by ${fullPath}`);
        }

        renames.files.push({ old: fullPath, new: newPath });

        // Add to path map for import updates
        const relativeOld = path.relative(baseDir, fullPath);
        const relativeNew = path.relative(baseDir, newPath);

        // Remove extension for import paths
        const oldImport = relativeOld.replace(/\.(tsx?|jsx?)$/, '');
        const newImport = relativeNew.replace(/\.(tsx?|jsx?)$/, '');
        pathMap.set(oldImport, newImport);
      }
    }
  }
}

/**
 * Recursively copy directory contents
 */
function copyDirectoryContents(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src, { withFileTypes: true });

  for (const item of items) {
    const srcPath = path.join(src, item.name);
    const destPath = path.join(dest, item.name);

    if (item.isDirectory()) {
      copyDirectoryContents(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Recursively remove directory
 */
function removeDirectory(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      removeDirectory(fullPath);
    } else {
      fs.unlinkSync(fullPath);
    }
  }

  fs.rmdirSync(dir);
}

/**
 * Rename directories (from deepest to shallowest)
 */
function renameDirectories() {
  console.log('\n=== Renaming/Merging directories ===');

  // Sort by depth (deepest first)
  renames.directories.sort((a, b) => {
    const depthA = a.old.split(path.sep).length;
    const depthB = b.old.split(path.sep).length;
    return depthB - depthA;
  });

  for (const { old: oldPath, new: newPath, merge } of renames.directories) {
    if (!fs.existsSync(oldPath)) {
      continue;
    }

    console.log(`  ${path.relative(projectRoot, oldPath)} -> ${path.relative(projectRoot, newPath)}`);

    if (merge) {
      // Merge contents into existing lowercase directory
      console.log(`    Merging contents...`);
      copyDirectoryContents(oldPath, newPath);
      removeDirectory(oldPath);
    } else {
      // Simple rename with temp file to handle case-insensitive filesystems
      const tempPath = `${oldPath}_temp_${Date.now()}`;
      fs.renameSync(oldPath, tempPath);
      fs.renameSync(tempPath, newPath);
    }
  }

  console.log(`Processed ${renames.directories.length} directories`);
}

/**
 * Rename files
 */
function renameFiles() {
  console.log('\n=== Renaming files ===');

  let count = 0;

  for (const { old: oldPath, new: newPath } of renames.files) {
    if (!fs.existsSync(oldPath)) {
      continue;
    }

    console.log(`  ${path.relative(projectRoot, oldPath)} -> ${path.relative(projectRoot, newPath)}`);

    // Use temp name to handle case-insensitive filesystems
    const tempPath = `${oldPath}_temp_${Date.now()}`;

    try {
      fs.renameSync(oldPath, tempPath);
      // If newPath exists, remove it first
      if (fs.existsSync(newPath)) {
        fs.unlinkSync(newPath);
      }
      fs.renameSync(tempPath, newPath);
      count++;
    } catch (error) {
      console.error(`    Error renaming ${oldPath}: ${error.message}`);
      // Try to restore from temp
      if (fs.existsSync(tempPath)) {
        try {
          fs.renameSync(tempPath, oldPath);
        } catch (e) {
          // Ignore
        }
      }
    }
  }

  console.log(`Renamed ${count} files`);
}

/**
 * Update import statements in a file
 */
function updateImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Sort by length (longest first) to avoid partial replacements
  const sortedPaths = Array.from(pathMap.entries()).sort((a, b) => b[0].length - a[0].length);

  for (const [oldPath, newPath] of sortedPaths) {
    // Convert to forward slashes for import paths
    const oldImport = oldPath.replace(/\\/g, '/');
    const newImport = newPath.replace(/\\/g, '/');

    if (oldImport === newImport) {
      continue;
    }

    // Escape special characters for regex
    const escapedOld = oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Pattern for absolute imports from @/
    const absolutePattern = new RegExp(`from ['"]@/${escapedOld}(['"])`, 'g');
    if (content.match(absolutePattern)) {
      content = content.replace(absolutePattern, `from '@/${newImport}$1`);
      modified = true;
    }

    // Pattern for dynamic imports
    const dynamicPattern = new RegExp(`import\\(['"]@/${escapedOld}(['"])`, 'g');
    if (content.match(dynamicPattern)) {
      content = content.replace(dynamicPattern, `import('@/${newImport}$1`);
      modified = true;
    }

    // Pattern for relative imports (../ and ./)
    const relativePattern1 = new RegExp(`from ['"]\\.\\./${escapedOld}(['"])`, 'g');
    if (content.match(relativePattern1)) {
      content = content.replace(relativePattern1, `from '../${newImport}$1`);
      modified = true;
    }

    const relativePattern2 = new RegExp(`from ['"]\\./${escapedOld}(['"])`, 'g');
    if (content.match(relativePattern2)) {
      content = content.replace(relativePattern2, `from './${newImport}$1`);
      modified = true;
    }

    // Pattern for lazy imports
    const lazyPattern = new RegExp(`lazy\\(\\(\\)\\s*=>\\s*import\\(['"]@/${escapedOld}(['"])`, 'g');
    if (content.match(lazyPattern)) {
      content = content.replace(lazyPattern, `lazy(() => import('@/${newImport}$1`);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

/**
 * Update all import statements
 */
function updateImports() {
  console.log('\n=== Updating import statements ===');

  let updatedCount = 0;

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
        if (updateImportsInFile(fullPath)) {
          updatedCount++;
        }
      }
    }
  }

  processDirectory(srcDir);

  // Also update vite.config.ts, tsconfig.json, etc.
  const configFiles = [
    path.join(projectRoot, 'vite.config.ts'),
    path.join(projectRoot, 'tsconfig.json'),
    path.join(projectRoot, 'tsconfig.app.json'),
  ];

  for (const configFile of configFiles) {
    if (fs.existsSync(configFile) && updateImportsInFile(configFile)) {
      updatedCount++;
    }
  }

  console.log(`Updated imports in ${updatedCount} files`);
}

/**
 * Main execution
 */
function main() {
  console.log('=== Starting lowercase conversion (v2) ===');
  console.log(`Project root: ${projectRoot}`);
  console.log(`Source directory: ${srcDir}`);

  // Find all items to rename
  console.log('\n=== Scanning for files with uppercase letters ===');
  findUppercaseItems(srcDir);

  console.log(`Found ${renames.directories.length} directories and ${renames.files.length} files to rename`);

  if (renames.directories.length === 0 && renames.files.length === 0) {
    console.log('\n✓ Nothing to rename. All files are already lowercase.');
    return;
  }

  // Perform renames
  renameDirectories();
  renameFiles();

  // Update imports
  updateImports();

  console.log('\n=== Done! ===');
  console.log('✓ All files and directories have been renamed to lowercase.');
  console.log('✓ All import statements have been updated.');
  console.log('\nNext steps:');
  console.log('  1. Run: npm run build');
  console.log('  2. Verify everything works correctly');
  console.log('  3. Commit the changes');
}

// Run the script
try {
  main();
} catch (error) {
  console.error('\n✗ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
