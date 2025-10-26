// Compatibility shim for project path filtering used by views
// New dataflow uses indexes, but legacy components import this helper.
/**
 * Inclusive filter: select tasks whose effective project path starts with any selected path.
 * Falls back to matching metadata.project, then tgProject.name.
 */
export function filterTasksByProjectPaths(tasks, selectedPaths, separator = "/") {
    if (!selectedPaths || selectedPaths.length === 0)
        return tasks;
    const lowered = selectedPaths.map(p => (p || "").toLowerCase());
    return tasks.filter(t => {
        var _a, _b, _c, _d, _e;
        const project = ((_b = (_a = t.metadata) === null || _a === void 0 ? void 0 : _a.project) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || ((_e = (_d = (_c = t.metadata) === null || _c === void 0 ? void 0 : _c.tgProject) === null || _d === void 0 ? void 0 : _d.name) === null || _e === void 0 ? void 0 : _e.toLowerCase()) || "";
        if (!project)
            return false;
        return lowered.some(sel => project === sel || project.startsWith(sel + separator));
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC1maWx0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwcm9qZWN0LWZpbHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSw4REFBOEQ7QUFDOUQsdUVBQXVFO0FBSXZFOzs7R0FHRztBQUNILE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxLQUFhLEVBQUUsYUFBdUIsRUFBRSxZQUFvQixHQUFHO0lBQ3ZHLElBQUksQ0FBQyxhQUFhLElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDO1FBQUUsT0FBTyxLQUFLLENBQUM7SUFDL0QsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7SUFDaEUsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFOztRQUN0QixNQUFNLE9BQU8sR0FBRyxDQUFBLE1BQUEsTUFBQSxDQUFDLENBQUMsUUFBUSwwQ0FBRSxPQUFPLDBDQUFFLFdBQVcsRUFBRSxNQUFJLE1BQUEsTUFBQSxNQUFBLENBQUMsQ0FBQyxRQUFRLDBDQUFFLFNBQVMsMENBQUUsSUFBSSwwQ0FBRSxXQUFXLEVBQUUsQ0FBQSxJQUFJLEVBQUUsQ0FBQztRQUN2RyxJQUFJLENBQUMsT0FBTztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQzNCLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sS0FBSyxHQUFHLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUNyRixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb21wYXRpYmlsaXR5IHNoaW0gZm9yIHByb2plY3QgcGF0aCBmaWx0ZXJpbmcgdXNlZCBieSB2aWV3c1xyXG4vLyBOZXcgZGF0YWZsb3cgdXNlcyBpbmRleGVzLCBidXQgbGVnYWN5IGNvbXBvbmVudHMgaW1wb3J0IHRoaXMgaGVscGVyLlxyXG5cclxuaW1wb3J0IHR5cGUgeyBUYXNrIH0gZnJvbSBcIi4uL3R5cGVzL3Rhc2tcIjtcclxuXHJcbi8qKlxyXG4gKiBJbmNsdXNpdmUgZmlsdGVyOiBzZWxlY3QgdGFza3Mgd2hvc2UgZWZmZWN0aXZlIHByb2plY3QgcGF0aCBzdGFydHMgd2l0aCBhbnkgc2VsZWN0ZWQgcGF0aC5cclxuICogRmFsbHMgYmFjayB0byBtYXRjaGluZyBtZXRhZGF0YS5wcm9qZWN0LCB0aGVuIHRnUHJvamVjdC5uYW1lLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclRhc2tzQnlQcm9qZWN0UGF0aHModGFza3M6IFRhc2tbXSwgc2VsZWN0ZWRQYXRoczogc3RyaW5nW10sIHNlcGFyYXRvcjogc3RyaW5nID0gXCIvXCIpOiBUYXNrW10ge1xyXG4gIGlmICghc2VsZWN0ZWRQYXRocyB8fCBzZWxlY3RlZFBhdGhzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHRhc2tzO1xyXG4gIGNvbnN0IGxvd2VyZWQgPSBzZWxlY3RlZFBhdGhzLm1hcChwID0+IChwIHx8IFwiXCIpLnRvTG93ZXJDYXNlKCkpO1xyXG4gIHJldHVybiB0YXNrcy5maWx0ZXIodCA9PiB7XHJcbiAgICBjb25zdCBwcm9qZWN0ID0gdC5tZXRhZGF0YT8ucHJvamVjdD8udG9Mb3dlckNhc2UoKSB8fCB0Lm1ldGFkYXRhPy50Z1Byb2plY3Q/Lm5hbWU/LnRvTG93ZXJDYXNlKCkgfHwgXCJcIjtcclxuICAgIGlmICghcHJvamVjdCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgcmV0dXJuIGxvd2VyZWQuc29tZShzZWwgPT4gcHJvamVjdCA9PT0gc2VsIHx8IHByb2plY3Quc3RhcnRzV2l0aChzZWwgKyBzZXBhcmF0b3IpKTtcclxuICB9KTtcclxufVxyXG5cclxuIl19