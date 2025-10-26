// Code from https://github.com/obsidian-tasks-group/obsidian-tasks/tree/main/src/Config/Themes
// Original code is licensed under the MIT License.
/**
 * Status supported by the Minimal theme. {@link https://github.com/kepano/obsidian-minimal}
 * Values recognised by Tasks are excluded.
 * @see {@link StatusSettings.bulkAddStatusCollection}
 */
export function minimalSupportedStatuses() {
    const zzz = [
        [' ', 'to-do', 'notStarted'],
        ['/', 'incomplete', 'inProgress'],
        ['x', 'done', 'completed'],
        ['-', 'canceled', 'abandoned'],
        ['>', 'forwarded', 'planned'],
        ['<', 'scheduling', 'planned'],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWluaW1hbFRoZW1lQ29sbGVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIk1pbmltYWxUaGVtZUNvbGxlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsK0ZBQStGO0FBQy9GLG1EQUFtRDtBQUluRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLHdCQUF3QjtJQUNwQyxNQUFNLEdBQUcsR0FBcUI7UUFDMUIsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLFlBQVksQ0FBQztRQUM1QixDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsWUFBWSxDQUFDO1FBQ2pDLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUM7UUFDMUIsQ0FBQyxHQUFHLEVBQUUsVUFBVSxFQUFFLFdBQVcsQ0FBQztRQUM5QixDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDO1FBQzdCLENBQUMsR0FBRyxFQUFFLFlBQVksRUFBRSxTQUFTLENBQUM7UUFDOUIsQ0FBQyxHQUFHLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQztRQUMvQixDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUUsWUFBWSxDQUFDO1FBQ2hDLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUM7UUFDM0IsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLFlBQVksQ0FBQztRQUM1QixDQUFDLEdBQUcsRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDO1FBQy9CLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRSxZQUFZLENBQUM7UUFDL0IsQ0FBQyxHQUFHLEVBQUUsYUFBYSxFQUFFLFlBQVksQ0FBQztRQUNsQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsWUFBWSxDQUFDO1FBQzlCLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUM7UUFDM0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQztRQUMzQixDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDO1FBQzNCLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUM7UUFDM0IsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQztRQUMxQixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDO1FBQzFCLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxZQUFZLENBQUM7UUFDekIsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQztLQUM5QixDQUFDO0lBQ0YsT0FBTyxHQUFHLENBQUM7QUFDZixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29kZSBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9vYnNpZGlhbi10YXNrcy1ncm91cC9vYnNpZGlhbi10YXNrcy90cmVlL21haW4vc3JjL0NvbmZpZy9UaGVtZXNcclxuLy8gT3JpZ2luYWwgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXHJcblxyXG5pbXBvcnQgdHlwZSB7IFN0YXR1c0NvbGxlY3Rpb24gfSBmcm9tICcuL1N0YXR1c0NvbGxlY3Rpb25zJztcclxuXHJcbi8qKlxyXG4gKiBTdGF0dXMgc3VwcG9ydGVkIGJ5IHRoZSBNaW5pbWFsIHRoZW1lLiB7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL2tlcGFuby9vYnNpZGlhbi1taW5pbWFsfVxyXG4gKiBWYWx1ZXMgcmVjb2duaXNlZCBieSBUYXNrcyBhcmUgZXhjbHVkZWQuXHJcbiAqIEBzZWUge0BsaW5rIFN0YXR1c1NldHRpbmdzLmJ1bGtBZGRTdGF0dXNDb2xsZWN0aW9ufVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG1pbmltYWxTdXBwb3J0ZWRTdGF0dXNlcygpIHtcclxuICAgIGNvbnN0IHp6ejogU3RhdHVzQ29sbGVjdGlvbiA9IFtcclxuICAgICAgICBbJyAnLCAndG8tZG8nLCAnbm90U3RhcnRlZCddLFxyXG4gICAgICAgIFsnLycsICdpbmNvbXBsZXRlJywgJ2luUHJvZ3Jlc3MnXSxcclxuICAgICAgICBbJ3gnLCAnZG9uZScsICdjb21wbGV0ZWQnXSxcclxuICAgICAgICBbJy0nLCAnY2FuY2VsZWQnLCAnYWJhbmRvbmVkJ10sXHJcbiAgICAgICAgWyc+JywgJ2ZvcndhcmRlZCcsICdwbGFubmVkJ10sXHJcbiAgICAgICAgWyc8JywgJ3NjaGVkdWxpbmcnLCAncGxhbm5lZCddLFxyXG4gICAgICAgIFsnPycsICdxdWVzdGlvbicsICdub3RTdGFydGVkJ10sXHJcbiAgICAgICAgWychJywgJ2ltcG9ydGFudCcsICdub3RTdGFydGVkJ10sXHJcbiAgICAgICAgWycqJywgJ3N0YXInLCAnbm90U3RhcnRlZCddLFxyXG4gICAgICAgIFsnXCInLCAncXVvdGUnLCAnbm90U3RhcnRlZCddLFxyXG4gICAgICAgIFsnbCcsICdsb2NhdGlvbicsICdub3RTdGFydGVkJ10sXHJcbiAgICAgICAgWydiJywgJ2Jvb2ttYXJrJywgJ25vdFN0YXJ0ZWQnXSxcclxuICAgICAgICBbJ2knLCAnaW5mb3JtYXRpb24nLCAnbm90U3RhcnRlZCddLFxyXG4gICAgICAgIFsnUycsICdzYXZpbmdzJywgJ25vdFN0YXJ0ZWQnXSxcclxuICAgICAgICBbJ0knLCAnaWRlYScsICdub3RTdGFydGVkJ10sXHJcbiAgICAgICAgWydwJywgJ3Byb3MnLCAnbm90U3RhcnRlZCddLFxyXG4gICAgICAgIFsnYycsICdjb25zJywgJ25vdFN0YXJ0ZWQnXSxcclxuICAgICAgICBbJ2YnLCAnZmlyZScsICdub3RTdGFydGVkJ10sXHJcbiAgICAgICAgWydrJywgJ2tleScsICdub3RTdGFydGVkJ10sXHJcbiAgICAgICAgWyd3JywgJ3dpbicsICdub3RTdGFydGVkJ10sXHJcbiAgICAgICAgWyd1JywgJ3VwJywgJ25vdFN0YXJ0ZWQnXSxcclxuICAgICAgICBbJ2QnLCAnZG93bicsICdub3RTdGFydGVkJ10sXHJcbiAgICBdO1xyXG4gICAgcmV0dXJuIHp6ejtcclxufVxyXG4iXX0=