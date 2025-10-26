/**
 * Project Tree Builder
 *
 * Utilities for building hierarchical project structures from flat project lists
 */
import { getEffectiveProject } from "../utils/task/task-operations";
/**
 * Parse a project path into segments
 * @param projectName The project name/path to parse
 * @param separator The path separator (default: "/")
 * @returns Array of path segments
 */
export function parseProjectPath(projectName, separator = "/") {
    if (!projectName || !projectName.trim()) {
        return [];
    }
    // Normalize the path by trimming and removing duplicate separators
    const normalized = projectName
        .trim()
        .replace(new RegExp(`${escapeRegExp(separator)}+`, 'g'), separator)
        .replace(new RegExp(`^${escapeRegExp(separator)}|${escapeRegExp(separator)}$`, 'g'), '');
    if (!normalized) {
        return [];
    }
    return normalized.split(separator);
}
/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/**
 * Build a hierarchical tree structure from a flat map of projects
 * @param projectsMap Map of project names to task IDs
 * @returns Root node of the project tree
 */
export function buildProjectTree(projectsMap, separator = "/") {
    // Create root node
    const root = {
        id: "root",
        name: "Projects",
        fullPath: "",
        data: {
            directTaskIds: new Set(),
            allTaskIds: new Set(),
            directTaskCount: 0,
            totalTaskCount: 0
        },
        children: [],
        level: 0,
        isExpanded: true
    };
    // Build tree structure
    for (const [projectPath, taskIds] of projectsMap.entries()) {
        const segments = parseProjectPath(projectPath, separator);
        if (segments.length === 0)
            continue;
        let currentNode = root;
        let currentPath = "";
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const isLeaf = i === segments.length - 1;
            // Build the full path up to this segment
            currentPath = currentPath ? `${currentPath}${separator}${segment}` : segment;
            // Check if this child already exists
            let childNode = currentNode.children.find(child => child.name === segment);
            if (!childNode) {
                // Create new node
                childNode = {
                    id: currentPath,
                    name: segment,
                    fullPath: currentPath,
                    data: {
                        directTaskIds: isLeaf ? taskIds : new Set(),
                        allTaskIds: new Set(taskIds),
                        directTaskCount: isLeaf ? taskIds.size : 0,
                        totalTaskCount: taskIds.size // Will be updated later
                    },
                    children: [],
                    parent: currentNode,
                    level: currentNode.level + 1,
                    isExpanded: false
                };
                currentNode.children.push(childNode);
            }
            else if (isLeaf) {
                // Update existing node with direct tasks
                childNode.data.directTaskIds = taskIds;
                childNode.data.directTaskCount = taskIds.size;
            }
            currentNode = childNode;
        }
    }
    // Calculate cumulative task counts (bottom-up)
    calculateCumulativeCounts(root);
    // Sort children alphabetically at each level
    sortTreeAlphabetically(root);
    return root;
}
/**
 * Calculate cumulative task counts for all nodes
 */
function calculateCumulativeCounts(node) {
    // Start with direct tasks
    const allTaskIds = new Set(node.data.directTaskIds);
    // Add tasks from all children
    for (const child of node.children) {
        const childTaskIds = calculateCumulativeCounts(child);
        childTaskIds.forEach(id => allTaskIds.add(id));
    }
    // Update node data
    node.data.allTaskIds = allTaskIds;
    node.data.totalTaskCount = allTaskIds.size;
    return allTaskIds;
}
/**
 * Sort tree children alphabetically at each level
 */
function sortTreeAlphabetically(node) {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    // Recursively sort children
    for (const child of node.children) {
        sortTreeAlphabetically(child);
    }
}
/**
 * Build a project tree from a list of tasks
 * @param tasks List of tasks to process
 * @param separator Path separator
 * @returns Root node of the project tree
 */
