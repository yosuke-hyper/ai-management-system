const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const projectRoot = path.join(__dirname, '..');
const outputPath = path.join(projectRoot, 'ai-management-system.zip');

if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}

const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
  zlib: { level: 9 }
});

output.on('close', function() {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`✓ ZIPファイルを作成しました: ${outputPath}`);
  console.log(`  ファイルサイズ: ${sizeMB} MB`);
  console.log(`  合計ファイル数: ${archive.pointer()} bytes`);
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

const filesToExclude = [
  'node_modules',
  'dist',
  '.git',
  '.bolt',
  'ai-management-system.zip',
  '.DS_Store',
  'vite.config.ts.timestamp-*'
];

function shouldInclude(filePath) {
  const relativePath = path.relative(projectRoot, filePath);

  for (const exclude of filesToExclude) {
    if (relativePath.includes(exclude)) {
      return false;
    }
  }

  if (relativePath.startsWith('.env') && relativePath !== '.env.example' && relativePath !== '.env.production.example') {
    return false;
  }

  return true;
}

function addDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);

    if (!shouldInclude(fullPath)) {
      continue;
    }

    const stat = fs.statSync(fullPath);
    const relativePath = path.relative(projectRoot, fullPath);

    if (stat.isDirectory()) {
      addDirectory(fullPath);
    } else if (stat.isFile()) {
      archive.file(fullPath, { name: relativePath });
    }
  }
}

console.log('プロジェクトファイルをZIPに追加中...');
addDirectory(projectRoot);

archive.finalize();
