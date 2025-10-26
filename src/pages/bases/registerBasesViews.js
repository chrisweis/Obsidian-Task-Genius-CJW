import { TaskBasesView } from './TaskBasesView';
/**
 * All available Task Genius view types for Bases
 */
const TASK_GENIUS_BASES_VIEWS = [
    {
        id: 'task-genius-inbox',
        name: 'Inbox (Task Genius)',
        icon: 'lucide-inbox',
        defaultViewMode: 'inbox',
        description: 'View and manage tasks in inbox mode'
    },
    {
        id: 'task-genius-forecast',
        name: 'Forecast (Task Genius)',
        icon: 'lucide-calendar-days',
        defaultViewMode: 'forecast',
        description: 'View tasks in forecast timeline'
    },
    {
        id: 'task-genius-projects',
        name: 'Projects (Task Genius)',
        icon: 'lucide-folder-tree',
        defaultViewMode: 'projects',
        description: 'Organize tasks by projects'
    },
    {
        id: 'task-genius-tags',
        name: 'Tags (Task Genius)',
        icon: 'lucide-tags',
        defaultViewMode: 'tags',
        description: 'Browse tasks by tags'
    },
    {
        id: 'task-genius-calendar',
        name: 'Calendar (Task Genius)',
        icon: 'lucide-calendar',
        defaultViewMode: 'calendar',
        description: 'View tasks in calendar layout'
    },
    {
        id: 'task-genius-kanban',
        name: 'Kanban (Task Genius)',
        icon: 'lucide-columns-3',
        defaultViewMode: 'kanban',
        description: 'Manage tasks in kanban board'
    },
    {
        id: 'task-genius-gantt',
        name: 'Gantt (Task Genius)',
        icon: 'lucide-gantt-chart-square',
        defaultViewMode: 'gantt',
        description: 'View tasks in Gantt chart'
    },
    {
        id: 'task-genius-review',
        name: 'Review (Task Genius)',
        icon: 'lucide-list-checks',
        defaultViewMode: 'review',
        description: 'Review and process tasks'
    },
    {
        id: 'task-genius-habits',
        name: 'Habits (Task Genius)',
        icon: 'lucide-target',
        defaultViewMode: 'habit',
        description: 'Track habits and recurring tasks'
    },
    {
        id: 'task-genius-flagged',
        name: 'Flagged (Task Genius)',
        icon: 'lucide-flag',
        defaultViewMode: 'flagged',
        description: 'View high-priority flagged tasks'
    },
    {
        id: 'task-genius-quadrant',
        name: 'Quadrant (Task Genius)',
        icon: 'lucide-grid',
        defaultViewMode: 'quadrant',
        description: 'Organize tasks using the Eisenhower Matrix'
    }
];
/**
 * Create view options for a specific view type
 */
function createViewOptions(viewType) {
    return () => {
        var _a, _b;
        // For specialized views, pass the viewMode to filter options
        const viewMode = viewType.defaultViewMode;
        const baseOptions = TaskBasesView.getViewOptions(viewMode);
        const viewSettingsGroup = baseOptions.find(opt => opt.displayName === 'View Settings' && opt.type === 'group');
        if (viewSettingsGroup && 'items' in viewSettingsGroup) {
            // Remove the view mode selector for specialized views
            viewSettingsGroup.items = (_a = viewSettingsGroup.items) === null || _a === void 0 ? void 0 : _a.filter(item => item.key !== 'viewMode');
            // Add a note about the view type
            (_b = viewSettingsGroup.items) === null || _b === void 0 ? void 0 : _b.unshift({
                displayName: 'View Type',
                type: 'text',
                key: '__viewType',
                placeholder: `This is a ${viewType.name} view`,
                default: viewType.name,
                readonly: true,
            });
        }
        return baseOptions;
    };
}
/**
 * Register all Task Genius views with the Bases plugin
 * @param plugin - The main Task Genius plugin instance
 */
