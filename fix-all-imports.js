const fs = require('fs');
const path = require('path');

// Function to fix imports in a file based on its location
function fixImports(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Determine the file's location and calculate proper relative paths
    const fileDir = path.dirname(filePath);
    const relativeToSrc = path.relative(fileDir, path.join(__dirname, 'src'));
    const relativeToComponents = path.relative(fileDir, path.join(__dirname, 'src/components'));
    
    // Fix imports in features/gantt
    if (filePath.includes('features/gantt')) {
        content = content.replace(/from ['"]\.\.\/inview-filter\//g, `from '../task/filter/in-view/`);
    }
    
    // Fix imports in features/habit
    if (filePath.includes('features/habit')) {
        // Fix relative imports to root
        content = content.replace(/from ['"]\.\.\/index['"]/g, `from '../../../../index'`);
        content = content.replace(/from ['"]\.\.\/types\//g, `from '../../../../types/`);
        content = content.replace(/from ['"]\.\.\/translations\//g, `from '../../../../translations/`);
        content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/types\//g, `from '../../../../types/`);
        content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/translations\//g, `from '../../../../translations/`);
        content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/index['"]/g, `from '../../../../index'`);
        content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/utils\//g, `from '../../../../utils/`);
        
        // Fix IconMenu import
        content = content.replace(/from ['"]\.\/IconMenu['"]/g, `from '../../../ui/menus/IconMenu'`);
    }
    
    // Fix imports in features/quick-capture
    if (filePath.includes('features/quick-capture')) {
        content = content.replace(/from ['"]\.\.\/\.\.\/date-picker\//g, `from '../../../ui/date-picker/`);
        content = content.replace(/from ['"]\.\.\/AutoComplete['"]/g, `from '../../../ui/inputs/AutoComplete'`);
        content = content.replace(/from ['"]\.\.\/\.\.\/AutoComplete['"]/g, `from '../../../ui/inputs/AutoComplete'`);
        content = content.replace(/from ['"]\.\.\/suggest['"]/g, `from '../../../ui/suggest'`);
        content = content.replace(/from ['"]\.\.\/MarkdownRenderer['"]/g, `from '../../../ui/renderers/MarkdownRenderer'`);
        content = content.replace(/from ['"]\.\.\/StatusComponent['"]/g, `from '../../../ui/feedback/StatusIndicator'`);
        content = content.replace(/from ['"]\.\.\/suggest\/SpecialCharacterSuggests['"]/g, `from '../../../ui/suggest/SpecialCharacterSuggests'`);
    }
    
    // Fix imports in features/workflow
    if (filePath.includes('features/workflow')) {
        content = content.replace(/from ['"]\.\.\/\.\.\/IconMenu['"]/g, `from '../../../ui/menus/IconMenu'`);
    }
    
    // Fix imports in features/onboarding
    if (filePath.includes('features/onboarding')) {
        content = content.replace(/from ['"]\.\.\/HabitEditDialog['"]/g, `from '../habit/components/HabitEditDialog'`);
    }
    
    // Fix imports in features/settings
    if (filePath.includes('features/settings')) {
        content = content.replace(/from ['"]\.\.\/ConfirmModal['"]/g, `from '../../../ui/modals/ConfirmModal'`);
        content = content.replace(/from ['"]\.\.\/\.\.\/ConfirmModal['"]/g, `from '../../../ui/modals/ConfirmModal'`);
        content = content.replace(/from ['"]\.\.\/AutoComplete['"]/g, `from '../../../ui/inputs/AutoComplete'`);
        content = content.replace(/from ['"]\.\.\/\.\.\/AutoComplete['"]/g, `from '../../../ui/inputs/AutoComplete'`);
        content = content.replace(/from ['"]\.\.\/HabitEditDialog['"]/g, `from '../habit/components/HabitEditDialog'`);
        content = content.replace(/from ['"]\.\.\/HabitSettingList['"]/g, `from '../habit/components/HabitSettingList'`);
        content = content.replace(/from ['"]\.\.\/\.\.\/HabitSettingList['"]/g, `from '../habit/components/HabitSettingList'`);
        content = content.replace(/from ['"]\.\.\/\.\.\/RewardModal['"]/g, `from '../habit/modals/RewardModal'`);
        content = content.replace(/from ['"]\.\.\/task-filter\/ViewTaskFilter['"]/g, `from '../task/filter/ViewTaskFilter'`);
    }
    
    // Fix imports in pages directory
    if (filePath.includes('/pages/')) {
        content = content.replace(/from ['"]\.\.\/components\/task-view\//g, `from '../components/features/task/view/`);
        content = content.replace(/from ['"]\.\.\/components\/kanban\//g, `from '../components/features/kanban/`);
        content = content.replace(/from ['"]\.\.\/components\/gantt\//g, `from '../components/features/gantt/`);
        content = content.replace(/from ['"]\.\.\/components\/habit\//g, `from '../components/features/habit/`);
        content = content.replace(/from ['"]\.\.\/components\/task-filter\//g, `from '../components/features/task/filter/`);
    }
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Fixed imports in: ${filePath}`);
        return true;
    }
    return false;
}

// Find all TypeScript files
function findTsFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
            files.push(...findTsFiles(fullPath));
        } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

// Fix imports in features directory
const featuresDir = path.join(__dirname, 'src/components/features');
const pagesDir = path.join(__dirname, 'src/pages');
const testsDir = path.join(__dirname, 'src/__tests__');
const commandsDir = path.join(__dirname, 'src/commands');

let totalFixed = 0;

console.log('Fixing imports in features directory...');
const featureFiles = findTsFiles(featuresDir);
featureFiles.forEach(file => {
    if (fixImports(file)) totalFixed++;
});

console.log('Fixing imports in pages directory...');
const pageFiles = findTsFiles(pagesDir);
pageFiles.forEach(file => {
    if (fixImports(file)) totalFixed++;
});

console.log(`\nTotal files fixed: ${totalFixed}`);
console.log('Import fixing complete!');