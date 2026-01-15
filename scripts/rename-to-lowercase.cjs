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
  const items = fs.readdirSync(dir, { withFileTypes: true });

  // Process directories first (depth-first)
  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (item.name.startsWith('.') || item.name === 'node_modules') {
        continue;
      }

      // Recurse into subdirectories
      findUppercaseItems(fullPath, baseDir);

      // Check if directory name has uppercase
      const lowerName = item.name.toLowerCase();
      if (item.name !== lowerName) {
        const newPath = path.join(dir, lowerName);
        renames.directories.push({ old: fullPath, new: newPath });

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
 * Rename directories (from deepest to shallowest)
 */
function renameDirectories() {
  console.log('\n=== Renaming directories ===');

  // Sort by depth (deepest first)
  renames.directories.sort((a, b) => {
    const depthA = a.old.split(path.sep).length;
    const depthB = b.old.split(path.sep).length;
    return depthB - depthA;
  });

  for (const { old: oldPath, new: newPath } of renames.directories) {
    if (fs.existsSync(oldPath)) {
      console.log(`  ${path.relative(projectRoot, oldPath)} -> ${path.relative(projectRoot, newPath)}`);

      // Use temp name to handle case-insensitive filesystems
      const tempPath = `${oldPath}_temp_${Date.now()}`;
      fs.renameSync(oldPath, tempPath);
      fs.renameSync(tempPath, newPath);
    }
  }

  console.log(`Renamed ${renames.directories.length} directories`);
}

/**
 * Rename files
 */
function renameFiles() {
  console.log('\n=== Renaming files ===');

  for (const { old: oldPath, new: newPath } of renames.files) {
    if (fs.existsSync(oldPath)) {
      console.log(`  ${path.relative(projectRoot, oldPath)} -> ${path.relative(projectRoot, newPath)}`);

      // Use temp name to handle case-insensitive filesystems
      const tempPath = `${oldPath}_temp_${Date.now()}`;
      fs.renameSync(oldPath, tempPath);
      fs.renameSync(tempPath, newPath);
    }
  }

  console.log(`Renamed ${renames.files.length} files`);
}

/**
 * Update import statements in a file
 */
function updateImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Update each path in the map
  for (const [oldPath, newPath] of pathMap) {
    // Convert to forward slashes for import paths
    const oldImport = oldPath.replace(/\\/g, '/');
    const newImport = newPath.replace(/\\/g, '/');

    // Pattern for absolute imports from @/
    const absolutePattern = new RegExp(`from ['"]@/${oldImport}`, 'g');
    if (absolutePattern.test(content)) {
      content = content.replace(absolutePattern, `from '@/${newImport}`);
      modified = true;
    }

    // Pattern for dynamic imports
    const dynamicPattern = new RegExp(`import\\(['"]@/${oldImport}`, 'g');
    if (dynamicPattern.test(content)) {
      content = content.replace(dynamicPattern, `import('@/${newImport}`);
      modified = true;
    }

    // Pattern for relative imports
    const relativePatterns = [
      new RegExp(`from ['"]\\.\\./${oldImport}`, 'g'),
      new RegExp(`from ['"]\\./${oldImport}`, 'g'),
    ];

    for (const pattern of relativePatterns) {
      if (pattern.test(content)) {
        const match = pattern.toString().match(/from ['"]([^'"]*)${oldImport}/);
        if (match) {
          const prefix = match[1];
          content = content.replace(pattern, `from '${prefix}${newImport}`);
          modified = true;
        }
      }
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
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        if (!item.name.startsWith('.') && item.name !== 'node_modules') {
          processDirectory(fullPath);
        }
      } else if (item.isFile() && /\.(tsx?|jsx?)$/.test(item.name)) {
        if (updateImportsInFile(fullPath)) {
          console.log(`  Updated: ${path.relative(projectRoot, fullPath)}`);
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
      console.log(`  Updated: ${path.relative(projectRoot, configFile)}`);
      updatedCount++;
    }
  }

  console.log(`Updated imports in ${updatedCount} files`);
}

/**
 * Main execution
 */
function main() {
  console.log('=== Starting lowercase conversion ===');
  console.log(`Project root: ${projectRoot}`);
  console.log(`Source directory: ${srcDir}`);

  // Find all items to rename
  console.log('\n=== Scanning for files with uppercase letters ===');
  findUppercaseItems(srcDir);

  console.log(`Found ${renames.directories.length} directories and ${renames.files.length} files to rename`);

  if (renames.directories.length === 0 && renames.files.length === 0) {
    console.log('Nothing to rename. All files are already lowercase.');
    return;
  }

  // Perform renames
  renameDirectories();
  renameFiles();

  // Update imports
  updateImports();

  console.log('\n=== Done! ===');
  console.log('All files and directories have been renamed to lowercase.');
  console.log('All import statements have been updated.');
  console.log('\nNext steps:');
  console.log('  1. Run: npm run build');
  console.log('  2. Verify everything works correctly');
  console.log('  3. Commit the changes');
}

// Run the script
try {
  main();
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
