import { __awaiter } from "tslib";
import { Menu, setIcon } from "obsidian";
import { t } from "@/translations/helper";
export class WorkspaceSettingsSelector {
    constructor(containerEl, plugin, settingTab) {
        var _a;
        this.containerEl = containerEl;
        this.plugin = plugin;
        this.settingTab = settingTab;
        this.currentWorkspaceId =
            ((_a = plugin.workspaceManager) === null || _a === void 0 ? void 0 : _a.getActiveWorkspace().id) || "";
        this.render();
    }
    render() {
        // Create workspace selector container
        const selectorContainer = this.containerEl.createDiv({
            cls: "workspace-settings-selector",
        });
        if (!this.plugin.workspaceManager)
            return;
        const currentWorkspace = this.plugin.workspaceManager.getActiveWorkspace();
        this.buttonEl = selectorContainer.createDiv({
            cls: "workspace-settings-selector-button",
        });
        // Workspace icon
        const workspaceIcon = this.buttonEl.createDiv({
            cls: "workspace-icon",
        });
        setIcon(workspaceIcon, currentWorkspace.icon || "layers");
        // Workspace name
        const workspaceName = this.buttonEl.createSpan({
            cls: "workspace-name",
            text: currentWorkspace.name,
        });
        // Dropdown arrow
        const dropdownIcon = this.buttonEl.createDiv({
            cls: "workspace-dropdown-icon",
        });
        setIcon(dropdownIcon, "chevron-down");
        // Click handler
        this.buttonEl.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showWorkspaceMenu(e);
        });
    }
    showWorkspaceMenu(event) {
        if (!this.plugin.workspaceManager)
            return;
        const menu = new Menu();
        const workspaces = this.plugin.workspaceManager.getAllWorkspaces();
        const currentWorkspace = this.plugin.workspaceManager.getActiveWorkspace();
        // Add workspace items for switching
        workspaces.forEach((workspace) => {
            menu.addItem((item) => {
                item.setTitle(workspace.name)
                    .setIcon(workspace.icon || "layers")
                    .onClick(() => __awaiter(this, void 0, void 0, function* () {
                    yield this.switchWorkspace(workspace.id);
                }));
                // Mark current workspace with checkmark
                if (workspace.id === currentWorkspace.id) {
                    item.setChecked(true);
                }
            });
        });
        // Add separator
        menu.addSeparator();
        // Add "Manage Workspaces..." option to navigate to settings
        menu.addItem((item) => {
            item.setTitle(t("Manage Workspaces..."))
                .setIcon("settings")
                .onClick(() => {
                // Navigate to workspace settings tab
                this.settingTab.switchToTab("workspaces");
            });
        });
        menu.showAtMouseEvent(event);
    }
    switchWorkspace(workspaceId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.plugin.workspaceManager)
                return;
            // Switch workspace
            yield this.plugin.workspaceManager.setActiveWorkspace(workspaceId);
            this.currentWorkspaceId = workspaceId;
            // Update button display
            this.updateDisplay();
            // Trigger settings reload to reflect workspace change
            yield this.plugin.saveSettings();
            this.settingTab.applySettingsUpdate();
        });
    }
    updateDisplay() {
        if (!this.plugin.workspaceManager || !this.buttonEl)
            return;
        const currentWorkspace = this.plugin.workspaceManager.getActiveWorkspace();
        // Update icon
        const iconEl = this.buttonEl.querySelector(".workspace-icon");
        if (iconEl) {
            iconEl.empty();
            setIcon(iconEl, currentWorkspace.icon || "layers");
        }
        // Update name
        const nameEl = this.buttonEl.querySelector(".workspace-name");
        if (nameEl) {
            nameEl.textContent = currentWorkspace.name;
        }
    }
    setWorkspace(workspaceId) {
        this.currentWorkspaceId = workspaceId;
        this.updateDisplay();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV29ya3NwYWNlU2V0dGluZ3NTZWxlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIldvcmtzcGFjZVNldHRpbmdzU2VsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBR3pDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUcxQyxNQUFNLE9BQU8seUJBQXlCO0lBT3JDLFlBQ0MsV0FBd0IsRUFDeEIsTUFBNkIsRUFDN0IsVUFBcUM7O1FBRXJDLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQy9CLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQzdCLElBQUksQ0FBQyxrQkFBa0I7WUFDdEIsQ0FBQSxNQUFBLE1BQU0sQ0FBQyxnQkFBZ0IsMENBQUUsa0JBQWtCLEdBQUcsRUFBRSxLQUFJLEVBQUUsQ0FBQztRQUV4RCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDZixDQUFDO0lBRU8sTUFBTTtRQUNiLHNDQUFzQztRQUN0QyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDO1lBQ3BELEdBQUcsRUFBRSw2QkFBNkI7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCO1lBQUUsT0FBTztRQUUxQyxNQUFNLGdCQUFnQixHQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFFbkQsSUFBSSxDQUFDLFFBQVEsR0FBRyxpQkFBaUIsQ0FBQyxTQUFTLENBQUM7WUFDM0MsR0FBRyxFQUFFLG9DQUFvQztTQUN6QyxDQUFDLENBQUM7UUFFSCxpQkFBaUI7UUFDakIsTUFBTSxhQUFhLEdBQUcsSUFBSSxD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InNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1lbnUsIHNldEljb24gfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHR5cGUgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IFdvcmtzcGFjZURhdGEgfSBmcm9tIFwiQC90eXBlcy93b3Jrc3BhY2VcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgVGFza1Byb2dyZXNzQmFyU2V0dGluZ1RhYiB9IGZyb20gXCJAL3NldHRpbmdcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBXb3Jrc3BhY2VTZXR0aW5nc1NlbGVjdG9yIHtcclxuXHRwcml2YXRlIGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdHByaXZhdGUgc2V0dGluZ1RhYjogVGFza1Byb2dyZXNzQmFyU2V0dGluZ1RhYjtcclxuXHRwcml2YXRlIGN1cnJlbnRXb3Jrc3BhY2VJZDogc3RyaW5nO1xyXG5cdHByaXZhdGUgYnV0dG9uRWw6IEhUTUxFbGVtZW50O1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0c2V0dGluZ1RhYjogVGFza1Byb2dyZXNzQmFyU2V0dGluZ1RhYlxyXG5cdCkge1xyXG5cdFx0dGhpcy5jb250YWluZXJFbCA9IGNvbnRhaW5lckVsO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLnNldHRpbmdUYWIgPSBzZXR0aW5nVGFiO1xyXG5cdFx0dGhpcy5jdXJyZW50V29ya3NwYWNlSWQgPVxyXG5cdFx0XHRwbHVnaW4ud29ya3NwYWNlTWFuYWdlcj8uZ2V0QWN0aXZlV29ya3NwYWNlKCkuaWQgfHwgXCJcIjtcclxuXHJcblx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXIoKSB7XHJcblx0XHQvLyBDcmVhdGUgd29ya3NwYWNlIHNlbGVjdG9yIGNvbnRhaW5lclxyXG5cdFx0Y29uc3Qgc2VsZWN0b3JDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ3b3Jrc3BhY2Utc2V0dGluZ3Mtc2VsZWN0b3JcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGlmICghdGhpcy5wbHVnaW4ud29ya3NwYWNlTWFuYWdlcikgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnN0IGN1cnJlbnRXb3Jrc3BhY2UgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbi53b3Jrc3BhY2VNYW5hZ2VyLmdldEFjdGl2ZVdvcmtzcGFjZSgpO1xyXG5cclxuXHRcdHRoaXMuYnV0dG9uRWwgPSBzZWxlY3RvckNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwid29ya3NwYWNlLXNldHRpbmdzLXNlbGVjdG9yLWJ1dHRvblwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gV29ya3NwYWNlIGljb25cclxuXHRcdGNvbnN0IHdvcmtzcGFjZUljb24gPSB0aGlzLmJ1dHRvbkVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ3b3Jrc3BhY2UtaWNvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKHdvcmtzcGFjZUljb24sIGN1cnJlbnRXb3Jrc3BhY2UuaWNvbiB8fCBcImxheWVyc1wiKTtcclxuXHJcblx0XHQvLyBXb3Jrc3BhY2UgbmFtZVxyXG5cdFx0Y29uc3Qgd29ya3NwYWNlTmFtZSA9IHRoaXMuYnV0dG9uRWwuY3JlYXRlU3Bhbih7XHJcblx0XHRcdGNsczogXCJ3b3Jrc3BhY2UtbmFtZVwiLFxyXG5cdFx0XHR0ZXh0OiBjdXJyZW50V29ya3NwYWNlLm5hbWUsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBEcm9wZG93biBhcnJvd1xyXG5cdFx0Y29uc3QgZHJvcGRvd25JY29uID0gdGhpcy5idXR0b25FbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwid29ya3NwYWNlLWRyb3Bkb3duLWljb25cIixcclxuXHRcdH0pO1xyXG5cdFx0c2V0SWNvbihkcm9wZG93bkljb24sIFwiY2hldnJvbi1kb3duXCIpO1xyXG5cclxuXHRcdC8vIENsaWNrIGhhbmRsZXJcclxuXHRcdHRoaXMuYnV0dG9uRWwuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0dGhpcy5zaG93V29ya3NwYWNlTWVudShlKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzaG93V29ya3NwYWNlTWVudShldmVudDogTW91c2VFdmVudCkge1xyXG5cdFx0aWYgKCF0aGlzLnBsdWdpbi53b3Jrc3BhY2VNYW5hZ2VyKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgbWVudSA9IG5ldyBNZW51KCk7XHJcblx0XHRjb25zdCB3b3Jrc3BhY2VzID0gdGhpcy5wbHVnaW4ud29ya3NwYWNlTWFuYWdlci5nZXRBbGxXb3Jrc3BhY2VzKCk7XHJcblx0XHRjb25zdCBjdXJyZW50V29ya3NwYWNlID1cclxuXHRcdFx0dGhpcy5wbHVnaW4ud29ya3NwYWNlTWFuYWdlci5nZXRBY3RpdmVXb3Jrc3BhY2UoKTtcclxuXHJcblx0XHQvLyBBZGQgd29ya3NwYWNlIGl0ZW1zIGZvciBzd2l0Y2hpbmdcclxuXHRcdHdvcmtzcGFjZXMuZm9yRWFjaCgod29ya3NwYWNlKSA9PiB7XHJcblx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdGl0ZW0uc2V0VGl0bGUod29ya3NwYWNlLm5hbWUpXHJcblx0XHRcdFx0XHQuc2V0SWNvbih3b3Jrc3BhY2UuaWNvbiB8fCBcImxheWVyc1wiKVxyXG5cdFx0XHRcdFx0Lm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRhd2FpdCB0aGlzLnN3aXRjaFdvcmtzcGFjZSh3b3Jrc3BhY2UuaWQpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIE1hcmsgY3VycmVudCB3b3Jrc3BhY2Ugd2l0aCBjaGVja21hcmtcclxuXHRcdFx0XHRpZiAod29ya3NwYWNlLmlkID09PSBjdXJyZW50V29ya3NwYWNlLmlkKSB7XHJcblx0XHRcdFx0XHRpdGVtLnNldENoZWNrZWQodHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFkZCBzZXBhcmF0b3JcclxuXHRcdG1lbnUuYWRkU2VwYXJhdG9yKCk7XHJcblxyXG5cdFx0Ly8gQWRkIFwiTWFuYWdlIFdvcmtzcGFjZXMuLi5cIiBvcHRpb24gdG8gbmF2aWdhdGUgdG8gc2V0dGluZ3NcclxuXHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJNYW5hZ2UgV29ya3NwYWNlcy4uLlwiKSlcclxuXHRcdFx0XHQuc2V0SWNvbihcInNldHRpbmdzXCIpXHJcblx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gTmF2aWdhdGUgdG8gd29ya3NwYWNlIHNldHRpbmdzIHRhYlxyXG5cdFx0XHRcdFx0dGhpcy5zZXR0aW5nVGFiLnN3aXRjaFRvVGFiKFwid29ya3NwYWNlc1wiKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdG1lbnUuc2hvd0F0TW91c2VFdmVudChldmVudCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIHN3aXRjaFdvcmtzcGFjZSh3b3Jrc3BhY2VJZDogc3RyaW5nKSB7XHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXIpIHJldHVybjtcclxuXHJcblx0XHQvLyBTd2l0Y2ggd29ya3NwYWNlXHJcblx0XHRhd2FpdCB0aGlzLnBsdWdpbi53b3Jrc3BhY2VNYW5hZ2VyLnNldEFjdGl2ZVdvcmtzcGFjZSh3b3Jrc3BhY2VJZCk7XHJcblx0XHR0aGlzLmN1cnJlbnRXb3Jrc3BhY2VJZCA9IHdvcmtzcGFjZUlkO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBidXR0b24gZGlzcGxheVxyXG5cdFx0dGhpcy51cGRhdGVEaXNwbGF5KCk7XHJcblxyXG5cdFx0Ly8gVHJpZ2dlciBzZXR0aW5ncyByZWxvYWQgdG8gcmVmbGVjdCB3b3Jrc3BhY2UgY2hhbmdlXHJcblx0XHRhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdHRoaXMuc2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHVwZGF0ZURpc3BsYXkoKSB7XHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXIgfHwgIXRoaXMuYnV0dG9uRWwpIHJldHVybjtcclxuXHJcblx0XHRjb25zdCBjdXJyZW50V29ya3NwYWNlID1cclxuXHRcdFx0dGhpcy5wbHVnaW4ud29ya3NwYWNlTWFuYWdlci5nZXRBY3RpdmVXb3Jrc3BhY2UoKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgaWNvblxyXG5cdFx0Y29uc3QgaWNvbkVsID0gdGhpcy5idXR0b25FbC5xdWVyeVNlbGVjdG9yKFwiLndvcmtzcGFjZS1pY29uXCIpO1xyXG5cdFx0aWYgKGljb25FbCkge1xyXG5cdFx0XHRpY29uRWwuZW1wdHkoKTtcclxuXHRcdFx0c2V0SWNvbihpY29uRWwgYXMgSFRNTEVsZW1lbnQsIGN1cnJlbnRXb3Jrc3BhY2UuaWNvbiB8fCBcImxheWVyc1wiKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgbmFtZVxyXG5cdFx0Y29uc3QgbmFtZUVsID0gdGhpcy5idXR0b25FbC5xdWVyeVNlbGVjdG9yKFwiLndvcmtzcGFjZS1uYW1lXCIpO1xyXG5cdFx0aWYgKG5hbWVFbCkge1xyXG5cdFx0XHRuYW1lRWwudGV4dENvbnRlbnQgPSBjdXJyZW50V29ya3NwYWNlLm5hbWU7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc2V0V29ya3NwYWNlKHdvcmtzcGFjZUlkOiBzdHJpbmcpIHtcclxuXHRcdHRoaXMuY3VycmVudFdvcmtzcGFjZUlkID0gd29ya3NwYWNlSWQ7XHJcblx0XHR0aGlzLnVwZGF0ZURpc3BsYXkoKTtcclxuXHR9XHJcbn1cclxuIl19