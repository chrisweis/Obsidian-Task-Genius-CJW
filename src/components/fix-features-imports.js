const fs = require('fs');
const path = require('path');

// Function to update import paths in features files
function fixImports(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Determine depth from src/components/features/
    const relativePath = path.relative(path.join(__dirname, 'features'), filePath);
    const depth = relativePath.split('/').length - 1;
    const prefix = '../'.repeat(depth + 1); // +1 to get out of features/
    
    // Fix common import patterns
    content = content.replace(/from ["']\.\.\/\.\.\/index["']/g, `from "${prefix}../index"`);
    content = content.replace(/from ["']\.\.\/\.\.\/types\//g, `from "${prefix}../types/`);
    content = content.replace(/from ["']\.\.\/\.\.\/translations\//g, `from "${prefix}../translations/`);
    content = content.replace(/from ["']\.\.\/\.\.\/icon["']/g, `from "${prefix}../icon"`);
    content = content.replace(/from ["']\.\.\/\.\.\/utils\//g, `from "${prefix}../utils/`);
    content = content.replace(/from ["']\.\.\/\.\.\/common\//g, `from "${prefix}../common/`);
    content = content.replace(/from ["']\.\.\/\.\.\/editor-extensions\//g, `from "${prefix}../editor-extensions/`);
    content = content.replace(/from ["']\.\.\/\.\.\/styles\//g, `from "${prefix}../styles/`);
    content = content.replace(/import ["']\.\.\/\.\.\/styles\//g, `import "${prefix}../styles/`);
    
    // Fix references to components that were moved to ui/
    content = content.replace(/from ["']\.\.\/MarkdownRenderer["']/g, `from "${prefix}ui/renderers/MarkdownRenderer"`);
    content = content.replace(/from ["']\.\.\/\.\.\/MarkdownRenderer["']/g, `from "${prefix}ui/renderers/MarkdownRenderer"`);
    content = content.replace(/from ["']\.\.\/IconMenu["']/g, `from "${prefix}ui/menus/IconMenu"`);
    content = content.replace(/from ["']\.\.\/AutoComplete["']/g, `from "${prefix}ui/inputs/AutoComplete"`);
    content = content.replace(/from ["']\.\.\/ConfirmModal["']/g, `from "${prefix}ui/modals/ConfirmModal"`);
    content = content.replace(/from ["']\.\.\/IframeModal["']/g, `from "${prefix}ui/modals/IframeModal"`);
    content = content.replace(/from ["']\.\.\/StatusComponent["']/g, `from "${prefix}ui/feedback/StatusIndicator"`);
    content = content.replace(/from ["']\.\.\/DragManager["']/g, `from "${prefix}ui/behavior/DragManager"`);
    content = content.replace(/from ["']\.\.\/ViewComponentManager["']/g, `from "${prefix}ui/behavior/ViewComponentManager"`);
    content = content.replace(/from ["']\.\.\/suggest["']/g, `from "${prefix}ui/suggest"`);
    content = content.replace(/from ["']\.\.\/suggest\//g, `from "${prefix}ui/suggest/`);
    content = content.replace(/from ["']\.\.\/date-picker\//g, `from "${prefix}ui/date-picker/`);
    content = content.replace(/from ["']\.\.\/common\/Tree/g, `from "${prefix}ui/tree/Tree`);
    
    // Fix references to other features
    content = content.replace(/from ["']\.\.\/QuickCaptureModal["']/g, `from "${prefix}features/quick-capture/modals/QuickCaptureModal"`);
    content = content.replace(/from ["']\.\.\/task-view\//g, `from "${prefix}features/task/view/`);
    content = content.replace(/from ["']\.\.\/\.\.\/task-view\//g, `from "${prefix}features/task/view/`);
    content = content.replace(/from ["']\.\.\/task-edit\//g, `from "${prefix}features/task/edit/`);
    content = content.replace(/from ["']\.\.\/task-filter\//g, `from "${prefix}features/task/filter/`);
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Fixed imports in: ${filePath}`);
    }
}

// Find all TypeScript files in features/ directory
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

// Fix imports in all features/ files
const featuresDir = path.join(__dirname, 'features');
const files = findTsFiles(featuresDir);

console.log(`Found ${files.length} TypeScript files to fix`);
files.forEach(fixImports);

console.log('Import fixing complete!');