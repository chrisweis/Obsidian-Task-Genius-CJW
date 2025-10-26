// Code from https://github.com/obsidian-tasks-group/obsidian-tasks/tree/main/src/Config/Themes
// Original code is licensed under the MIT License.
/**
 * Status supported by the Things theme. {@link https://github.com/colineckert/obsidian-things}
 * @see {@link StatusSettings.bulkAddStatusCollection}
 */
export function thingsSupportedStatuses() {
    const zzz = [
        // Basic
        [' ', 'to-do', 'notStarted'],
        ['/', 'incomplete', 'inProgress'],
        ['x', 'done', 'completed'],
        ['-', 'canceled', 'abandoned'],
        ['>', 'forwarded', 'planned'],
        ['<', 'scheduling', 'planned'],
        // Extras
        ['?', 'question', 'notStarted'],
        ['!', 'important', 'notStarted'],
        ['*', 'star', 'notStarted'],
        ['"', 'quote', 'notStarted'],
        ['l', 'location', 'notStarted'],
        ['b', 'bookmark', 'notStarted'],
        ['i', 'information', 'notStarted'],
        ['S', 'savings', 'notStarted'],
        ['I', 'idea', 'notStarted'],
        ['p', 'pros', 'notStarted'],
        ['c', 'cons', 'notStarted'],
        ['f', 'fire', 'notStarted'],
        ['k', 'key', 'notStarted'],
        ['w', 'win', 'notStarted'],
        ['u', 'up', 'notStarted'],
        ['d', 'down', 'notStarted'],
    ];
    return zzz;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGhpbmdzVGhlbWVDb2xsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiVGhpbmdzVGhlbWVDb2xsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLCtGQUErRjtBQUMvRixtREFBbUQ7QUFJbkQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLHVCQUF1QjtJQUNuQyxNQUFNLEdBQUcsR0FBcUI7UUFDMUIsUUFBUTtRQUNSLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxZQUFZLENBQUM7UUFDNUIsQ0FBQyxHQUFHLEVBQUUsWUFBWSxFQUFFLFlBQVksQ0FBQztRQUNqQyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDO1FBQzFCLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRSxXQUFXLENBQUM7UUFDOUIsQ0FBQyxHQUFHLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQztRQUM3QixDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsU0FBUyxDQUFDO1FBQzlCLFNBQVM7UUFDVCxDQUFDLEdBQUcsRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDO1FBQy9CLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRSxZQUFZLENBQUM7UUFDaEMsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQztRQUMzQixDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsWUFBWSxDQUFDO1FBQzVCLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRSxZQUFZLENBQUM7UUFDL0IsQ0FBQyxHQUFHLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQztRQUMvQixDQUFDLEdBQUcsRUFBRSxhQUFhLEVBQUUsWUFBWSxDQUFDO1FBQ2xDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxZQUFZLENBQUM7UUFDOUIsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQztRQUMzQixDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDO1FBQzNCLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUM7UUFDM0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQztRQUMzQixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDO1FBQzFCLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxZQUFZLENBQUM7UUFDMUIsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFlBQVksQ0FBQztRQUN6QixDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDO0tBQzlCLENBQUM7SUFDRixPQUFPLEdBQUcsQ0FBQztBQUNmLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb2RlIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL29ic2lkaWFuLXRhc2tzLWdyb3VwL29ic2lkaWFuLXRhc2tzL3RyZWUvbWFpbi9zcmMvQ29uZmlnL1RoZW1lc1xyXG4vLyBPcmlnaW5hbCBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cclxuXHJcbmltcG9ydCB0eXBlIHsgU3RhdHVzQ29sbGVjdGlvbiB9IGZyb20gJy4vU3RhdHVzQ29sbGVjdGlvbnMnO1xyXG5cclxuLyoqXHJcbiAqIFN0YXR1cyBzdXBwb3J0ZWQgYnkgdGhlIFRoaW5ncyB0aGVtZS4ge0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9jb2xpbmVja2VydC9vYnNpZGlhbi10aGluZ3N9XHJcbiAqIEBzZWUge0BsaW5rIFN0YXR1c1NldHRpbmdzLmJ1bGtBZGRTdGF0dXNDb2xsZWN0aW9ufVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHRoaW5nc1N1cHBvcnRlZFN0YXR1c2VzKCkge1xyXG4gICAgY29uc3Qgenp6OiBTdGF0dXNDb2xsZWN0aW9uID0gW1xyXG4gICAgICAgIC8vIEJhc2ljXHJcbiAgICAgICAgWycgJywgJ3RvLWRvJywgJ25vdFN0YXJ0ZWQnXSxcclxuICAgICAgICBbJy8nLCAnaW5jb21wbGV0ZScsICdpblByb2dyZXNzJ10sXHJcbiAgICAgICAgWyd4JywgJ2RvbmUnLCAnY29tcGxldGVkJ10sXHJcbiAgICAgICAgWyctJywgJ2NhbmNlbGVkJywgJ2FiYW5kb25lZCddLFxyXG4gICAgICAgIFsnPicsICdmb3J3YXJkZWQnLCAncGxhbm5lZCddLFxyXG4gICAgICAgIFsnPCcsICdzY2hlZHVsaW5nJywgJ3BsYW5uZWQnXSxcclxuICAgICAgICAvLyBFeHRyYXNcclxuICAgICAgICBbJz8nLCAncXVlc3Rpb24nLCAnbm90U3RhcnRlZCddLFxyXG4gICAgICAgIFsnIScsICdpbXBvcnRhbnQnLCAnbm90U3RhcnRlZCddLFxyXG4gICAgICAgIFsnKicsICdzdGFyJywgJ25vdFN0YXJ0ZWQnXSxcclxuICAgICAgICBbJ1wiJywgJ3F1b3RlJywgJ25vdFN0YXJ0ZWQnXSxcclxuICAgICAgICBbJ2wnLCAnbG9jYXRpb24nLCAnbm90U3RhcnRlZCddLFxyXG4gICAgICAgIFsnYicsICdib29rbWFyaycsICdub3RTdGFydGVkJ10sXHJcbiAgICAgICAgWydpJywgJ2luZm9ybWF0aW9uJywgJ25vdFN0YXJ0ZWQnXSxcclxuICAgICAgICBbJ1MnLCAnc2F2aW5ncycsICdub3RTdGFydGVkJ10sXHJcbiAgICAgICAgWydJJywgJ2lkZWEnLCAnbm90U3RhcnRlZCddLFxyXG4gICAgICAgIFsncCcsICdwcm9zJywgJ25vdFN0YXJ0ZWQnXSxcclxuICAgICAgICBbJ2MnLCAnY29ucycsICdub3RTdGFydGVkJ10sXHJcbiAgICAgICAgWydmJywgJ2ZpcmUnLCAnbm90U3RhcnRlZCddLFxyXG4gICAgICAgIFsnaycsICdrZXknLCAnbm90U3RhcnRlZCddLFxyXG4gICAgICAgIFsndycsICd3aW4nLCAnbm90U3RhcnRlZCddLFxyXG4gICAgICAgIFsndScsICd1cCcsICdub3RTdGFydGVkJ10sXHJcbiAgICAgICAgWydkJywgJ2Rvd24nLCAnbm90U3RhcnRlZCddLFxyXG4gICAgXTtcclxuICAgIHJldHVybiB6eno7XHJcbn1cclxuIl19