import { around, dedupe } from "monkey-around";
import { Workspace } from "obsidian";
// Use WeakMap to avoid attaching arbitrary properties to Workspace instances
const RESTRICT_DND_STATE = new WeakMap();
const setRestrictState = (ws, val) => {
    if (ws)
        RESTRICT_DND_STATE.set(ws, !!val);
};
const getRestrictState = (ws) => {
    return !!(ws && RESTRICT_DND_STATE.get(ws));
};
/** View types that should never be drag-moved to the center panel. */
const RESTRICTED_VIEW_TYPES = new Set([
    "tg-left-sidebar",
    "tg-right-detail",
    "tg-timeline-sidebar-view",
]);
/** Allow other modules to add more restricted view types at runtime. */
export function registerRestrictedDnDViewTypes(...types) {
    for (const t of types)
        if (t)
            RESTRICTED_VIEW_TYPES.add(t);
}
function isRestrictedLeaf(leaf) {
    var _a, _b;
    try {
        const vt = (_b = (_a = leaf === null || leaf === void 0 ? void 0 : leaf.view) === null || _a === void 0 ? void 0 : _a.getViewType) === null || _b === void 0 ? void 0 : _b.call(_a);
        return typeof vt === "string" && RESTRICTED_VIEW_TYPES.has(vt);
    }
    catch (_c) {
        return false;
    }
}
/** Unique keys for deduping patches across plugins */
const KEY_ON_DRAG = "task-genius/workspace-dnd:onDragLeaf";
const KEY_GET_DROP = "task-genius/workspace-dnd:getDropLocation";
/**
 * Install a runtime monkey-patch for Obsidian's internal drag handling,
 * using monkey-around for co-operative, removable patches.
 */
