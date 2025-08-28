const fs = require('fs');
const path = require('path');

// Function to fix specific import issues
function fixRemainingImports(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Fix tests imports
    if (filePath.includes('__tests__')) {
        content = content.replace(/from ['"]\.\.\/components\/settings\/SettingsIndexer['"]/g, 
            `from '../components/features/settings/core/SettingsIndexer'`);
    }
    
    // Fix gantt imports
    if (filePath.includes('components/features/gantt')) {
        content = content.replace(/from ['"]\.\.\/inview-filter\//g, `from '../task/filter/in-view/`);
        content = content.replace(/from ['"]\.\/features\/gantt['"]/g, `from './gantt'`);
    }
    
    // Fix incorrect paths in components that were already moved
    content = content.replace(/from ['"]\.\/features\//g, `from './`);
    content = content.replace(/from ['"]\.\.\/features\//g, `from '../`);
    
    // Fix imports in features components that reference other features
    if (filePath.includes('components/features/')) {
        // Fix habit components
        content = content.replace(/from ['"]\.\.\/types\/habit-card['"]/g, `from '../../../../types/habit-card'`);
        content = content.replace(/from ['"]\.\.\/index['"]/g, `from '../../../../index'`);
        content = content.replace(/from ['"]\.\.\/translations\/helper['"]/g, `from '../../../../translations/helper'`);
        content = content.replace(/from ['"]\.\/IconMenu['"]/g, `from '../../../ui/menus/IconMenu'`);
        
        // Fix quick-capture components
        content = content.replace(/from ['"]\.\.\/editor-extensions\//g, `from '../../../../editor-extensions/`);
        content = content.replace(/from ['"]\.\.\/utils\//g, `from '../../../../utils/`);
        content = content.replace(/from ['"]\.\.\/dataflow\//g, `from '../../../../dataflow/`);
        content = content.replace(/from ['"]\.\.\/services\//g, `from '../../../../services/`);
        content = content.replace(/from ['"]\.\/features\/quick-capture\//g, `from './`);
        
        // Fix workflow components
        content = content.replace(/from ['"]\.\.\/common\/setting-definition['"]/g, `from '../../../../common/setting-definition'`);
        content = content.replace(/from ['"]\.\/features\/workflow\//g, `from './`);
        
        // Fix table components
        content = content.replace(/from ['"]\.\.\/common\//g, `from '../../../common/`);
        content = content.replace(/from ['"]\.\.\/task-view\//g, `from '../task/view/`);
        
        // Fix settings imports
        content = content.replace(/from ['"]\.\.\/\.\.\/habit\//g, `from '../../habit/`);
        content = content.replace(/from ['"]\.\.\/\.\.\/RewardModal['"]/g, `from '../../habit/modals/RewardModal'`);
        content = content.replace(/from ['"]\.\.\/\.\.\/HabitSettingList['"]/g, `from '../../habit/components/HabitSettingList'`);
        content = content.replace(/from ['"]\.\.\/task-filter\/ViewTaskFilter['"]/g, `from '../../task/filter/ViewTaskFilter'`);
        
        // Fix read-mode imports
        content = content.replace(/from ['"]\.\/features\/read-mode\//g, `from './`);
    }
    
    // Fix ViewConfigModal incorrect paths
    if (filePath.includes('ViewConfigModal')) {
        content = content.replace(/from ['"]\.\.\/common\/setting-definition['"]/g, `from '../../../../../common/setting-definition'`);
        content = content.replace(/from ['"]\.\.\/index['"]/g, `from '../../../../../index'`);
        content = content.replace(/from ['"]\.\/ui\/inputs\/AutoComplete['"]/g, `from '../../../../ui/inputs/AutoComplete'`);
        content = content.replace(/from ['"]\.\/ui\/menus\/IconMenu['"]/g, `from '../../../../ui/menus/IconMenu'`);
        content = content.replace(/from ['"]\.\/ui\/modals\/ConfirmModal['"]/g, `from '../../../../ui/modals/ConfirmModal'`);
        content = content.replace(/from ['"]\.\/features\/task\/filter\/ViewTaskFilter['"]/g, `from '../filter/ViewTaskFilter'`);
    }
    
    // Fix WorkflowDefinitionModal incorrect paths
    if (filePath.includes('WorkflowDefinitionModal')) {
        content = content.replace(/from ['"]\.\.\/index['"]/g, `from '../../../../index'`);
        content = content.replace(/from ['"]\.\.\/common\/setting-definition['"]/g, `from '../../../../common/setting-definition'`);
        content = content.replace(/from ['"]\.\.\/translations\/helper['"]/g, `from '../../../../translations/helper'`);
        content = content.replace(/from ['"]\.\/features\/workflow\/modals\/StageEditModal['"]/g, `from './StageEditModal'`);
    }
    
    // Fix MinimalQuickCaptureModal and QuickCaptureModal
    if (filePath.includes('QuickCaptureModal')) {
        content = content.replace(/from ['"]\.\.\/editor-extensions\//g, `from '../../../../editor-extensions/`);
        content = content.replace(/from ['"]\.\.\/index['"]/g, `from '../../../../index'`);
        content = content.replace(/from ['"]\.\.\/utils\//g, `from '../../../../utils/`);
        content = content.replace(/from ['"]\.\.\/translations\/helper['"]/g, `from '../../../../translations/helper'`);
        content = content.replace(/from ['"]\.\/features\/quick-capture\//g, `from '../`);
        content = content.replace(/from ['"]\.\/ui\//g, `from '../../../ui/`);
        content = content.replace(/from ['"]\.\.\/dataflow\//g, `from '../../../../dataflow/`);
        content = content.replace(/from ['"]\.\.\/services\//g, `from '../../../../services/`);
        content = content.replace(/from ['"]\.\.\/types\//g, `from '../../../../types/`);
    }
    
    // Fix MinimalQuickCaptureSuggest
    if (filePath.includes('MinimalQuickCaptureSuggest')) {
        content = content.replace(/from ['"]\.\.\/index['"]/g, `from '../../../../index'`);
        content = content.replace(/from ['"]\.\.\/translations\/helper['"]/g, `from '../../../../translations/helper'`);
        content = content.replace(/from ['"]\.\/ui\/suggest\//g, `from '../../../ui/suggest/`);
    }
    
    // Fix HabitEditDialog and HabitSettingList
    if (filePath.includes('HabitEditDialog') || filePath.includes('HabitSettingList')) {
        content = content.replace(/from ['"]\.\.\/types\/habit-card['"]/g, `from '../../../../types/habit-card'`);
        content = content.replace(/from ['"]\.\.\/index['"]/g, `from '../../../../index'`);
        content = content.replace(/from ['"]\.\.\/translations\/helper['"]/g, `from '../../../../translations/helper'`);
        content = content.replace(/from ['"]\.\/ui\/menus\/IconMenu['"]/g, `from '../../../ui/menus/IconMenu'`);
        content = content.replace(/from ['"]\.\/features\/habit\/components\/HabitEditDialog['"]/g, `from './HabitEditDialog'`);
        content = content.replace(/from ['"]\.\.\/styles\//g, `from '../../../../styles/`);
    }
    
    // Fix forecast component
    if (filePath.includes('forecast.ts')) {
        content = content.replace(/from ['"]\.\/features\/calendar['"]/g, `from '../../calendar'`);
    }
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Fixed: ${path.relative(__dirname, filePath)}`);
        return true;
    }
    return false;
}

// Find all TypeScript files
function findTsFiles(dir) {
    const files = [];
    
    if (!fs.existsSync(dir)) {
        return files;
    }
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git') && !item.includes('dist')) {
            files.push(...findTsFiles(fullPath));
        } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

// Process all TypeScript files
const srcDir = path.join(__dirname, 'src');
const files = findTsFiles(srcDir);

console.log(`Processing ${files.length} TypeScript files...`);

let fixedCount = 0;
files.forEach(file => {
    if (fixRemainingImports(file)) {
        fixedCount++;
    }
});

console.log(`\nFixed ${fixedCount} files`);
console.log('Final import fixes complete!');