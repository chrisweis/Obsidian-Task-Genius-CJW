// Code from https://github.com/obsidian-tasks-group/obsidian-tasks/tree/main/src/Config/Themes
// Original code is licensed under the MIT License.
/**
 * Status supported by the Aura theme. {@link https://github.com/ashwinjadhav818/obsidian-aura}
 * @see {@link StatusSettings.bulkAddStatusCollection}
 */
export function auraSupportedStatuses() {
    const zzz = [
        [" ", "incomplete", "notStarted"],
        ["x", "complete / done", "completed"],
        ["-", "cancelled", "abandoned"],
        [">", "deferred", "planned"],
        ["/", "in progress, or half-done", "inProgress"],
        ["!", "Important", "notStarted"],
        ["?", "question", "notStarted"],
        ["R", "review", "notStarted"],
        ["+", "Inbox / task that should be processed later", "notStarted"],
        ["b", "bookmark", "notStarted"],
        ["B", "brainstorm", "notStarted"],
        ["D", "deferred or scheduled", "planned"],
        ["I", "Info", "notStarted"],
        ["i", "idea", "notStarted"],
        ["N", "note", "notStarted"],
        ["Q", "quote", "notStarted"],
        ["W", "win / success / reward", "notStarted"],
        ["P", "pro", "notStarted"],
        ["C", "con", "notStarted"],
    ];
    return zzz;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXVyYVRoZW1lQ29sbGVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkF1cmFUaGVtZUNvbGxlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsK0ZBQStGO0FBQy9GLG1EQUFtRDtBQUluRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUscUJBQXFCO0lBQ3BDLE1BQU0sR0FBRyxHQUFxQjtRQUM3QixDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsWUFBWSxDQUFDO1FBQ2pDLENBQUMsR0FBRyxFQUFFLGlCQUFpQixFQUFFLFdBQVcsQ0FBQztRQUNyQyxDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUUsV0FBVyxDQUFDO1FBQy9CLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRSxTQUFTLENBQUM7UUFDNUIsQ0FBQyxHQUFHLEVBQUUsMkJBQTJCLEVBQUUsWUFBWSxDQUFDO1FBQ2hELENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRSxZQUFZLENBQUM7UUFDaEMsQ0FBQyxHQUFHLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQztRQUMvQixDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDO1FBQzdCLENBQUMsR0FBRyxFQUFFLDZDQUE2QyxFQUFFLFlBQVksQ0FBQztRQUNsRSxDQUFDLEdBQUcsRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDO1FBQy9CLENBQUMsR0FBRyxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUM7UUFDakMsQ0FBQyxHQUFHLEVBQUUsdUJBQXVCLEVBQUUsU0FBUyxDQUFDO1FBQ3pDLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUM7UUFDM0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQztRQUMzQixDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDO1FBQzNCLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxZQUFZLENBQUM7UUFDNUIsQ0FBQyxHQUFHLEVBQUUsd0JBQXdCLEVBQUUsWUFBWSxDQUFDO1FBQzdDLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxZQUFZLENBQUM7UUFDMUIsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQztLQUMxQixDQUFDO0lBQ0YsT0FBTyxHQUFHLENBQUM7QUFDWixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29kZSBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9vYnNpZGlhbi10YXNrcy1ncm91cC9vYnNpZGlhbi10YXNrcy90cmVlL21haW4vc3JjL0NvbmZpZy9UaGVtZXNcclxuLy8gT3JpZ2luYWwgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXHJcblxyXG5pbXBvcnQgdHlwZSB7IFN0YXR1c0NvbGxlY3Rpb24gfSBmcm9tIFwiLi9TdGF0dXNDb2xsZWN0aW9uc1wiO1xyXG5cclxuLyoqXHJcbiAqIFN0YXR1cyBzdXBwb3J0ZWQgYnkgdGhlIEF1cmEgdGhlbWUuIHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vYXNod2luamFkaGF2ODE4L29ic2lkaWFuLWF1cmF9XHJcbiAqIEBzZWUge0BsaW5rIFN0YXR1c1NldHRpbmdzLmJ1bGtBZGRTdGF0dXNDb2xsZWN0aW9ufVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGF1cmFTdXBwb3J0ZWRTdGF0dXNlcygpIHtcclxuXHRjb25zdCB6eno6IFN0YXR1c0NvbGxlY3Rpb24gPSBbXHJcblx0XHRbXCIgXCIsIFwiaW5jb21wbGV0ZVwiLCBcIm5vdFN0YXJ0ZWRcIl0sXHJcblx0XHRbXCJ4XCIsIFwiY29tcGxldGUgLyBkb25lXCIsIFwiY29tcGxldGVkXCJdLFxyXG5cdFx0W1wiLVwiLCBcImNhbmNlbGxlZFwiLCBcImFiYW5kb25lZFwiXSxcclxuXHRcdFtcIj5cIiwgXCJkZWZlcnJlZFwiLCBcInBsYW5uZWRcIl0sXHJcblx0XHRbXCIvXCIsIFwiaW4gcHJvZ3Jlc3MsIG9yIGhhbGYtZG9uZVwiLCBcImluUHJvZ3Jlc3NcIl0sXHJcblx0XHRbXCIhXCIsIFwiSW1wb3J0YW50XCIsIFwibm90U3RhcnRlZFwiXSxcclxuXHRcdFtcIj9cIiwgXCJxdWVzdGlvblwiLCBcIm5vdFN0YXJ0ZWRcIl0sXHJcblx0XHRbXCJSXCIsIFwicmV2aWV3XCIsIFwibm90U3RhcnRlZFwiXSxcclxuXHRcdFtcIitcIiwgXCJJbmJveCAvIHRhc2sgdGhhdCBzaG91bGQgYmUgcHJvY2Vzc2VkIGxhdGVyXCIsIFwibm90U3RhcnRlZFwiXSxcclxuXHRcdFtcImJcIiwgXCJib29rbWFya1wiLCBcIm5vdFN0YXJ0ZWRcIl0sXHJcblx0XHRbXCJCXCIsIFwiYnJhaW5zdG9ybVwiLCBcIm5vdFN0YXJ0ZWRcIl0sXHJcblx0XHRbXCJEXCIsIFwiZGVmZXJyZWQgb3Igc2NoZWR1bGVkXCIsIFwicGxhbm5lZFwiXSxcclxuXHRcdFtcIklcIiwgXCJJbmZvXCIsIFwibm90U3RhcnRlZFwiXSxcclxuXHRcdFtcImlcIiwgXCJpZGVhXCIsIFwibm90U3RhcnRlZFwiXSxcclxuXHRcdFtcIk5cIiwgXCJub3RlXCIsIFwibm90U3RhcnRlZFwiXSxcclxuXHRcdFtcIlFcIiwgXCJxdW90ZVwiLCBcIm5vdFN0YXJ0ZWRcIl0sXHJcblx0XHRbXCJXXCIsIFwid2luIC8gc3VjY2VzcyAvIHJld2FyZFwiLCBcIm5vdFN0YXJ0ZWRcIl0sXHJcblx0XHRbXCJQXCIsIFwicHJvXCIsIFwibm90U3RhcnRlZFwiXSxcclxuXHRcdFtcIkNcIiwgXCJjb25cIiwgXCJub3RTdGFydGVkXCJdLFxyXG5cdF07XHJcblx0cmV0dXJuIHp6ejtcclxufVxyXG4iXX0=