export function registerTaskGeniusBasesViews(plugin) {
    // Register each view type
    TASK_GENIUS_BASES_VIEWS.forEach(viewType => {
        try {
            plugin.registerBasesView(viewType.id, {
                name: viewType.name,
                icon: viewType.icon,
                factory: (controller, containerEl) => {
                    const view = new TaskBasesView(controller, containerEl, plugin, viewType.defaultViewMode);
                    view.setForcedViewMode(viewType.defaultViewMode);
                    return view;
                },
                options: createViewOptions(viewType),
            });
            console.log(`Registered Bases view: ${viewType.name} (${viewType.id})`);
        }
        catch (error) {
            console.error(`Failed to register Bases view ${viewType.id}:`, error);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0ZXJCYXNlc1ZpZXdzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicmVnaXN0ZXJCYXNlc1ZpZXdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQWVoRDs7R0FFRztBQUNILE1BQU0sdUJBQXVCLEdBQThCO0lBQzFEO1FBQ0MsRUFBRSxFQUFFLG1CQUFtQjtRQUN2QixJQUFJLEVBQUUscUJBQXFCO1FBQzNCLElBQUksRUFBRSxjQUFjO1FBQ3BCLGVBQWUsRUFBRSxPQUFPO1FBQ3hCLFdBQVcsRUFBRSxxQ0FBcUM7S0FDbEQ7SUFDRDtRQUNDLEVBQUUsRUFBRSxzQkFBc0I7UUFDMUIsSUFBSSxFQUFFLHdCQUF3QjtRQUM5QixJQUFJLEVBQUUsc0JBQXNCO1FBQzVCLGVBQWUsRUFBRSxVQUFVO1FBQzNCLFdBQVcsRUFBRSxpQ0FBaUM7S0FDOUM7SUFDRDtRQUNDLEVBQUUsRUFBRSxzQkFBc0I7UUFDMUIsSUFBSSxFQUFFLHdCQUF3QjtRQUM5QixJQUFJLEVBQUUsb0JBQW9CO1FBQzFCLGVBQWUsRUFBRSxVQUFVO1FBQzNCLFdBQVcsRUFBRSw0QkFBNEI7S0FDekM7SUFDRDtRQUNDLEVBQUUsRUFBRSxrQkFBa0I7UUFDdEIsSUFBSSxFQUFFLG9CQUFvQjtRQUMxQixJQUFJLEVBQUUsYUFBYTtRQUNuQixlQUFlLEVBQUUsTUFBTTtRQUN2QixXQUFXLEVBQUUsc0JBQXNCO0tBQ25DO0lBQ0Q7UUFDQyxFQUFFLEVBQUUsc0JBQXNCO1FBQzFCLElBQUksRUFBRSx3QkFBd0I7UUFDOUIsSUFBSSxFQUFFLGlCQUFpQjtRQUN2QixlQUFlLEVBQUUsVUFBVTtRQUMzQixXQUFXLEVBQUUsK0JBQStCO0tBQzVDO0lBQ0Q7UUFDQyxFQUFFLEVBQUUsb0JBQW9CO1FBQ3hCLElBQUksRUFBRSxzQkFBc0I7UUFDNUIsSUFBSSxFQUFFLGtCQUFrQjtRQUN4QixlQUFlLEVBQUUsUUFB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Q0FBQyxRQUFRLENBQUMsZUFBMkIsQ0FBQyxDQUFDO29CQUU3RCxPQUFPLElBQUksQ0FBQztnQkFDYixDQUFDO2dCQUNELE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLENBQUM7YUFDcEMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsUUFBUSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUN4RTtRQUFDLE9BQU8sS0FBSyxFQUFFO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3RFO0lBQ0YsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVmlld09wdGlvbiB9IGZyb20gJ29ic2lkaWFuJztcclxuaW1wb3J0IHsgVGFza0Jhc2VzVmlldyB9IGZyb20gJy4vVGFza0Jhc2VzVmlldyc7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSAnLi4vLi4vaW5kZXgnO1xyXG5pbXBvcnQgeyBWaWV3TW9kZSB9IGZyb20gJ0AvY29tbW9uL3NldHRpbmctZGVmaW5pdGlvbic7XHJcblxyXG4vKipcclxuICogVmlldyB0eXBlIGRlZmluaXRpb25zIGZvciBUYXNrIEdlbml1cyBCYXNlcyB2aWV3c1xyXG4gKi9cclxuaW50ZXJmYWNlIFRhc2tHZW5pdXNCYXNlc1ZpZXdUeXBlIHtcclxuXHRpZDogc3RyaW5nO1xyXG5cdG5hbWU6IHN0cmluZztcclxuXHRpY29uOiBzdHJpbmc7XHJcblx0ZGVmYXVsdFZpZXdNb2RlOiBWaWV3TW9kZTtcclxuXHRkZXNjcmlwdGlvbj86IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIEFsbCBhdmFpbGFibGUgVGFzayBHZW5pdXMgdmlldyB0eXBlcyBmb3IgQmFzZXNcclxuICovXHJcbmNvbnN0IFRBU0tfR0VOSVVTX0JBU0VTX1ZJRVdTOiBUYXNrR2VuaXVzQmFzZXNWaWV3VHlwZVtdID0gW1xyXG5cdHtcclxuXHRcdGlkOiAndGFzay1nZW5pdXMtaW5ib3gnLFxyXG5cdFx0bmFtZTogJ0luYm94IChUYXNrIEdlbml1cyknLFxyXG5cdFx0aWNvbjogJ2x1Y2lkZS1pbmJveCcsXHJcblx0XHRkZWZhdWx0Vmlld01vZGU6ICdpbmJveCcsXHJcblx0XHRkZXNjcmlwdGlvbjogJ1ZpZXcgYW5kIG1hbmFnZSB0YXNrcyBpbiBpbmJveCBtb2RlJ1xyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6ICd0YXNrLWdlbml1cy1mb3JlY2FzdCcsXHJcblx0XHRuYW1lOiAnRm9yZWNhc3QgKFRhc2sgR2VuaXVzKScsXHJcblx0XHRpY29uOiAnbHVjaWRlLWNhbGVuZGFyLWRheXMnLFxyXG5cdFx0ZGVmYXVsdFZpZXdNb2RlOiAnZm9yZWNhc3QnLFxyXG5cdFx0ZGVzY3JpcHRpb246ICdWaWV3IHRhc2tzIGluIGZvcmVjYXN0IHRpbWVsaW5lJ1xyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6ICd0YXNrLWdlbml1cy1wcm9qZWN0cycsXHJcblx0XHRuYW1lOiAnUHJvamVjdHMgKFRhc2sgR2VuaXVzKScsXHJcblx0XHRpY29uOiAnbHVjaWRlLWZvbGRlci10cmVlJyxcclxuXHRcdGRlZmF1bHRWaWV3TW9kZTogJ3Byb2plY3RzJyxcclxuXHRcdGRlc2NyaXB0aW9uOiAnT3JnYW5pemUgdGFza3MgYnkgcHJvamVjdHMnXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogJ3Rhc2stZ2VuaXVzLXRhZ3MnLFxyXG5cdFx0bmFtZTogJ1RhZ3MgKFRhc2sgR2VuaXVzKScsXHJcblx0XHRpY29uOiAnbHVjaWRlLXRhZ3MnLFxyXG5cdFx0ZGVmYXVsdFZpZXdNb2RlOiAndGFncycsXHJcblx0XHRkZXNjcmlwdGlvbjogJ0Jyb3dzZSB0YXNrcyBieSB0YWdzJ1xyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6ICd0YXNrLWdlbml1cy1jYWxlbmRhcicsXHJcblx0XHRuYW1lOiAnQ2FsZW5kYXIgKFRhc2sgR2VuaXVzKScsXHJcblx0XHRpY29uOiAnbHVjaWRlLWNhbGVuZGFyJyxcclxuXHRcdGRlZmF1bHRWaWV3TW9kZTogJ2NhbGVuZGFyJyxcclxuXHRcdGRlc2NyaXB0aW9uOiAnVmlldyB0YXNrcyBpbiBjYWxlbmRhciBsYXlvdXQnXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogJ3Rhc2stZ2VuaXVzLWthbmJhbicsXHJcblx0XHRuYW1lOiAnS2FuYmFuIChUYXNrIEdlbml1cyknLFxyXG5cdFx0aWNvbjogJ2x1Y2lkZS1jb2x1bW5zLTMnLFxyXG5cdFx0ZGVmYXVsdFZpZXdNb2RlOiAna2FuYmFuJyxcclxuXHRcdGRlc2NyaXB0aW9uOiAnTWFuYWdlIHRhc2tzIGluIGthbmJhbiBib2FyZCdcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiAndGFzay1nZW5pdXMtZ2FudHQnLFxyXG5cdFx0bmFtZTogJ0dhbnR0IChUYXNrIEdlbml1cyknLFxyXG5cdFx0aWNvbjogJ2x1Y2lkZS1nYW50dC1jaGFydC1zcXVhcmUnLFxyXG5cdFx0ZGVmYXVsdFZpZXdNb2RlOiAnZ2FudHQnLFxyXG5cdFx0ZGVzY3JpcHRpb246ICdWaWV3IHRhc2tzIGluIEdhbnR0IGNoYXJ0J1xyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6ICd0YXNrLWdlbml1cy1yZXZpZXcnLFxyXG5cdFx0bmFtZTogJ1JldmlldyAoVGFzayBHZW5pdXMpJyxcclxuXHRcdGljb246ICdsdWNpZGUtbGlzdC1jaGVja3MnLFxyXG5cdFx0ZGVmYXVsdFZpZXdNb2RlOiAncmV2aWV3JyxcclxuXHRcdGRlc2NyaXB0aW9uOiAnUmV2aWV3IGFuZCBwcm9jZXNzIHRhc2tzJ1xyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6ICd0YXNrLWdlbml1cy1oYWJpdHMnLFxyXG5cdFx0bmFtZTogJ0hhYml0cyAoVGFzayBHZW5pdXMpJyxcclxuXHRcdGljb246ICdsdWNpZGUtdGFyZ2V0JyxcclxuXHRcdGRlZmF1bHRWaWV3TW9kZTogJ2hhYml0JyxcclxuXHRcdGRlc2NyaXB0aW9uOiAnVHJhY2sgaGFiaXRzIGFuZCByZWN1cnJpbmcgdGFza3MnXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogJ3Rhc2stZ2VuaXVzLWZsYWdnZWQnLFxyXG5cdFx0bmFtZTogJ0ZsYWdnZWQgKFRhc2sgR2VuaXVzKScsXHJcblx0XHRpY29uOiAnbHVjaWRlLWZsYWcnLFxyXG5cdFx0ZGVmYXVsdFZpZXdNb2RlOiAnZmxhZ2dlZCcsXHJcblx0XHRkZXNjcmlwdGlvbjogJ1ZpZXcgaGlnaC1wcmlvcml0eSBmbGFnZ2VkIHRhc2tzJ1xyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6ICd0YXNrLWdlbml1cy1xdWFkcmFudCcsXHJcblx0XHRuYW1lOiAnUXVhZHJhbnQgKFRhc2sgR2VuaXVzKScsXHJcblx0XHRpY29uOiAnbHVjaWRlLWdyaWQnLFxyXG5cdFx0ZGVmYXVsdFZpZXdNb2RlOiAncXVhZHJhbnQnLFxyXG5cdFx0ZGVzY3JpcHRpb246ICdPcmdhbml6ZSB0YXNrcyB1c2luZyB0aGUgRWlzZW5ob3dlciBNYXRyaXgnXHJcblx0fVxyXG5dO1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSB2aWV3IG9wdGlvbnMgZm9yIGEgc3BlY2lmaWMgdmlldyB0eXBlXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVWaWV3T3B0aW9ucyh2aWV3VHlwZTogVGFza0dlbml1c0Jhc2VzVmlld1R5cGUpOiAoKSA9PiBWaWV3T3B0aW9uW10ge1xyXG5cdHJldHVybiAoKSA9PiB7XHJcblx0XHQvLyBGb3Igc3BlY2lhbGl6ZWQgdmlld3MsIHBhc3MgdGhlIHZpZXdNb2RlIHRvIGZpbHRlciBvcHRpb25zXHJcblx0XHRjb25zdCB2aWV3TW9kZSA9IHZpZXdUeXBlLmRlZmF1bHRWaWV3TW9kZTtcclxuXHRcdGNvbnN0IGJhc2VPcHRpb25zID0gVGFza0Jhc2VzVmlldy5nZXRWaWV3T3B0aW9ucyh2aWV3TW9kZSk7XHJcblxyXG5cdFx0Y29uc3Qgdmlld1NldHRpbmdzR3JvdXAgPSBiYXNlT3B0aW9ucy5maW5kKFxyXG5cdFx0XHRvcHQgPT4gb3B0LmRpc3BsYXlOYW1lID09PSAnVmlldyBTZXR0aW5ncycgJiYgb3B0LnR5cGUgPT09ICdncm91cCdcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKHZpZXdTZXR0aW5nc0dyb3VwICYmICdpdGVtcycgaW4gdmlld1NldHRpbmdzR3JvdXApIHtcclxuXHRcdFx0Ly8gUmVtb3ZlIHRoZSB2aWV3IG1vZGUgc2VsZWN0b3IgZm9yIHNwZWNpYWxpemVkIHZpZXdzXHJcblx0XHRcdHZpZXdTZXR0aW5nc0dyb3VwLml0ZW1zID0gdmlld1NldHRpbmdzR3JvdXAuaXRlbXM/LmZpbHRlcihcclxuXHRcdFx0XHRpdGVtID0+IGl0ZW0ua2V5ICE9PSAndmlld01vZGUnXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBBZGQgYSBub3RlIGFib3V0IHRoZSB2aWV3IHR5cGVcclxuXHRcdFx0dmlld1NldHRpbmdzR3JvdXAuaXRlbXM/LnVuc2hpZnQoe1xyXG5cdFx0XHRcdGRpc3BsYXlOYW1lOiAnVmlldyBUeXBlJyxcclxuXHRcdFx0XHR0eXBlOiAndGV4dCcsXHJcblx0XHRcdFx0a2V5OiAnX192aWV3VHlwZScsXHJcblx0XHRcdFx0cGxhY2Vob2xkZXI6IGBUaGlzIGlzIGEgJHt2aWV3VHlwZS5uYW1lfSB2aWV3YCxcclxuXHRcdFx0XHRkZWZhdWx0OiB2aWV3VHlwZS5uYW1lLFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHR9IGFzIGFueSk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGJhc2VPcHRpb25zO1xyXG5cdH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZWdpc3RlciBhbGwgVGFzayBHZW5pdXMgdmlld3Mgd2l0aCB0aGUgQmFzZXMgcGx1Z2luXHJcbiAqIEBwYXJhbSBwbHVnaW4gLSBUaGUgbWFpbiBUYXNrIEdlbml1cyBwbHVnaW4gaW5zdGFuY2VcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlclRhc2tHZW5pdXNCYXNlc1ZpZXdzKHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luKSB7XHJcblx0Ly8gUmVnaXN0ZXIgZWFjaCB2aWV3IHR5cGVcclxuXHRUQVNLX0dFTklVU19CQVNFU19WSUVXUy5mb3JFYWNoKHZpZXdUeXBlID0+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdHBsdWdpbi5yZWdpc3RlckJhc2VzVmlldyh2aWV3VHlwZS5pZCwge1xyXG5cdFx0XHRcdG5hbWU6IHZpZXdUeXBlLm5hbWUsXHJcblx0XHRcdFx0aWNvbjogdmlld1R5cGUuaWNvbixcclxuXHRcdFx0XHRmYWN0b3J5OiAoY29udHJvbGxlciwgY29udGFpbmVyRWwpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IHZpZXcgPSBuZXcgVGFza0Jhc2VzVmlldyhcclxuXHRcdFx0XHRcdFx0Y29udHJvbGxlcixcclxuXHRcdFx0XHRcdFx0Y29udGFpbmVyRWwsXHJcblx0XHRcdFx0XHRcdHBsdWdpbixcclxuXHRcdFx0XHRcdFx0dmlld1R5cGUuZGVmYXVsdFZpZXdNb2RlXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0dmlldy5zZXRGb3JjZWRWaWV3TW9kZSh2aWV3VHlwZS5kZWZhdWx0Vmlld01vZGUgYXMgVmlld01vZGUpO1xyXG5cclxuXHRcdFx0XHRcdHJldHVybiB2aWV3O1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b3B0aW9uczogY3JlYXRlVmlld09wdGlvbnModmlld1R5cGUpLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKGBSZWdpc3RlcmVkIEJhc2VzIHZpZXc6ICR7dmlld1R5cGUubmFtZX0gKCR7dmlld1R5cGUuaWR9KWApO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihgRmFpbGVkIHRvIHJlZ2lzdGVyIEJhc2VzIHZpZXcgJHt2aWV3VHlwZS5pZH06YCwgZXJyb3IpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG59XHJcbiJdfQ==