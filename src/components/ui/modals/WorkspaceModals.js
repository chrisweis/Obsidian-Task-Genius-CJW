import { __awaiter } from "tslib";
import { Modal, Notice, Setting, ButtonComponent } from "obsidian";
import { t } from "@/translations/helper";
import { attachIconMenu } from "@/components/ui/menus/IconMenu";
/**
 * Helper function to create a workspace icon selector
 */
export function createWorkspaceIconSelector(containerEl, plugin, initialIcon, onIconSelected) {
    const iconButton = new ButtonComponent(containerEl);
    iconButton.setIcon(initialIcon);
    attachIconMenu(iconButton, {
        containerEl,
        plugin,
        onIconSelected: (iconId) => {
            iconButton.setIcon(iconId);
            onIconSelected(iconId);
        },
    });
    return iconButton;
}
/**
 * Modal for creating a new workspace
 */
export class CreateWorkspaceModal extends Modal {
    constructor(plugin, onCreated) {
        super(plugin.app);
        this.plugin = plugin;
        this.onCreated = onCreated;
        this.selectedIcon = "layers";
        this.name = "";
        this.selectWorkspaceId = "";
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: t("Create New Workspace") });
        // Name input
        new Setting(contentEl)
            .setName(t("Workspace Name"))
            .setDesc(t("A descriptive name for the workspace"))
            .addText((text) => {
            text
                .setPlaceholder(t("Enter workspace name"))
                .setValue("")
                .onChange((value) => {
                this.name = value;
            });
            this.nameInput = text.inputEl;
        });
        // Icon selection
        const iconSetting = new Setting(contentEl)
            .setName(t("Workspace Icon"))
            .setDesc(t("Choose an icon for this workspace"));
        const iconContainer = iconSetting.controlEl.createDiv({
            cls: "workspace-icon-selector",
        });
        createWorkspaceIconSelector(iconContainer, this.plugin, this.selectedIcon, (iconId) => {
            this.selectedIcon = iconId;
        });
        // Base workspace selector
        new Setting(contentEl)
            .setName(t("Copy Settings From"))
            .setDesc(t("Copy settings from an existing workspace"))
            .addDropdown((dropdown) => {
            var _a, _b;
            dropdown.addOption("", t("Default settings"));
            const currentWorkspace = (_a = this.plugin.workspaceManager) === null || _a === void 0 ? void 0 : _a.getActiveWorkspace();
            if (currentWorkspace) {
                dropdown.addOption(currentWorkspace.id, `Current (${currentWorkspace.name})`);
            }
            (_b = this.plugin.workspaceManager) === null || _b === void 0 ? void 0 : _b.getAllWorkspaces().forEach((ws) => {
                if (ws.id !== (currentWorkspace === null || currentWorkspace === void 0 ? void 0 : currentWorkspace.id)) {
                    dropdown.addOption(ws.id, ws.name);
                }
            });
            dropdown.onChange((value) => {
                this.selectWorkspaceId = value;
            });
            this.baseSelect = dropdown.selectEl;
        });
        // Buttons
        const buttonContainer = contentEl.createDiv({
            cls: "modal-button-container",
        });
        const createButton = buttonContainer.createEl("button", {
            text: t("Create"),
            cls: "mod-cta",
        });
        const cancelButton = buttonContainer.createEl("button", {
            text: t("Cancel"),
        });
        createButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
            const name = this.name.trim();
            const baseId = this.selectWorkspaceId || undefined;
            if (!name) {
                new Notice(t("Please enter a workspace name"));
                return;
            }
            if (this.plugin.workspaceManager) {
                console.log("[TG-WORKSPACE] modal:create", {
                    name,
                    baseId,
                    icon: this.selectedIcon,
                });
                const workspace = yield this.plugin.workspaceManager.createWorkspace(name, baseId, this.selectedIcon);
                new Notice(t('Workspace "{{name}}" created', {
                    interpolation: { name: name },
                }));
                this.onCreated(workspace);
                this.close();
            }
        }));
        cancelButton.addEventListener("click", () => {
            this.close();
        });
        // Focus the name input
        this.nameInput.focus();
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
/**
 * Modal for renaming a workspace
 */
