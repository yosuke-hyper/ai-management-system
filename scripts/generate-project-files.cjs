const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const outputFile = path.join(projectRoot, 'src', 'lib', 'projectFiles.ts');

const excludePaths = [
  'node_modules',
  'dist',
  '.git',
  '.env',
  '.env.local',
  'package-lock.json',
  'vite.config.ts.timestamp',
  'src/lib/projectFiles.ts',
  '.bolt',
  'scripts/verify-production.sh'
];

const excludeExtensions = [
  '.md',
  '.txt',
  '.html'
];

function shouldExclude(filePath) {
  if (excludePaths.some(exclude => filePath.includes(exclude))) {
    return true;
  }

  const ext = path.extname(filePath);
  if (excludeExtensions.includes(ext)) {
    return true;
  }

  return false;
}

function readFilesRecursively(dir, baseDir = dir) {
  const files = {};
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativePath = path.relative(baseDir, fullPath);
      
      if (shouldExclude(fullPath)) {
        continue;
      }
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        Object.assign(files, readFilesRecursively(fullPath, baseDir));
      } else if (stat.isFile()) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          files[relativePath] = content;
        } catch (err) {
          console.warn(`Warning: Could not read ${relativePath}`);
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }
  
  return files;
}

const allFiles = readFilesRecursively(projectRoot);

const tsContent = `// Auto-generated file containing all project files
// Generated on: ${new Date().toISOString()}

export const projectFiles: Record<string, string> = ${JSON.stringify(allFiles, null, 2)};
`;

fs.writeFileSync(outputFile, tsContent, 'utf8');
console.log(`Generated ${outputFile} with ${Object.keys(allFiles).length} files`);
