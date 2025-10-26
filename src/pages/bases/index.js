/**
 * Bases Plugin Integration for Task Genius
 *
 * This module provides complete integration between Task Genius and the Bases plugin,
 * allowing all Task Genius views to be used as Bases views with full data conversion
 * and view management capabilities.
 */
export { TaskBasesView, TaskBasesViewType } from './TaskBasesView';
export { registerTaskGeniusBasesViews } from './registerBasesViews';
/**
 * Example usage in Bases:
 *
 * 1. Create a base file with task-related properties:
 * ```yaml
 * ---
 * bases:
 *   properties:
 *     - task_content: text
 *     - status: checkbox
 *     - priority: number
 *     - project: text
 *     - tags: list
 *     - due_date: date
 *     - context: text
 * ---
 * ```
 *
 * 2. Query your tasks:
 * ```base
 * view: task-genius-kanban
 * from: "Tasks"
 * where: status != "x"
 * sort: priority desc, due_date asc
 * ```
 *
 * 3. Available view types:
 * - task-genius-inbox: Inbox view for managing tasks
 * - task-genius-forecast: Timeline forecast view
 * - task-genius-projects: Project-based organization
 * - task-genius-tags: Tag-based browsing
 * - task-genius-calendar: Calendar layout
 * - task-genius-kanban: Kanban board
 * - task-genius-gantt: Gantt chart
 * - task-genius-review: Task review interface
 * - task-genius-habits: Habit tracking
 * - task-genius-flagged: High-priority flagged tasks
 * - task-genius-unified: Configurable unified view
 * - task-genius-custom: Fully customizable view
 *
 * 4. Property mappings:
 * Map your base properties to Task Genius fields:
 * - taskContent: The main task text
 * - taskStatus: Completion status (checkbox or text)
 * - taskPriority: Priority level (1-5)
 * - taskProject: Project assignment
 * - taskTags: Tags (list or comma-separated)
 * - taskDueDate: Due date
 * - taskStartDate: Start date
 * - taskCompletedDate: Completion date
 * - taskContext: Task context (@context)
 *
 * 5. View-specific configurations (saved to view config):
 *
 * Kanban View:
 * - kanban.groupBy: Group tasks by (status, priority, tags, project, context, dueDate, startDate)
 * - kanban.hideEmptyColumns: Hide columns with no tasks
 * - kanban.defaultSortField: Default sort field (priority, dueDate, scheduledDate, startDate, createdDate)
 * - kanban.defaultSortOrder: Sort order (asc or desc)
 *
 * Calendar View:
 * - calendar.firstDayOfWeek: First day of week (0=Sunday, 1=Monday, etc.)
 * - calendar.hideWeekends: Hide weekend columns
 *
 * Gantt View:
 * - gantt.showTaskLabels: Show task labels on bars
 * - gantt.useMarkdownRenderer: Use markdown rendering for task names
 *
 * Forecast View:
 * - forecast.firstDayOfWeek: First day of week (0=Sunday, 1=Monday, etc.)
 * - forecast.hideWeekends: Hide weekend columns
 *
 * These configurations are saved directly to the .base file's frontmatter and are
 * specific to each view instance. They override plugin-level settings.
 */
