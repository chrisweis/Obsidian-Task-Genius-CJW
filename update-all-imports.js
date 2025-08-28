const fs = require('fs');
const path = require('path');

// Mapping of old paths to new paths
const pathMappings = {
    // UI Components
    '../components/AutoComplete': '../components/ui/inputs/AutoComplete',
    './AutoComplete': './ui/inputs/AutoComplete',
    '../components/ConfirmModal': '../components/ui/modals/ConfirmModal',
    './ConfirmModal': './ui/modals/ConfirmModal',
    '../components/IframeModal': '../components/ui/modals/IframeModal',
    './IframeModal': './ui/modals/IframeModal',
    '../components/IconMenu': '../components/ui/menus/IconMenu',
    './IconMenu': './ui/menus/IconMenu',
    '../components/MarkdownRenderer': '../components/ui/renderers/MarkdownRenderer',
    './MarkdownRenderer': './ui/renderers/MarkdownRenderer',
    '../components/StatusComponent': '../components/ui/feedback/StatusIndicator',
    './StatusComponent': './ui/feedback/StatusIndicator',
    '../components/DragManager': '../components/ui/behavior/DragManager',
    './DragManager': './ui/behavior/DragManager',
    '../components/ViewComponentManager': '../components/ui/behavior/ViewComponentManager',
    './ViewComponentManager': './ui/behavior/ViewComponentManager',
    '../components/date-picker': '../components/ui/date-picker',
    './date-picker': './ui/date-picker',
    '../components/suggest': '../components/ui/suggest',
    './suggest': './ui/suggest',
    '../components/common/TreeComponent': '../components/ui/tree/TreeComponent',
    './common/TreeComponent': './ui/tree/TreeComponent',
    '../components/common/TreeItemRenderer': '../components/ui/tree/TreeItemRenderer',
    './common/TreeItemRenderer': './ui/tree/TreeItemRenderer',
    
    // Feature Components
    '../components/HabitEditDialog': '../components/features/habit/components/HabitEditDialog',
    './HabitEditDialog': './features/habit/components/HabitEditDialog',
    '../components/HabitSettingList': '../components/features/habit/components/HabitSettingList',
    './HabitSettingList': './features/habit/components/HabitSettingList',
    '../components/RewardModal': '../components/features/habit/modals/RewardModal',
    './RewardModal': './features/habit/modals/RewardModal',
    '../components/MinimalQuickCaptureModal': '../components/features/quick-capture/modals/MinimalQuickCaptureModal',
    './MinimalQuickCaptureModal': './features/quick-capture/modals/MinimalQuickCaptureModal',
    '../components/QuickCaptureModal': '../components/features/quick-capture/modals/QuickCaptureModal',
    './QuickCaptureModal': './features/quick-capture/modals/QuickCaptureModal',
    '../components/MinimalQuickCaptureSuggest': '../components/features/quick-capture/suggest/MinimalQuickCaptureSuggest',
    './MinimalQuickCaptureSuggest': './features/quick-capture/suggest/MinimalQuickCaptureSuggest',
    '../components/QuickWorkflowModal': '../components/features/workflow/modals/QuickWorkflowModal',
    './QuickWorkflowModal': './features/workflow/modals/QuickWorkflowModal',
    '../components/StageEditModal': '../components/features/workflow/modals/StageEditModal',
    './StageEditModal': './features/workflow/modals/StageEditModal',
    '../components/WorkflowDefinitionModal': '../components/features/workflow/modals/WorkflowDefinitionModal',
    './WorkflowDefinitionModal': './features/workflow/modals/WorkflowDefinitionModal',
    '../components/WorkflowProgressIndicator': '../components/features/workflow/widgets/WorkflowProgressIndicator',
    './WorkflowProgressIndicator': './features/workflow/widgets/WorkflowProgressIndicator',
    '../components/ViewConfigModal': '../components/features/task/view/modals/ViewConfigModal',
    './ViewConfigModal': './features/task/view/modals/ViewConfigModal',
    '../components/readModeProgressbarWidget': '../components/features/read-mode/ReadModeProgressBarWidget',
    './readModeProgressbarWidget': './features/read-mode/ReadModeProgressBarWidget',
    '../components/readModeTextMark': '../components/features/read-mode/ReadModeTextMark',
    './readModeTextMark': './features/read-mode/ReadModeTextMark',
    
    // Directory mappings
    '../components/calendar': '../components/features/calendar',
    './calendar': './features/calendar',
    '../components/gantt': '../components/features/gantt',
    './gantt': './features/gantt',
    '../components/kanban': '../components/features/kanban',
    './kanban': './features/kanban',
    '../components/quadrant': '../components/features/quadrant',
    './quadrant': './features/quadrant',
    '../components/habit': '../components/features/habit',
    './habit': './features/habit',
    '../components/onboarding': '../components/features/onboarding',
    './onboarding': './features/onboarding',
    '../components/timeline-sidebar': '../components/features/timeline-sidebar',
    './timeline-sidebar': './features/timeline-sidebar',
    '../components/task-edit': '../components/features/task/edit',
    './task-edit': './features/task/edit',
    '../components/task-view': '../components/features/task/view',
    './task-view': './features/task/view',
    '../components/task-filter': '../components/features/task/filter',
    './task-filter': './features/task/filter',
    '../components/inview-filter': '../components/features/task/filter/in-view',
    './inview-filter': './features/task/filter/in-view',
    '../components/table': '../components/features/table',
    './table': './features/table',
    '../components/onCompletion': '../components/features/on-completion',
    './onCompletion': './features/on-completion',
    
    // Settings
    '../components/settings/TaskTimerSettingTab': '../components/features/settings/tabs/TaskTimerSettingsTab',
    './settings/TaskTimerSettingTab': './features/settings/tabs/TaskTimerSettingsTab',
};

// Function to update imports in a file
function updateImports(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let changesMade = false;
    
    // Replace imports based on mappings
    for (const [oldPath, newPath] of Object.entries(pathMappings)) {
        const patterns = [
            new RegExp(`from ['"]${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
            new RegExp(`from ['"]${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`, 'g'),
        ];
        
        for (const pattern of patterns) {
            if (pattern.test(content)) {
                content = content.replace(pattern, (match) => {
                    const quote = match.includes('"') ? '"' : "'";
                    if (match.endsWith('/')) {
                        return `from ${quote}${newPath}/`;
                    }
                    return `from ${quote}${newPath}${quote}`;
                });
                changesMade = true;
            }
        }
    }
    
    // Special case handling for settings tabs
    const settingsPattern = /from ['"](\.\.\/components\/settings\/\w+SettingsTab)['"]/g;
    content = content.replace(settingsPattern, (match, path) => {
        const fileName = path.split('/').pop();
        const quote = match.includes('"') ? '"' : "'";
        return `from ${quote}../components/features/settings/tabs/${fileName}${quote}`;
    });
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated imports in: ${path.relative(__dirname, filePath)}`);
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

// Process all TypeScript files in src directory
const srcDir = path.join(__dirname, 'src');
const files = findTsFiles(srcDir);

console.log(`Found ${files.length} TypeScript files to process...`);

let updatedCount = 0;
files.forEach(file => {
    if (updateImports(file)) {
        updatedCount++;
    }
});

console.log(`\nUpdated ${updatedCount} files`);
console.log('Import update complete!');