export function installWorkspaceDragMonitor(plugin) {
    const unpatch = around(Workspace.prototype, {
        onDragLeaf(old) {
            return dedupe(KEY_ON_DRAG, old, function (e, leaf) {
                var _a, _b;
                const restricted = isRestrictedLeaf(leaf);
                // Mark workspace as currently dragging a restricted leaf until drop/dragend
                if (restricted)
                    setRestrictState(this, true);
                if (restricted) {
                    const vt = (_b = (_a = leaf === null || leaf === void 0 ? void 0 : leaf.view) === null || _a === void 0 ? void 0 : _a.getViewType) === null || _b === void 0 ? void 0 : _b.call(_a);
                    console.debug("[TG][MonkeyPatch] onDragLeaf(restricted)", vt);
                }
                else {
                    console.debug("[TG][MonkeyPatch] onDragLeaf");
                }
                // Install one-shot cleanup on drop/dragend
                const ws = this;
                if (restricted) {
                    const cleanup = () => {
                        setRestrictState(ws, false);
                        window.removeEventListener("dragend", cleanup, true);
                        window.removeEventListener("drop", cleanup, true);
                    };
                    window.addEventListener("dragend", cleanup, true);
                    window.addEventListener("drop", cleanup, true);
                }
                return old && old.apply(this, [e, leaf]);
            });
        },
        getDropLocation(old) {
            return dedupe(KEY_GET_DROP, old, function (...args) {
                const target = old && old.apply(this, args);
                try {
                    if (getRestrictState(this) && target) {
                        const root = typeof (target === null || target === void 0 ? void 0 : target.getRoot) === "function" ? target.getRoot() : undefined;
                        const isCenterRegion = root && root === this.rootSplit && target !== this.leftSplit && target !== this.rightSplit;
                        if (isCenterRegion) {
                            console.debug("[TG][MonkeyPatch] Blocked center drop location for restricted leaf");
                            return null;
                        }
                    }
                }
                catch (err) {
                    console.warn("[TG][MonkeyPatch] getDropLocation patch error", err);
                }
                return target;
            });
        },
    });
    plugin.register(unpatch);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlLWRuZC1wYXRjaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndvcmtzcGFjZS1kbmQtcGF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDL0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUVyQyw2RUFBNkU7QUFDN0UsTUFBTSxrQkFBa0IsR0FBMEIsSUFBSSxPQUFPLEVBQUUsQ0FBQztBQUNoRSxNQUFNLGdCQUFnQixHQUFHLENBQUMsRUFBTyxFQUFFLEdBQVksRUFBRSxFQUFFO0lBQ2xELElBQUksRUFBRTtRQUFFLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQztBQUNGLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxFQUFPLEVBQVcsRUFBRTtJQUM3QyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQUM7QUFFRixzRUFBc0U7QUFDdEUsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLEdBQUcsQ0FBUztJQUM3QyxpQkFBaUI7SUFDakIsaUJBQWlCO0lBQ2pCLDBCQUEwQjtDQUMxQixDQUFDLENBQUM7QUFFSCx3RUFBd0U7QUFDeEUsTUFBTSxVQUFVLDhCQUE4QixDQUFDLEdBQUcsS0FBZTtJQUNoRSxLQUFLLE1BQU0sQ0FBQyxJQUFJLEtBQUs7UUFBRSxJQUFJLENBQUM7WUFBRSxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUQsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsSUFBUzs7SUFDbEMsSUFBSTtRQUNILE1BQU0sRUFBRSxHQUFHLE1BQUEsTUFBQSxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJ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QUFjLEVBQUU7NEJBQ25CLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0VBQW9FLENBQUMsQ0FBQzs0QkFDcEYsT0FBTyxJQUFJLENBQUM7eUJBQ1o7cUJBQ0Q7aUJBQ0Q7Z0JBQUMsT0FBTyxHQUFHLEVBQUU7b0JBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQywrQ0FBK0MsRUFBRSxHQUFHLENBQUMsQ0FBQztpQkFDbkU7Z0JBQ0QsT0FBTyxNQUFNLENBQUM7WUFDZixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7S0FDRCxDQUFDLENBQUM7SUFFSCxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzFCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdHlwZSBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgYXJvdW5kLCBkZWR1cGUgfSBmcm9tIFwibW9ua2V5LWFyb3VuZFwiO1xyXG5pbXBvcnQgeyBXb3Jrc3BhY2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuXHJcbi8vIFVzZSBXZWFrTWFwIHRvIGF2b2lkIGF0dGFjaGluZyBhcmJpdHJhcnkgcHJvcGVydGllcyB0byBXb3Jrc3BhY2UgaW5zdGFuY2VzXHJcbmNvbnN0IFJFU1RSSUNUX0RORF9TVEFURTogV2Vha01hcDxhbnksIGJvb2xlYW4+ID0gbmV3IFdlYWtNYXAoKTtcclxuY29uc3Qgc2V0UmVzdHJpY3RTdGF0ZSA9ICh3czogYW55LCB2YWw6IGJvb2xlYW4pID0+IHtcclxuXHRpZiAod3MpIFJFU1RSSUNUX0RORF9TVEFURS5zZXQod3MsICEhdmFsKTtcclxufTtcclxuY29uc3QgZ2V0UmVzdHJpY3RTdGF0ZSA9ICh3czogYW55KTogYm9vbGVhbiA9PiB7XHJcblx0cmV0dXJuICEhKHdzICYmIFJFU1RSSUNUX0RORF9TVEFURS5nZXQod3MpKTtcclxufTtcclxuXHJcbi8qKiBWaWV3IHR5cGVzIHRoYXQgc2hvdWxkIG5ldmVyIGJlIGRyYWctbW92ZWQgdG8gdGhlIGNlbnRlciBwYW5lbC4gKi9cclxuY29uc3QgUkVTVFJJQ1RFRF9WSUVXX1RZUEVTID0gbmV3IFNldDxzdHJpbmc+KFtcclxuXHRcInRnLWxlZnQtc2lkZWJhclwiLFxyXG5cdFwidGctcmlnaHQtZGV0YWlsXCIsXHJcblx0XCJ0Zy10aW1lbGluZS1zaWRlYmFyLXZpZXdcIixcclxuXSk7XHJcblxyXG4vKiogQWxsb3cgb3RoZXIgbW9kdWxlcyB0byBhZGQgbW9yZSByZXN0cmljdGVkIHZpZXcgdHlwZXMgYXQgcnVudGltZS4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyUmVzdHJpY3RlZERuRFZpZXdUeXBlcyguLi50eXBlczogc3RyaW5nW10pIHtcclxuXHRmb3IgKGNvbnN0IHQgb2YgdHlwZXMpIGlmICh0KSBSRVNUUklDVEVEX1ZJRVdfVFlQRVMuYWRkKHQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc1Jlc3RyaWN0ZWRMZWFmKGxlYWY6IGFueSk6IGJvb2xlYW4ge1xyXG5cdHRyeSB7XHJcblx0XHRjb25zdCB2dCA9IGxlYWY/LnZpZXc/LmdldFZpZXdUeXBlPy4oKTtcclxuXHRcdHJldHVybiB0eXBlb2YgdnQgPT09IFwic3RyaW5nXCIgJiYgUkVTVFJJQ1RFRF9WSUVXX1RZUEVTLmhhcyh2dCk7XHJcblx0fSBjYXRjaCB7XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG59XHJcblxyXG4vKiogVW5pcXVlIGtleXMgZm9yIGRlZHVwaW5nIHBhdGNoZXMgYWNyb3NzIHBsdWdpbnMgKi9cclxuY29uc3QgS0VZX09OX0RSQUcgPSBcInRhc2stZ2VuaXVzL3dvcmtzcGFjZS1kbmQ6b25EcmFnTGVhZlwiO1xyXG5jb25zdCBLRVlfR0VUX0RST1AgPSBcInRhc2stZ2VuaXVzL3dvcmtzcGFjZS1kbmQ6Z2V0RHJvcExvY2F0aW9uXCI7XHJcblxyXG4vKipcclxuICogSW5zdGFsbCBhIHJ1bnRpbWUgbW9ua2V5LXBhdGNoIGZvciBPYnNpZGlhbidzIGludGVybmFsIGRyYWcgaGFuZGxpbmcsXHJcbiAqIHVzaW5nIG1vbmtleS1hcm91bmQgZm9yIGNvLW9wZXJhdGl2ZSwgcmVtb3ZhYmxlIHBhdGNoZXMuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaW5zdGFsbFdvcmtzcGFjZURyYWdNb25pdG9yKHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luKTogdm9pZCB7XHJcblx0Y29uc3QgdW5wYXRjaCA9IGFyb3VuZChXb3Jrc3BhY2UucHJvdG90eXBlIGFzIGFueSwge1xyXG5cdFx0b25EcmFnTGVhZihvbGQ6IEZ1bmN0aW9uIHwgdW5kZWZpbmVkKSB7XHJcblx0XHRcdHJldHVybiBkZWR1cGUoS0VZX09OX0RSQUcsIG9sZCBhcyBGdW5jdGlvbiwgZnVuY3Rpb24gKHRoaXM6IGFueSwgZTogRHJhZ0V2ZW50LCBsZWFmOiBhbnkpIHtcclxuXHRcdFx0XHRjb25zdCByZXN0cmljdGVkID0gaXNSZXN0cmljdGVkTGVhZihsZWFmKTtcclxuXHRcdFx0XHQvLyBNYXJrIHdvcmtzcGFjZSBhcyBjdXJyZW50bHkgZHJhZ2dpbmcgYSByZXN0cmljdGVkIGxlYWYgdW50aWwgZHJvcC9kcmFnZW5kXHJcblx0XHRcdFx0aWYgKHJlc3RyaWN0ZWQpIHNldFJlc3RyaWN0U3RhdGUodGhpcywgdHJ1ZSk7XHJcblx0XHRcdFx0aWYgKHJlc3RyaWN0ZWQpIHtcclxuXHRcdFx0XHRcdGNvbnN0IHZ0ID0gbGVhZj8udmlldz8uZ2V0Vmlld1R5cGU/LigpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5kZWJ1ZyhcIltUR11bTW9ua2V5UGF0Y2hdIG9uRHJhZ0xlYWYocmVzdHJpY3RlZClcIiwgdnQpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmRlYnVnKFwiW1RHXVtNb25rZXlQYXRjaF0gb25EcmFnTGVhZlwiKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gSW5zdGFsbCBvbmUtc2hvdCBjbGVhbnVwIG9uIGRyb3AvZHJhZ2VuZFxyXG5cdFx0XHRcdGNvbnN0IHdzID0gdGhpcztcclxuXHRcdFx0XHRpZiAocmVzdHJpY3RlZCkge1xyXG5cdFx0XHRcdFx0Y29uc3QgY2xlYW51cCA9ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0UmVzdHJpY3RTdGF0ZSh3cywgZmFsc2UpO1xyXG5cdFx0XHRcdFx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImRyYWdlbmRcIiwgY2xlYW51cCwgdHJ1ZSk7XHJcblx0XHRcdFx0XHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwiZHJvcFwiLCBjbGVhbnVwLCB0cnVlKTtcclxuXHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdlbmRcIiwgY2xlYW51cCwgdHJ1ZSk7XHJcblx0XHRcdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImRyb3BcIiwgY2xlYW51cCwgdHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBvbGQgJiYgb2xkLmFwcGx5KHRoaXMsIFtlLCBsZWFmXSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSxcclxuXHJcblx0XHRnZXREcm9wTG9jYXRpb24ob2xkOiBGdW5jdGlvbiB8IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRyZXR1cm4gZGVkdXBlKEtFWV9HRVRfRFJPUCwgb2xkIGFzIEZ1bmN0aW9uLCBmdW5jdGlvbiAodGhpczogYW55LCAuLi5hcmdzOiBhbnlbXSkge1xyXG5cdFx0XHRcdGNvbnN0IHRhcmdldCA9IG9sZCAmJiBvbGQuYXBwbHkodGhpcywgYXJncyk7XHJcblxyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRpZiAoZ2V0UmVzdHJpY3RTdGF0ZSh0aGlzKSAmJiB0YXJnZXQpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3Qgcm9vdCA9IHR5cGVvZiB0YXJnZXQ/LmdldFJvb3QgPT09IFwiZnVuY3Rpb25cIiA/IHRhcmdldC5nZXRSb290KCkgOiB1bmRlZmluZWQ7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGlzQ2VudGVyUmVnaW9uID0gcm9vdCAmJiByb290ID09PSB0aGlzLnJvb3RTcGxpdCAmJiB0YXJnZXQgIT09IHRoaXMubGVmdFNwbGl0ICYmIHRhcmdldCAhPT0gdGhpcy5yaWdodFNwbGl0O1xyXG5cdFx0XHRcdFx0XHRpZiAoaXNDZW50ZXJSZWdpb24pIHtcclxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmRlYnVnKFwiW1RHXVtNb25rZXlQYXRjaF0gQmxvY2tlZCBjZW50ZXIgZHJvcCBsb2NhdGlvbiBmb3IgcmVzdHJpY3RlZCBsZWFmXCIpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oXCJbVEddW01vbmtleVBhdGNoXSBnZXREcm9wTG9jYXRpb24gcGF0Y2ggZXJyb3JcIiwgZXJyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIHRhcmdldDtcclxuXHRcdFx0fSk7XHJcblx0XHR9LFxyXG5cdH0pO1xyXG5cclxuXHRwbHVnaW4ucmVnaXN0ZXIodW5wYXRjaCk7XHJcbn1cclxuXHJcbiJdfQ==