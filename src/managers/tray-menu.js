import { __awaiter } from "tslib";
export class TrayMenuBuilder {
    constructor(plugin) {
        this.plugin = plugin;
    }
    getElectron() {
        try {
            const injected = window.electron || globalThis.electron;
            if (injected)
                return injected;
            const req = window.require || globalThis.require;
            return req ? req("electron") : null;
        }
        catch (_a) {
            return null;
        }
    }
    isIcsBadge(task) {
        var _a, _b, _c, _d, _e, _f;
        try {
            const srcType = (_c = (_b = (_a = task === null || task === void 0 ? void 0 : task.metadata) === null || _a === void 0 ? void 0 : _a.source) === null || _b === void 0 ? void 0 : _b.type) !== null && _c !== void 0 ? _c : (_d = task === null || task === void 0 ? void 0 : task.source) === null || _d === void 0 ? void 0 : _d.type;
            const isIcs = srcType === "ics";
            const isBadge = (task === null || task === void 0 ? void 0 : task.badge) === true ||
                ((_f = (_e = task === null || task === void 0 ? void 0 : task.icsEvent) === null || _e === void 0 ? void 0 : _e.source) === null || _f === void 0 ? void 0 : _f.showType) === "badge";
            return !!(isIcs && isBadge);
        }
        catch (_g) {
            return false;
        }
    }
    buildDueTasks(limit = 5) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const df = this.plugin.dataflowOrchestrator;
            const queryAPI = (_a = df === null || df === void 0 ? void 0 : df.getQueryAPI) === null || _a === void 0 ? void 0 : _a.call(df);
            if (!queryAPI)
                return [];
            // Get all tasks with due dates (including overdue), exclude ICS badge only
            const allTasks = (yield queryAPI.getAllTasks());
            const today = new Date();
            today.setHours(23, 59, 59, 999); // End of today
            // Filter: due today or overdue, not completed, exclude ICS badge only
            const dueTasks = allTasks.filter((t) => {
                var _a;
                if (t.completed || !((_a = t.metadata) === null || _a === void 0 ? void 0 : _a.dueDate))
                    return false;
                if (this.isIcsBadge(t))
                    return false;
                return t.metadata.dueDate <= today.getTime();
            });
            // Sort by due date
            dueTasks.sort((a, b) => { var _a, _b; return (((_a = a.metadata) === null || _a === void 0 ? void 0 : _a.dueDate) || 0) - (((_b = b.metadata) === null || _b === void 0 ? void 0 : _b.dueDate) || 0); });
            return dueTasks.slice(0, limit);
        });
    }
    applyToTray(tray, actions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const electron = this.getElectron();
            const Menu = (electron === null || electron === void 0 ? void 0 : electron.Menu) || ((_a = electron === null || electron === void 0 ? void 0 : electron.remote) === null || _a === void 0 ? void 0 : _a.Menu);
            if (!Menu || !tray)
                return;
            const tasks = yield this.buildDueTasks(7);
            const template = [];
            template.push({
                label: `Vault: ${this.plugin.app.vault.getName()}`,
                enabled: false,
            });
            template.push({
                label: "Open Vault",
                click: () => actions.openVault(),
            });
            template.push({
                label: "Open Task Genius",
                click: () => actions.openTaskView(),
            });
            template.push({ type: "separator" });
            template.push({
                label: "Quick Capture...",
                accelerator: "CmdOrCtrl+Shift+Q",
                click: () => actions.quickCapture(),
            });
            template.push({ type: "separator" });
            for (const t of tasks) {
                const taskLabel = t.content.length > 50
                    ? t.content.slice(0, 50) + "…"
                    : t.content;
                template.push({
                    label: taskLabel,
                    submenu: [
                        { label: "Open", click: () => actions.openTask(t) },
                        {
                            label: "Complete",
                            click: () => actions.completeTask(t.id),
                        },
                        { type: "separator" },
                        {
                            label: "Snooze 1d",
                            click: () => actions.postponeTask(t, 1 * 24 * 60 * 60000),
                        },
                        {
                            label: "Snooze 2d",
                            click: () => actions.postponeTask(t, 2 * 24 * 60 * 60000),
                        },
                        {
                            label: "Snooze 3d",
                            click: () => actions.postponeTask(t, 3 * 24 * 60 * 60000),
                        },
                        {
                            label: "Snooze 1w",
                            click: () => actions.postponeTask(t, 7 * 24 * 60 * 60000),
                        },
                        {
                            label: "Custom date…",
                            click: () => actions.pickCustomDate(t),
                        },
                        { type: "separator" },
                        {
                            label: "Priority",
                            submenu: [
                                {
                                    label: "Highest",
                                    click: () => actions.setPriority(t, 5),
                                },
                                {
                                    label: "High",
                                    click: () => actions.setPriority(t, 4),
                                },
                                {
                                    label: "Medium",
                                    click: () => actions.setPriority(t, 3),
                                },
                                {
                                    label: "Low",
                                    click: () => actions.setPriority(t, 2),
                                },
                                {
                                    label: "Lowest",
                                    click: () => actions.setPriority(t, 1),
                                },
                            ],
                        },
                    ],
                });
            }
            if (tasks.length === 0)
                template.push({ label: "No tasks due today", enabled: false });
            template.push({ type: "separator" });
            template.push({
                label: "Refresh",
                click: () => {
                    /* handled by caller update */
                },
            });
            const menu = Menu.buildFromTemplate(template);
            try {
                tray.setContextMenu(menu);
            }
            catch (_b) { }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJheS1tZW51LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidHJheS1tZW51LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFHQSxNQUFNLE9BQU8sZUFBZTtJQUMzQixZQUFvQixNQUE2QjtRQUE3QixXQUFNLEdBQU4sTUFBTSxDQUF1QjtJQUFHLENBQUM7SUFFN0MsV0FBVztRQUNsQixJQUFJO1lBQ0gsTUFBTSxRQUFRLEdBQ1osTUFBYyxDQUFDLFFBQVEsSUFBSyxVQUFrQixDQUFDLFFBQVEsQ0FBQztZQUMxRCxJQUFJLFFBQVE7Z0JBQUUsT0FBTyxRQUFRLENBQUM7WUFDOUIsTUFBTSxHQUFHLEdBQUksTUFBYyxDQUFDLE9BQU8sSUFBSyxVQUFrQixDQUFDLE9BQU8sQ0FBQztZQUNuRSxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7U0FDcEM7UUFBQyxXQUFNO1lBQ1AsT0FBTyxJQUFJLENBQUM7U0FDWjtJQUNGLENBQUM7SUFFTyxVQUFVLENBQUMsSUFBVTs7UUFDNUIsSUFBSTtZQUNILE1BQU0sT0FBTyxHQUNaLE1BQUEsTUFBQSxNQUFDLElBQVksYUFBWixJQUFJLHVCQUFKLElBQUksQ0FBVSxRQUFRLDBDQUFFLE1BQU0sMENBQUUsSUFBSSxtQ0FDckMsTUFBQyxJQUFZLGFBQVosSUFBSSx1QkFBSixJQUFJLENBQVUsTUFBTSwwQ0FBRSxJQUFJLENBQUM7WUFDN0IsTUFBTSxLQUFLLEdBQUcsT0FBTyxLQUFLLEtBQUssQ0FBQztZQUNoQyxNQUFNLE9BQU8sR0FDWixDQUFDLElBQVksYUFBWixJQUFJLHVCQUFKLElBQUksQ0FBVSxLQUFLLE1BQUssSUFBSTtnQkFDN0IsQ0FBQSxNQUFBLE1BQUMsSUFBWSxhQUFaLElBQUksdUJBQUosSUFBSSxDQUFVLFFBQVEsMENBQUUsTUFBTSwwQ0FBRSxRQUFRLE1BQUssT0FBTyxDQUFDO1lBQ3ZELE9BQU8sQ0FBQyxD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LEtBQUssRUFBRSxLQUFLO29DQUNaLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7aUNBQ3RDO2dDQUNEO29DQUNDLEtBQUssRUFBRSxRQUFRO29DQUNmLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7aUNBQ3RDOzZCQUNEO3lCQUNEO3FCQUNEO2lCQUNELENBQUMsQ0FBQzthQUNIO1lBRUQsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUM7Z0JBQ3JCLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDaEUsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1lBQ3JDLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0JBQ2IsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLEtBQUssRUFBRSxHQUFHLEVBQUU7b0JBQ1gsOEJBQThCO2dCQUMvQixDQUFDO2FBQ0QsQ0FBQyxDQUFDO1lBRUgsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzlDLElBQUk7Z0JBQ0gsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUMxQjtZQUFDLFdBQU0sR0FBRTs7S0FDVjtDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB0eXBlIHsgVGFzayB9IGZyb20gXCJAL3R5cGVzL3Rhc2tcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBUcmF5TWVudUJ1aWxkZXIge1xyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4pIHt9XHJcblxyXG5cdHByaXZhdGUgZ2V0RWxlY3Ryb24oKTogYW55IHwgbnVsbCB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBpbmplY3RlZCA9XHJcblx0XHRcdFx0KHdpbmRvdyBhcyBhbnkpLmVsZWN0cm9uIHx8IChnbG9iYWxUaGlzIGFzIGFueSkuZWxlY3Ryb247XHJcblx0XHRcdGlmIChpbmplY3RlZCkgcmV0dXJuIGluamVjdGVkO1xyXG5cdFx0XHRjb25zdCByZXEgPSAod2luZG93IGFzIGFueSkucmVxdWlyZSB8fCAoZ2xvYmFsVGhpcyBhcyBhbnkpLnJlcXVpcmU7XHJcblx0XHRcdHJldHVybiByZXEgPyByZXEoXCJlbGVjdHJvblwiKSA6IG51bGw7XHJcblx0XHR9IGNhdGNoIHtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGlzSWNzQmFkZ2UodGFzazogVGFzayk6IGJvb2xlYW4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3Qgc3JjVHlwZSA9XHJcblx0XHRcdFx0KHRhc2sgYXMgYW55KT8ubWV0YWRhdGE/LnNvdXJjZT8udHlwZSA/P1xyXG5cdFx0XHRcdCh0YXNrIGFzIGFueSk/LnNvdXJjZT8udHlwZTtcclxuXHRcdFx0Y29uc3QgaXNJY3MgPSBzcmNUeXBlID09PSBcImljc1wiO1xyXG5cdFx0XHRjb25zdCBpc0JhZGdlID1cclxuXHRcdFx0XHQodGFzayBhcyBhbnkpPy5iYWRnZSA9PT0gdHJ1ZSB8fFxyXG5cdFx0XHRcdCh0YXNrIGFzIGFueSk/Lmljc0V2ZW50Py5zb3VyY2U/LnNob3dUeXBlID09PSBcImJhZGdlXCI7XHJcblx0XHRcdHJldHVybiAhIShpc0ljcyAmJiBpc0JhZGdlKTtcclxuXHRcdH0gY2F0Y2gge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGJ1aWxkRHVlVGFza3MobGltaXQ6IG51bWJlciA9IDUpOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0Y29uc3QgZGYgPSB0aGlzLnBsdWdpbi5kYXRhZmxvd09yY2hlc3RyYXRvciBhcyBhbnk7XHJcblx0XHRjb25zdCBxdWVyeUFQSSA9IGRmPy5nZXRRdWVyeUFQST8uKCk7XHJcblx0XHRpZiAoIXF1ZXJ5QVBJKSByZXR1cm4gW107XHJcblxyXG5cdFx0Ly8gR2V0IGFsbCB0YXNrcyB3aXRoIGR1ZSBkYXRlcyAoaW5jbHVkaW5nIG92ZXJkdWUpLCBleGNsdWRlIElDUyBiYWRnZSBvbmx5XHJcblx0XHRjb25zdCBhbGxUYXNrcyA9IChhd2FpdCBxdWVyeUFQSS5nZXRBbGxUYXNrcygpKSBhcyBUYXNrW107XHJcblx0XHRjb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XHJcblx0XHR0b2RheS5zZXRIb3VycygyMywgNTksIDU5LCA5OTkpOyAvLyBFbmQgb2YgdG9kYXlcclxuXHJcblx0XHQvLyBGaWx0ZXI6IGR1ZSB0b2RheSBvciBvdmVyZHVlLCBub3QgY29tcGxldGVkLCBleGNsdWRlIElDUyBiYWRnZSBvbmx5XHJcblx0XHRjb25zdCBkdWVUYXNrcyA9IGFsbFRhc2tzLmZpbHRlcigodCkgPT4ge1xyXG5cdFx0XHRpZiAodC5jb21wbGV0ZWQgfHwgIXQubWV0YWRhdGE/LmR1ZURhdGUpIHJldHVybiBmYWxzZTtcclxuXHRcdFx0aWYgKHRoaXMuaXNJY3NCYWRnZSh0KSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRyZXR1cm4gdC5tZXRhZGF0YS5kdWVEYXRlIDw9IHRvZGF5LmdldFRpbWUoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFNvcnQgYnkgZHVlIGRhdGVcclxuXHRcdGR1ZVRhc2tzLnNvcnQoXHJcblx0XHRcdChhLCBiKSA9PiAoYS5tZXRhZGF0YT8uZHVlRGF0ZSB8fCAwKSAtIChiLm1ldGFkYXRhPy5kdWVEYXRlIHx8IDApXHJcblx0XHQpO1xyXG5cclxuXHRcdHJldHVybiBkdWVUYXNrcy5zbGljZSgwLCBsaW1pdCk7XHJcblx0fVxyXG5cclxuXHRhc3luYyBhcHBseVRvVHJheShcclxuXHRcdHRyYXk6IGFueSxcclxuXHRcdGFjdGlvbnM6IHtcclxuXHRcdFx0b3BlblZhdWx0OiAoKSA9PiB2b2lkO1xyXG5cdFx0XHRvcGVuVGFza1ZpZXc6ICgpID0+IHZvaWQ7XHJcblx0XHRcdG9wZW5UYXNrOiAodGFzazogVGFzaykgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHRcdFx0Y29tcGxldGVUYXNrOiAoaWQ6IHN0cmluZykgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHRcdFx0cG9zdHBvbmVUYXNrOiAodGFzazogVGFzaywgb2Zmc2V0TXM6IG51bWJlcikgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHRcdFx0c2V0UHJpb3JpdHk6ICh0YXNrOiBUYXNrLCBsZXZlbDogbnVtYmVyKSA9PiBQcm9taXNlPHZvaWQ+O1xyXG5cdFx0XHRwaWNrQ3VzdG9tRGF0ZTogKHRhc2s6IFRhc2spID0+IFByb21pc2U8dm9pZD47XHJcblx0XHRcdHNlbmREYWlseTogKCkgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHRcdFx0cXVpY2tDYXB0dXJlOiAoKSA9PiBQcm9taXNlPHZvaWQ+O1xyXG5cdFx0fVxyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgZWxlY3Ryb24gPSB0aGlzLmdldEVsZWN0cm9uKCk7XHJcblx0XHRjb25zdCBNZW51ID0gZWxlY3Ryb24/Lk1lbnUgfHwgZWxlY3Ryb24/LnJlbW90ZT8uTWVudTtcclxuXHRcdGlmICghTWVudSB8fCAhdHJheSkgcmV0dXJuO1xyXG5cdFx0Y29uc3QgdGFza3MgPSBhd2FpdCB0aGlzLmJ1aWxkRHVlVGFza3MoNyk7XHJcblx0XHRjb25zdCB0ZW1wbGF0ZTogYW55W10gPSBbXTtcclxuXHRcdHRlbXBsYXRlLnB1c2goe1xyXG5cdFx0XHRsYWJlbDogYFZhdWx0OiAke3RoaXMucGx1Z2luLmFwcC52YXVsdC5nZXROYW1lKCl9YCxcclxuXHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHR9KTtcclxuXHRcdHRlbXBsYXRlLnB1c2goe1xyXG5cdFx0XHRsYWJlbDogXCJPcGVuIFZhdWx0XCIsXHJcblx0XHRcdGNsaWNrOiAoKSA9PiBhY3Rpb25zLm9wZW5WYXVsdCgpLFxyXG5cdFx0fSk7XHJcblx0XHR0ZW1wbGF0ZS5wdXNoKHtcclxuXHRcdFx0bGFiZWw6IFwiT3BlbiBUYXNrIEdlbml1c1wiLFxyXG5cdFx0XHRjbGljazogKCkgPT4gYWN0aW9ucy5vcGVuVGFza1ZpZXcoKSxcclxuXHRcdH0pO1xyXG5cdFx0dGVtcGxhdGUucHVzaCh7IHR5cGU6IFwic2VwYXJhdG9yXCIgfSk7XHJcblx0XHR0ZW1wbGF0ZS5wdXNoKHtcclxuXHRcdFx0bGFiZWw6IFwiUXVpY2sgQ2FwdHVyZS4uLlwiLFxyXG5cdFx0XHRhY2NlbGVyYXRvcjogXCJDbWRPckN0cmwrU2hpZnQrUVwiLFxyXG5cdFx0XHRjbGljazogKCkgPT4gYWN0aW9ucy5xdWlja0NhcHR1cmUoKSxcclxuXHRcdH0pO1xyXG5cdFx0dGVtcGxhdGUucHVzaCh7IHR5cGU6IFwic2VwYXJhdG9yXCIgfSk7XHJcblxyXG5cdFx0Zm9yIChjb25zdCB0IG9mIHRhc2tzKSB7XHJcblx0XHRcdGNvbnN0IHRhc2tMYWJlbCA9XHJcblx0XHRcdFx0dC5jb250ZW50Lmxlbmd0aCA+IDUwXHJcblx0XHRcdFx0XHQ/IHQuY29udGVudC5zbGljZSgwLCA1MCkgKyBcIuKAplwiXHJcblx0XHRcdFx0XHQ6IHQuY29udGVudDtcclxuXHRcdFx0dGVtcGxhdGUucHVzaCh7XHJcblx0XHRcdFx0bGFiZWw6IHRhc2tMYWJlbCxcclxuXHRcdFx0XHRzdWJtZW51OiBbXHJcblx0XHRcdFx0XHR7IGxhYmVsOiBcIk9wZW5cIiwgY2xpY2s6ICgpID0+IGFjdGlvbnMub3BlblRhc2sodCkgfSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bGFiZWw6IFwiQ29tcGxldGVcIixcclxuXHRcdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGFjdGlvbnMuY29tcGxldGVUYXNrKHQuaWQpLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHsgdHlwZTogXCJzZXBhcmF0b3JcIiB9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRsYWJlbDogXCJTbm9vemUgMWRcIixcclxuXHRcdFx0XHRcdFx0Y2xpY2s6ICgpID0+XHJcblx0XHRcdFx0XHRcdFx0YWN0aW9ucy5wb3N0cG9uZVRhc2sodCwgMSAqIDI0ICogNjAgKiA2MF8wMDApLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bGFiZWw6IFwiU25vb3plIDJkXCIsXHJcblx0XHRcdFx0XHRcdGNsaWNrOiAoKSA9PlxyXG5cdFx0XHRcdFx0XHRcdGFjdGlvbnMucG9zdHBvbmVUYXNrKHQsIDIgKiAyNCAqIDYwICogNjBfMDAwKSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGxhYmVsOiBcIlNub296ZSAzZFwiLFxyXG5cdFx0XHRcdFx0XHRjbGljazogKCkgPT5cclxuXHRcdFx0XHRcdFx0XHRhY3Rpb25zLnBvc3Rwb25lVGFzayh0LCAzICogMjQgKiA2MCAqIDYwXzAwMCksXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRsYWJlbDogXCJTbm9vemUgMXdcIixcclxuXHRcdFx0XHRcdFx0Y2xpY2s6ICgpID0+XHJcblx0XHRcdFx0XHRcdFx0YWN0aW9ucy5wb3N0cG9uZVRhc2sodCwgNyAqIDI0ICogNjAgKiA2MF8wMDApLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bGFiZWw6IFwiQ3VzdG9tIGRhdGXigKZcIixcclxuXHRcdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGFjdGlvbnMucGlja0N1c3RvbURhdGUodCksXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0eyB0eXBlOiBcInNlcGFyYXRvclwiIH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGxhYmVsOiBcIlByaW9yaXR5XCIsXHJcblx0XHRcdFx0XHRcdHN1Ym1lbnU6IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRsYWJlbDogXCJIaWdoZXN0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjbGljazogKCkgPT4gYWN0aW9ucy5zZXRQcmlvcml0eSh0LCA1KSxcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGxhYmVsOiBcIkhpZ2hcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNsaWNrOiAoKSA9PiBhY3Rpb25zLnNldFByaW9yaXR5KHQsIDQpLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0bGFiZWw6IFwiTWVkaXVtXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjbGljazogKCkgPT4gYWN0aW9ucy5zZXRQcmlvcml0eSh0LCAzKSxcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGxhYmVsOiBcIkxvd1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGFjdGlvbnMuc2V0UHJpb3JpdHkodCwgMiksXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRsYWJlbDogXCJMb3dlc3RcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNsaWNrOiAoKSA9PiBhY3Rpb25zLnNldFByaW9yaXR5KHQsIDEpLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0YXNrcy5sZW5ndGggPT09IDApXHJcblx0XHRcdHRlbXBsYXRlLnB1c2goeyBsYWJlbDogXCJObyB0YXNrcyBkdWUgdG9kYXlcIiwgZW5hYmxlZDogZmFsc2UgfSk7XHJcblx0XHR0ZW1wbGF0ZS5wdXNoKHsgdHlwZTogXCJzZXBhcmF0b3JcIiB9KTtcclxuXHRcdHRlbXBsYXRlLnB1c2goe1xyXG5cdFx0XHRsYWJlbDogXCJSZWZyZXNoXCIsXHJcblx0XHRcdGNsaWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0LyogaGFuZGxlZCBieSBjYWxsZXIgdXBkYXRlICovXHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBtZW51ID0gTWVudS5idWlsZEZyb21UZW1wbGF0ZSh0ZW1wbGF0ZSk7XHJcblx0XHR0cnkge1xyXG5cdFx0XHR0cmF5LnNldENvbnRleHRNZW51KG1lbnUpO1xyXG5cdFx0fSBjYXRjaCB7fVxyXG5cdH1cclxufVxyXG4iXX0=