export class RenameWorkspaceModal extends Modal {
    constructor(plugin, workspace, onRenamed) {
        super(plugin.app);
        this.plugin = plugin;
        this.workspace = workspace;
        this.onRenamed = onRenamed;
        this.selectedIcon = workspace.icon || "layers";
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: t("Rename Workspace") });
        // Name input
        new Setting(contentEl)
            .setName(t("New Name"))
            .addText((text) => {
            text
                .setValue(this.workspace.name)
                .setPlaceholder(t("Enter new name"));
            this.nameInput = text.inputEl;
        });
        // Icon selection
        const iconSetting = new Setting(contentEl)
            .setName(t("Workspace Icon"))
            .setDesc(t("Choose an icon for this workspace"));
        const iconContainer = iconSetting.controlEl.createDiv({
            cls: "workspace-icon-selector",
        });
        createWorkspaceIconSelector(iconContainer, this.plugin, this.selectedIcon, (iconId) => {
            this.selectedIcon = iconId;
        });
        // Buttons
        const buttonContainer = contentEl.createDiv({
            cls: "modal-button-container",
        });
        const saveButton = buttonContainer.createEl("button", {
            text: t("Save"),
            cls: "mod-cta",
        });
        const cancelButton = buttonContainer.createEl("button", {
            text: t("Cancel"),
        });
        saveButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
            const newName = this.nameInput.value.trim();
            if (!newName) {
                new Notice(t("Please enter a name"));
                return;
            }
            if (this.plugin.workspaceManager) {
                console.log("[TG-WORKSPACE] modal:rename", {
                    id: this.workspace.id,
                    name: newName,
                    icon: this.selectedIcon,
                });
                yield this.plugin.workspaceManager.renameWorkspace(this.workspace.id, newName, this.selectedIcon);
                new Notice(t("Workspace updated"));
                this.onRenamed();
                this.close();
            }
        }));
        cancelButton.addEventListener("click", () => {
            this.close();
        });
        // Focus and select the name input
        this.nameInput.focus();
        this.nameInput.select();
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
/**
 * Modal for deleting a workspace
 */