export function buildProjectTreeFromTasks(tasks, separator = "/") {
    var _a;
    // Build project map
    const projectsMap = new Map();
    for (const task of tasks) {
        const projectName = getEffectiveProject(task);
        if (!projectName)
            continue;
        if (!projectsMap.has(projectName)) {
            projectsMap.set(projectName, new Set());
        }
        (_a = projectsMap.get(projectName)) === null || _a === void 0 ? void 0 : _a.add(task.id);
    }
    return buildProjectTree(projectsMap, separator);
}
/**
 * Find a node in the tree by its path
 * @param root Root node of the tree
 * @param path Path to search for
 * @returns The node if found, undefined otherwise
 */
export function findNodeByPath(root, path) {
    if (path === "" || path === root.fullPath) {
        return root;
    }
    // BFS to find the node
    const queue = [root];
    while (queue.length > 0) {
        const node = queue.shift();
        if (node.fullPath === path) {
            return node;
        }
        queue.push(...node.children);
    }
    return undefined;
}
/**
 * Get all descendant nodes of a given node
 * @param node The parent node
 * @returns Array of all descendant nodes
 */
export function getAllDescendants(node) {
    const descendants = [];
    const queue = [...node.children];
    while (queue.length > 0) {
        const current = queue.shift();
        descendants.push(current);
        queue.push(...current.children);
    }
    return descendants;
}
/**
 * Expand or collapse all nodes in the tree
 * @param root Root node of the tree
 * @param expanded Whether to expand (true) or collapse (false)
 */
export function setAllNodesExpanded(root, expanded) {
    const queue = [root];
    while (queue.length > 0) {
        const node = queue.shift();
        node.isExpanded = expanded;
        queue.push(...node.children);
    }
}
/**
 * Get paths of all expanded nodes
 * @param root Root node of the tree
 * @returns Set of expanded node paths
 */
export function getExpandedPaths(root) {
    const expandedPaths = new Set();
    const queue = [root];
    while (queue.length > 0) {
        const node = queue.shift();
        if (node.isExpanded && node.fullPath !== "") {
            expandedPaths.add(node.fullPath);
        }
        queue.push(...node.children);
    }
    return expandedPaths;
}
/**
 * Restore expanded state from a set of paths
 * @param root Root node of the tree
 * @param expandedPaths Set of paths that should be expanded
 */
