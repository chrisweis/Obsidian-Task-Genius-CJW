// Compatibility shim for advanced filter utilities removed in dataflow refactor
// Provides minimal API used by editor-ext/filterTasks.ts and utils/RewardManager.ts
// Very minimal parser: returns the raw string; real implementation lives elsewhere in the codebase.
// This keeps build passing without changing editor-ext consumers. You can replace later with full parser.
export function parseAdvancedFilterQuery(query) {
    return query;
}
// Very permissive evaluator: if query is empty -> true; otherwise do a simple substring match on content/tags/project/context when possible.
// This is a temporary shim to satisfy type-check; views already have rich filtering via TaskFilterUtils.
export function evaluateFilterNode(node, task) {
    var _a, _b, _c, _d, _e;
    if (!node || (typeof node === 'string' && node.trim() === ''))
        return true;
    const q = typeof node === 'string' ? node.toLowerCase() : '';
    if (!q)
        return true;
    try {
        const haystacks = [];
        if (task.content)
            haystacks.push(String(task.content).toLowerCase());
        const tags = ((_a = task.metadata) === null || _a === void 0 ? void 0 : _a.tags) || task.tags;
        if (Array.isArray(tags))
            haystacks.push(tags.join(' ').toLowerCase());
        const project = ((_b = task.metadata) === null || _b === void 0 ? void 0 : _b.project) || task.project || ((_d = (_c = task.metadata) === null || _c === void 0 ? void 0 : _c.tgProject) === null || _d === void 0 ? void 0 : _d.name) || task.tgProject;
        if (project)
            haystacks.push(String(project).toLowerCase());
        const context = ((_e = task.metadata) === null || _e === void 0 ? void 0 : _e.context) || task.context;
        if (context)
            haystacks.push(String(context).toLowerCase());
        return haystacks.some(h => h.includes(q));
    }
    catch (_f) {
        return true;
    }
}
// Parse priority expressions used by filter UI, returning a numeric 1..5 if recognized; otherwise null.
export function parsePriorityFilterValue(input) {
    if (input == null)
        return null;
    if (typeof input === 'number')
        return input;
    const s = String(input).trim().toLowerCase();
    if (!s)
        return null;
    const map = {
        highest: 5,
        high: 4,
        medium: 3,
        normal: 3,
        moderate: 3,
        low: 2,
        lowest: 1,
        urgent: 5,
        critical: 5,
        important: 4,
        minor: 2,
        trivial: 1,
    };
    if (s in map)
        return map[s];
    const n = parseInt(s.replace(/^#/, ''), 10);
    return Number.isFinite(n) ? n : null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVyLWNvbXBhdGliaWxpdHkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmaWx0ZXItY29tcGF0aWJpbGl0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxnRkFBZ0Y7QUFDaEYsb0ZBQW9GO0FBSXBGLG9HQUFvRztBQUNwRywwR0FBMEc7QUFDMUcsTUFBTSxVQUFVLHdCQUF3QixDQUFDLEtBQWE7SUFDcEQsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDO0FBRUQsNklBQTZJO0FBQzdJLHlHQUF5RztBQUN6RyxNQUFNLFVBQVUsa0JBQWtCLENBQUMsSUFBZ0IsRUFBRSxJQUFTOztJQUM1RCxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFBRSxPQUFPLElBQUksQ0FBQztJQUMzRSxNQUFNLENBQUMsR0FBRyxPQUFPLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQzdELElBQUksQ0FBQyxDQUFDO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFDcEIsSUFBSTtRQUNGLE1BQU0sU0FBUyxHQUFhLEVBQUUsQ0FBQztRQUMvQixJQUFJLElBQUksQ0FBQyxPQUFPO1lBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDckUsTUFBTSxJQUFJLEdBQUcsQ0FBQSxNQUFBLElBQUksQ0FBQyxRQUFRLDBDQUFFLElBQUksS0FBSSxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQzlDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN0RSxNQUFNLE9BQU8sR0FBRyxDQUFBLE1BQUEsSUFBSSxDQUFDLFFBQVEsMENBQUUsT0FBTyxLQUFJLElBQUksQ0FBQyxPQUFPLEtBQUksTUFBQSxNQUFBLElBQUksQ0FBQyxRQUFRLDBDQUFFLFNBQVMsMENBQUUsSUFBSSxDQUFBLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUMzRyxJQUFJLE9BQU87WUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQzNELE1BQU0sT0FBTyxHQUFHLENBQUEsTUFBQSxJQUFJLENBQUMsUUFBUSwwQ0FBRSxPQUFPLEtBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUN2RCxJQUFJLE9BQU87WUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQzNELE9BQU8sU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMzQztJQUFDLFdBQU07UUFDTixPQUFPLElBQUksQ0FBQztLQUNiO0FBQ0gsQ0FBQztBQUVELHdHQUF3RztBQUN4RyxNQUFNLFVBQVUsd0JBQXdCLENBQUMsS0FBeUM7SUFDaEYsSUFBSSxLQUFLLElBQUksSUFBSTtRQUFFLE9BQU8sSUFBSSxDQUFDO0lBQy9CLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUTtRQUFFLE9BQU8sS0FBSyxDQUFDO0lBQzVDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUM3QyxJQUFJLENBQUMsQ0FBQztRQUFFLE9BQU8sSUFBSSxDQUFDO0lBQ3BCLE1BQU0sR0FBRyxHQUEyQjtRQUNsQyxPQUFPLEVBQUUsQ0FBQztRQUNWLElBQUksRUFBRSxDQUFDO1FBQ1AsTUFBTSxFQUFFLENBQUM7UUFDVCxNQUFNLEVBQUUsQ0FBQztRQUNULFFBQVEsRUFBRSxDQUFDO1FBQ1gsR0FBRyxFQUFFLENBQUM7UUFDTixNQUFNLEVBQUUsQ0FBQztRQUNULE1BQU0sRUFBRSxDQUFDO1FBQ1QsUUFBUSxFQUFFLENBQUM7UUFDWCxTQUFTLEVBQUUsQ0FBQztRQUNaLEtBQUssRUFBRSxDQUFDO1FBQ1IsT0FBTyxFQUFFLENBQUM7S0FDWCxDQUFDO0lBQ0YsSUFBSSxDQUFDLElBQUksR0FBRztRQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVCLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM1QyxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3ZDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb21wYXRpYmlsaXR5IHNoaW0gZm9yIGFkdmFuY2VkIGZpbHRlciB1dGlsaXRpZXMgcmVtb3ZlZCBpbiBkYXRhZmxvdyByZWZhY3RvclxyXG4vLyBQcm92aWRlcyBtaW5pbWFsIEFQSSB1c2VkIGJ5IGVkaXRvci1leHQvZmlsdGVyVGFza3MudHMgYW5kIHV0aWxzL1Jld2FyZE1hbmFnZXIudHNcclxuXHJcbmV4cG9ydCB0eXBlIEZpbHRlck5vZGUgPSBhbnk7XHJcblxyXG4vLyBWZXJ5IG1pbmltYWwgcGFyc2VyOiByZXR1cm5zIHRoZSByYXcgc3RyaW5nOyByZWFsIGltcGxlbWVudGF0aW9uIGxpdmVzIGVsc2V3aGVyZSBpbiB0aGUgY29kZWJhc2UuXHJcbi8vIFRoaXMga2VlcHMgYnVpbGQgcGFzc2luZyB3aXRob3V0IGNoYW5naW5nIGVkaXRvci1leHQgY29uc3VtZXJzLiBZb3UgY2FuIHJlcGxhY2UgbGF0ZXIgd2l0aCBmdWxsIHBhcnNlci5cclxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlQWR2YW5jZWRGaWx0ZXJRdWVyeShxdWVyeTogc3RyaW5nKTogRmlsdGVyTm9kZSB7XHJcbiAgcmV0dXJuIHF1ZXJ5O1xyXG59XHJcblxyXG4vLyBWZXJ5IHBlcm1pc3NpdmUgZXZhbHVhdG9yOiBpZiBxdWVyeSBpcyBlbXB0eSAtPiB0cnVlOyBvdGhlcndpc2UgZG8gYSBzaW1wbGUgc3Vic3RyaW5nIG1hdGNoIG9uIGNvbnRlbnQvdGFncy9wcm9qZWN0L2NvbnRleHQgd2hlbiBwb3NzaWJsZS5cclxuLy8gVGhpcyBpcyBhIHRlbXBvcmFyeSBzaGltIHRvIHNhdGlzZnkgdHlwZS1jaGVjazsgdmlld3MgYWxyZWFkeSBoYXZlIHJpY2ggZmlsdGVyaW5nIHZpYSBUYXNrRmlsdGVyVXRpbHMuXHJcbmV4cG9ydCBmdW5jdGlvbiBldmFsdWF0ZUZpbHRlck5vZGUobm9kZTogRmlsdGVyTm9kZSwgdGFzazogYW55KTogYm9vbGVhbiB7XHJcbiAgaWYgKCFub2RlIHx8ICh0eXBlb2Ygbm9kZSA9PT0gJ3N0cmluZycgJiYgbm9kZS50cmltKCkgPT09ICcnKSkgcmV0dXJuIHRydWU7XHJcbiAgY29uc3QgcSA9IHR5cGVvZiBub2RlID09PSAnc3RyaW5nJyA/IG5vZGUudG9Mb3dlckNhc2UoKSA6ICcnO1xyXG4gIGlmICghcSkgcmV0dXJuIHRydWU7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGhheXN0YWNrczogc3RyaW5nW10gPSBbXTtcclxuICAgIGlmICh0YXNrLmNvbnRlbnQpIGhheXN0YWNrcy5wdXNoKFN0cmluZyh0YXNrLmNvbnRlbnQpLnRvTG93ZXJDYXNlKCkpO1xyXG4gICAgY29uc3QgdGFncyA9IHRhc2subWV0YWRhdGE/LnRhZ3MgfHwgdGFzay50YWdzO1xyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGFncykpIGhheXN0YWNrcy5wdXNoKHRhZ3Muam9pbignICcpLnRvTG93ZXJDYXNlKCkpO1xyXG4gICAgY29uc3QgcHJvamVjdCA9IHRhc2subWV0YWRhdGE/LnByb2plY3QgfHwgdGFzay5wcm9qZWN0IHx8IHRhc2subWV0YWRhdGE/LnRnUHJvamVjdD8ubmFtZSB8fCB0YXNrLnRnUHJvamVjdDtcclxuICAgIGlmIChwcm9qZWN0KSBoYXlzdGFja3MucHVzaChTdHJpbmcocHJvamVjdCkudG9Mb3dlckNhc2UoKSk7XHJcbiAgICBjb25zdCBjb250ZXh0ID0gdGFzay5tZXRhZGF0YT8uY29udGV4dCB8fCB0YXNrLmNvbnRleHQ7XHJcbiAgICBpZiAoY29udGV4dCkgaGF5c3RhY2tzLnB1c2goU3RyaW5nKGNvbnRleHQpLnRvTG93ZXJDYXNlKCkpO1xyXG4gICAgcmV0dXJuIGhheXN0YWNrcy5zb21lKGggPT4gaC5pbmNsdWRlcyhxKSk7XHJcbiAgfSBjYXRjaCB7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFBhcnNlIHByaW9yaXR5IGV4cHJlc3Npb25zIHVzZWQgYnkgZmlsdGVyIFVJLCByZXR1cm5pbmcgYSBudW1lcmljIDEuLjUgaWYgcmVjb2duaXplZDsgb3RoZXJ3aXNlIG51bGwuXHJcbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVByaW9yaXR5RmlsdGVyVmFsdWUoaW5wdXQ6IHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCB8IG51bGwpOiBudW1iZXIgfCBudWxsIHtcclxuICBpZiAoaW5wdXQgPT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ251bWJlcicpIHJldHVybiBpbnB1dDtcclxuICBjb25zdCBzID0gU3RyaW5nKGlucHV0KS50cmltKCkudG9Mb3dlckNhc2UoKTtcclxuICBpZiAoIXMpIHJldHVybiBudWxsO1xyXG4gIGNvbnN0IG1hcDogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHtcclxuICAgIGhpZ2hlc3Q6IDUsXHJcbiAgICBoaWdoOiA0LFxyXG4gICAgbWVkaXVtOiAzLFxyXG4gICAgbm9ybWFsOiAzLFxyXG4gICAgbW9kZXJhdGU6IDMsXHJcbiAgICBsb3c6IDIsXHJcbiAgICBsb3dlc3Q6IDEsXHJcbiAgICB1cmdlbnQ6IDUsXHJcbiAgICBjcml0aWNhbDogNSxcclxuICAgIGltcG9ydGFudDogNCxcclxuICAgIG1pbm9yOiAyLFxyXG4gICAgdHJpdmlhbDogMSxcclxuICB9O1xyXG4gIGlmIChzIGluIG1hcCkgcmV0dXJuIG1hcFtzXTtcclxuICBjb25zdCBuID0gcGFyc2VJbnQocy5yZXBsYWNlKC9eIy8sICcnKSwgMTApO1xyXG4gIHJldHVybiBOdW1iZXIuaXNGaW5pdGUobikgPyBuIDogbnVsbDtcclxufVxyXG5cclxuIl19