/**
 * Integration Features:
 *
 * 1. Full View Support:
 *    - All Task Genius views available as Bases views
 *    - Seamless switching between view modes
 *    - Persistent configuration per view
 *
 * 2. Data Conversion:
 *    - Automatic conversion between Bases entries and Task format
 *    - Support for all task properties and metadata
 *    - Bi-directional sync when using WriteAPI
 *
 * 3. Filtering & Sorting:
 *    - Advanced task filtering system
 *    - Multiple sort criteria support
 *    - Live filter updates
 *
 * 4. Task Operations:
 *    - Complete/uncomplete tasks
 *    - Edit task properties
 *    - Status switching
 *    - Quick capture integration
 *
 * 5. Customization:
 *    - Configurable property mappings
 *    - View-specific settings
 *    - Theme-aware styling
 */ 
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDbkUsT0FBTyxFQUNILDRCQUE0QixFQUMvQixNQUFNLHNCQUFzQixDQUFDO0FBRTlCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQTBFRztBQUVIOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBNEJHIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEJhc2VzIFBsdWdpbiBJbnRlZ3JhdGlvbiBmb3IgVGFzayBHZW5pdXNcclxuICpcclxuICogVGhpcyBtb2R1bGUgcHJvdmlkZXMgY29tcGxldGUgaW50ZWdyYXRpb24gYmV0d2VlbiBUYXNrIEdlbml1cyBhbmQgdGhlIEJhc2VzIHBsdWdpbixcclxuICogYWxsb3dpbmcgYWxsIFRhc2sgR2VuaXVzIHZpZXdzIHRvIGJlIHVzZWQgYXMgQmFzZXMgdmlld3Mgd2l0aCBmdWxsIGRhdGEgY29udmVyc2lvblxyXG4gKiBhbmQgdmlldyBtYW5hZ2VtZW50IGNhcGFiaWxpdGllcy5cclxuICovXHJcblxyXG5leHBvcnQgeyBUYXNrQmFzZXNWaWV3LCBUYXNrQmFzZXNWaWV3VHlwZSB9IGZyb20gJy4vVGFza0Jhc2VzVmlldyc7XHJcbmV4cG9ydCB7XHJcbiAgICByZWdpc3RlclRhc2tHZW5pdXNCYXNlc1ZpZXdzXHJcbn0gZnJvbSAnLi9yZWdpc3RlckJhc2VzVmlld3MnO1xyXG5cclxuLyoqXHJcbiAqIEV4YW1wbGUgdXNhZ2UgaW4gQmFzZXM6XHJcbiAqXHJcbiAqIDEuIENyZWF0ZSBhIGJhc2UgZmlsZSB3aXRoIHRhc2stcmVsYXRlZCBwcm9wZXJ0aWVzOlxyXG4gKiBgYGB5YW1sXHJcbiAqIC0tLVxyXG4gKiBiYXNlczpcclxuICogICBwcm9wZXJ0aWVzOlxyXG4gKiAgICAgLSB0YXNrX2NvbnRlbnQ6IHRleHRcclxuICogICAgIC0gc3RhdHVzOiBjaGVja2JveFxyXG4gKiAgICAgLSBwcmlvcml0eTogbnVtYmVyXHJcbiAqICAgICAtIHByb2plY3Q6IHRleHRcclxuICogICAgIC0gdGFnczogbGlzdFxyXG4gKiAgICAgLSBkdWVfZGF0ZTogZGF0ZVxyXG4gKiAgICAgLSBjb250ZXh0OiB0ZXh0XHJcbiAqIC0tLVxyXG4gKiBgYGBcclxuICpcclxuICogMi4gUXVlcnkgeW91ciB0YXNrczpcclxuICogYGBgYmFzZVxyXG4gKiB2aWV3OiB0YXNrLWdlbml1cy1rYW5iYW5cclxuICogZnJvbTogXCJUYXNrc1wiXHJcbiAqIHdoZXJlOiBzdGF0dXMgIT0gXCJ4XCJcclxuICogc29ydDogcHJpb3JpdHkgZGVzYywgZHVlX2RhdGUgYXNjXHJcbiAqIGBgYFxyXG4gKlxyXG4gKiAzLiBBdmFpbGFibGUgdmlldyB0eXBlczpcclxuICogLSB0YXNrLWdlbml1cy1pbmJveDogSW5ib3ggdmlldyBmb3IgbWFuYWdpbmcgdGFza3NcclxuICogLSB0YXNrLWdlbml1cy1mb3JlY2FzdDogVGltZWxpbmUgZm9yZWNhc3Qgdmlld1xyXG4gKiAtIHRhc2stZ2VuaXVzLXByb2plY3RzOiBQcm9qZWN0LWJhc2VkIG9yZ2FuaXphdGlvblxyXG4gKiAtIHRhc2stZ2VuaXVzLXRhZ3M6IFRhZy1iYXNlZCBicm93c2luZ1xyXG4gKiAtIHRhc2stZ2VuaXVzLWNhbGVuZGFyOiBDYWxlbmRhciBsYXlvdXRcclxuICogLSB0YXNrLWdlbml1cy1rYW5iYW46IEthbmJhbiBib2FyZFxyXG4gKiAtIHRhc2stZ2VuaXVzLWdhbnR0OiBHYW50dCBjaGFydFxyXG4gKiAtIHRhc2stZ2VuaXVzLXJldmlldzogVGFzayByZXZpZXcgaW50ZXJmYWNlXHJcbiAqIC0gdGFzay1nZW5pdXMtaGFiaXRzOiBIYWJpdCB0cmFja2luZ1xyXG4gKiAtIHRhc2stZ2VuaXVzLWZsYWdnZWQ6IEhpZ2gtcHJpb3JpdHkgZmxhZ2dlZCB0YXNrc1xyXG4gKiAtIHRhc2stZ2VuaXVzLXVuaWZpZWQ6IENvbmZpZ3VyYWJsZSB1bmlmaWVkIHZpZXdcclxuICogLSB0YXNrLWdlbml1cy1jdXN0b206IEZ1bGx5IGN1c3RvbWl6YWJsZSB2aWV3XHJcbiAqXHJcbiAqIDQuIFByb3BlcnR5IG1hcHBpbmdzOlxyXG4gKiBNYXAgeW91ciBiYXNlIHByb3BlcnRpZXMgdG8gVGFzayBHZW5pdXMgZmllbGRzOlxyXG4gKiAtIHRhc2tDb250ZW50OiBUaGUgbWFpbiB0YXNrIHRleHRcclxuICogLSB0YXNrU3RhdHVzOiBDb21wbGV0aW9uIHN0YXR1cyAoY2hlY2tib3ggb3IgdGV4dClcclxuICogLSB0YXNrUHJpb3JpdHk6IFByaW9yaXR5IGxldmVsICgxLTUpXHJcbiAqIC0gdGFza1Byb2plY3Q6IFByb2plY3QgYXNzaWdubWVudFxyXG4gKiAtIHRhc2tUYWdzOiBUYWdzIChsaXN0IG9yIGNvbW1hLXNlcGFyYXRlZClcclxuICogLSB0YXNrRHVlRGF0ZTogRHVlIGRhdGVcclxuICogLSB0YXNrU3RhcnREYXRlOiBTdGFydCBkYXRlXHJcbiAqIC0gdGFza0NvbXBsZXRlZERhdGU6IENvbXBsZXRpb24gZGF0ZVxyXG4gKiAtIHRhc2tDb250ZXh0OiBUYXNrIGNvbnRleHQgKEBjb250ZXh0KVxyXG4gKlxyXG4gKiA1LiBWaWV3LXNwZWNpZmljIGNvbmZpZ3VyYXRpb25zIChzYXZlZCB0byB2aWV3IGNvbmZpZyk6XHJcbiAqXHJcbiAqIEthbmJhbiBWaWV3OlxyXG4gKiAtIGthbmJhbi5ncm91cEJ5OiBHcm91cCB0YXNrcyBieSAoc3RhdHVzLCBwcmlvcml0eSwgdGFncywgcHJvamVjdCwgY29udGV4dCwgZHVlRGF0ZSwgc3RhcnREYXRlKVxyXG4gKiAtIGthbmJhbi5oaWRlRW1wdHlDb2x1bW5zOiBIaWRlIGNvbHVtbnMgd2l0aCBubyB0YXNrc1xyXG4gKiAtIGthbmJhbi5kZWZhdWx0U29ydEZpZWxkOiBEZWZhdWx0IHNvcnQgZmllbGQgKHByaW9yaXR5LCBkdWVEYXRlLCBzY2hlZHVsZWREYXRlLCBzdGFydERhdGUsIGNyZWF0ZWREYXRlKVxyXG4gKiAtIGthbmJhbi5kZWZhdWx0U29ydE9yZGVyOiBTb3J0IG9yZGVyIChhc2Mgb3IgZGVzYylcclxuICpcclxuICogQ2FsZW5kYXIgVmlldzpcclxuICogLSBjYWxlbmRhci5maXJzdERheU9mV2VlazogRmlyc3QgZGF5IG9mIHdlZWsgKDA9U3VuZGF5LCAxPU1vbmRheSwgZXRjLilcclxuICogLSBjYWxlbmRhci5oaWRlV2Vla2VuZHM6IEhpZGUgd2Vla2VuZCBjb2x1bW5zXHJcbiAqXHJcbiAqIEdhbnR0IFZpZXc6XHJcbiAqIC0gZ2FudHQuc2hvd1Rhc2tMYWJlbHM6IFNob3cgdGFzayBsYWJlbHMgb24gYmFyc1xyXG4gKiAtIGdhbnR0LnVzZU1hcmtkb3duUmVuZGVyZXI6IFVzZSBtYXJrZG93biByZW5kZXJpbmcgZm9yIHRhc2sgbmFtZXNcclxuICpcclxuICogRm9yZWNhc3QgVmlldzpcclxuICogLSBmb3JlY2FzdC5maXJzdERheU9mV2VlazogRmlyc3QgZGF5IG9mIHdlZWsgKDA9U3VuZGF5LCAxPU1vbmRheSwgZXRjLilcclxuICogLSBmb3JlY2FzdC5oaWRlV2Vla2VuZHM6IEhpZGUgd2Vla2VuZCBjb2x1bW5zXHJcbiAqXHJcbiAqIFRoZXNlIGNvbmZpZ3VyYXRpb25zIGFyZSBzYXZlZCBkaXJlY3RseSB0byB0aGUgLmJhc2UgZmlsZSdzIGZyb250bWF0dGVyIGFuZCBhcmVcclxuICogc3BlY2lmaWMgdG8gZWFjaCB2aWV3IGluc3RhbmNlLiBUaGV5IG92ZXJyaWRlIHBsdWdpbi1sZXZlbCBzZXR0aW5ncy5cclxuICovXHJcblxyXG4vKipcclxuICogSW50ZWdyYXRpb24gRmVhdHVyZXM6XHJcbiAqXHJcbiAqIDEuIEZ1bGwgVmlldyBTdXBwb3J0OlxyXG4gKiAgICAtIEFsbCBUYXNrIEdlbml1cyB2aWV3cyBhdmFpbGFibGUgYXMgQmFzZXMgdmlld3NcclxuICogICAgLSBTZWFtbGVzcyBzd2l0Y2hpbmcgYmV0d2VlbiB2aWV3IG1vZGVzXHJcbiAqICAgIC0gUGVyc2lzdGVudCBjb25maWd1cmF0aW9uIHBlciB2aWV3XHJcbiAqXHJcbiAqIDIuIERhdGEgQ29udmVyc2lvbjpcclxuICogICAgLSBBdXRvbWF0aWMgY29udmVyc2lvbiBiZXR3ZWVuIEJhc2VzIGVudHJpZXMgYW5kIFRhc2sgZm9ybWF0XHJcbiAqICAgIC0gU3VwcG9ydCBmb3IgYWxsIHRhc2sgcHJvcGVydGllcyBhbmQgbWV0YWRhdGFcclxuICogICAgLSBCaS1kaXJlY3Rpb25hbCBzeW5jIHdoZW4gdXNpbmcgV3JpdGVBUElcclxuICpcclxuICogMy4gRmlsdGVyaW5nICYgU29ydGluZzpcclxuICogICAgLSBBZHZhbmNlZCB0YXNrIGZpbHRlcmluZyBzeXN0ZW1cclxuICogICAgLSBNdWx0aXBsZSBzb3J0IGNyaXRlcmlhIHN1cHBvcnRcclxuICogICAgLSBMaXZlIGZpbHRlciB1cGRhdGVzXHJcbiAqXHJcbiAqIDQuIFRhc2sgT3BlcmF0aW9uczpcclxuICogICAgLSBDb21wbGV0ZS91bmNvbXBsZXRlIHRhc2tzXHJcbiAqICAgIC0gRWRpdCB0YXNrIHByb3BlcnRpZXNcclxuICogICAgLSBTdGF0dXMgc3dpdGNoaW5nXHJcbiAqICAgIC0gUXVpY2sgY2FwdHVyZSBpbnRlZ3JhdGlvblxyXG4gKlxyXG4gKiA1LiBDdXN0b21pemF0aW9uOlxyXG4gKiAgICAtIENvbmZpZ3VyYWJsZSBwcm9wZXJ0eSBtYXBwaW5nc1xyXG4gKiAgICAtIFZpZXctc3BlY2lmaWMgc2V0dGluZ3NcclxuICogICAgLSBUaGVtZS1hd2FyZSBzdHlsaW5nXHJcbiAqLyJdfQ==