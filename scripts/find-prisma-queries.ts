const fs = require('fs');
const path = require('path');
const glob = require('glob');

// You'll need to install glob: npm install glob
const srcDir = path.join(process.cwd(), 'src');

// Find all TypeScript and TSX files
const files = glob.sync('**/*.{ts,tsx}', { cwd: srcDir });

// Patterns to look for
const patterns = [
  /prisma\.\w+\.\w+/g,                 // prisma.model.method
  /import.*from ['"]@prisma\/client['"]/g,  // Prisma imports
  /PrismaClient/g                      // PrismaClient references
];

// Process each file
files.forEach((file: string) => {
  const filePath = path.join(srcDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  let hasMatch = false;
  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      if (!hasMatch) {
        console.log(`\nFile: ${file}`);
        hasMatch = true;
      }
      console.log(`  - Found ${matches.length} matches for pattern: ${pattern}`);
      matches.forEach((match: string) => {
        console.log(`    ${match}`);
      });
    }
  });
}); 