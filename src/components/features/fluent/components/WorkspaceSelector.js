import { __awaiter } from "tslib";
import { Menu, setIcon } from "obsidian";
import { t } from "@/translations/helper";
import { CreateWorkspaceModal, RenameWorkspaceModal, DeleteWorkspaceModal, } from "@/components/ui/modals/WorkspaceModals";
export class WorkspaceSelector {
    constructor(containerEl, plugin, onWorkspaceChange) {
        var _a;
        this.containerEl = containerEl;
        this.plugin = plugin;
        this.currentWorkspaceId =
            ((_a = plugin.workspaceManager) === null || _a === void 0 ? void 0 : _a.getActiveWorkspace().id) || "";
        this.onWorkspaceChange = onWorkspaceChange;
        this.render();
    }
    render() {
        this.containerEl.empty();
        this.containerEl.addClass("workspace-selector");
        if (!this.plugin.workspaceManager)
            return;
        const currentWorkspace = this.plugin.workspaceManager.getActiveWorkspace();
        const isDefault = this.plugin.workspaceManager.isDefaultWorkspace(currentWorkspace.id);
        const selectorButton = this.containerEl.createDiv({
            cls: "workspace-selector-button",
        });
        const workspaceInfo = selectorButton.createDiv({
            cls: "workspace-info",
        });
        const workspaceIcon = workspaceInfo.createDiv({
            cls: "workspace-icon",
        });
        // Use a color scheme for workspaces if needed
        workspaceIcon.style.backgroundColor =
            this.getWorkspaceColor(currentWorkspace);
        setIcon(workspaceIcon, currentWorkspace.icon || "layers");
        const workspaceDetails = workspaceInfo.createDiv({
            cls: "workspace-details",
        });
        const nameContainer = workspaceDetails.createDiv({
            cls: "workspace-name-container",
        });
        nameContainer.createSpan({
            cls: "workspace-name",
            text: currentWorkspace.name,
        });
        workspaceDetails.createDiv({
            cls: "workspace-label",
            text: t("Workspace"),
        });
        const dropdownIcon = selectorButton.createDiv({
            cls: "workspace-dropdown-icon",
        });
        setIcon(dropdownIcon, "chevron-down");
        selectorButton.addEventListener("click", (e) => {
            e.preventDefault();
            this.showWorkspaceMenu(e);
        });
    }
    getWorkspaceColor(workspace) {
        // Generate a color based on workspace ID or use predefined colors
        const colors = [
            "#e74c3c",
            "#3498db",
            "#2ecc71",
            "#f39c12",
            "#9b59b6",
            "#1abc9c",
            "#34495e",
            "#e67e22",
        ];
        const index = Math.abs(workspace.id
            .split("")
            .reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
        return colors[index];
    }
    showWorkspaceMenu(event) {
        if (!this.plugin.workspaceManager)
            return;
        const menu = new Menu();
        const workspaces = this.plugin.workspaceManager.getAllWorkspaces();
        const currentWorkspace = this.plugin.workspaceManager.getActiveWorkspace();
        // Add workspace items
        workspaces.forEach((workspace) => {
            menu.addItem((item) => {
                var _a;
                const isDefault = (_a = this.plugin.workspaceManager) === null || _a === void 0 ? void 0 : _a.isDefaultWorkspace(workspace.id);
                const title = isDefault ? `${workspace.name}` : workspace.name;
                item.setTitle(title)
                    .setIcon(workspace.icon || "layers")
                    .onClick(() => __awaiter(this, void 0, void 0, function* () {
                    yield this.onWorkspaceChange(workspace.id);
                    this.currentWorkspaceId = workspace.id;
                    this.render();
                }));
                if (workspace.id === currentWorkspace.id) {
                    item.setChecked(true);
                }
            });
        });
        menu.addSeparator();
        // Add management options
        menu.addItem((item) => {
            item.setTitle(t("Create Workspace"))
                .setIcon("plus")
                .onClick(() => {
                this.showCreateWorkspaceDialog();
            });
        });
        // Only show rename/delete for non-default workspaces
        if (!this.plugin.workspaceManager.isDefaultWorkspace(currentWorkspace.id)) {
            menu.addItem((item) => {
                item.setTitle(t("Rename Current Workspace"))
                    .setIcon("edit")
                    .onClick(() => {
                    this.showRenameWorkspaceDialog(currentWorkspace);
                });
            });
            menu.addItem((item) => {
                item.setTitle(t("Delete Current Workspace"))
                    .setIcon("trash")
                    .onClick(() => {
                    this.showDeleteWorkspaceDialog(currentWorkspace);
                });
            });
        }
        menu.addSeparator();
        menu.addItem((item) => {
            item.setTitle(t("Manage Workspaces..."))
                .setIcon("settings")
                .onClick(() => {
                // Open settings to workspace tab
                // @ts-ignore
                this.plugin.app.setting.open();
                // @ts-ignore
                this.plugin.app.setting.openTabById("obsidian-task-progress-bar");
                setTimeout(() => {
                    if (this.plugin.settingTab) {
                        this.plugin.settingTab.openTab("workspaces");
                    }
                }, 100);
            });
        });
        menu.showAtMouseEvent(event);
    }
    showCreateWorkspaceDialog() {
        new CreateWorkspaceModal(this.plugin, (workspace) => {
            this.onWorkspaceChange(workspace.id);
            this.currentWorkspaceId = workspace.id;
            this.render();
        }).open();
    }
    showRenameWorkspaceDialog(workspace) {
        new RenameWorkspaceModal(this.plugin, workspace, () => {
            this.render();
        }).open();
    }
    showDeleteWorkspaceDialog(workspace) {
        new DeleteWorkspaceModal(this.plugin, workspace, () => {
            var _a;
            // After deletion, workspace manager will automatically switch to default
            this.currentWorkspaceId =
                ((_a = this.plugin.workspaceManager) === null || _a === void 0 ? void 0 : _a.getActiveWorkspace().id) || "";
            this.render();
        }).open();
    }
    setWorkspace(workspaceId) {
        this.currentWorkspaceId = workspaceId;
        this.render();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV29ya3NwYWNlU2VsZWN0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJXb3Jrc3BhY2VTZWxlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFHekMsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsb0JBQW9CLEVBQ3BCLG9CQUFvQixHQUNwQixNQUFNLHdDQUF3QyxDQUFDO0FBRWhELE1BQU0sT0FBTyxpQkFBaUI7SUFNN0IsWUFDQyxXQUF3QixFQUN4QixNQUE2QixFQUM3QixpQkFBZ0Q7O1FBRWhELElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQy9CLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxrQkFBa0I7WUFDdEIsQ0FBQSxNQUFBLE1BQU0sQ0FBQyxnQkFBZ0IsMENBQUUsa0JBQWtCLEdBQUcsRUFBRSxLQUFJLEVBQUUsQ0FBQztRQUN4RCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUM7UUFFM0MsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUVPLE1BQU07UUFDYixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFFaEQsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCO1lBQUUsT0FBTztRQUUxQyxNQUFNLGdCQUFnQixHQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDbkQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FDaEUsZ0JBQWdCLENB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QkFBZ0IsMENBQUUsa0JBQWtCLEdBQUcsRUFBRSxLQUFJLEVBQUUsQ0FBQztZQUM3RCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFTSxZQUFZLENBQUMsV0FBbUI7UUFDdEMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLFdBQVcsQ0FBQztRQUN0QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDZixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNZW51LCBzZXRJY29uIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB0eXBlIFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyBXb3Jrc3BhY2VEYXRhIH0gZnJvbSBcIkAvdHlwZXMvd29ya3NwYWNlXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7XHJcblx0Q3JlYXRlV29ya3NwYWNlTW9kYWwsXHJcblx0UmVuYW1lV29ya3NwYWNlTW9kYWwsXHJcblx0RGVsZXRlV29ya3NwYWNlTW9kYWwsXHJcbn0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9tb2RhbHMvV29ya3NwYWNlTW9kYWxzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgV29ya3NwYWNlU2VsZWN0b3Ige1xyXG5cdHByaXZhdGUgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0cHJpdmF0ZSBjdXJyZW50V29ya3NwYWNlSWQ6IHN0cmluZztcclxuXHRwcml2YXRlIG9uV29ya3NwYWNlQ2hhbmdlOiAod29ya3NwYWNlSWQ6IHN0cmluZykgPT4gdm9pZDtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdG9uV29ya3NwYWNlQ2hhbmdlOiAod29ya3NwYWNlSWQ6IHN0cmluZykgPT4gdm9pZFxyXG5cdCkge1xyXG5cdFx0dGhpcy5jb250YWluZXJFbCA9IGNvbnRhaW5lckVsO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLmN1cnJlbnRXb3Jrc3BhY2VJZCA9XHJcblx0XHRcdHBsdWdpbi53b3Jrc3BhY2VNYW5hZ2VyPy5nZXRBY3RpdmVXb3Jrc3BhY2UoKS5pZCB8fCBcIlwiO1xyXG5cdFx0dGhpcy5vbldvcmtzcGFjZUNoYW5nZSA9IG9uV29ya3NwYWNlQ2hhbmdlO1xyXG5cclxuXHRcdHRoaXMucmVuZGVyKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlcigpIHtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuYWRkQ2xhc3MoXCJ3b3Jrc3BhY2Utc2VsZWN0b3JcIik7XHJcblxyXG5cdFx0aWYgKCF0aGlzLnBsdWdpbi53b3Jrc3BhY2VNYW5hZ2VyKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgY3VycmVudFdvcmtzcGFjZSA9XHJcblx0XHRcdHRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXIuZ2V0QWN0aXZlV29ya3NwYWNlKCk7XHJcblx0XHRjb25zdCBpc0RlZmF1bHQgPSB0aGlzLnBsdWdpbi53b3Jrc3BhY2VNYW5hZ2VyLmlzRGVmYXVsdFdvcmtzcGFjZShcclxuXHRcdFx0Y3VycmVudFdvcmtzcGFjZS5pZFxyXG5cdFx0KTtcclxuXHJcblx0XHRjb25zdCBzZWxlY3RvckJ1dHRvbiA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcIndvcmtzcGFjZS1zZWxlY3Rvci1idXR0b25cIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHdvcmtzcGFjZUluZm8gPSBzZWxlY3RvckJ1dHRvbi5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwid29ya3NwYWNlLWluZm9cIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHdvcmtzcGFjZUljb24gPSB3b3Jrc3BhY2VJbmZvLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ3b3Jrc3BhY2UtaWNvblwiLFxyXG5cdFx0fSk7XHJcblx0XHQvLyBVc2UgYSBjb2xvciBzY2hlbWUgZm9yIHdvcmtzcGFjZXMgaWYgbmVlZGVkXHJcblx0XHR3b3Jrc3BhY2VJY29uLnN0eWxlLmJhY2tncm91bmRDb2xvciA9XHJcblx0XHRcdHRoaXMuZ2V0V29ya3NwYWNlQ29sb3IoY3VycmVudFdvcmtzcGFjZSk7XHJcblx0XHRzZXRJY29uKHdvcmtzcGFjZUljb24sIGN1cnJlbnRXb3Jrc3BhY2UuaWNvbiB8fCBcImxheWVyc1wiKTtcclxuXHJcblx0XHRjb25zdCB3b3Jrc3BhY2VEZXRhaWxzID0gd29ya3NwYWNlSW5mby5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwid29ya3NwYWNlLWRldGFpbHNcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IG5hbWVDb250YWluZXIgPSB3b3Jrc3BhY2VEZXRhaWxzLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ3b3Jrc3BhY2UtbmFtZS1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdG5hbWVDb250YWluZXIuY3JlYXRlU3Bhbih7XHJcblx0XHRcdGNsczogXCJ3b3Jrc3BhY2UtbmFtZVwiLFxyXG5cdFx0XHR0ZXh0OiBjdXJyZW50V29ya3NwYWNlLm5hbWUsXHJcblx0XHR9KTtcclxuXHJcblx0XHR3b3Jrc3BhY2VEZXRhaWxzLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ3b3Jrc3BhY2UtbGFiZWxcIixcclxuXHRcdFx0dGV4dDogdChcIldvcmtzcGFjZVwiKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGRyb3Bkb3duSWNvbiA9IHNlbGVjdG9yQnV0dG9uLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ3b3Jrc3BhY2UtZHJvcGRvd24taWNvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKGRyb3Bkb3duSWNvbiwgXCJjaGV2cm9uLWRvd25cIik7XHJcblxyXG5cdFx0c2VsZWN0b3JCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0dGhpcy5zaG93V29ya3NwYWNlTWVudShlKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXRXb3Jrc3BhY2VDb2xvcih3b3Jrc3BhY2U6IFdvcmtzcGFjZURhdGEpOiBzdHJpbmcge1xyXG5cdFx0Ly8gR2VuZXJhdGUgYSBjb2xvciBiYXNlZCBvbiB3b3Jrc3BhY2UgSUQgb3IgdXNlIHByZWRlZmluZWQgY29sb3JzXHJcblx0XHRjb25zdCBjb2xvcnMgPSBbXHJcblx0XHRcdFwiI2U3NGMzY1wiLFxyXG5cdFx0XHRcIiMzNDk4ZGJcIixcclxuXHRcdFx0XCIjMmVjYzcxXCIsXHJcblx0XHRcdFwiI2YzOWMxMlwiLFxyXG5cdFx0XHRcIiM5YjU5YjZcIixcclxuXHRcdFx0XCIjMWFiYzljXCIsXHJcblx0XHRcdFwiIzM0NDk1ZVwiLFxyXG5cdFx0XHRcIiNlNjdlMjJcIixcclxuXHRcdF07XHJcblx0XHRjb25zdCBpbmRleCA9XHJcblx0XHRcdE1hdGguYWJzKFxyXG5cdFx0XHRcdHdvcmtzcGFjZS5pZFxyXG5cdFx0XHRcdFx0LnNwbGl0KFwiXCIpXHJcblx0XHRcdFx0XHQucmVkdWNlKChhY2MsIGNoYXIpID0+IGFjYyArIGNoYXIuY2hhckNvZGVBdCgwKSwgMClcclxuXHRcdFx0KSAlIGNvbG9ycy5sZW5ndGg7XHJcblx0XHRyZXR1cm4gY29sb3JzW2luZGV4XTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2hvd1dvcmtzcGFjZU1lbnUoZXZlbnQ6IE1vdXNlRXZlbnQpIHtcclxuXHRcdGlmICghdGhpcy5wbHVnaW4ud29ya3NwYWNlTWFuYWdlcikgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG5cdFx0Y29uc3Qgd29ya3NwYWNlcyA9IHRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXIuZ2V0QWxsV29ya3NwYWNlcygpO1xyXG5cdFx0Y29uc3QgY3VycmVudFdvcmtzcGFjZSA9XHJcblx0XHRcdHRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXIuZ2V0QWN0aXZlV29ya3NwYWNlKCk7XHJcblxyXG5cdFx0Ly8gQWRkIHdvcmtzcGFjZSBpdGVtc1xyXG5cdFx0d29ya3NwYWNlcy5mb3JFYWNoKCh3b3Jrc3BhY2UpID0+IHtcclxuXHRcdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgaXNEZWZhdWx0ID1cclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXI/LmlzRGVmYXVsdFdvcmtzcGFjZShcclxuXHRcdFx0XHRcdFx0d29ya3NwYWNlLmlkXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdGNvbnN0IHRpdGxlID0gaXNEZWZhdWx0ID8gYCR7d29ya3NwYWNlLm5hbWV9YCA6IHdvcmtzcGFjZS5uYW1lO1xyXG5cclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHRpdGxlKVxyXG5cdFx0XHRcdFx0LnNldEljb24od29ya3NwYWNlLmljb24gfHwgXCJsYXllcnNcIilcclxuXHRcdFx0XHRcdC5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5vbldvcmtzcGFjZUNoYW5nZSh3b3Jrc3BhY2UuaWQpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmN1cnJlbnRXb3Jrc3BhY2VJZCA9IHdvcmtzcGFjZS5pZDtcclxuXHRcdFx0XHRcdFx0dGhpcy5yZW5kZXIoKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRpZiAod29ya3NwYWNlLmlkID09PSBjdXJyZW50V29ya3NwYWNlLmlkKSB7XHJcblx0XHRcdFx0XHRpdGVtLnNldENoZWNrZWQodHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdG1lbnUuYWRkU2VwYXJhdG9yKCk7XHJcblxyXG5cdFx0Ly8gQWRkIG1hbmFnZW1lbnQgb3B0aW9uc1xyXG5cdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIkNyZWF0ZSBXb3Jrc3BhY2VcIikpXHJcblx0XHRcdFx0LnNldEljb24oXCJwbHVzXCIpXHJcblx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5zaG93Q3JlYXRlV29ya3NwYWNlRGlhbG9nKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBPbmx5IHNob3cgcmVuYW1lL2RlbGV0ZSBmb3Igbm9uLWRlZmF1bHQgd29ya3NwYWNlc1xyXG5cdFx0aWYgKFxyXG5cdFx0XHQhdGhpcy5wbHVnaW4ud29ya3NwYWNlTWFuYWdlci5pc0RlZmF1bHRXb3Jrc3BhY2UoXHJcblx0XHRcdFx0Y3VycmVudFdvcmtzcGFjZS5pZFxyXG5cdFx0XHQpXHJcblx0XHQpIHtcclxuXHRcdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiUmVuYW1lIEN1cnJlbnQgV29ya3NwYWNlXCIpKVxyXG5cdFx0XHRcdFx0LnNldEljb24oXCJlZGl0XCIpXHJcblx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc2hvd1JlbmFtZVdvcmtzcGFjZURpYWxvZyhjdXJyZW50V29ya3NwYWNlKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIkRlbGV0ZSBDdXJyZW50IFdvcmtzcGFjZVwiKSlcclxuXHRcdFx0XHRcdC5zZXRJY29uKFwidHJhc2hcIilcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5zaG93RGVsZXRlV29ya3NwYWNlRGlhbG9nKGN1cnJlbnRXb3Jrc3BhY2UpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdG1lbnUuYWRkU2VwYXJhdG9yKCk7XHJcblxyXG5cdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIk1hbmFnZSBXb3Jrc3BhY2VzLi4uXCIpKVxyXG5cdFx0XHRcdC5zZXRJY29uKFwic2V0dGluZ3NcIilcclxuXHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBPcGVuIHNldHRpbmdzIHRvIHdvcmtzcGFjZSB0YWJcclxuXHRcdFx0XHRcdC8vIEB0cy1pZ25vcmVcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLmFwcC5zZXR0aW5nLm9wZW4oKTtcclxuXHRcdFx0XHRcdC8vIEB0cy1pZ25vcmVcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLmFwcC5zZXR0aW5nLm9wZW5UYWJCeUlkKFxyXG5cdFx0XHRcdFx0XHRcIm9ic2lkaWFuLXRhc2stcHJvZ3Jlc3MtYmFyXCJcclxuXHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5nVGFiKSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ1RhYi5vcGVuVGFiKFwid29ya3NwYWNlc1wiKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSwgMTAwKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdG1lbnUuc2hvd0F0TW91c2VFdmVudChldmVudCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNob3dDcmVhdGVXb3Jrc3BhY2VEaWFsb2coKSB7XHJcblx0XHRuZXcgQ3JlYXRlV29ya3NwYWNlTW9kYWwodGhpcy5wbHVnaW4sICh3b3Jrc3BhY2UpID0+IHtcclxuXHRcdFx0dGhpcy5vbldvcmtzcGFjZUNoYW5nZSh3b3Jrc3BhY2UuaWQpO1xyXG5cdFx0XHR0aGlzLmN1cnJlbnRXb3Jrc3BhY2VJZCA9IHdvcmtzcGFjZS5pZDtcclxuXHRcdFx0dGhpcy5yZW5kZXIoKTtcclxuXHRcdH0pLm9wZW4oKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2hvd1JlbmFtZVdvcmtzcGFjZURpYWxvZyh3b3Jrc3BhY2U6IFdvcmtzcGFjZURhdGEpIHtcclxuXHRcdG5ldyBSZW5hbWVXb3Jrc3BhY2VNb2RhbCh0aGlzLnBsdWdpbiwgd29ya3NwYWNlLCAoKSA9PiB7XHJcblx0XHRcdHRoaXMucmVuZGVyKCk7XHJcblx0XHR9KS5vcGVuKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNob3dEZWxldGVXb3Jrc3BhY2VEaWFsb2cod29ya3NwYWNlOiBXb3Jrc3BhY2VEYXRhKSB7XHJcblx0XHRuZXcgRGVsZXRlV29ya3NwYWNlTW9kYWwodGhpcy5wbHVnaW4sIHdvcmtzcGFjZSwgKCkgPT4ge1xyXG5cdFx0XHQvLyBBZnRlciBkZWxldGlvbiwgd29ya3NwYWNlIG1hbmFnZXIgd2lsbCBhdXRvbWF0aWNhbGx5IHN3aXRjaCB0byBkZWZhdWx0XHJcblx0XHRcdHRoaXMuY3VycmVudFdvcmtzcGFjZUlkID1cclxuXHRcdFx0XHR0aGlzLnBsdWdpbi53b3Jrc3BhY2VNYW5hZ2VyPy5nZXRBY3RpdmVXb3Jrc3BhY2UoKS5pZCB8fCBcIlwiO1xyXG5cdFx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdFx0fSkub3BlbigpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHNldFdvcmtzcGFjZSh3b3Jrc3BhY2VJZDogc3RyaW5nKSB7XHJcblx0XHR0aGlzLmN1cnJlbnRXb3Jrc3BhY2VJZCA9IHdvcmtzcGFjZUlkO1xyXG5cdFx0dGhpcy5yZW5kZXIoKTtcclxuXHR9XHJcbn1cclxuIl19