export function restoreExpandedState(root, expandedPaths) {
    const queue = [root];
    while (queue.length > 0) {
        const node = queue.shift();
        node.isExpanded = expandedPaths.has(node.fullPath) || node.fullPath === "";
        queue.push(...node.children);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC10cmVlLWJ1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwcm9qZWN0LXRyZWUtYnVpbGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OztHQUlHO0FBSUgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFcEU7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsV0FBbUIsRUFBRSxZQUFvQixHQUFHO0lBQzVFLElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDeEMsT0FBTyxFQUFFLENBQUM7S0FDVjtJQUVELG1FQUFtRTtJQUNuRSxNQUFNLFVBQVUsR0FBRyxXQUFXO1NBQzVCLElBQUksRUFBRTtTQUNOLE9BQU8sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQztTQUNsRSxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFMUYsSUFBSSxDQUFDLFVBQVUsRUFBRTtRQUNoQixPQUFPLEVBQUUsQ0FBQztLQUNWO0lBRUQsT0FBTyxVQUFVLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3BDLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsWUFBWSxDQUFDLE1BQWM7SUFDbkMsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3RELENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLGdCQUFnQixDQUMvQixXQUFxQyxFQUNyQyxZQUFvQixHQUFHO0lBRXZCLG1CQUFtQjtJQUNuQixNQUFNLElBQUksR0FB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QztLQUM3QjtJQUVELE9BQU8sYUFBYSxDQUFDO0FBQ3RCLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLG9CQUFvQixDQUNuQyxJQUErQixFQUMvQixhQUEwQjtJQUUxQixNQUFNLEtBQUssR0FBZ0MsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUVsRCxPQUFPLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3hCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUcsQ0FBQztRQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssRUFBRSxDQUFDO1FBQzNFLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDN0I7QUFDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFByb2plY3QgVHJlZSBCdWlsZGVyXHJcbiAqIFxyXG4gKiBVdGlsaXRpZXMgZm9yIGJ1aWxkaW5nIGhpZXJhcmNoaWNhbCBwcm9qZWN0IHN0cnVjdHVyZXMgZnJvbSBmbGF0IHByb2plY3QgbGlzdHNcclxuICovXHJcblxyXG5pbXBvcnQgeyBUcmVlTm9kZSwgUHJvamVjdE5vZGVEYXRhIH0gZnJvbSBcIi4uL3R5cGVzL3RyZWVcIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCIuLi90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IGdldEVmZmVjdGl2ZVByb2plY3QgfSBmcm9tIFwiLi4vdXRpbHMvdGFzay90YXNrLW9wZXJhdGlvbnNcIjtcclxuXHJcbi8qKlxyXG4gKiBQYXJzZSBhIHByb2plY3QgcGF0aCBpbnRvIHNlZ21lbnRzXHJcbiAqIEBwYXJhbSBwcm9qZWN0TmFtZSBUaGUgcHJvamVjdCBuYW1lL3BhdGggdG8gcGFyc2VcclxuICogQHBhcmFtIHNlcGFyYXRvciBUaGUgcGF0aCBzZXBhcmF0b3IgKGRlZmF1bHQ6IFwiL1wiKVxyXG4gKiBAcmV0dXJucyBBcnJheSBvZiBwYXRoIHNlZ21lbnRzXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VQcm9qZWN0UGF0aChwcm9qZWN0TmFtZTogc3RyaW5nLCBzZXBhcmF0b3I6IHN0cmluZyA9IFwiL1wiKTogc3RyaW5nW10ge1xyXG5cdGlmICghcHJvamVjdE5hbWUgfHwgIXByb2plY3ROYW1lLnRyaW0oKSkge1xyXG5cdFx0cmV0dXJuIFtdO1xyXG5cdH1cclxuXHRcclxuXHQvLyBOb3JtYWxpemUgdGhlIHBhdGggYnkgdHJpbW1pbmcgYW5kIHJlbW92aW5nIGR1cGxpY2F0ZSBzZXBhcmF0b3JzXHJcblx0Y29uc3Qgbm9ybWFsaXplZCA9IHByb2plY3ROYW1lXHJcblx0XHQudHJpbSgpXHJcblx0XHQucmVwbGFjZShuZXcgUmVnRXhwKGAke2VzY2FwZVJlZ0V4cChzZXBhcmF0b3IpfStgLCAnZycpLCBzZXBhcmF0b3IpXHJcblx0XHQucmVwbGFjZShuZXcgUmVnRXhwKGBeJHtlc2NhcGVSZWdFeHAoc2VwYXJhdG9yKX18JHtlc2NhcGVSZWdFeHAoc2VwYXJhdG9yKX0kYCwgJ2cnKSwgJycpO1xyXG5cdFxyXG5cdGlmICghbm9ybWFsaXplZCkge1xyXG5cdFx0cmV0dXJuIFtdO1xyXG5cdH1cclxuXHRcclxuXHRyZXR1cm4gbm9ybWFsaXplZC5zcGxpdChzZXBhcmF0b3IpO1xyXG59XHJcblxyXG4vKipcclxuICogRXNjYXBlIHNwZWNpYWwgcmVnZXggY2hhcmFjdGVycyBpbiBhIHN0cmluZ1xyXG4gKi9cclxuZnVuY3Rpb24gZXNjYXBlUmVnRXhwKHN0cmluZzogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRyZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCAnXFxcXCQmJyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBCdWlsZCBhIGhpZXJhcmNoaWNhbCB0cmVlIHN0cnVjdHVyZSBmcm9tIGEgZmxhdCBtYXAgb2YgcHJvamVjdHNcclxuICogQHBhcmFtIHByb2plY3RzTWFwIE1hcCBvZiBwcm9qZWN0IG5hbWVzIHRvIHRhc2sgSURzXHJcbiAqIEByZXR1cm5zIFJvb3Qgbm9kZSBvZiB0aGUgcHJvamVjdCB0cmVlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRQcm9qZWN0VHJlZShcclxuXHRwcm9qZWN0c01hcDogTWFwPHN0cmluZywgU2V0PHN0cmluZz4+LFxyXG5cdHNlcGFyYXRvcjogc3RyaW5nID0gXCIvXCJcclxuKTogVHJlZU5vZGU8UHJvamVjdE5vZGVEYXRhPiB7XHJcblx0Ly8gQ3JlYXRlIHJvb3Qgbm9kZVxyXG5cdGNvbnN0IHJvb3Q6IFRyZWVOb2RlPFByb2plY3ROb2RlRGF0YT4gPSB7XHJcblx0XHRpZDogXCJyb290XCIsXHJcblx0XHRuYW1lOiBcIlByb2plY3RzXCIsXHJcblx0XHRmdWxsUGF0aDogXCJcIixcclxuXHRcdGRhdGE6IHtcclxuXHRcdFx0ZGlyZWN0VGFza0lkczogbmV3IFNldCgpLFxyXG5cdFx0XHRhbGxUYXNrSWRzOiBuZXcgU2V0KCksXHJcblx0XHRcdGRpcmVjdFRhc2tDb3VudDogMCxcclxuXHRcdFx0dG90YWxUYXNrQ291bnQ6IDBcclxuXHRcdH0sXHJcblx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRsZXZlbDogMCxcclxuXHRcdGlzRXhwYW5kZWQ6IHRydWVcclxuXHR9O1xyXG5cdFxyXG5cdC8vIEJ1aWxkIHRyZWUgc3RydWN0dXJlXHJcblx0Zm9yIChjb25zdCBbcHJvamVjdFBhdGgsIHRhc2tJZHNdIG9mIHByb2plY3RzTWFwLmVudHJpZXMoKSkge1xyXG5cdFx0Y29uc3Qgc2VnbWVudHMgPSBwYXJzZVByb2plY3RQYXRoKHByb2plY3RQYXRoLCBzZXBhcmF0b3IpO1xyXG5cdFx0aWYgKHNlZ21lbnRzLmxlbmd0aCA9PT0gMCkgY29udGludWU7XHJcblx0XHRcclxuXHRcdGxldCBjdXJyZW50Tm9kZSA9IHJvb3Q7XHJcblx0XHRsZXQgY3VycmVudFBhdGggPSBcIlwiO1xyXG5cdFx0XHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHNlZ21lbnRzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGNvbnN0IHNlZ21lbnQgPSBzZWdtZW50c1tpXTtcclxuXHRcdFx0Y29uc3QgaXNMZWFmID0gaSA9PT0gc2VnbWVudHMubGVuZ3RoIC0gMTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIEJ1aWxkIHRoZSBmdWxsIHBhdGggdXAgdG8gdGhpcyBzZWdtZW50XHJcblx0XHRcdGN1cnJlbnRQYXRoID0gY3VycmVudFBhdGggPyBgJHtjdXJyZW50UGF0aH0ke3NlcGFyYXRvcn0ke3NlZ21lbnR9YCA6IHNlZ21lbnQ7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBDaGVjayBpZiB0aGlzIGNoaWxkIGFscmVhZHkgZXhpc3RzXHJcblx0XHRcdGxldCBjaGlsZE5vZGUgPSBjdXJyZW50Tm9kZS5jaGlsZHJlbi5maW5kKGNoaWxkID0+IGNoaWxkLm5hbWUgPT09IHNlZ21lbnQpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKCFjaGlsZE5vZGUpIHtcclxuXHRcdFx0XHQvLyBDcmVhdGUgbmV3IG5vZGVcclxuXHRcdFx0XHRjaGlsZE5vZGUgPSB7XHJcblx0XHRcdFx0XHRpZDogY3VycmVudFBhdGgsXHJcblx0XHRcdFx0XHRuYW1lOiBzZWdtZW50LFxyXG5cdFx0XHRcdFx0ZnVsbFBhdGg6IGN1cnJlbnRQYXRoLFxyXG5cdFx0XHRcdFx0ZGF0YToge1xyXG5cdFx0XHRcdFx0XHRkaXJlY3RUYXNrSWRzOiBpc0xlYWYgPyB0YXNrSWRzIDogbmV3IFNldCgpLFxyXG5cdFx0XHRcdFx0XHRhbGxUYXNrSWRzOiBuZXcgU2V0KHRhc2tJZHMpLCAvLyBXaWxsIGJlIHVwZGF0ZWQgbGF0ZXJcclxuXHRcdFx0XHRcdFx0ZGlyZWN0VGFza0NvdW50OiBpc0xlYWYgPyB0YXNrSWRzLnNpemUgOiAwLFxyXG5cdFx0XHRcdFx0XHR0b3RhbFRhc2tDb3VudDogdGFza0lkcy5zaXplIC8vIFdpbGwgYmUgdXBkYXRlZCBsYXRlclxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdHBhcmVudDogY3VycmVudE5vZGUsXHJcblx0XHRcdFx0XHRsZXZlbDogY3VycmVudE5vZGUubGV2ZWwgKyAxLFxyXG5cdFx0XHRcdFx0aXNFeHBhbmRlZDogZmFsc2VcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGN1cnJlbnROb2RlLmNoaWxkcmVuLnB1c2goY2hpbGROb2RlKTtcclxuXHRcdFx0fSBlbHNlIGlmIChpc0xlYWYpIHtcclxuXHRcdFx0XHQvLyBVcGRhdGUgZXhpc3Rpbmcgbm9kZSB3aXRoIGRpcmVjdCB0YXNrc1xyXG5cdFx0XHRcdGNoaWxkTm9kZS5kYXRhLmRpcmVjdFRhc2tJZHMgPSB0YXNrSWRzO1xyXG5cdFx0XHRcdGNoaWxkTm9kZS5kYXRhLmRpcmVjdFRhc2tDb3VudCA9IHRhc2tJZHMuc2l6ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Y3VycmVudE5vZGUgPSBjaGlsZE5vZGU7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdC8vIENhbGN1bGF0ZSBjdW11bGF0aXZlIHRhc2sgY291bnRzIChib3R0b20tdXApXHJcblx0Y2FsY3VsYXRlQ3VtdWxhdGl2ZUNvdW50cyhyb290KTtcclxuXHRcclxuXHQvLyBTb3J0IGNoaWxkcmVuIGFscGhhYmV0aWNhbGx5IGF0IGVhY2ggbGV2ZWxcclxuXHRzb3J0VHJlZUFscGhhYmV0aWNhbGx5KHJvb3QpO1xyXG5cdFxyXG5cdHJldHVybiByb290O1xyXG59XHJcblxyXG4vKipcclxuICogQ2FsY3VsYXRlIGN1bXVsYXRpdmUgdGFzayBjb3VudHMgZm9yIGFsbCBub2Rlc1xyXG4gKi9cclxuZnVuY3Rpb24gY2FsY3VsYXRlQ3VtdWxhdGl2ZUNvdW50cyhub2RlOiBUcmVlTm9kZTxQcm9qZWN0Tm9kZURhdGE+KTogU2V0PHN0cmluZz4ge1xyXG5cdC8vIFN0YXJ0IHdpdGggZGlyZWN0IHRhc2tzXHJcblx0Y29uc3QgYWxsVGFza0lkcyA9IG5ldyBTZXQobm9kZS5kYXRhLmRpcmVjdFRhc2tJZHMpO1xyXG5cdFxyXG5cdC8vIEFkZCB0YXNrcyBmcm9tIGFsbCBjaGlsZHJlblxyXG5cdGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xyXG5cdFx0Y29uc3QgY2hpbGRUYXNrSWRzID0gY2FsY3VsYXRlQ3VtdWxhdGl2ZUNvdW50cyhjaGlsZCk7XHJcblx0XHRjaGlsZFRhc2tJZHMuZm9yRWFjaChpZCA9PiBhbGxUYXNrSWRzLmFkZChpZCkpO1xyXG5cdH1cclxuXHRcclxuXHQvLyBVcGRhdGUgbm9kZSBkYXRhXHJcblx0bm9kZS5kYXRhLmFsbFRhc2tJZHMgPSBhbGxUYXNrSWRzO1xyXG5cdG5vZGUuZGF0YS50b3RhbFRhc2tDb3VudCA9IGFsbFRhc2tJZHMuc2l6ZTtcclxuXHRcclxuXHRyZXR1cm4gYWxsVGFza0lkcztcclxufVxyXG5cclxuLyoqXHJcbiAqIFNvcnQgdHJlZSBjaGlsZHJlbiBhbHBoYWJldGljYWxseSBhdCBlYWNoIGxldmVsXHJcbiAqL1xyXG5mdW5jdGlvbiBzb3J0VHJlZUFscGhhYmV0aWNhbGx5KG5vZGU6IFRyZWVOb2RlPFByb2plY3ROb2RlRGF0YT4pOiB2b2lkIHtcclxuXHRub2RlLmNoaWxkcmVuLnNvcnQoKGEsIGIpID0+IGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSkpO1xyXG5cdFxyXG5cdC8vIFJlY3Vyc2l2ZWx5IHNvcnQgY2hpbGRyZW5cclxuXHRmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcclxuXHRcdHNvcnRUcmVlQWxwaGFiZXRpY2FsbHkoY2hpbGQpO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEJ1aWxkIGEgcHJvamVjdCB0cmVlIGZyb20gYSBsaXN0IG9mIHRhc2tzXHJcbiAqIEBwYXJhbSB0YXNrcyBMaXN0IG9mIHRhc2tzIHRvIHByb2Nlc3NcclxuICogQHBhcmFtIHNlcGFyYXRvciBQYXRoIHNlcGFyYXRvclxyXG4gKiBAcmV0dXJucyBSb290IG5vZGUgb2YgdGhlIHByb2plY3QgdHJlZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkUHJvamVjdFRyZWVGcm9tVGFza3MoXHJcblx0dGFza3M6IFRhc2tbXSxcclxuXHRzZXBhcmF0b3I6IHN0cmluZyA9IFwiL1wiXHJcbik6IFRyZWVOb2RlPFByb2plY3ROb2RlRGF0YT4ge1xyXG5cdC8vIEJ1aWxkIHByb2plY3QgbWFwXHJcblx0Y29uc3QgcHJvamVjdHNNYXAgPSBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCk7XHJcblx0XHJcblx0Zm9yIChjb25zdCB0YXNrIG9mIHRhc2tzKSB7XHJcblx0XHRjb25zdCBwcm9qZWN0TmFtZSA9IGdldEVmZmVjdGl2ZVByb2plY3QodGFzayk7XHJcblx0XHRpZiAoIXByb2plY3ROYW1lKSBjb250aW51ZTtcclxuXHRcdFxyXG5cdFx0aWYgKCFwcm9qZWN0c01hcC5oYXMocHJvamVjdE5hbWUpKSB7XHJcblx0XHRcdHByb2plY3RzTWFwLnNldChwcm9qZWN0TmFtZSwgbmV3IFNldCgpKTtcclxuXHRcdH1cclxuXHRcdHByb2plY3RzTWFwLmdldChwcm9qZWN0TmFtZSk/LmFkZCh0YXNrLmlkKTtcclxuXHR9XHJcblx0XHJcblx0cmV0dXJuIGJ1aWxkUHJvamVjdFRyZWUocHJvamVjdHNNYXAsIHNlcGFyYXRvcik7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGaW5kIGEgbm9kZSBpbiB0aGUgdHJlZSBieSBpdHMgcGF0aFxyXG4gKiBAcGFyYW0gcm9vdCBSb290IG5vZGUgb2YgdGhlIHRyZWVcclxuICogQHBhcmFtIHBhdGggUGF0aCB0byBzZWFyY2ggZm9yXHJcbiAqIEByZXR1cm5zIFRoZSBub2RlIGlmIGZvdW5kLCB1bmRlZmluZWQgb3RoZXJ3aXNlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmluZE5vZGVCeVBhdGgoXHJcblx0cm9vdDogVHJlZU5vZGU8UHJvamVjdE5vZGVEYXRhPixcclxuXHRwYXRoOiBzdHJpbmdcclxuKTogVHJlZU5vZGU8UHJvamVjdE5vZGVEYXRhPiB8IHVuZGVmaW5lZCB7XHJcblx0aWYgKHBhdGggPT09IFwiXCIgfHwgcGF0aCA9PT0gcm9vdC5mdWxsUGF0aCkge1xyXG5cdFx0cmV0dXJuIHJvb3Q7XHJcblx0fVxyXG5cdFxyXG5cdC8vIEJGUyB0byBmaW5kIHRoZSBub2RlXHJcblx0Y29uc3QgcXVldWU6IFRyZWVOb2RlPFByb2plY3ROb2RlRGF0YT5bXSA9IFtyb290XTtcclxuXHRcclxuXHR3aGlsZSAocXVldWUubGVuZ3RoID4gMCkge1xyXG5cdFx0Y29uc3Qgbm9kZSA9IHF1ZXVlLnNoaWZ0KCkhO1xyXG5cdFx0XHJcblx0XHRpZiAobm9kZS5mdWxsUGF0aCA9PT0gcGF0aCkge1xyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0cXVldWUucHVzaCguLi5ub2RlLmNoaWxkcmVuKTtcclxuXHR9XHJcblx0XHJcblx0cmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBhbGwgZGVzY2VuZGFudCBub2RlcyBvZiBhIGdpdmVuIG5vZGVcclxuICogQHBhcmFtIG5vZGUgVGhlIHBhcmVudCBub2RlXHJcbiAqIEByZXR1cm5zIEFycmF5IG9mIGFsbCBkZXNjZW5kYW50IG5vZGVzXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsRGVzY2VuZGFudHMoXHJcblx0bm9kZTogVHJlZU5vZGU8UHJvamVjdE5vZGVEYXRhPlxyXG4pOiBUcmVlTm9kZTxQcm9qZWN0Tm9kZURhdGE+W10ge1xyXG5cdGNvbnN0IGRlc2NlbmRhbnRzOiBUcmVlTm9kZTxQcm9qZWN0Tm9kZURhdGE+W10gPSBbXTtcclxuXHRjb25zdCBxdWV1ZSA9IFsuLi5ub2RlLmNoaWxkcmVuXTtcclxuXHRcclxuXHR3aGlsZSAocXVldWUubGVuZ3RoID4gMCkge1xyXG5cdFx0Y29uc3QgY3VycmVudCA9IHF1ZXVlLnNoaWZ0KCkhO1xyXG5cdFx0ZGVzY2VuZGFudHMucHVzaChjdXJyZW50KTtcclxuXHRcdHF1ZXVlLnB1c2goLi4uY3VycmVudC5jaGlsZHJlbik7XHJcblx0fVxyXG5cdFxyXG5cdHJldHVybiBkZXNjZW5kYW50cztcclxufVxyXG5cclxuLyoqXHJcbiAqIEV4cGFuZCBvciBjb2xsYXBzZSBhbGwgbm9kZXMgaW4gdGhlIHRyZWVcclxuICogQHBhcmFtIHJvb3QgUm9vdCBub2RlIG9mIHRoZSB0cmVlXHJcbiAqIEBwYXJhbSBleHBhbmRlZCBXaGV0aGVyIHRvIGV4cGFuZCAodHJ1ZSkgb3IgY29sbGFwc2UgKGZhbHNlKVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHNldEFsbE5vZGVzRXhwYW5kZWQoXHJcblx0cm9vdDogVHJlZU5vZGU8UHJvamVjdE5vZGVEYXRhPixcclxuXHRleHBhbmRlZDogYm9vbGVhblxyXG4pOiB2b2lkIHtcclxuXHRjb25zdCBxdWV1ZTogVHJlZU5vZGU8UHJvamVjdE5vZGVEYXRhPltdID0gW3Jvb3RdO1xyXG5cdFxyXG5cdHdoaWxlIChxdWV1ZS5sZW5ndGggPiAwKSB7XHJcblx0XHRjb25zdCBub2RlID0gcXVldWUuc2hpZnQoKSE7XHJcblx0XHRub2RlLmlzRXhwYW5kZWQgPSBleHBhbmRlZDtcclxuXHRcdHF1ZXVlLnB1c2goLi4ubm9kZS5jaGlsZHJlbik7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogR2V0IHBhdGhzIG9mIGFsbCBleHBhbmRlZCBub2Rlc1xyXG4gKiBAcGFyYW0gcm9vdCBSb290IG5vZGUgb2YgdGhlIHRyZWVcclxuICogQHJldHVybnMgU2V0IG9mIGV4cGFuZGVkIG5vZGUgcGF0aHNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHBhbmRlZFBhdGhzKHJvb3Q6IFRyZWVOb2RlPFByb2plY3ROb2RlRGF0YT4pOiBTZXQ8c3RyaW5nPiB7XHJcblx0Y29uc3QgZXhwYW5kZWRQYXRocyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cdGNvbnN0IHF1ZXVlOiBUcmVlTm9kZTxQcm9qZWN0Tm9kZURhdGE+W10gPSBbcm9vdF07XHJcblx0XHJcblx0d2hpbGUgKHF1ZXVlLmxlbmd0aCA+IDApIHtcclxuXHRcdGNvbnN0IG5vZGUgPSBxdWV1ZS5zaGlmdCgpITtcclxuXHRcdGlmIChub2RlLmlzRXhwYW5kZWQgJiYgbm9kZS5mdWxsUGF0aCAhPT0gXCJcIikge1xyXG5cdFx0XHRleHBhbmRlZFBhdGhzLmFkZChub2RlLmZ1bGxQYXRoKTtcclxuXHRcdH1cclxuXHRcdHF1ZXVlLnB1c2goLi4ubm9kZS5jaGlsZHJlbik7XHJcblx0fVxyXG5cdFxyXG5cdHJldHVybiBleHBhbmRlZFBhdGhzO1xyXG59XHJcblxyXG4vKipcclxuICogUmVzdG9yZSBleHBhbmRlZCBzdGF0ZSBmcm9tIGEgc2V0IG9mIHBhdGhzXHJcbiAqIEBwYXJhbSByb290IFJvb3Qgbm9kZSBvZiB0aGUgdHJlZVxyXG4gKiBAcGFyYW0gZXhwYW5kZWRQYXRocyBTZXQgb2YgcGF0aHMgdGhhdCBzaG91bGQgYmUgZXhwYW5kZWRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZXN0b3JlRXhwYW5kZWRTdGF0ZShcclxuXHRyb290OiBUcmVlTm9kZTxQcm9qZWN0Tm9kZURhdGE+LFxyXG5cdGV4cGFuZGVkUGF0aHM6IFNldDxzdHJpbmc+XHJcbik6IHZvaWQge1xyXG5cdGNvbnN0IHF1ZXVlOiBUcmVlTm9kZTxQcm9qZWN0Tm9kZURhdGE+W10gPSBbcm9vdF07XHJcblx0XHJcblx0d2hpbGUgKHF1ZXVlLmxlbmd0aCA+IDApIHtcclxuXHRcdGNvbnN0IG5vZGUgPSBxdWV1ZS5zaGlmdCgpITtcclxuXHRcdG5vZGUuaXNFeHBhbmRlZCA9IGV4cGFuZGVkUGF0aHMuaGFzKG5vZGUuZnVsbFBhdGgpIHx8IG5vZGUuZnVsbFBhdGggPT09IFwiXCI7XHJcblx0XHRxdWV1ZS5wdXNoKC4uLm5vZGUuY2hpbGRyZW4pO1xyXG5cdH1cclxufSJdfQ==