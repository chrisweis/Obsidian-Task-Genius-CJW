const fs = require('fs');
const path = require('path');

// Function to update import paths
function fixImports(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Determine depth from src/components/ui/
    const relativePath = path.relative(path.join(__dirname, 'src/components/ui'), filePath);
    const depth = relativePath.split('/').length - 1;
    const prefix = '../'.repeat(depth + 1); // +1 to get out of ui/
    
    // Fix common import patterns
    content = content.replace(/from ["']\.\.\/index["']/g, `from "${prefix}../index"`);
    content = content.replace(/from ["']\.\.\/\.\.\/index["']/g, `from "${prefix}../index"`);
    content = content.replace(/from ["']\.\.\/types\//g, `from "${prefix}../types/`);
    content = content.replace(/from ["']\.\.\/\.\.\/types\//g, `from "${prefix}../types/`);
    content = content.replace(/from ["']\.\.\/translations\//g, `from "${prefix}../translations/`);
    content = content.replace(/from ["']\.\.\/\.\.\/translations\//g, `from "${prefix}../translations/`);
    content = content.replace(/from ["']\.\.\/common\//g, `from "${prefix}../common/`);
    content = content.replace(/from ["']\.\.\/\.\.\/common\//g, `from "${prefix}../common/`);
    content = content.replace(/from ["']\.\.\/icon["']/g, `from "${prefix}../icon"`);
    content = content.replace(/from ["']\.\.\/\.\.\/icon["']/g, `from "${prefix}../icon"`);
    content = content.replace(/from ["']\.\.\/editor-extensions\//g, `from "${prefix}../editor-extensions/`);
    content = content.replace(/from ["']\.\.\/\.\.\/editor-extensions\//g, `from "${prefix}../editor-extensions/`);
    content = content.replace(/import ["']\.\.\/styles\//g, `import "${prefix}../styles/`);
    content = content.replace(/import ["']\.\.\/\.\.\/styles\//g, `import "${prefix}../styles/`);
    
    // Fix references to components that are still in src/components/
    content = content.replace(/from ["']\.\/(kanban|calendar|gantt|task-view|table|quadrant)\//g, `from "${prefix}$1/`);
    content = content.replace(/from ["']\.\/task-view\//g, `from "${prefix}task-view/`);
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Fixed imports in: ${filePath}`);
    }
}

// Find all TypeScript files in ui/ directory
function findTsFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            files.push(...findTsFiles(fullPath));
        } else if (item.endsWith('.ts')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

// Fix imports in all ui/ files
const uiDir = path.join(__dirname, 'src/components/ui');
const files = findTsFiles(uiDir);

console.log(`Found ${files.length} TypeScript files to fix`);
files.forEach(fixImports);

console.log('Import fixing complete!');