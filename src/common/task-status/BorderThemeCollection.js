/**
 * Statuses supported by the Border theme. {@link https://github.com/Akifyss/obsidian-border?tab=readme-ov-file#alternate-checkboxes}
 * @see {@link StatusSettings.bulkAddStatusCollection}
 */
export function borderSupportedStatuses() {
    const zzz = [
        [" ", "To Do", "notStarted"],
        ["/", "In Progress", "inProgress"],
        ["x", "Done", "completed"],
        ["-", "Cancelled", "abandoned"],
        [">", "Rescheduled", "planned"],
        ["<", "Scheduled", "planned"],
        ["!", "Important", "notStarted"],
        ["?", "Question", "notStarted"],
        ["i", "Infomation", "notStarted"],
        ["S", "Amount", "notStarted"],
        ["*", "Star", "notStarted"],
        ["b", "Bookmark", "notStarted"],
        ["“", "Quote", "notStarted"],
        ["n", "Note", "notStarted"],
        ["l", "Location", "notStarted"],
        ["I", "Idea", "notStarted"],
        ["p", "Pro", "notStarted"],
        ["c", "Con", "notStarted"],
        ["u", "Up", "notStarted"],
        ["d", "Down", "notStarted"],
    ];
    return zzz;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQm9yZGVyVGhlbWVDb2xsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQm9yZGVyVGhlbWVDb2xsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUlBOzs7R0FHRztBQUNILE1BQU0sVUFBVSx1QkFBdUI7SUFDdEMsTUFBTSxHQUFHLEdBQXFCO1FBQzdCLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxZQUFZLENBQUM7UUFDNUIsQ0FBQyxHQUFHLEVBQUUsYUFBYSxFQUFFLFlBQVksQ0FBQztRQUNsQyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDO1FBQzFCLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRSxXQUFXLENBQUM7UUFDL0IsQ0FBQyxHQUFHLEVBQUUsYUFBYSxFQUFFLFNBQVMsQ0FBQztRQUMvQixDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDO1FBQzdCLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRSxZQUFZLENBQUM7UUFDaEMsQ0FBQyxHQUFHLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQztRQUMvQixDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsWUFBWSxDQUFDO1FBQ2pDLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUM7UUFDN0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQztRQUMzQixDQUFDLEdBQUcsRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDO1FBQy9CLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxZQUFZLENBQUM7UUFDNUIsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQztRQUMzQixDQUFDLEdBQUcsRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDO1FBQy9CLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUM7UUFDM0IsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQztRQUMxQixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDO1FBQzFCLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxZQUFZLENBQUM7UUFDekIsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQztLQUMzQixDQUFDO0lBQ0YsT0FBTyxHQUFHLENBQUM7QUFDWixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29kZSBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9vYnNpZGlhbi10YXNrcy1ncm91cC9vYnNpZGlhbi10YXNrcy90cmVlL21haW4vc3JjL0NvbmZpZy9UaGVtZXNcclxuLy8gT3JpZ2luYWwgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXHJcbmltcG9ydCB0eXBlIHsgU3RhdHVzQ29sbGVjdGlvbiB9IGZyb20gXCIuL1N0YXR1c0NvbGxlY3Rpb25zXCI7XHJcblxyXG4vKipcclxuICogU3RhdHVzZXMgc3VwcG9ydGVkIGJ5IHRoZSBCb3JkZXIgdGhlbWUuIHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vQWtpZnlzcy9vYnNpZGlhbi1ib3JkZXI/dGFiPXJlYWRtZS1vdi1maWxlI2FsdGVybmF0ZS1jaGVja2JveGVzfVxyXG4gKiBAc2VlIHtAbGluayBTdGF0dXNTZXR0aW5ncy5idWxrQWRkU3RhdHVzQ29sbGVjdGlvbn1cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBib3JkZXJTdXBwb3J0ZWRTdGF0dXNlcygpIHtcclxuXHRjb25zdCB6eno6IFN0YXR1c0NvbGxlY3Rpb24gPSBbXHJcblx0XHRbXCIgXCIsIFwiVG8gRG9cIiwgXCJub3RTdGFydGVkXCJdLFxyXG5cdFx0W1wiL1wiLCBcIkluIFByb2dyZXNzXCIsIFwiaW5Qcm9ncmVzc1wiXSxcclxuXHRcdFtcInhcIiwgXCJEb25lXCIsIFwiY29tcGxldGVkXCJdLFxyXG5cdFx0W1wiLVwiLCBcIkNhbmNlbGxlZFwiLCBcImFiYW5kb25lZFwiXSxcclxuXHRcdFtcIj5cIiwgXCJSZXNjaGVkdWxlZFwiLCBcInBsYW5uZWRcIl0sXHJcblx0XHRbXCI8XCIsIFwiU2NoZWR1bGVkXCIsIFwicGxhbm5lZFwiXSxcclxuXHRcdFtcIiFcIiwgXCJJbXBvcnRhbnRcIiwgXCJub3RTdGFydGVkXCJdLFxyXG5cdFx0W1wiP1wiLCBcIlF1ZXN0aW9uXCIsIFwibm90U3RhcnRlZFwiXSxcclxuXHRcdFtcImlcIiwgXCJJbmZvbWF0aW9uXCIsIFwibm90U3RhcnRlZFwiXSxcclxuXHRcdFtcIlNcIiwgXCJBbW91bnRcIiwgXCJub3RTdGFydGVkXCJdLFxyXG5cdFx0W1wiKlwiLCBcIlN0YXJcIiwgXCJub3RTdGFydGVkXCJdLFxyXG5cdFx0W1wiYlwiLCBcIkJvb2ttYXJrXCIsIFwibm90U3RhcnRlZFwiXSxcclxuXHRcdFtcIuKAnFwiLCBcIlF1b3RlXCIsIFwibm90U3RhcnRlZFwiXSxcclxuXHRcdFtcIm5cIiwgXCJOb3RlXCIsIFwibm90U3RhcnRlZFwiXSxcclxuXHRcdFtcImxcIiwgXCJMb2NhdGlvblwiLCBcIm5vdFN0YXJ0ZWRcIl0sXHJcblx0XHRbXCJJXCIsIFwiSWRlYVwiLCBcIm5vdFN0YXJ0ZWRcIl0sXHJcblx0XHRbXCJwXCIsIFwiUHJvXCIsIFwibm90U3RhcnRlZFwiXSxcclxuXHRcdFtcImNcIiwgXCJDb25cIiwgXCJub3RTdGFydGVkXCJdLFxyXG5cdFx0W1widVwiLCBcIlVwXCIsIFwibm90U3RhcnRlZFwiXSxcclxuXHRcdFtcImRcIiwgXCJEb3duXCIsIFwibm90U3RhcnRlZFwiXSxcclxuXHRdO1xyXG5cdHJldHVybiB6eno7XHJcbn1cclxuIl19