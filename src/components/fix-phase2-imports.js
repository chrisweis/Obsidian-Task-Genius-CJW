const fs = require('fs');
const path = require('path');

// List of components that were moved and need re-exports
const movedComponents = [
    // Top-level components moved to features
    { from: 'HabitEditDialog.ts', to: 'features/habit/components/HabitEditDialog' },
    { from: 'HabitSettingList.ts', to: 'features/habit/components/HabitSettingList' },
    { from: 'RewardModal.ts', to: 'features/habit/modals/RewardModal' },
    { from: 'MinimalQuickCaptureModal.ts', to: 'features/quick-capture/modals/MinimalQuickCaptureModal' },
    { from: 'QuickCaptureModal.ts', to: 'features/quick-capture/modals/QuickCaptureModal' },
    { from: 'MinimalQuickCaptureSuggest.ts', to: 'features/quick-capture/suggest/MinimalQuickCaptureSuggest' },
    { from: 'QuickWorkflowModal.ts', to: 'features/workflow/modals/QuickWorkflowModal' },
    { from: 'StageEditModal.ts', to: 'features/workflow/modals/StageEditModal' },
    { from: 'WorkflowDefinitionModal.ts', to: 'features/workflow/modals/WorkflowDefinitionModal' },
    { from: 'WorkflowProgressIndicator.ts', to: 'features/workflow/widgets/WorkflowProgressIndicator' },
    { from: 'ViewConfigModal.ts', to: 'features/task/view/modals/ViewConfigModal' },
    { from: 'readModeProgressbarWidget.ts', to: 'features/read-mode/ReadModeProgressBarWidget' },
    { from: 'readModeTextMark.ts', to: 'features/read-mode/ReadModeTextMark' },
    
    // Directories that were moved
    { from: 'calendar', to: 'features/calendar', isDir: true },
    { from: 'gantt', to: 'features/gantt', isDir: true },
    { from: 'kanban', to: 'features/kanban', isDir: true },
    { from: 'quadrant', to: 'features/quadrant', isDir: true },
    { from: 'onboarding', to: 'features/onboarding', isDir: true },
    { from: 'timeline-sidebar', to: 'features/timeline-sidebar', isDir: true },
    { from: 'habit', to: 'features/habit', isDir: true },
    { from: 'task-edit', to: 'features/task/edit', isDir: true },
    { from: 'task-view', to: 'features/task/view', isDir: true },
    { from: 'task-filter', to: 'features/task/filter', isDir: true },
    { from: 'inview-filter', to: 'features/task/filter/in-view', isDir: true },
    { from: 'table', to: 'features/table', isDir: true },
    { from: 'onCompletion', to: 'features/on-completion', isDir: true },
];

// Create re-export files
movedComponents.forEach(comp => {
    const fromPath = path.join(__dirname, comp.from);
    const exportContent = `export * from './${comp.to}';`;
    
    if (comp.isDir) {
        // For directories, create the directory and add index.ts
        if (!fs.existsSync(fromPath)) {
            fs.mkdirSync(fromPath, { recursive: true });
        }
        fs.writeFileSync(path.join(fromPath, 'index.ts'), exportContent);
        console.log(`Created re-export for directory: ${comp.from}`);
    } else {
        // For files, create the re-export file
        fs.writeFileSync(fromPath, exportContent);
        console.log(`Created re-export for file: ${comp.from}`);
    }
});

console.log('Phase 2 re-exports created!');