export class DeleteWorkspaceModal extends Modal {
    constructor(plugin, workspace, onDeleted) {
        super(plugin.app);
        this.plugin = plugin;
        this.workspace = workspace;
        this.onDeleted = onDeleted;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: t("Delete Workspace") });
        contentEl.createEl("p", {
            text: t('Are you sure you want to delete "{{name}}"? This action cannot be undone.', { interpolation: { name: this.workspace.name } }),
        });
        const buttonContainer = contentEl.createDiv({
            cls: "modal-button-container",
        });
        const deleteButton = buttonContainer.createEl("button", {
            text: t("Delete"),
            cls: "mod-warning",
        });
        const cancelButton = buttonContainer.createEl("button", {
            text: t("Cancel"),
        });
        deleteButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
            if (this.plugin.workspaceManager) {
                console.log("[TG-WORKSPACE] modal:delete", {
                    id: this.workspace.id,
                });
                yield this.plugin.workspaceManager.deleteWorkspace(this.workspace.id);
                new Notice(t('Workspace "{{name}}" deleted', {
                    interpolation: { name: this.workspace.name },
                }));
                this.onDeleted();
                this.close();
            }
        }));
        cancelButton.addEventListener("click", () => {
            this.close();
        });
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV29ya3NwYWNlTW9kYWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiV29ya3NwYWNlTW9kYWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFXLE1BQU0sVUFBVSxDQUFDO0FBRzVFLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFaEU7O0dBRUc7QUFDSCxNQUFNLFVBQVUsMkJBQTJCLENBQzFDLFdBQXdCLEVBQ3hCLE1BQTZCLEVBQzdCLFdBQW1CLEVBQ25CLGNBQXdDO0lBRXhDLE1BQU0sVUFBVSxHQUFHLElBQUksZUFBZSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3BELFVBQVUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7SUFFaEMsY0FBYyxDQUFDLFVBQVUsRUFBRTtRQUMxQixXQUFXO1FBQ1gsTUFBTTtRQUNOLGNBQWMsRUFBRSxDQUFDLE1BQWMsRUFBRSxFQUFFO1lBQ2xDLFVBQVUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDM0IsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hCLENBQUM7S0FDRCxDQUFDLENBQUM7SUFFSCxPQUFPLFVBQVUsQ0FBQztBQUNuQixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsS0FBSztJQU85QyxZQUNTLE1BQTZCLEVBQzdCLFNBQTZDO1FBRXJELEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFIVixXQUFNLEdBQU4sTUFBTSxDQUF1QjtRQUM3QixjQUFTLEdBQVQsU0FBUyxDQUFvQztRQU45QyxpQkFBWSxHQUFXLFFBQVEsQ0FBQztRQUNoQyxTQUFJLEdBQVcsRUFBRSxDQUFDO1FBQ2xCLHNCQUFpQixHQUFXLEVBQUUsQ0FB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QVksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBUyxFQUFFO1lBQ2pELElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRTtnQkFDakMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsRUFBRTtvQkFDMUMsRUFBRSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtpQkFDckIsQ0FBQyxDQUFDO2dCQUVILE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQ2pELElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUNqQixDQUFDO2dCQUVGLElBQUksTUFBTSxDQUNULENBQUMsQ0FBQyw4QkFBOEIsRUFBRTtvQkFDakMsYUFBYSxFQUFFLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFDO2lCQUMxQyxDQUFDLENBQ0YsQ0FBQztnQkFFRixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2pCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQzthQUNiO1FBQ0YsQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUVILFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQzNDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELE9BQU87UUFDTixNQUFNLEVBQUMsU0FBUyxFQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNuQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNb2RhbCwgTm90aWNlLCBTZXR0aW5nLCBCdXR0b25Db21wb25lbnQsIHNldEljb24gfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHR5cGUgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IFdvcmtzcGFjZURhdGEgfSBmcm9tIFwiQC90eXBlcy93b3Jrc3BhY2VcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgYXR0YWNoSWNvbk1lbnUgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL21lbnVzL0ljb25NZW51XCI7XHJcblxyXG4vKipcclxuICogSGVscGVyIGZ1bmN0aW9uIHRvIGNyZWF0ZSBhIHdvcmtzcGFjZSBpY29uIHNlbGVjdG9yXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlV29ya3NwYWNlSWNvblNlbGVjdG9yKFxyXG5cdGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRpbml0aWFsSWNvbjogc3RyaW5nLFxyXG5cdG9uSWNvblNlbGVjdGVkOiAoaWNvbklkOiBzdHJpbmcpID0+IHZvaWRcclxuKTogQnV0dG9uQ29tcG9uZW50IHtcclxuXHRjb25zdCBpY29uQnV0dG9uID0gbmV3IEJ1dHRvbkNvbXBvbmVudChjb250YWluZXJFbCk7XHJcblx0aWNvbkJ1dHRvbi5zZXRJY29uKGluaXRpYWxJY29uKTtcclxuXHJcblx0YXR0YWNoSWNvbk1lbnUoaWNvbkJ1dHRvbiwge1xyXG5cdFx0Y29udGFpbmVyRWwsXHJcblx0XHRwbHVnaW4sXHJcblx0XHRvbkljb25TZWxlY3RlZDogKGljb25JZDogc3RyaW5nKSA9PiB7XHJcblx0XHRcdGljb25CdXR0b24uc2V0SWNvbihpY29uSWQpO1xyXG5cdFx0XHRvbkljb25TZWxlY3RlZChpY29uSWQpO1xyXG5cdFx0fSxcclxuXHR9KTtcclxuXHJcblx0cmV0dXJuIGljb25CdXR0b247XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBNb2RhbCBmb3IgY3JlYXRpbmcgYSBuZXcgd29ya3NwYWNlXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQ3JlYXRlV29ya3NwYWNlTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcblx0cHJpdmF0ZSBuYW1lSW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBiYXNlU2VsZWN0OiBIVE1MU2VsZWN0RWxlbWVudDtcclxuXHRwcml2YXRlIHNlbGVjdGVkSWNvbjogc3RyaW5nID0gXCJsYXllcnNcIjtcclxuXHRwcml2YXRlIG5hbWU6IHN0cmluZyA9IFwiXCI7XHJcblx0cHJpdmF0ZSBzZWxlY3RXb3Jrc3BhY2VJZDogc3RyaW5nID0gXCJcIjtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cHJpdmF0ZSBvbkNyZWF0ZWQ6ICh3b3Jrc3BhY2U6IFdvcmtzcGFjZURhdGEpID0+IHZvaWRcclxuXHQpIHtcclxuXHRcdHN1cGVyKHBsdWdpbi5hcHApO1xyXG5cdH1cclxuXHJcblx0b25PcGVuKCkge1xyXG5cdFx0Y29uc3Qge2NvbnRlbnRFbH0gPSB0aGlzO1xyXG5cdFx0Y29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwge3RleHQ6IHQoXCJDcmVhdGUgTmV3IFdvcmtzcGFjZVwiKX0pO1xyXG5cclxuXHRcdC8vIE5hbWUgaW5wdXRcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0LnNldE5hbWUodChcIldvcmtzcGFjZSBOYW1lXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiQSBkZXNjcmlwdGl2ZSBuYW1lIGZvciB0aGUgd29ya3NwYWNlXCIpKVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdHRleHRcclxuXHRcdFx0XHRcdC5zZXRQbGFjZWhvbGRlcih0KFwiRW50ZXIgd29ya3NwYWNlIG5hbWVcIikpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoXCJcIilcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5uYW1lID0gdmFsdWU7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR0aGlzLm5hbWVJbnB1dCA9IHRleHQuaW5wdXRFbDtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gSWNvbiBzZWxlY3Rpb25cclxuXHRcdGNvbnN0IGljb25TZXR0aW5nID0gbmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiV29ya3NwYWNlIEljb25cIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJDaG9vc2UgYW4gaWNvbiBmb3IgdGhpcyB3b3Jrc3BhY2VcIikpO1xyXG5cclxuXHRcdGNvbnN0IGljb25Db250YWluZXIgPSBpY29uU2V0dGluZy5jb250cm9sRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcIndvcmtzcGFjZS1pY29uLXNlbGVjdG9yXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjcmVhdGVXb3Jrc3BhY2VJY29uU2VsZWN0b3IoXHJcblx0XHRcdGljb25Db250YWluZXIsXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR0aGlzLnNlbGVjdGVkSWNvbixcclxuXHRcdFx0KGljb25JZCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuc2VsZWN0ZWRJY29uID0gaWNvbklkO1xyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIEJhc2Ugd29ya3NwYWNlIHNlbGVjdG9yXHJcblx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJDb3B5IFNldHRpbmdzIEZyb21cIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJDb3B5IHNldHRpbmdzIGZyb20gYW4gZXhpc3Rpbmcgd29ya3NwYWNlXCIpKVxyXG5cdFx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XHJcblx0XHRcdFx0ZHJvcGRvd24uYWRkT3B0aW9uKFwiXCIsIHQoXCJEZWZhdWx0IHNldHRpbmdzXCIpKTtcclxuXHJcblx0XHRcdFx0Y29uc3QgY3VycmVudFdvcmtzcGFjZSA9IHRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXI/LmdldEFjdGl2ZVdvcmtzcGFjZSgpO1xyXG5cdFx0XHRcdGlmIChjdXJyZW50V29ya3NwYWNlKSB7XHJcblx0XHRcdFx0XHRkcm9wZG93bi5hZGRPcHRpb24oXHJcblx0XHRcdFx0XHRcdGN1cnJlbnRXb3Jrc3BhY2UuaWQsXHJcblx0XHRcdFx0XHRcdGBDdXJyZW50ICgke2N1cnJlbnRXb3Jrc3BhY2UubmFtZX0pYFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXJcclxuXHRcdFx0XHRcdD8uZ2V0QWxsV29ya3NwYWNlcygpXHJcblx0XHRcdFx0XHQuZm9yRWFjaCgod3MpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKHdzLmlkICE9PSBjdXJyZW50V29ya3NwYWNlPy5pZCkge1xyXG5cdFx0XHRcdFx0XHRcdGRyb3Bkb3duLmFkZE9wdGlvbih3cy5pZCwgd3MubmFtZSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRkcm9wZG93bi5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuc2VsZWN0V29ya3NwYWNlSWQgPSB2YWx1ZTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0dGhpcy5iYXNlU2VsZWN0ID0gZHJvcGRvd24uc2VsZWN0RWw7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIEJ1dHRvbnNcclxuXHRcdGNvbnN0IGJ1dHRvbkNvbnRhaW5lciA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwibW9kYWwtYnV0dG9uLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgY3JlYXRlQnV0dG9uID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIkNyZWF0ZVwiKSxcclxuXHRcdFx0Y2xzOiBcIm1vZC1jdGFcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGNhbmNlbEJ1dHRvbiA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJDYW5jZWxcIiksXHJcblx0XHR9KTtcclxuXHJcblx0XHRjcmVhdGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbmFtZSA9IHRoaXMubmFtZS50cmltKCk7XHJcblx0XHRcdGNvbnN0IGJhc2VJZCA9IHRoaXMuc2VsZWN0V29ya3NwYWNlSWQgfHwgdW5kZWZpbmVkO1xyXG5cclxuXHRcdFx0aWYgKCFuYW1lKSB7XHJcblx0XHRcdFx0bmV3IE5vdGljZSh0KFwiUGxlYXNlIGVudGVyIGEgd29ya3NwYWNlIG5hbWVcIikpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIltURy1XT1JLU1BBQ0VdIG1vZGFsOmNyZWF0ZVwiLCB7XHJcblx0XHRcdFx0XHRuYW1lLFxyXG5cdFx0XHRcdFx0YmFzZUlkLFxyXG5cdFx0XHRcdFx0aWNvbjogdGhpcy5zZWxlY3RlZEljb24sXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IHRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXIuY3JlYXRlV29ya3NwYWNlKFxyXG5cdFx0XHRcdFx0bmFtZSxcclxuXHRcdFx0XHRcdGJhc2VJZCxcclxuXHRcdFx0XHRcdHRoaXMuc2VsZWN0ZWRJY29uXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0bmV3IE5vdGljZShcclxuXHRcdFx0XHRcdHQoJ1dvcmtzcGFjZSBcInt7bmFtZX19XCIgY3JlYXRlZCcsIHtcclxuXHRcdFx0XHRcdFx0aW50ZXJwb2xhdGlvbjoge25hbWU6IG5hbWV9LFxyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHR0aGlzLm9uQ3JlYXRlZCh3b3Jrc3BhY2UpO1xyXG5cdFx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y2FuY2VsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEZvY3VzIHRoZSBuYW1lIGlucHV0XHJcblx0XHR0aGlzLm5hbWVJbnB1dC5mb2N1cygpO1xyXG5cdH1cclxuXHJcblx0b25DbG9zZSgpIHtcclxuXHRcdGNvbnN0IHtjb250ZW50RWx9ID0gdGhpcztcclxuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIE1vZGFsIGZvciByZW5hbWluZyBhIHdvcmtzcGFjZVxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJlbmFtZVdvcmtzcGFjZU1vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG5cdHByaXZhdGUgbmFtZUlucHV0OiBIVE1MSW5wdXRFbGVtZW50O1xyXG5cdHByaXZhdGUgc2VsZWN0ZWRJY29uOiBzdHJpbmc7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdHByaXZhdGUgd29ya3NwYWNlOiBXb3Jrc3BhY2VEYXRhLFxyXG5cdFx0cHJpdmF0ZSBvblJlbmFtZWQ6ICgpID0+IHZvaWRcclxuXHQpIHtcclxuXHRcdHN1cGVyKHBsdWdpbi5hcHApO1xyXG5cdFx0dGhpcy5zZWxlY3RlZEljb24gPSB3b3Jrc3BhY2UuaWNvbiB8fCBcImxheWVyc1wiO1xyXG5cdH1cclxuXHJcblx0b25PcGVuKCkge1xyXG5cdFx0Y29uc3Qge2NvbnRlbnRFbH0gPSB0aGlzO1xyXG5cdFx0Y29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwge3RleHQ6IHQoXCJSZW5hbWUgV29ya3NwYWNlXCIpfSk7XHJcblxyXG5cdFx0Ly8gTmFtZSBpbnB1dFxyXG5cdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiTmV3IE5hbWVcIikpXHJcblx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0dGV4dFxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKHRoaXMud29ya3NwYWNlLm5hbWUpXHJcblx0XHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIodChcIkVudGVyIG5ldyBuYW1lXCIpKTtcclxuXHRcdFx0XHR0aGlzLm5hbWVJbnB1dCA9IHRleHQuaW5wdXRFbDtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gSWNvbiBzZWxlY3Rpb25cclxuXHRcdGNvbnN0IGljb25TZXR0aW5nID0gbmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiV29ya3NwYWNlIEljb25cIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJDaG9vc2UgYW4gaWNvbiBmb3IgdGhpcyB3b3Jrc3BhY2VcIikpO1xyXG5cclxuXHRcdGNvbnN0IGljb25Db250YWluZXIgPSBpY29uU2V0dGluZy5jb250cm9sRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcIndvcmtzcGFjZS1pY29uLXNlbGVjdG9yXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjcmVhdGVXb3Jrc3BhY2VJY29uU2VsZWN0b3IoXHJcblx0XHRcdGljb25Db250YWluZXIsXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR0aGlzLnNlbGVjdGVkSWNvbixcclxuXHRcdFx0KGljb25JZCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuc2VsZWN0ZWRJY29uID0gaWNvbklkO1xyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIEJ1dHRvbnNcclxuXHRcdGNvbnN0IGJ1dHRvbkNvbnRhaW5lciA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwibW9kYWwtYnV0dG9uLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3Qgc2F2ZUJ1dHRvbiA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJTYXZlXCIpLFxyXG5cdFx0XHRjbHM6IFwibW9kLWN0YVwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgY2FuY2VsQnV0dG9uID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIkNhbmNlbFwiKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdHNhdmVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbmV3TmFtZSA9IHRoaXMubmFtZUlucHV0LnZhbHVlLnRyaW0oKTtcclxuXHJcblx0XHRcdGlmICghbmV3TmFtZSkge1xyXG5cdFx0XHRcdG5ldyBOb3RpY2UodChcIlBsZWFzZSBlbnRlciBhIG5hbWVcIikpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIltURy1XT1JLU1BBQ0VdIG1vZGFsOnJlbmFtZVwiLCB7XHJcblx0XHRcdFx0XHRpZDogdGhpcy53b3Jrc3BhY2UuaWQsXHJcblx0XHRcdFx0XHRuYW1lOiBuZXdOYW1lLFxyXG5cdFx0XHRcdFx0aWNvbjogdGhpcy5zZWxlY3RlZEljb24sXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGF3YWl0IHRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXIucmVuYW1lV29ya3NwYWNlKFxyXG5cdFx0XHRcdFx0dGhpcy53b3Jrc3BhY2UuaWQsXHJcblx0XHRcdFx0XHRuZXdOYW1lLFxyXG5cdFx0XHRcdFx0dGhpcy5zZWxlY3RlZEljb25cclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRuZXcgTm90aWNlKHQoXCJXb3Jrc3BhY2UgdXBkYXRlZFwiKSk7XHJcblx0XHRcdFx0dGhpcy5vblJlbmFtZWQoKTtcclxuXHRcdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGNhbmNlbEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBGb2N1cyBhbmQgc2VsZWN0IHRoZSBuYW1lIGlucHV0XHJcblx0XHR0aGlzLm5hbWVJbnB1dC5mb2N1cygpO1xyXG5cdFx0dGhpcy5uYW1lSW5wdXQuc2VsZWN0KCk7XHJcblx0fVxyXG5cclxuXHRvbkNsb3NlKCkge1xyXG5cdFx0Y29uc3Qge2NvbnRlbnRFbH0gPSB0aGlzO1xyXG5cdFx0Y29udGVudEVsLmVtcHR5KCk7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogTW9kYWwgZm9yIGRlbGV0aW5nIGEgd29ya3NwYWNlXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgRGVsZXRlV29ya3NwYWNlTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cHJpdmF0ZSB3b3Jrc3BhY2U6IFdvcmtzcGFjZURhdGEsXHJcblx0XHRwcml2YXRlIG9uRGVsZXRlZDogKCkgPT4gdm9pZFxyXG5cdCkge1xyXG5cdFx0c3VwZXIocGx1Z2luLmFwcCk7XHJcblx0fVxyXG5cclxuXHRvbk9wZW4oKSB7XHJcblx0XHRjb25zdCB7Y29udGVudEVsfSA9IHRoaXM7XHJcblx0XHRjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7dGV4dDogdChcIkRlbGV0ZSBXb3Jrc3BhY2VcIil9KTtcclxuXHJcblx0XHRjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHQnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSBcInt7bmFtZX19XCI/IFRoaXMgYWN0aW9uIGNhbm5vdCBiZSB1bmRvbmUuJyxcclxuXHRcdFx0XHR7aW50ZXJwb2xhdGlvbjoge25hbWU6IHRoaXMud29ya3NwYWNlLm5hbWV9fVxyXG5cdFx0XHQpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgYnV0dG9uQ29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJtb2RhbC1idXR0b24tY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBkZWxldGVCdXR0b24gPSBidXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiRGVsZXRlXCIpLFxyXG5cdFx0XHRjbHM6IFwibW9kLXdhcm5pbmdcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGNhbmNlbEJ1dHRvbiA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJDYW5jZWxcIiksXHJcblx0XHR9KTtcclxuXHJcblx0XHRkZWxldGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0aWYgKHRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIltURy1XT1JLU1BBQ0VdIG1vZGFsOmRlbGV0ZVwiLCB7XHJcblx0XHRcdFx0XHRpZDogdGhpcy53b3Jrc3BhY2UuaWQsXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGF3YWl0IHRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXIuZGVsZXRlV29ya3NwYWNlKFxyXG5cdFx0XHRcdFx0dGhpcy53b3Jrc3BhY2UuaWRcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0dCgnV29ya3NwYWNlIFwie3tuYW1lfX1cIiBkZWxldGVkJywge1xyXG5cdFx0XHRcdFx0XHRpbnRlcnBvbGF0aW9uOiB7bmFtZTogdGhpcy53b3Jrc3BhY2UubmFtZX0sXHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdHRoaXMub25EZWxldGVkKCk7XHJcblx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRjYW5jZWxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRvbkNsb3NlKCkge1xyXG5cdFx0Y29uc3Qge2NvbnRlbnRFbH0gPSB0aGlzO1xyXG5cdFx0Y29udGVudEVsLmVtcHR5KCk7XHJcblx0fVxyXG59XHJcbiJdfQ==