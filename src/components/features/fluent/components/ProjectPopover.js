import { Component, Modal } from "obsidian";
import { createPopper } from "@popperjs/core";
import { t } from "@/translations/helper";
export class ProjectPopover extends Component {
    constructor(plugin, referenceEl, onSave, onClose) {
        super();
        this.popoverEl = null;
        this.nameInput = null;
        this.selectedColor = "#3498db";
        this.popperInstance = null;
        this.clickHandler = null;
        this.escapeHandler = null;
        this.colors = [
            "#e74c3c",
            "#3498db",
            "#2ecc71",
            "#f39c12",
            "#9b59b6",
            "#1abc9c",
            "#34495e",
            "#e67e22",
            "#16a085",
            "#27ae60",
            "#2980b9",
            "#8e44ad",
            "#2c3e50",
            "#f1c40f",
            "#d35400",
        ];
        this.plugin = plugin;
        this.referenceEl = referenceEl;
        this.onSave = onSave;
        this.onClose = onClose;
    }
    onload() {
        this.createPopover();
        this.setupPopper();
        this.setupEventHandlers();
    }
    onunload() {
        this.cleanup();
    }
    createPopover() {
        this.popoverEl = document.createElement("div");
        this.popoverEl.addClass("fluent-project-popover-container");
        document.body.appendChild(this.popoverEl);
        const popover = this.popoverEl.createDiv({
            cls: "fluent-project-popover",
        });
        // Arrow
        const arrow = popover.createDiv({ cls: "fluent-popover-arrow" });
        arrow.setAttribute("data-popper-arrow", "");
        // Content
        const content = popover.createDiv({ cls: "fluent-popover-content" });
        // Title
        const header = content.createDiv({ cls: "fluent-popover-header" });
        header.createEl("h3", { text: t("New Project") });
        // Name input
        const nameSection = content.createDiv({
            cls: "fluent-popover-section",
        });
        nameSection.createEl("label", { text: t("Project Name") });
        this.nameInput = nameSection.createEl("input", {
            cls: "fluent-popover-input",
            attr: {
                type: "text",
                placeholder: t("Enter project name"),
            },
        });
        // Color picker
        const colorSection = content.createDiv({
            cls: "fluent-popover-section",
        });
        colorSection.createEl("label", { text: t("Choose Color") });
        const colorGrid = colorSection.createDiv({ cls: "fluent-color-grid" });
        this.colors.forEach((color) => {
            const colorButton = colorGrid.createDiv({
                cls: "fluent-color-button",
                attr: { "data-color": color },
            });
            colorButton.style.backgroundColor = color;
            if (color === this.selectedColor) {
                colorButton.addClass("is-selected");
            }
            this.registerDomEvent(colorButton, "click", () => {
                this.selectColor(color);
            });
        });
        // Action buttons
        const actions = content.createDiv({ cls: "fluent-popover-actions" });
        const cancelBtn = actions.createEl("button", {
            cls: "fluent-button fluent-button-secondary",
            text: t("Cancel"),
        });
        this.registerDomEvent(cancelBtn, "click", () => this.close());
        const saveBtn = actions.createEl("button", {
            cls: "fluent-button fluent-button-primary",
            text: t("Create"),
        });
        this.registerDomEvent(saveBtn, "click", () => this.save());
        // Handle Enter key on input
        this.registerDomEvent(this.nameInput, "keydown", (e) => {
            var _a;
            if (e.key === "Enter" && ((_a = this.nameInput) === null || _a === void 0 ? void 0 : _a.value.trim())) {
                this.save();
            }
        });
        // Focus input
        setTimeout(() => { var _a; return (_a = this.nameInput) === null || _a === void 0 ? void 0 : _a.focus(); }, 50);
    }
    setupPopper() {
        if (!this.popoverEl)
            return;
        const popover = this.popoverEl.querySelector(".fluent-project-popover");
        if (!popover)
            return;
        this.popperInstance = createPopper(this.referenceEl, popover, {
            placement: "bottom-start",
            modifiers: [
                {
                    name: "offset",
                    options: {
                        offset: [0, 8],
                    },
                },
                {
                    name: "arrow",
                    options: {
                        element: ".fluent-popover-arrow",
                        padding: 8,
                    },
                },
                {
                    name: "preventOverflow",
                    options: {
                        boundary: "viewport",
                        padding: 8,
                    },
                },
                {
                    name: "flip",
                    options: {
                        fallbackPlacements: ["top-start", "right", "left"],
                    },
                },
            ],
        });
    }
    setupEventHandlers() {
        // Click outside to close
        this.clickHandler = (e) => {
            if (this.popoverEl &&
                !this.popoverEl.contains(e.target) &&
                !this.referenceEl.contains(e.target)) {
                this.close();
            }
        };
        // Delay to avoid immediate close
        setTimeout(() => {
            if (this.clickHandler) {
                document.addEventListener("click", this.clickHandler);
            }
        }, 0);
        // Escape key to close
        this.escapeHandler = (e) => {
            if (e.key === "Escape") {
                this.close();
            }
        };
        document.addEventListener("keydown", this.escapeHandler);
    }
    selectColor(color) {
        if (!this.popoverEl)
            return;
        this.selectedColor = color;
        // Update selected state
        this.popoverEl
            .querySelectorAll(".fluent-color-button")
            .forEach((btn) => {
            btn.removeClass("is-selected");
        });
        const selectedBtn = this.popoverEl.querySelector(`[data-color="${color}"]`);
        selectedBtn === null || selectedBtn === void 0 ? void 0 : selectedBtn.addClass("is-selected");
    }
    save() {
        if (!this.nameInput)
            return;
        const inputValue = this.nameInput.value.trim();
        if (!inputValue) {
            this.nameInput.focus();
            this.nameInput.addClass("is-error");
            setTimeout(() => { var _a; return (_a = this.nameInput) === null || _a === void 0 ? void 0 : _a.removeClass("is-error"); }, 300);
            return;
        }
        // Convert spaces to dashes for internal name, keep original for display
        const internalName = inputValue.replace(/\s+/g, "-");
        const displayName = inputValue;
        const project = {
            id: `project-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
            name: internalName,
            displayName: displayName,
            color: this.selectedColor,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        this.onSave(project);
        this.close();
    }
    close() {
        this.onClose();
        this.unload();
    }
    cleanup() {
        // Clean up event listeners
        if (this.clickHandler) {
            document.removeEventListener("click", this.clickHandler);
            this.clickHandler = null;
        }
        if (this.escapeHandler) {
            document.removeEventListener("keydown", this.escapeHandler);
            this.escapeHandler = null;
        }
        // Clean up Popper instance
        if (this.popperInstance) {
            this.popperInstance.destroy();
            this.popperInstance = null;
        }
        // Remove DOM elements
        if (this.popoverEl) {
            this.popoverEl.remove();
            this.popoverEl = null;
        }
    }
}
export class EditProjectPopover extends Component {
    constructor(plugin, referenceEl, project, onSave, onClose) {
        super();
        this.popoverEl = null;
        this.nameInput = null;
        this.displayNameInput = null;
        this.popperInstance = null;
        this.clickHandler = null;
        this.escapeHandler = null;
        this.colors = [
            "#e74c3c",
            "#3498db",
            "#2ecc71",
            "#f39c12",
            "#9b59b6",
            "#1abc9c",
            "#34495e",
            "#e67e22",
            "#16a085",
            "#27ae60",
            "#2980b9",
            "#8e44ad",
            "#2c3e50",
            "#f1c40f",
            "#d35400",
        ];
        this.plugin = plugin;
        this.referenceEl = referenceEl;
        this.project = Object.assign({}, project); // Clone the project to avoid direct mutation
        this.onSave = onSave;
        this.onClose = onClose;
        this.selectedColor = project.color || "#3498db";
    }
    onload() {
        this.createPopover();
        this.setupPopper();
        this.setupEventHandlers();
    }
    onunload() {
        this.cleanup();
    }
    createPopover() {
        this.popoverEl = document.createElement("div");
        this.popoverEl.addClass("fluent-project-popover-container");
        document.body.appendChild(this.popoverEl);
        const popover = this.popoverEl.createDiv({
            cls: "fluent-project-popover",
        });
        // Arrow
        const arrow = popover.createDiv({ cls: "fluent-popover-arrow" });
        arrow.setAttribute("data-popper-arrow", "");
        // Content
        const content = popover.createDiv({ cls: "fluent-popover-content" });
        // Title
        const header = content.createDiv({ cls: "fluent-popover-header" });
        header.createEl("h3", { text: t("Edit Project") });
        // Display name input
        const displayNameSection = content.createDiv({
            cls: "fluent-popover-section",
        });
        displayNameSection.createEl("label", { text: t("Display Name") });
        this.displayNameInput = displayNameSection.createEl("input", {
            cls: "fluent-popover-input",
            attr: {
                type: "text",
                placeholder: t("Enter display name"),
                value: this.project.displayName || this.project.name,
            },
        });
        // Color picker
        const colorSection = content.createDiv({
            cls: "fluent-popover-section",
        });
        colorSection.createEl("label", { text: t("Choose Color") });
        const colorGrid = colorSection.createDiv({ cls: "fluent-color-grid" });
        this.colors.forEach((color) => {
            const colorButton = colorGrid.createDiv({
                cls: "fluent-color-button",
                attr: { "data-color": color },
            });
            colorButton.style.backgroundColor = color;
            if (color === this.selectedColor) {
                colorButton.addClass("is-selected");
            }
            this.registerDomEvent(colorButton, "click", () => {
                this.selectColor(color);
            });
        });
        // Action buttons
        const actions = content.createDiv({ cls: "fluent-popover-actions" });
        const cancelBtn = actions.createEl("button", {
            cls: "fluent-button fluent-button-secondary",
            text: t("Cancel"),
        });
        this.registerDomEvent(cancelBtn, "click", () => this.close());
        const saveBtn = actions.createEl("button", {
            cls: "fluent-button fluent-button-primary",
            text: t("Save"),
        });
        this.registerDomEvent(saveBtn, "click", () => this.save());
        // Handle Enter key on input
        this.registerDomEvent(this.displayNameInput, "keydown", (e) => {
            if (e.key === "Enter") {
                this.save();
            }
        });
        // Focus input
        setTimeout(() => { var _a; return (_a = this.displayNameInput) === null || _a === void 0 ? void 0 : _a.focus(); }, 50);
    }
    setupPopper() {
        if (!this.popoverEl)
            return;
        const popover = this.popoverEl.querySelector(".fluent-project-popover");
        if (!popover)
            return;
        this.popperInstance = createPopper(this.referenceEl, popover, {
            placement: "bottom-start",
            modifiers: [
                {
                    name: "offset",
                    options: {
                        offset: [0, 8],
                    },
                },
                {
                    name: "arrow",
                    options: {
                        element: ".fluent-popover-arrow",
                        padding: 8,
                    },
                },
                {
                    name: "preventOverflow",
                    options: {
                        boundary: "viewport",
                        padding: 8,
                    },
                },
                {
                    name: "flip",
                    options: {
                        fallbackPlacements: ["top-start", "right", "left"],
                    },
                },
            ],
        });
    }
    setupEventHandlers() {
        // Click outside to close
        this.clickHandler = (e) => {
            if (this.popoverEl &&
                !this.popoverEl.contains(e.target) &&
                !this.referenceEl.contains(e.target)) {
                this.close();
            }
        };
        // Delay to avoid immediate close
        setTimeout(() => {
            if (this.clickHandler) {
                document.addEventListener("click", this.clickHandler);
            }
        }, 0);
        // Escape key to close
        this.escapeHandler = (e) => {
            if (e.key === "Escape") {
                this.close();
            }
        };
        document.addEventListener("keydown", this.escapeHandler);
    }
    selectColor(color) {
        if (!this.popoverEl)
            return;
        this.selectedColor = color;
        // Update selected state
        this.popoverEl
            .querySelectorAll(".fluent-color-button")
            .forEach((btn) => {
            btn.removeClass("is-selected");
        });
        const selectedBtn = this.popoverEl.querySelector(`[data-color="${color}"]`);
        selectedBtn === null || selectedBtn === void 0 ? void 0 : selectedBtn.addClass("is-selected");
    }
    save() {
        if (!this.displayNameInput)
            return;
        const displayNameValue = this.displayNameInput.value.trim();
        // Update the project object
        this.project.displayName = displayNameValue || this.project.name;
        this.project.color = this.selectedColor;
        this.project.updatedAt = Date.now();
        this.onSave(this.project);
        this.close();
    }
    close() {
        this.onClose();
        this.unload();
    }
    cleanup() {
        // Clean up event listeners
        if (this.clickHandler) {
            document.removeEventListener("click", this.clickHandler);
            this.clickHandler = null;
        }
        if (this.escapeHandler) {
            document.removeEventListener("keydown", this.escapeHandler);
            this.escapeHandler = null;
        }
        // Clean up Popper instance
        if (this.popperInstance) {
            this.popperInstance.destroy();
            this.popperInstance = null;
        }
        // Remove DOM elements
        if (this.popoverEl) {
            this.popoverEl.remove();
            this.popoverEl = null;
        }
    }
}
export class ProjectModal extends Modal {
    constructor(app, plugin, onSave) {
        super(app);
        this.nameInput = null;
        this.selectedColor = "#3498db";
        this.eventListeners = [];
        this.colors = [
            "#e74c3c",
            "#3498db",
            "#2ecc71",
            "#f39c12",
            "#9b59b6",
            "#1abc9c",
            "#34495e",
            "#e67e22",
            "#16a085",
            "#27ae60",
            "#2980b9",
            "#8e44ad",
            "#2c3e50",
            "#f1c40f",
            "#d35400",
        ];
        this.plugin = plugin;
        this.onSave = onSave;
    }
    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }
    onOpen() {
        const { contentEl } = this;
        // Add custom class for styling
        this.modalEl.addClass("fluent-project-modal");
        // Title
        contentEl.createEl("h2", { text: t("Create New Project") });
        // Name input section
        const nameSection = contentEl.createDiv({
            cls: "fluent-modal-section",
        });
        nameSection.createEl("label", { text: t("Project Name") });
        this.nameInput = nameSection.createEl("input", {
            cls: "fluent-modal-input",
            attr: {
                type: "text",
                placeholder: t("Enter project name"),
            },
        });
        // Color picker section
        const colorSection = contentEl.createDiv({
            cls: "fluent-modal-section",
        });
        colorSection.createEl("label", { text: t("Choose Color") });
        const colorGrid = colorSection.createDiv({
            cls: "fluent-modal-color-grid",
        });
        this.colors.forEach((color) => {
            const colorButton = colorGrid.createDiv({
                cls: "fluent-modal-color-button",
                attr: { "data-color": color },
            });
            colorButton.style.backgroundColor = color;
            if (color === this.selectedColor) {
                colorButton.addClass("is-selected");
            }
            this.addEventListener(colorButton, "click", () => {
                this.selectColor(color);
            });
        });
        // Preview section
        const previewSection = contentEl.createDiv({
            cls: "fluent-modal-section",
        });
        previewSection.createEl("label", { text: t("Preview") });
        const preview = previewSection.createDiv({
            cls: "fluent-modal-preview",
        });
        const previewItem = preview.createDiv({
            cls: "fluent-project-item-preview",
        });
        const previewColor = previewItem.createDiv({
            cls: "fluent-project-color",
        });
        previewColor.style.backgroundColor = this.selectedColor;
        const previewName = previewItem.createSpan({
            cls: "fluent-project-name",
        });
        // Update preview on name change
        this.addEventListener(this.nameInput, "input", () => {
            var _a;
            previewName.setText(((_a = this.nameInput) === null || _a === void 0 ? void 0 : _a.value) || t("Project Name"));
        });
        previewName.setText(t("Project Name"));
        // Footer with action buttons
        const footer = contentEl.createDiv({ cls: "fluent-modal-footer" });
        const cancelBtn = footer.createEl("button", {
            cls: "fluent-button fluent-button-secondary",
            text: t("Cancel"),
        });
        this.addEventListener(cancelBtn, "click", () => this.close());
        const createBtn = footer.createEl("button", {
            cls: "fluent-button fluent-button-primary",
            text: t("Create Project"),
        });
        this.addEventListener(createBtn, "click", () => this.save());
        // Handle Enter key
        this.addEventListener(this.nameInput, "keydown", (e) => {
            var _a;
            if (e.key === "Enter" && ((_a = this.nameInput) === null || _a === void 0 ? void 0 : _a.value.trim())) {
                this.save();
            }
        });
        // Focus input
        setTimeout(() => { var _a; return (_a = this.nameInput) === null || _a === void 0 ? void 0 : _a.focus(); }, 100);
    }
    onClose() {
        // Clean up all event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
        // Clear content
        const { contentEl } = this;
        contentEl.empty();
    }
    selectColor(color) {
        this.selectedColor = color;
        // Update selected state
        this.modalEl
            .querySelectorAll(".fluent-modal-color-button")
            .forEach((btn) => {
            btn.removeClass("is-selected");
        });
        const selectedBtn = this.modalEl.querySelector(`[data-color="${color}"]`);
        selectedBtn === null || selectedBtn === void 0 ? void 0 : selectedBtn.addClass("is-selected");
        // Update preview
        const previewColor = this.modalEl.querySelector(".fluent-project-color");
        if (previewColor) {
            previewColor.style.backgroundColor = color;
        }
    }
    save() {
        if (!this.nameInput)
            return;
        const inputValue = this.nameInput.value.trim();
        if (!inputValue) {
            this.nameInput.focus();
            this.nameInput.addClass("is-error");
            setTimeout(() => { var _a; return (_a = this.nameInput) === null || _a === void 0 ? void 0 : _a.removeClass("is-error"); }, 300);
            return;
        }
        // Convert spaces to dashes for internal name, keep original for display
        const internalName = inputValue.replace(/\s+/g, "-");
        const displayName = inputValue;
        const project = {
            id: `project-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
            name: internalName,
            displayName: displayName,
            color: this.selectedColor,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        this.onSave(project);
        this.close();
    }
}
export class EditProjectModal extends Modal {
    constructor(app, plugin, project, onSave) {
        super(app);
        this.nameInput = null;
        this.displayNameInput = null;
        this.eventListeners = [];
        this.colors = [
            "#e74c3c",
            "#3498db",
            "#2ecc71",
            "#f39c12",
            "#9b59b6",
            "#1abc9c",
            "#34495e",
            "#e67e22",
            "#16a085",
            "#27ae60",
            "#2980b9",
            "#8e44ad",
            "#2c3e50",
            "#f1c40f",
            "#d35400",
        ];
        this.plugin = plugin;
        this.project = Object.assign({}, project); // Clone to avoid direct mutation
        this.onSave = onSave;
        this.selectedColor = project.color || "#3498db";
    }
    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }
    onOpen() {
        const { contentEl } = this;
        // Add custom class for styling
        this.modalEl.addClass("fluent-project-modal");
        // Title
        contentEl.createEl("h2", { text: t("Edit Project") });
        // Display name input section
        const displayNameSection = contentEl.createDiv({
            cls: "fluent-modal-section",
        });
        displayNameSection.createEl("label", { text: t("Display Name") });
        this.displayNameInput = displayNameSection.createEl("input", {
            cls: "fluent-modal-input",
            attr: {
                type: "text",
                placeholder: t("Enter display name"),
                value: this.project.displayName || this.project.name,
            },
        });
        // Color picker section
        const colorSection = contentEl.createDiv({
            cls: "fluent-modal-section",
        });
        colorSection.createEl("label", { text: t("Choose Color") });
        const colorGrid = colorSection.createDiv({
            cls: "fluent-modal-color-grid",
        });
        this.colors.forEach((color) => {
            const colorButton = colorGrid.createDiv({
                cls: "fluent-modal-color-button",
                attr: { "data-color": color },
            });
            colorButton.style.backgroundColor = color;
            if (color === this.selectedColor) {
                colorButton.addClass("is-selected");
            }
            this.addEventListener(colorButton, "click", () => {
                this.selectColor(color);
            });
        });
        // Preview section
        const previewSection = contentEl.createDiv({
            cls: "fluent-modal-section",
        });
        previewSection.createEl("label", { text: t("Preview") });
        const preview = previewSection.createDiv({
            cls: "fluent-modal-preview",
        });
        const previewItem = preview.createDiv({
            cls: "fluent-project-item-preview",
        });
        const previewColor = previewItem.createDiv({
            cls: "fluent-project-color",
        });
        previewColor.style.backgroundColor = this.selectedColor;
        const previewName = previewItem.createSpan({
            cls: "fluent-project-name",
        });
        // Update preview on name change
        this.addEventListener(this.displayNameInput, "input", () => {
            var _a;
            previewName.setText(((_a = this.displayNameInput) === null || _a === void 0 ? void 0 : _a.value) || this.project.name);
        });
        previewName.setText(this.project.displayName || this.project.name);
        // Footer with action buttons
        const footer = contentEl.createDiv({ cls: "fluent-modal-footer" });
        const cancelBtn = footer.createEl("button", {
            cls: "fluent-button fluent-button-secondary",
            text: t("Cancel"),
        });
        this.addEventListener(cancelBtn, "click", () => this.close());
        const saveBtn = footer.createEl("button", {
            cls: "fluent-button fluent-button-primary",
            text: t("Save Changes"),
        });
        this.addEventListener(saveBtn, "click", () => this.save());
        // Handle Enter key
        this.addEventListener(this.displayNameInput, "keydown", (e) => {
            if (e.key === "Enter") {
                this.save();
            }
        });
        // Focus input
        setTimeout(() => {
            var _a, _b;
            (_a = this.displayNameInput) === null || _a === void 0 ? void 0 : _a.focus();
            (_b = this.displayNameInput) === null || _b === void 0 ? void 0 : _b.select();
        }, 100);
    }
    onClose() {
        // Clean up all event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
        // Clear content
        const { contentEl } = this;
        contentEl.empty();
    }
    selectColor(color) {
        this.selectedColor = color;
        // Update selected state
        this.modalEl
            .querySelectorAll(".fluent-modal-color-button")
            .forEach((btn) => {
            btn.removeClass("is-selected");
        });
        const selectedBtn = this.modalEl.querySelector(`[data-color="${color}"]`);
        selectedBtn === null || selectedBtn === void 0 ? void 0 : selectedBtn.addClass("is-selected");
        // Update preview
        const previewColor = this.modalEl.querySelector(".fluent-project-color");
        if (previewColor) {
            previewColor.style.backgroundColor = color;
        }
    }
    save() {
        if (!this.displayNameInput)
            return;
        const displayNameValue = this.displayNameInput.value.trim();
        // Update the project object
        this.project.displayName = displayNameValue || this.project.name;
        this.project.color = this.selectedColor;
        this.project.updatedAt = Date.now();
        this.onSave(this.project);
        this.close();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvamVjdFBvcG92ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJQcm9qZWN0UG9wb3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFZLEtBQUssRUFBTyxNQUFNLFVBQVUsQ0FBQztBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUE4QixNQUFNLGdCQUFnQixDQUFDO0FBRzFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxNQUFNLE9BQU8sY0FBZSxTQUFRLFNBQVM7SUE4QjVDLFlBQ0MsTUFBNkIsRUFDN0IsV0FBd0IsRUFDeEIsTUFBd0MsRUFDeEMsT0FBbUI7UUFFbkIsS0FBSyxFQUFFLENBQUM7UUFuQ0QsY0FBUyxHQUF1QixJQUFJLENBQUM7UUFJckMsY0FBUyxHQUE0QixJQUFJLENBQUM7UUFDMUMsa0JBQWEsR0FBRyxTQUFTLENBQUM7UUFDMUIsbUJBQWMsR0FBMEIsSUFBSSxDQUFDO1FBRTdDLGlCQUFZLEdBQXFDLElBQUksQ0FBQztRQUN0RCxrQkFBYSxHQUF3QyxJQUFJLENBQUM7UUFFakQsV0FBTSxHQUFHO1lBQ3pCLFNBQVM7WUFDVCxTQUFTO1lBQ1QsU0FBUztZQUNULFNBQVM7WUFDVCxTQUFTO1lBQ1QsU0FBUztZQUNULFNBQVM7WUFDVCxTQUFTO1lBQ1QsU0FBUztZQUNULFNBQVM7WUFDVCxTQUFTO1lBQ1QsU0FBUztZQUNULFNBQVM7WUFDVCxTQUFTO1lBQ1QsU0FBUztTQUNULENBQUM7UUFTRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUMvQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztJQUN4QixDQUFDO0lBRUQsTUFBTTtRQUNMLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNyQixJQUFJ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S0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRTVELDRCQUE0QjtRQUM1QixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsR0FBRyxnQkFBZ0IsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztRQUNqRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDO1FBQ3hDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUVwQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMxQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDZCxDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIFBsYXRmb3JtLCBNb2RhbCwgQXBwIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IGNyZWF0ZVBvcHBlciwgSW5zdGFuY2UgYXMgUG9wcGVySW5zdGFuY2UgfSBmcm9tIFwiQHBvcHBlcmpzL2NvcmVcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgdHlwZSB7IEN1c3RvbVByb2plY3QgfSBmcm9tIFwiQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgUHJvamVjdFBvcG92ZXIgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgcG9wb3ZlckVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0cHJpdmF0ZSBvblNhdmU6IChwcm9qZWN0OiBDdXN0b21Qcm9qZWN0KSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgb25DbG9zZTogKCkgPT4gdm9pZDtcclxuXHRwcml2YXRlIG5hbWVJbnB1dDogSFRNTElucHV0RWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgc2VsZWN0ZWRDb2xvciA9IFwiIzM0OThkYlwiO1xyXG5cdHByaXZhdGUgcG9wcGVySW5zdGFuY2U6IFBvcHBlckluc3RhbmNlIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSByZWZlcmVuY2VFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBjbGlja0hhbmRsZXI6ICgoZTogTW91c2VFdmVudCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGVzY2FwZUhhbmRsZXI6ICgoZTogS2V5Ym9hcmRFdmVudCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcclxuXHJcblx0cHJpdmF0ZSByZWFkb25seSBjb2xvcnMgPSBbXHJcblx0XHRcIiNlNzRjM2NcIixcclxuXHRcdFwiIzM0OThkYlwiLFxyXG5cdFx0XCIjMmVjYzcxXCIsXHJcblx0XHRcIiNmMzljMTJcIixcclxuXHRcdFwiIzliNTliNlwiLFxyXG5cdFx0XCIjMWFiYzljXCIsXHJcblx0XHRcIiMzNDQ5NWVcIixcclxuXHRcdFwiI2U2N2UyMlwiLFxyXG5cdFx0XCIjMTZhMDg1XCIsXHJcblx0XHRcIiMyN2FlNjBcIixcclxuXHRcdFwiIzI5ODBiOVwiLFxyXG5cdFx0XCIjOGU0NGFkXCIsXHJcblx0XHRcIiMyYzNlNTBcIixcclxuXHRcdFwiI2YxYzQwZlwiLFxyXG5cdFx0XCIjZDM1NDAwXCIsXHJcblx0XTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdHJlZmVyZW5jZUVsOiBIVE1MRWxlbWVudCxcclxuXHRcdG9uU2F2ZTogKHByb2plY3Q6IEN1c3RvbVByb2plY3QpID0+IHZvaWQsXHJcblx0XHRvbkNsb3NlOiAoKSA9PiB2b2lkXHJcblx0KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLnJlZmVyZW5jZUVsID0gcmVmZXJlbmNlRWw7XHJcblx0XHR0aGlzLm9uU2F2ZSA9IG9uU2F2ZTtcclxuXHRcdHRoaXMub25DbG9zZSA9IG9uQ2xvc2U7XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKSB7XHJcblx0XHR0aGlzLmNyZWF0ZVBvcG92ZXIoKTtcclxuXHRcdHRoaXMuc2V0dXBQb3BwZXIoKTtcclxuXHRcdHRoaXMuc2V0dXBFdmVudEhhbmRsZXJzKCk7XHJcblx0fVxyXG5cclxuXHRvbnVubG9hZCgpIHtcclxuXHRcdHRoaXMuY2xlYW51cCgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVQb3BvdmVyKCkge1xyXG5cdFx0dGhpcy5wb3BvdmVyRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG5cdFx0dGhpcy5wb3BvdmVyRWwuYWRkQ2xhc3MoXCJmbHVlbnQtcHJvamVjdC1wb3BvdmVyLWNvbnRhaW5lclwiKTtcclxuXHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5wb3BvdmVyRWwpO1xyXG5cclxuXHRcdGNvbnN0IHBvcG92ZXIgPSB0aGlzLnBvcG92ZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXByb2plY3QtcG9wb3ZlclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQXJyb3dcclxuXHRcdGNvbnN0IGFycm93ID0gcG9wb3Zlci5jcmVhdGVEaXYoe2NsczogXCJmbHVlbnQtcG9wb3Zlci1hcnJvd1wifSk7XHJcblx0XHRhcnJvdy5zZXRBdHRyaWJ1dGUoXCJkYXRhLXBvcHBlci1hcnJvd1wiLCBcIlwiKTtcclxuXHJcblx0XHQvLyBDb250ZW50XHJcblx0XHRjb25zdCBjb250ZW50ID0gcG9wb3Zlci5jcmVhdGVEaXYoe2NsczogXCJmbHVlbnQtcG9wb3Zlci1jb250ZW50XCJ9KTtcclxuXHJcblx0XHQvLyBUaXRsZVxyXG5cdFx0Y29uc3QgaGVhZGVyID0gY29udGVudC5jcmVhdGVEaXYoe2NsczogXCJmbHVlbnQtcG9wb3Zlci1oZWFkZXJcIn0pO1xyXG5cdFx0aGVhZGVyLmNyZWF0ZUVsKFwiaDNcIiwge3RleHQ6IHQoXCJOZXcgUHJvamVjdFwiKX0pO1xyXG5cclxuXHRcdC8vIE5hbWUgaW5wdXRcclxuXHRcdGNvbnN0IG5hbWVTZWN0aW9uID0gY29udGVudC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXBvcG92ZXItc2VjdGlvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRuYW1lU2VjdGlvbi5jcmVhdGVFbChcImxhYmVsXCIsIHt0ZXh0OiB0KFwiUHJvamVjdCBOYW1lXCIpfSk7XHJcblx0XHR0aGlzLm5hbWVJbnB1dCA9IG5hbWVTZWN0aW9uLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXBvcG92ZXItaW5wdXRcIixcclxuXHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRcdHBsYWNlaG9sZGVyOiB0KFwiRW50ZXIgcHJvamVjdCBuYW1lXCIpLFxyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ29sb3IgcGlja2VyXHJcblx0XHRjb25zdCBjb2xvclNlY3Rpb24gPSBjb250ZW50LmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtcG9wb3Zlci1zZWN0aW9uXCIsXHJcblx0XHR9KTtcclxuXHRcdGNvbG9yU2VjdGlvbi5jcmVhdGVFbChcImxhYmVsXCIsIHt0ZXh0OiB0KFwiQ2hvb3NlIENvbG9yXCIpfSk7XHJcblxyXG5cdFx0Y29uc3QgY29sb3JHcmlkID0gY29sb3JTZWN0aW9uLmNyZWF0ZURpdih7Y2xzOiBcImZsdWVudC1jb2xvci1ncmlkXCJ9KTtcclxuXHRcdHRoaXMuY29sb3JzLmZvckVhY2goKGNvbG9yKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbG9yQnV0dG9uID0gY29sb3JHcmlkLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcImZsdWVudC1jb2xvci1idXR0b25cIixcclxuXHRcdFx0XHRhdHRyOiB7XCJkYXRhLWNvbG9yXCI6IGNvbG9yfSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGNvbG9yQnV0dG9uLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGNvbG9yO1xyXG5cclxuXHRcdFx0aWYgKGNvbG9yID09PSB0aGlzLnNlbGVjdGVkQ29sb3IpIHtcclxuXHRcdFx0XHRjb2xvckJ1dHRvbi5hZGRDbGFzcyhcImlzLXNlbGVjdGVkXCIpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoY29sb3JCdXR0b24sIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuc2VsZWN0Q29sb3IoY29sb3IpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFjdGlvbiBidXR0b25zXHJcblx0XHRjb25zdCBhY3Rpb25zID0gY29udGVudC5jcmVhdGVEaXYoe2NsczogXCJmbHVlbnQtcG9wb3Zlci1hY3Rpb25zXCJ9KTtcclxuXHJcblx0XHRjb25zdCBjYW5jZWxCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1idXR0b24gZmx1ZW50LWJ1dHRvbi1zZWNvbmRhcnlcIixcclxuXHRcdFx0dGV4dDogdChcIkNhbmNlbFwiKSxcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGNhbmNlbEJ0biwgXCJjbGlja1wiLCAoKSA9PiB0aGlzLmNsb3NlKCkpO1xyXG5cclxuXHRcdGNvbnN0IHNhdmVCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1idXR0b24gZmx1ZW50LWJ1dHRvbi1wcmltYXJ5XCIsXHJcblx0XHRcdHRleHQ6IHQoXCJDcmVhdGVcIiksXHJcblx0XHR9KTtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChzYXZlQnRuLCBcImNsaWNrXCIsICgpID0+IHRoaXMuc2F2ZSgpKTtcclxuXHJcblx0XHQvLyBIYW5kbGUgRW50ZXIga2V5IG9uIGlucHV0XHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQodGhpcy5uYW1lSW5wdXQsIFwia2V5ZG93blwiLCAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG5cdFx0XHRpZiAoZS5rZXkgPT09IFwiRW50ZXJcIiAmJiB0aGlzLm5hbWVJbnB1dD8udmFsdWUudHJpbSgpKSB7XHJcblx0XHRcdFx0dGhpcy5zYXZlKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEZvY3VzIGlucHV0XHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHRoaXMubmFtZUlucHV0Py5mb2N1cygpLCA1MCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNldHVwUG9wcGVyKCkge1xyXG5cdFx0aWYgKCF0aGlzLnBvcG92ZXJFbCkgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnN0IHBvcG92ZXIgPSB0aGlzLnBvcG92ZXJFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcIi5mbHVlbnQtcHJvamVjdC1wb3BvdmVyXCJcclxuXHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRpZiAoIXBvcG92ZXIpIHJldHVybjtcclxuXHJcblx0XHR0aGlzLnBvcHBlckluc3RhbmNlID0gY3JlYXRlUG9wcGVyKHRoaXMucmVmZXJlbmNlRWwsIHBvcG92ZXIsIHtcclxuXHRcdFx0cGxhY2VtZW50OiBcImJvdHRvbS1zdGFydFwiLFxyXG5cdFx0XHRtb2RpZmllcnM6IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcIm9mZnNldFwiLFxyXG5cdFx0XHRcdFx0b3B0aW9uczoge1xyXG5cdFx0XHRcdFx0XHRvZmZzZXQ6IFswLCA4XSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcImFycm93XCIsXHJcblx0XHRcdFx0XHRvcHRpb25zOiB7XHJcblx0XHRcdFx0XHRcdGVsZW1lbnQ6IFwiLmZsdWVudC1wb3BvdmVyLWFycm93XCIsXHJcblx0XHRcdFx0XHRcdHBhZGRpbmc6IDgsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogXCJwcmV2ZW50T3ZlcmZsb3dcIixcclxuXHRcdFx0XHRcdG9wdGlvbnM6IHtcclxuXHRcdFx0XHRcdFx0Ym91bmRhcnk6IFwidmlld3BvcnRcIixcclxuXHRcdFx0XHRcdFx0cGFkZGluZzogOCxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcImZsaXBcIixcclxuXHRcdFx0XHRcdG9wdGlvbnM6IHtcclxuXHRcdFx0XHRcdFx0ZmFsbGJhY2tQbGFjZW1lbnRzOiBbXCJ0b3Atc3RhcnRcIiwgXCJyaWdodFwiLCBcImxlZnRcIl0sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdF0sXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2V0dXBFdmVudEhhbmRsZXJzKCkge1xyXG5cdFx0Ly8gQ2xpY2sgb3V0c2lkZSB0byBjbG9zZVxyXG5cdFx0dGhpcy5jbGlja0hhbmRsZXIgPSAoZTogTW91c2VFdmVudCkgPT4ge1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dGhpcy5wb3BvdmVyRWwgJiZcclxuXHRcdFx0XHQhdGhpcy5wb3BvdmVyRWwuY29udGFpbnMoZS50YXJnZXQgYXMgTm9kZSkgJiZcclxuXHRcdFx0XHQhdGhpcy5yZWZlcmVuY2VFbC5jb250YWlucyhlLnRhcmdldCBhcyBOb2RlKVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gRGVsYXkgdG8gYXZvaWQgaW1tZWRpYXRlIGNsb3NlXHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0aWYgKHRoaXMuY2xpY2tIYW5kbGVyKSB7XHJcblx0XHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMuY2xpY2tIYW5kbGVyKTtcclxuXHRcdFx0fVxyXG5cdFx0fSwgMCk7XHJcblxyXG5cdFx0Ly8gRXNjYXBlIGtleSB0byBjbG9zZVxyXG5cdFx0dGhpcy5lc2NhcGVIYW5kbGVyID0gKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcclxuXHRcdFx0aWYgKGUua2V5ID09PSBcIkVzY2FwZVwiKSB7XHJcblx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgdGhpcy5lc2NhcGVIYW5kbGVyKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2VsZWN0Q29sb3IoY29sb3I6IHN0cmluZykge1xyXG5cdFx0aWYgKCF0aGlzLnBvcG92ZXJFbCkgcmV0dXJuO1xyXG5cclxuXHRcdHRoaXMuc2VsZWN0ZWRDb2xvciA9IGNvbG9yO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBzZWxlY3RlZCBzdGF0ZVxyXG5cdFx0dGhpcy5wb3BvdmVyRWxcclxuXHRcdFx0LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuZmx1ZW50LWNvbG9yLWJ1dHRvblwiKVxyXG5cdFx0XHQuZm9yRWFjaCgoYnRuKSA9PiB7XHJcblx0XHRcdFx0YnRuLnJlbW92ZUNsYXNzKFwiaXMtc2VsZWN0ZWRcIik7XHJcblx0XHRcdH0pO1xyXG5cdFx0Y29uc3Qgc2VsZWN0ZWRCdG4gPSB0aGlzLnBvcG92ZXJFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRgW2RhdGEtY29sb3I9XCIke2NvbG9yfVwiXWBcclxuXHRcdCk7XHJcblx0XHRzZWxlY3RlZEJ0bj8uYWRkQ2xhc3MoXCJpcy1zZWxlY3RlZFwiKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2F2ZSgpIHtcclxuXHRcdGlmICghdGhpcy5uYW1lSW5wdXQpIHJldHVybjtcclxuXHJcblx0XHRjb25zdCBpbnB1dFZhbHVlID0gdGhpcy5uYW1lSW5wdXQudmFsdWUudHJpbSgpO1xyXG5cdFx0aWYgKCFpbnB1dFZhbHVlKSB7XHJcblx0XHRcdHRoaXMubmFtZUlucHV0LmZvY3VzKCk7XHJcblx0XHRcdHRoaXMubmFtZUlucHV0LmFkZENsYXNzKFwiaXMtZXJyb3JcIik7XHJcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5uYW1lSW5wdXQ/LnJlbW92ZUNsYXNzKFwiaXMtZXJyb3JcIiksIDMwMCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDb252ZXJ0IHNwYWNlcyB0byBkYXNoZXMgZm9yIGludGVybmFsIG5hbWUsIGtlZXAgb3JpZ2luYWwgZm9yIGRpc3BsYXlcclxuXHRcdGNvbnN0IGludGVybmFsTmFtZSA9IGlucHV0VmFsdWUucmVwbGFjZSgvXFxzKy9nLCBcIi1cIik7XHJcblx0XHRjb25zdCBkaXNwbGF5TmFtZSA9IGlucHV0VmFsdWU7XHJcblxyXG5cdFx0Y29uc3QgcHJvamVjdDogQ3VzdG9tUHJvamVjdCA9IHtcclxuXHRcdFx0aWQ6IGBwcm9qZWN0LSR7RGF0ZS5ub3coKX0tJHtNYXRoLnJhbmRvbSgpXHJcblx0XHRcdFx0LnRvU3RyaW5nKDM2KVxyXG5cdFx0XHRcdC5zdWJzdHIoMiwgOSl9YCxcclxuXHRcdFx0bmFtZTogaW50ZXJuYWxOYW1lLFxyXG5cdFx0XHRkaXNwbGF5TmFtZTogZGlzcGxheU5hbWUsXHJcblx0XHRcdGNvbG9yOiB0aGlzLnNlbGVjdGVkQ29sb3IsXHJcblx0XHRcdGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcclxuXHRcdFx0dXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLm9uU2F2ZShwcm9qZWN0KTtcclxuXHRcdHRoaXMuY2xvc2UoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY2xvc2UoKSB7XHJcblx0XHR0aGlzLm9uQ2xvc2UoKTtcclxuXHRcdHRoaXMudW5sb2FkKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNsZWFudXAoKSB7XHJcblx0XHQvLyBDbGVhbiB1cCBldmVudCBsaXN0ZW5lcnNcclxuXHRcdGlmICh0aGlzLmNsaWNrSGFuZGxlcikge1xyXG5cdFx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgdGhpcy5jbGlja0hhbmRsZXIpO1xyXG5cdFx0XHR0aGlzLmNsaWNrSGFuZGxlciA9IG51bGw7XHJcblx0XHR9XHJcblx0XHRpZiAodGhpcy5lc2NhcGVIYW5kbGVyKSB7XHJcblx0XHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIHRoaXMuZXNjYXBlSGFuZGxlcik7XHJcblx0XHRcdHRoaXMuZXNjYXBlSGFuZGxlciA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXAgUG9wcGVyIGluc3RhbmNlXHJcblx0XHRpZiAodGhpcy5wb3BwZXJJbnN0YW5jZSkge1xyXG5cdFx0XHR0aGlzLnBvcHBlckluc3RhbmNlLmRlc3Ryb3koKTtcclxuXHRcdFx0dGhpcy5wb3BwZXJJbnN0YW5jZSA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIERPTSBlbGVtZW50c1xyXG5cdFx0aWYgKHRoaXMucG9wb3ZlckVsKSB7XHJcblx0XHRcdHRoaXMucG9wb3ZlckVsLnJlbW92ZSgpO1xyXG5cdFx0XHR0aGlzLnBvcG92ZXJFbCA9IG51bGw7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRWRpdFByb2plY3RQb3BvdmVyIGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRwcml2YXRlIHBvcG92ZXJFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdHByaXZhdGUgcHJvamVjdDogQ3VzdG9tUHJvamVjdDtcclxuXHRwcml2YXRlIG9uU2F2ZTogKHByb2plY3Q6IEN1c3RvbVByb2plY3QpID0+IHZvaWQ7XHJcblx0cHJpdmF0ZSBvbkNsb3NlOiAoKSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgbmFtZUlucHV0OiBIVE1MSW5wdXRFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBkaXNwbGF5TmFtZUlucHV0OiBIVE1MSW5wdXRFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBzZWxlY3RlZENvbG9yOiBzdHJpbmc7XHJcblx0cHJpdmF0ZSBwb3BwZXJJbnN0YW5jZTogUG9wcGVySW5zdGFuY2UgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHJlZmVyZW5jZUVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGNsaWNrSGFuZGxlcjogKChlOiBNb3VzZUV2ZW50KSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgZXNjYXBlSGFuZGxlcjogKChlOiBLZXlib2FyZEV2ZW50KSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xyXG5cclxuXHRwcml2YXRlIHJlYWRvbmx5IGNvbG9ycyA9IFtcclxuXHRcdFwiI2U3NGMzY1wiLFxyXG5cdFx0XCIjMzQ5OGRiXCIsXHJcblx0XHRcIiMyZWNjNzFcIixcclxuXHRcdFwiI2YzOWMxMlwiLFxyXG5cdFx0XCIjOWI1OWI2XCIsXHJcblx0XHRcIiMxYWJjOWNcIixcclxuXHRcdFwiIzM0NDk1ZVwiLFxyXG5cdFx0XCIjZTY3ZTIyXCIsXHJcblx0XHRcIiMxNmEwODVcIixcclxuXHRcdFwiIzI3YWU2MFwiLFxyXG5cdFx0XCIjMjk4MGI5XCIsXHJcblx0XHRcIiM4ZTQ0YWRcIixcclxuXHRcdFwiIzJjM2U1MFwiLFxyXG5cdFx0XCIjZjFjNDBmXCIsXHJcblx0XHRcIiNkMzU0MDBcIixcclxuXHRdO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cmVmZXJlbmNlRWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0cHJvamVjdDogQ3VzdG9tUHJvamVjdCxcclxuXHRcdG9uU2F2ZTogKHByb2plY3Q6IEN1c3RvbVByb2plY3QpID0+IHZvaWQsXHJcblx0XHRvbkNsb3NlOiAoKSA9PiB2b2lkXHJcblx0KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLnJlZmVyZW5jZUVsID0gcmVmZXJlbmNlRWw7XHJcblx0XHR0aGlzLnByb2plY3QgPSB7Li4ucHJvamVjdH07IC8vIENsb25lIHRoZSBwcm9qZWN0IHRvIGF2b2lkIGRpcmVjdCBtdXRhdGlvblxyXG5cdFx0dGhpcy5vblNhdmUgPSBvblNhdmU7XHJcblx0XHR0aGlzLm9uQ2xvc2UgPSBvbkNsb3NlO1xyXG5cdFx0dGhpcy5zZWxlY3RlZENvbG9yID0gcHJvamVjdC5jb2xvciB8fCBcIiMzNDk4ZGJcIjtcclxuXHR9XHJcblxyXG5cdG9ubG9hZCgpIHtcclxuXHRcdHRoaXMuY3JlYXRlUG9wb3ZlcigpO1xyXG5cdFx0dGhpcy5zZXR1cFBvcHBlcigpO1xyXG5cdFx0dGhpcy5zZXR1cEV2ZW50SGFuZGxlcnMoKTtcclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCkge1xyXG5cdFx0dGhpcy5jbGVhbnVwKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZVBvcG92ZXIoKSB7XHJcblx0XHR0aGlzLnBvcG92ZXJFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcblx0XHR0aGlzLnBvcG92ZXJFbC5hZGRDbGFzcyhcImZsdWVudC1wcm9qZWN0LXBvcG92ZXItY29udGFpbmVyXCIpO1xyXG5cdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLnBvcG92ZXJFbCk7XHJcblxyXG5cdFx0Y29uc3QgcG9wb3ZlciA9IHRoaXMucG9wb3ZlckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtcHJvamVjdC1wb3BvdmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBcnJvd1xyXG5cdFx0Y29uc3QgYXJyb3cgPSBwb3BvdmVyLmNyZWF0ZURpdih7Y2xzOiBcImZsdWVudC1wb3BvdmVyLWFycm93XCJ9KTtcclxuXHRcdGFycm93LnNldEF0dHJpYnV0ZShcImRhdGEtcG9wcGVyLWFycm93XCIsIFwiXCIpO1xyXG5cclxuXHRcdC8vIENvbnRlbnRcclxuXHRcdGNvbnN0IGNvbnRlbnQgPSBwb3BvdmVyLmNyZWF0ZURpdih7Y2xzOiBcImZsdWVudC1wb3BvdmVyLWNvbnRlbnRcIn0pO1xyXG5cclxuXHRcdC8vIFRpdGxlXHJcblx0XHRjb25zdCBoZWFkZXIgPSBjb250ZW50LmNyZWF0ZURpdih7Y2xzOiBcImZsdWVudC1wb3BvdmVyLWhlYWRlclwifSk7XHJcblx0XHRoZWFkZXIuY3JlYXRlRWwoXCJoM1wiLCB7dGV4dDogdChcIkVkaXQgUHJvamVjdFwiKX0pO1xyXG5cclxuXHRcdC8vIERpc3BsYXkgbmFtZSBpbnB1dFxyXG5cdFx0Y29uc3QgZGlzcGxheU5hbWVTZWN0aW9uID0gY29udGVudC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXBvcG92ZXItc2VjdGlvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRkaXNwbGF5TmFtZVNlY3Rpb24uY3JlYXRlRWwoXCJsYWJlbFwiLCB7dGV4dDogdChcIkRpc3BsYXkgTmFtZVwiKX0pO1xyXG5cdFx0dGhpcy5kaXNwbGF5TmFtZUlucHV0ID0gZGlzcGxheU5hbWVTZWN0aW9uLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXBvcG92ZXItaW5wdXRcIixcclxuXHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRcdHBsYWNlaG9sZGVyOiB0KFwiRW50ZXIgZGlzcGxheSBuYW1lXCIpLFxyXG5cdFx0XHRcdHZhbHVlOiB0aGlzLnByb2plY3QuZGlzcGxheU5hbWUgfHwgdGhpcy5wcm9qZWN0Lm5hbWUsXHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDb2xvciBwaWNrZXJcclxuXHRcdGNvbnN0IGNvbG9yU2VjdGlvbiA9IGNvbnRlbnQuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1wb3BvdmVyLXNlY3Rpb25cIixcclxuXHRcdH0pO1xyXG5cdFx0Y29sb3JTZWN0aW9uLmNyZWF0ZUVsKFwibGFiZWxcIiwge3RleHQ6IHQoXCJDaG9vc2UgQ29sb3JcIil9KTtcclxuXHJcblx0XHRjb25zdCBjb2xvckdyaWQgPSBjb2xvclNlY3Rpb24uY3JlYXRlRGl2KHtjbHM6IFwiZmx1ZW50LWNvbG9yLWdyaWRcIn0pO1xyXG5cdFx0dGhpcy5jb2xvcnMuZm9yRWFjaCgoY29sb3IpID0+IHtcclxuXHRcdFx0Y29uc3QgY29sb3JCdXR0b24gPSBjb2xvckdyaWQuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZmx1ZW50LWNvbG9yLWJ1dHRvblwiLFxyXG5cdFx0XHRcdGF0dHI6IHtcImRhdGEtY29sb3JcIjogY29sb3J9LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0Y29sb3JCdXR0b24uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gY29sb3I7XHJcblxyXG5cdFx0XHRpZiAoY29sb3IgPT09IHRoaXMuc2VsZWN0ZWRDb2xvcikge1xyXG5cdFx0XHRcdGNvbG9yQnV0dG9uLmFkZENsYXNzKFwiaXMtc2VsZWN0ZWRcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChjb2xvckJ1dHRvbiwgXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5zZWxlY3RDb2xvcihjb2xvcik7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQWN0aW9uIGJ1dHRvbnNcclxuXHRcdGNvbnN0IGFjdGlvbnMgPSBjb250ZW50LmNyZWF0ZURpdih7Y2xzOiBcImZsdWVudC1wb3BvdmVyLWFjdGlvbnNcIn0pO1xyXG5cclxuXHRcdGNvbnN0IGNhbmNlbEJ0biA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LWJ1dHRvbiBmbHVlbnQtYnV0dG9uLXNlY29uZGFyeVwiLFxyXG5cdFx0XHR0ZXh0OiB0KFwiQ2FuY2VsXCIpLFxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoY2FuY2VsQnRuLCBcImNsaWNrXCIsICgpID0+IHRoaXMuY2xvc2UoKSk7XHJcblxyXG5cdFx0Y29uc3Qgc2F2ZUJ0biA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LWJ1dHRvbiBmbHVlbnQtYnV0dG9uLXByaW1hcnlcIixcclxuXHRcdFx0dGV4dDogdChcIlNhdmVcIiksXHJcblx0XHR9KTtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChzYXZlQnRuLCBcImNsaWNrXCIsICgpID0+IHRoaXMuc2F2ZSgpKTtcclxuXHJcblx0XHQvLyBIYW5kbGUgRW50ZXIga2V5IG9uIGlucHV0XHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXHJcblx0XHRcdHRoaXMuZGlzcGxheU5hbWVJbnB1dCxcclxuXHRcdFx0XCJrZXlkb3duXCIsXHJcblx0XHRcdChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XHJcblx0XHRcdFx0aWYgKGUua2V5ID09PSBcIkVudGVyXCIpIHtcclxuXHRcdFx0XHRcdHRoaXMuc2F2ZSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBGb2N1cyBpbnB1dFxyXG5cdFx0c2V0VGltZW91dCgoKSA9PiB0aGlzLmRpc3BsYXlOYW1lSW5wdXQ/LmZvY3VzKCksIDUwKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2V0dXBQb3BwZXIoKSB7XHJcblx0XHRpZiAoIXRoaXMucG9wb3ZlckVsKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgcG9wb3ZlciA9IHRoaXMucG9wb3ZlckVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLmZsdWVudC1wcm9qZWN0LXBvcG92ZXJcIlxyXG5cdFx0KSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdGlmICghcG9wb3ZlcikgcmV0dXJuO1xyXG5cclxuXHRcdHRoaXMucG9wcGVySW5zdGFuY2UgPSBjcmVhdGVQb3BwZXIodGhpcy5yZWZlcmVuY2VFbCwgcG9wb3Zlciwge1xyXG5cdFx0XHRwbGFjZW1lbnQ6IFwiYm90dG9tLXN0YXJ0XCIsXHJcblx0XHRcdG1vZGlmaWVyczogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwib2Zmc2V0XCIsXHJcblx0XHRcdFx0XHRvcHRpb25zOiB7XHJcblx0XHRcdFx0XHRcdG9mZnNldDogWzAsIDhdLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiYXJyb3dcIixcclxuXHRcdFx0XHRcdG9wdGlvbnM6IHtcclxuXHRcdFx0XHRcdFx0ZWxlbWVudDogXCIuZmx1ZW50LXBvcG92ZXItYXJyb3dcIixcclxuXHRcdFx0XHRcdFx0cGFkZGluZzogOCxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcInByZXZlbnRPdmVyZmxvd1wiLFxyXG5cdFx0XHRcdFx0b3B0aW9uczoge1xyXG5cdFx0XHRcdFx0XHRib3VuZGFyeTogXCJ2aWV3cG9ydFwiLFxyXG5cdFx0XHRcdFx0XHRwYWRkaW5nOiA4LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiZmxpcFwiLFxyXG5cdFx0XHRcdFx0b3B0aW9uczoge1xyXG5cdFx0XHRcdFx0XHRmYWxsYmFja1BsYWNlbWVudHM6IFtcInRvcC1zdGFydFwiLCBcInJpZ2h0XCIsIFwibGVmdFwiXSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XSxcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzZXR1cEV2ZW50SGFuZGxlcnMoKSB7XHJcblx0XHQvLyBDbGljayBvdXRzaWRlIHRvIGNsb3NlXHJcblx0XHR0aGlzLmNsaWNrSGFuZGxlciA9IChlOiBNb3VzZUV2ZW50KSA9PiB7XHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHR0aGlzLnBvcG92ZXJFbCAmJlxyXG5cdFx0XHRcdCF0aGlzLnBvcG92ZXJFbC5jb250YWlucyhlLnRhcmdldCBhcyBOb2RlKSAmJlxyXG5cdFx0XHRcdCF0aGlzLnJlZmVyZW5jZUVsLmNvbnRhaW5zKGUudGFyZ2V0IGFzIE5vZGUpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBEZWxheSB0byBhdm9pZCBpbW1lZGlhdGUgY2xvc2VcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy5jbGlja0hhbmRsZXIpIHtcclxuXHRcdFx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgdGhpcy5jbGlja0hhbmRsZXIpO1xyXG5cdFx0XHR9XHJcblx0XHR9LCAwKTtcclxuXHJcblx0XHQvLyBFc2NhcGUga2V5IHRvIGNsb3NlXHJcblx0XHR0aGlzLmVzY2FwZUhhbmRsZXIgPSAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG5cdFx0XHRpZiAoZS5rZXkgPT09IFwiRXNjYXBlXCIpIHtcclxuXHRcdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCB0aGlzLmVzY2FwZUhhbmRsZXIpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzZWxlY3RDb2xvcihjb2xvcjogc3RyaW5nKSB7XHJcblx0XHRpZiAoIXRoaXMucG9wb3ZlckVsKSByZXR1cm47XHJcblxyXG5cdFx0dGhpcy5zZWxlY3RlZENvbG9yID0gY29sb3I7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHNlbGVjdGVkIHN0YXRlXHJcblx0XHR0aGlzLnBvcG92ZXJFbFxyXG5cdFx0XHQucXVlcnlTZWxlY3RvckFsbChcIi5mbHVlbnQtY29sb3ItYnV0dG9uXCIpXHJcblx0XHRcdC5mb3JFYWNoKChidG4pID0+IHtcclxuXHRcdFx0XHRidG4ucmVtb3ZlQ2xhc3MoXCJpcy1zZWxlY3RlZFwiKTtcclxuXHRcdFx0fSk7XHJcblx0XHRjb25zdCBzZWxlY3RlZEJ0biA9IHRoaXMucG9wb3ZlckVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdGBbZGF0YS1jb2xvcj1cIiR7Y29sb3J9XCJdYFxyXG5cdFx0KTtcclxuXHRcdHNlbGVjdGVkQnRuPy5hZGRDbGFzcyhcImlzLXNlbGVjdGVkXCIpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzYXZlKCkge1xyXG5cdFx0aWYgKCF0aGlzLmRpc3BsYXlOYW1lSW5wdXQpIHJldHVybjtcclxuXHJcblx0XHRjb25zdCBkaXNwbGF5TmFtZVZhbHVlID0gdGhpcy5kaXNwbGF5TmFtZUlucHV0LnZhbHVlLnRyaW0oKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgdGhlIHByb2plY3Qgb2JqZWN0XHJcblx0XHR0aGlzLnByb2plY3QuZGlzcGxheU5hbWUgPSBkaXNwbGF5TmFtZVZhbHVlIHx8IHRoaXMucHJvamVjdC5uYW1lO1xyXG5cdFx0dGhpcy5wcm9qZWN0LmNvbG9yID0gdGhpcy5zZWxlY3RlZENvbG9yO1xyXG5cdFx0dGhpcy5wcm9qZWN0LnVwZGF0ZWRBdCA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0dGhpcy5vblNhdmUodGhpcy5wcm9qZWN0KTtcclxuXHRcdHRoaXMuY2xvc2UoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY2xvc2UoKSB7XHJcblx0XHR0aGlzLm9uQ2xvc2UoKTtcclxuXHRcdHRoaXMudW5sb2FkKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNsZWFudXAoKSB7XHJcblx0XHQvLyBDbGVhbiB1cCBldmVudCBsaXN0ZW5lcnNcclxuXHRcdGlmICh0aGlzLmNsaWNrSGFuZGxlcikge1xyXG5cdFx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgdGhpcy5jbGlja0hhbmRsZXIpO1xyXG5cdFx0XHR0aGlzLmNsaWNrSGFuZGxlciA9IG51bGw7XHJcblx0XHR9XHJcblx0XHRpZiAodGhpcy5lc2NhcGVIYW5kbGVyKSB7XHJcblx0XHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIHRoaXMuZXNjYXBlSGFuZGxlcik7XHJcblx0XHRcdHRoaXMuZXNjYXBlSGFuZGxlciA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXAgUG9wcGVyIGluc3RhbmNlXHJcblx0XHRpZiAodGhpcy5wb3BwZXJJbnN0YW5jZSkge1xyXG5cdFx0XHR0aGlzLnBvcHBlckluc3RhbmNlLmRlc3Ryb3koKTtcclxuXHRcdFx0dGhpcy5wb3BwZXJJbnN0YW5jZSA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIERPTSBlbGVtZW50c1xyXG5cdFx0aWYgKHRoaXMucG9wb3ZlckVsKSB7XHJcblx0XHRcdHRoaXMucG9wb3ZlckVsLnJlbW92ZSgpO1xyXG5cdFx0XHR0aGlzLnBvcG92ZXJFbCA9IG51bGw7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUHJvamVjdE1vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0cHJpdmF0ZSBvblNhdmU6IChwcm9qZWN0OiBDdXN0b21Qcm9qZWN0KSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgbmFtZUlucHV0OiBIVE1MSW5wdXRFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBzZWxlY3RlZENvbG9yOiBzdHJpbmcgPSBcIiMzNDk4ZGJcIjtcclxuXHRwcml2YXRlIGV2ZW50TGlzdGVuZXJzOiBBcnJheTx7XHJcblx0XHRlbGVtZW50OiBIVE1MRWxlbWVudDtcclxuXHRcdGV2ZW50OiBzdHJpbmc7XHJcblx0XHRoYW5kbGVyOiBFdmVudExpc3RlbmVyO1xyXG5cdH0+ID0gW107XHJcblxyXG5cdHByaXZhdGUgcmVhZG9ubHkgY29sb3JzID0gW1xyXG5cdFx0XCIjZTc0YzNjXCIsXHJcblx0XHRcIiMzNDk4ZGJcIixcclxuXHRcdFwiIzJlY2M3MVwiLFxyXG5cdFx0XCIjZjM5YzEyXCIsXHJcblx0XHRcIiM5YjU5YjZcIixcclxuXHRcdFwiIzFhYmM5Y1wiLFxyXG5cdFx0XCIjMzQ0OTVlXCIsXHJcblx0XHRcIiNlNjdlMjJcIixcclxuXHRcdFwiIzE2YTA4NVwiLFxyXG5cdFx0XCIjMjdhZTYwXCIsXHJcblx0XHRcIiMyOTgwYjlcIixcclxuXHRcdFwiIzhlNDRhZFwiLFxyXG5cdFx0XCIjMmMzZTUwXCIsXHJcblx0XHRcIiNmMWM0MGZcIixcclxuXHRcdFwiI2QzNTQwMFwiLFxyXG5cdF07XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdG9uU2F2ZTogKHByb2plY3Q6IEN1c3RvbVByb2plY3QpID0+IHZvaWRcclxuXHQpIHtcclxuXHRcdHN1cGVyKGFwcCk7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMub25TYXZlID0gb25TYXZlO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhZGRFdmVudExpc3RlbmVyKFxyXG5cdFx0ZWxlbWVudDogSFRNTEVsZW1lbnQsXHJcblx0XHRldmVudDogc3RyaW5nLFxyXG5cdFx0aGFuZGxlcjogRXZlbnRMaXN0ZW5lclxyXG5cdCkge1xyXG5cdFx0ZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyKTtcclxuXHRcdHRoaXMuZXZlbnRMaXN0ZW5lcnMucHVzaCh7ZWxlbWVudCwgZXZlbnQsIGhhbmRsZXJ9KTtcclxuXHR9XHJcblxyXG5cdG9uT3BlbigpIHtcclxuXHRcdGNvbnN0IHtjb250ZW50RWx9ID0gdGhpcztcclxuXHJcblx0XHQvLyBBZGQgY3VzdG9tIGNsYXNzIGZvciBzdHlsaW5nXHJcblx0XHR0aGlzLm1vZGFsRWwuYWRkQ2xhc3MoXCJmbHVlbnQtcHJvamVjdC1tb2RhbFwiKTtcclxuXHJcblx0XHQvLyBUaXRsZVxyXG5cdFx0Y29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwge3RleHQ6IHQoXCJDcmVhdGUgTmV3IFByb2plY3RcIil9KTtcclxuXHJcblx0XHQvLyBOYW1lIGlucHV0IHNlY3Rpb25cclxuXHRcdGNvbnN0IG5hbWVTZWN0aW9uID0gY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtbW9kYWwtc2VjdGlvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRuYW1lU2VjdGlvbi5jcmVhdGVFbChcImxhYmVsXCIsIHt0ZXh0OiB0KFwiUHJvamVjdCBOYW1lXCIpfSk7XHJcblx0XHR0aGlzLm5hbWVJbnB1dCA9IG5hbWVTZWN0aW9uLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LW1vZGFsLWlucHV0XCIsXHJcblx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0XHRwbGFjZWhvbGRlcjogdChcIkVudGVyIHByb2plY3QgbmFtZVwiKSxcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENvbG9yIHBpY2tlciBzZWN0aW9uXHJcblx0XHRjb25zdCBjb2xvclNlY3Rpb24gPSBjb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1tb2RhbC1zZWN0aW9uXCIsXHJcblx0XHR9KTtcclxuXHRcdGNvbG9yU2VjdGlvbi5jcmVhdGVFbChcImxhYmVsXCIsIHt0ZXh0OiB0KFwiQ2hvb3NlIENvbG9yXCIpfSk7XHJcblxyXG5cdFx0Y29uc3QgY29sb3JHcmlkID0gY29sb3JTZWN0aW9uLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtbW9kYWwtY29sb3ItZ3JpZFwiLFxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLmNvbG9ycy5mb3JFYWNoKChjb2xvcikgPT4ge1xyXG5cdFx0XHRjb25zdCBjb2xvckJ1dHRvbiA9IGNvbG9yR3JpZC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJmbHVlbnQtbW9kYWwtY29sb3ItYnV0dG9uXCIsXHJcblx0XHRcdFx0YXR0cjoge1wiZGF0YS1jb2xvclwiOiBjb2xvcn0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjb2xvckJ1dHRvbi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBjb2xvcjtcclxuXHJcblx0XHRcdGlmIChjb2xvciA9PT0gdGhpcy5zZWxlY3RlZENvbG9yKSB7XHJcblx0XHRcdFx0Y29sb3JCdXR0b24uYWRkQ2xhc3MoXCJpcy1zZWxlY3RlZFwiKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKGNvbG9yQnV0dG9uLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0XHR0aGlzLnNlbGVjdENvbG9yKGNvbG9yKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBQcmV2aWV3IHNlY3Rpb25cclxuXHRcdGNvbnN0IHByZXZpZXdTZWN0aW9uID0gY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtbW9kYWwtc2VjdGlvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRwcmV2aWV3U2VjdGlvbi5jcmVhdGVFbChcImxhYmVsXCIsIHt0ZXh0OiB0KFwiUHJldmlld1wiKX0pO1xyXG5cdFx0Y29uc3QgcHJldmlldyA9IHByZXZpZXdTZWN0aW9uLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtbW9kYWwtcHJldmlld1wiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBwcmV2aWV3SXRlbSA9IHByZXZpZXcuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1wcm9qZWN0LWl0ZW0tcHJldmlld1wiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBwcmV2aWV3Q29sb3IgPSBwcmV2aWV3SXRlbS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXByb2plY3QtY29sb3JcIixcclxuXHRcdH0pO1xyXG5cdFx0cHJldmlld0NvbG9yLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IHRoaXMuc2VsZWN0ZWRDb2xvcjtcclxuXHRcdGNvbnN0IHByZXZpZXdOYW1lID0gcHJldmlld0l0ZW0uY3JlYXRlU3Bhbih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtcHJvamVjdC1uYW1lXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBVcGRhdGUgcHJldmlldyBvbiBuYW1lIGNoYW5nZVxyXG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKHRoaXMubmFtZUlucHV0LCBcImlucHV0XCIsICgpID0+IHtcclxuXHRcdFx0cHJldmlld05hbWUuc2V0VGV4dCh0aGlzLm5hbWVJbnB1dD8udmFsdWUgfHwgdChcIlByb2plY3QgTmFtZVwiKSk7XHJcblx0XHR9KTtcclxuXHRcdHByZXZpZXdOYW1lLnNldFRleHQodChcIlByb2plY3QgTmFtZVwiKSk7XHJcblxyXG5cdFx0Ly8gRm9vdGVyIHdpdGggYWN0aW9uIGJ1dHRvbnNcclxuXHRcdGNvbnN0IGZvb3RlciA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoe2NsczogXCJmbHVlbnQtbW9kYWwtZm9vdGVyXCJ9KTtcclxuXHJcblx0XHRjb25zdCBjYW5jZWxCdG4gPSBmb290ZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LWJ1dHRvbiBmbHVlbnQtYnV0dG9uLXNlY29uZGFyeVwiLFxyXG5cdFx0XHR0ZXh0OiB0KFwiQ2FuY2VsXCIpLFxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXIoY2FuY2VsQnRuLCBcImNsaWNrXCIsICgpID0+IHRoaXMuY2xvc2UoKSk7XHJcblxyXG5cdFx0Y29uc3QgY3JlYXRlQnRuID0gZm9vdGVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1idXR0b24gZmx1ZW50LWJ1dHRvbi1wcmltYXJ5XCIsXHJcblx0XHRcdHRleHQ6IHQoXCJDcmVhdGUgUHJvamVjdFwiKSxcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKGNyZWF0ZUJ0biwgXCJjbGlja1wiLCAoKSA9PiB0aGlzLnNhdmUoKSk7XHJcblxyXG5cdFx0Ly8gSGFuZGxlIEVudGVyIGtleVxyXG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKHRoaXMubmFtZUlucHV0LCBcImtleWRvd25cIiwgKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcclxuXHRcdFx0aWYgKGUua2V5ID09PSBcIkVudGVyXCIgJiYgdGhpcy5uYW1lSW5wdXQ/LnZhbHVlLnRyaW0oKSkge1xyXG5cdFx0XHRcdHRoaXMuc2F2ZSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBGb2N1cyBpbnB1dFxyXG5cdFx0c2V0VGltZW91dCgoKSA9PiB0aGlzLm5hbWVJbnB1dD8uZm9jdXMoKSwgMTAwKTtcclxuXHR9XHJcblxyXG5cdG9uQ2xvc2UoKSB7XHJcblx0XHQvLyBDbGVhbiB1cCBhbGwgZXZlbnQgbGlzdGVuZXJzXHJcblx0XHR0aGlzLmV2ZW50TGlzdGVuZXJzLmZvckVhY2goKHtlbGVtZW50LCBldmVudCwgaGFuZGxlcn0pID0+IHtcclxuXHRcdFx0ZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyKTtcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5ldmVudExpc3RlbmVycyA9IFtdO1xyXG5cclxuXHRcdC8vIENsZWFyIGNvbnRlbnRcclxuXHRcdGNvbnN0IHtjb250ZW50RWx9ID0gdGhpcztcclxuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzZWxlY3RDb2xvcihjb2xvcjogc3RyaW5nKSB7XHJcblx0XHR0aGlzLnNlbGVjdGVkQ29sb3IgPSBjb2xvcjtcclxuXHJcblx0XHQvLyBVcGRhdGUgc2VsZWN0ZWQgc3RhdGVcclxuXHRcdHRoaXMubW9kYWxFbFxyXG5cdFx0XHQucXVlcnlTZWxlY3RvckFsbChcIi5mbHVlbnQtbW9kYWwtY29sb3ItYnV0dG9uXCIpXHJcblx0XHRcdC5mb3JFYWNoKChidG4pID0+IHtcclxuXHRcdFx0XHRidG4ucmVtb3ZlQ2xhc3MoXCJpcy1zZWxlY3RlZFwiKTtcclxuXHRcdFx0fSk7XHJcblx0XHRjb25zdCBzZWxlY3RlZEJ0biA9IHRoaXMubW9kYWxFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRgW2RhdGEtY29sb3I9XCIke2NvbG9yfVwiXWBcclxuXHRcdCk7XHJcblx0XHRzZWxlY3RlZEJ0bj8uYWRkQ2xhc3MoXCJpcy1zZWxlY3RlZFwiKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgcHJldmlld1xyXG5cdFx0Y29uc3QgcHJldmlld0NvbG9yID0gdGhpcy5tb2RhbEVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLmZsdWVudC1wcm9qZWN0LWNvbG9yXCJcclxuXHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRpZiAocHJldmlld0NvbG9yKSB7XHJcblx0XHRcdHByZXZpZXdDb2xvci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBjb2xvcjtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2F2ZSgpIHtcclxuXHRcdGlmICghdGhpcy5uYW1lSW5wdXQpIHJldHVybjtcclxuXHJcblx0XHRjb25zdCBpbnB1dFZhbHVlID0gdGhpcy5uYW1lSW5wdXQudmFsdWUudHJpbSgpO1xyXG5cdFx0aWYgKCFpbnB1dFZhbHVlKSB7XHJcblx0XHRcdHRoaXMubmFtZUlucHV0LmZvY3VzKCk7XHJcblx0XHRcdHRoaXMubmFtZUlucHV0LmFkZENsYXNzKFwiaXMtZXJyb3JcIik7XHJcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5uYW1lSW5wdXQ/LnJlbW92ZUNsYXNzKFwiaXMtZXJyb3JcIiksIDMwMCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDb252ZXJ0IHNwYWNlcyB0byBkYXNoZXMgZm9yIGludGVybmFsIG5hbWUsIGtlZXAgb3JpZ2luYWwgZm9yIGRpc3BsYXlcclxuXHRcdGNvbnN0IGludGVybmFsTmFtZSA9IGlucHV0VmFsdWUucmVwbGFjZSgvXFxzKy9nLCBcIi1cIik7XHJcblx0XHRjb25zdCBkaXNwbGF5TmFtZSA9IGlucHV0VmFsdWU7XHJcblxyXG5cdFx0Y29uc3QgcHJvamVjdDogQ3VzdG9tUHJvamVjdCA9IHtcclxuXHRcdFx0aWQ6IGBwcm9qZWN0LSR7RGF0ZS5ub3coKX0tJHtNYXRoLnJhbmRvbSgpXHJcblx0XHRcdFx0LnRvU3RyaW5nKDM2KVxyXG5cdFx0XHRcdC5zdWJzdHIoMiwgOSl9YCxcclxuXHRcdFx0bmFtZTogaW50ZXJuYWxOYW1lLFxyXG5cdFx0XHRkaXNwbGF5TmFtZTogZGlzcGxheU5hbWUsXHJcblx0XHRcdGNvbG9yOiB0aGlzLnNlbGVjdGVkQ29sb3IsXHJcblx0XHRcdGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcclxuXHRcdFx0dXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLm9uU2F2ZShwcm9qZWN0KTtcclxuXHRcdHRoaXMuY2xvc2UoKTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBFZGl0UHJvamVjdE1vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0cHJpdmF0ZSBwcm9qZWN0OiBDdXN0b21Qcm9qZWN0O1xyXG5cdHByaXZhdGUgb25TYXZlOiAocHJvamVjdDogQ3VzdG9tUHJvamVjdCkgPT4gdm9pZDtcclxuXHRwcml2YXRlIG5hbWVJbnB1dDogSFRNTElucHV0RWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgZGlzcGxheU5hbWVJbnB1dDogSFRNTElucHV0RWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgc2VsZWN0ZWRDb2xvcjogc3RyaW5nO1xyXG5cdHByaXZhdGUgZXZlbnRMaXN0ZW5lcnM6IEFycmF5PHtcclxuXHRcdGVsZW1lbnQ6IEhUTUxFbGVtZW50O1xyXG5cdFx0ZXZlbnQ6IHN0cmluZztcclxuXHRcdGhhbmRsZXI6IEV2ZW50TGlzdGVuZXI7XHJcblx0fT4gPSBbXTtcclxuXHJcblx0cHJpdmF0ZSByZWFkb25seSBjb2xvcnMgPSBbXHJcblx0XHRcIiNlNzRjM2NcIixcclxuXHRcdFwiIzM0OThkYlwiLFxyXG5cdFx0XCIjMmVjYzcxXCIsXHJcblx0XHRcIiNmMzljMTJcIixcclxuXHRcdFwiIzliNTliNlwiLFxyXG5cdFx0XCIjMWFiYzljXCIsXHJcblx0XHRcIiMzNDQ5NWVcIixcclxuXHRcdFwiI2U2N2UyMlwiLFxyXG5cdFx0XCIjMTZhMDg1XCIsXHJcblx0XHRcIiMyN2FlNjBcIixcclxuXHRcdFwiIzI5ODBiOVwiLFxyXG5cdFx0XCIjOGU0NGFkXCIsXHJcblx0XHRcIiMyYzNlNTBcIixcclxuXHRcdFwiI2YxYzQwZlwiLFxyXG5cdFx0XCIjZDM1NDAwXCIsXHJcblx0XTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cHJvamVjdDogQ3VzdG9tUHJvamVjdCxcclxuXHRcdG9uU2F2ZTogKHByb2plY3Q6IEN1c3RvbVByb2plY3QpID0+IHZvaWRcclxuXHQpIHtcclxuXHRcdHN1cGVyKGFwcCk7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMucHJvamVjdCA9IHsuLi5wcm9qZWN0fTsgLy8gQ2xvbmUgdG8gYXZvaWQgZGlyZWN0IG11dGF0aW9uXHJcblx0XHR0aGlzLm9uU2F2ZSA9IG9uU2F2ZTtcclxuXHRcdHRoaXMuc2VsZWN0ZWRDb2xvciA9IHByb2plY3QuY29sb3IgfHwgXCIjMzQ5OGRiXCI7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFkZEV2ZW50TGlzdGVuZXIoXHJcblx0XHRlbGVtZW50OiBIVE1MRWxlbWVudCxcclxuXHRcdGV2ZW50OiBzdHJpbmcsXHJcblx0XHRoYW5kbGVyOiBFdmVudExpc3RlbmVyXHJcblx0KSB7XHJcblx0XHRlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGhhbmRsZXIpO1xyXG5cdFx0dGhpcy5ldmVudExpc3RlbmVycy5wdXNoKHtlbGVtZW50LCBldmVudCwgaGFuZGxlcn0pO1xyXG5cdH1cclxuXHJcblx0b25PcGVuKCkge1xyXG5cdFx0Y29uc3Qge2NvbnRlbnRFbH0gPSB0aGlzO1xyXG5cclxuXHRcdC8vIEFkZCBjdXN0b20gY2xhc3MgZm9yIHN0eWxpbmdcclxuXHRcdHRoaXMubW9kYWxFbC5hZGRDbGFzcyhcImZsdWVudC1wcm9qZWN0LW1vZGFsXCIpO1xyXG5cclxuXHRcdC8vIFRpdGxlXHJcblx0XHRjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7dGV4dDogdChcIkVkaXQgUHJvamVjdFwiKX0pO1xyXG5cclxuXHRcdC8vIERpc3BsYXkgbmFtZSBpbnB1dCBzZWN0aW9uXHJcblx0XHRjb25zdCBkaXNwbGF5TmFtZVNlY3Rpb24gPSBjb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1tb2RhbC1zZWN0aW9uXCIsXHJcblx0XHR9KTtcclxuXHRcdGRpc3BsYXlOYW1lU2VjdGlvbi5jcmVhdGVFbChcImxhYmVsXCIsIHt0ZXh0OiB0KFwiRGlzcGxheSBOYW1lXCIpfSk7XHJcblx0XHR0aGlzLmRpc3BsYXlOYW1lSW5wdXQgPSBkaXNwbGF5TmFtZVNlY3Rpb24uY3JlYXRlRWwoXCJpbnB1dFwiLCB7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtbW9kYWwtaW5wdXRcIixcclxuXHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRcdHBsYWNlaG9sZGVyOiB0KFwiRW50ZXIgZGlzcGxheSBuYW1lXCIpLFxyXG5cdFx0XHRcdHZhbHVlOiB0aGlzLnByb2plY3QuZGlzcGxheU5hbWUgfHwgdGhpcy5wcm9qZWN0Lm5hbWUsXHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDb2xvciBwaWNrZXIgc2VjdGlvblxyXG5cdFx0Y29uc3QgY29sb3JTZWN0aW9uID0gY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtbW9kYWwtc2VjdGlvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb2xvclNlY3Rpb24uY3JlYXRlRWwoXCJsYWJlbFwiLCB7dGV4dDogdChcIkNob29zZSBDb2xvclwiKX0pO1xyXG5cclxuXHRcdGNvbnN0IGNvbG9yR3JpZCA9IGNvbG9yU2VjdGlvbi5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LW1vZGFsLWNvbG9yLWdyaWRcIixcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5jb2xvcnMuZm9yRWFjaCgoY29sb3IpID0+IHtcclxuXHRcdFx0Y29uc3QgY29sb3JCdXR0b24gPSBjb2xvckdyaWQuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZmx1ZW50LW1vZGFsLWNvbG9yLWJ1dHRvblwiLFxyXG5cdFx0XHRcdGF0dHI6IHtcImRhdGEtY29sb3JcIjogY29sb3J9LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0Y29sb3JCdXR0b24uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gY29sb3I7XHJcblxyXG5cdFx0XHRpZiAoY29sb3IgPT09IHRoaXMuc2VsZWN0ZWRDb2xvcikge1xyXG5cdFx0XHRcdGNvbG9yQnV0dG9uLmFkZENsYXNzKFwiaXMtc2VsZWN0ZWRcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihjb2xvckJ1dHRvbiwgXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5zZWxlY3RDb2xvcihjb2xvcik7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUHJldmlldyBzZWN0aW9uXHJcblx0XHRjb25zdCBwcmV2aWV3U2VjdGlvbiA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LW1vZGFsLXNlY3Rpb25cIixcclxuXHRcdH0pO1xyXG5cdFx0cHJldmlld1NlY3Rpb24uY3JlYXRlRWwoXCJsYWJlbFwiLCB7dGV4dDogdChcIlByZXZpZXdcIil9KTtcclxuXHRcdGNvbnN0IHByZXZpZXcgPSBwcmV2aWV3U2VjdGlvbi5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LW1vZGFsLXByZXZpZXdcIixcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3QgcHJldmlld0l0ZW0gPSBwcmV2aWV3LmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtcHJvamVjdC1pdGVtLXByZXZpZXdcIixcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3QgcHJldmlld0NvbG9yID0gcHJldmlld0l0ZW0uY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1wcm9qZWN0LWNvbG9yXCIsXHJcblx0XHR9KTtcclxuXHRcdHByZXZpZXdDb2xvci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSB0aGlzLnNlbGVjdGVkQ29sb3I7XHJcblx0XHRjb25zdCBwcmV2aWV3TmFtZSA9IHByZXZpZXdJdGVtLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXByb2plY3QtbmFtZVwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHByZXZpZXcgb24gbmFtZSBjaGFuZ2VcclxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcih0aGlzLmRpc3BsYXlOYW1lSW5wdXQsIFwiaW5wdXRcIiwgKCkgPT4ge1xyXG5cdFx0XHRwcmV2aWV3TmFtZS5zZXRUZXh0KFxyXG5cdFx0XHRcdHRoaXMuZGlzcGxheU5hbWVJbnB1dD8udmFsdWUgfHwgdGhpcy5wcm9qZWN0Lm5hbWVcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cdFx0cHJldmlld05hbWUuc2V0VGV4dCh0aGlzLnByb2plY3QuZGlzcGxheU5hbWUgfHwgdGhpcy5wcm9qZWN0Lm5hbWUpO1xyXG5cclxuXHRcdC8vIEZvb3RlciB3aXRoIGFjdGlvbiBidXR0b25zXHJcblx0XHRjb25zdCBmb290ZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHtjbHM6IFwiZmx1ZW50LW1vZGFsLWZvb3RlclwifSk7XHJcblxyXG5cdFx0Y29uc3QgY2FuY2VsQnRuID0gZm9vdGVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1idXR0b24gZmx1ZW50LWJ1dHRvbi1zZWNvbmRhcnlcIixcclxuXHRcdFx0dGV4dDogdChcIkNhbmNlbFwiKSxcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKGNhbmNlbEJ0biwgXCJjbGlja1wiLCAoKSA9PiB0aGlzLmNsb3NlKCkpO1xyXG5cclxuXHRcdGNvbnN0IHNhdmVCdG4gPSBmb290ZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LWJ1dHRvbiBmbHVlbnQtYnV0dG9uLXByaW1hcnlcIixcclxuXHRcdFx0dGV4dDogdChcIlNhdmUgQ2hhbmdlc1wiKSxcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKHNhdmVCdG4sIFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5zYXZlKCkpO1xyXG5cclxuXHRcdC8vIEhhbmRsZSBFbnRlciBrZXlcclxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcclxuXHRcdFx0dGhpcy5kaXNwbGF5TmFtZUlucHV0LFxyXG5cdFx0XHRcImtleWRvd25cIixcclxuXHRcdFx0KGU6IEtleWJvYXJkRXZlbnQpID0+IHtcclxuXHRcdFx0XHRpZiAoZS5rZXkgPT09IFwiRW50ZXJcIikge1xyXG5cdFx0XHRcdFx0dGhpcy5zYXZlKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIEZvY3VzIGlucHV0XHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0dGhpcy5kaXNwbGF5TmFtZUlucHV0Py5mb2N1cygpO1xyXG5cdFx0XHR0aGlzLmRpc3BsYXlOYW1lSW5wdXQ/LnNlbGVjdCgpO1xyXG5cdFx0fSwgMTAwKTtcclxuXHR9XHJcblxyXG5cdG9uQ2xvc2UoKSB7XHJcblx0XHQvLyBDbGVhbiB1cCBhbGwgZXZlbnQgbGlzdGVuZXJzXHJcblx0XHR0aGlzLmV2ZW50TGlzdGVuZXJzLmZvckVhY2goKHtlbGVtZW50LCBldmVudCwgaGFuZGxlcn0pID0+IHtcclxuXHRcdFx0ZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyKTtcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5ldmVudExpc3RlbmVycyA9IFtdO1xyXG5cclxuXHRcdC8vIENsZWFyIGNvbnRlbnRcclxuXHRcdGNvbnN0IHtjb250ZW50RWx9ID0gdGhpcztcclxuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzZWxlY3RDb2xvcihjb2xvcjogc3RyaW5nKSB7XHJcblx0XHR0aGlzLnNlbGVjdGVkQ29sb3IgPSBjb2xvcjtcclxuXHJcblx0XHQvLyBVcGRhdGUgc2VsZWN0ZWQgc3RhdGVcclxuXHRcdHRoaXMubW9kYWxFbFxyXG5cdFx0XHQucXVlcnlTZWxlY3RvckFsbChcIi5mbHVlbnQtbW9kYWwtY29sb3ItYnV0dG9uXCIpXHJcblx0XHRcdC5mb3JFYWNoKChidG4pID0+IHtcclxuXHRcdFx0XHRidG4ucmVtb3ZlQ2xhc3MoXCJpcy1zZWxlY3RlZFwiKTtcclxuXHRcdFx0fSk7XHJcblx0XHRjb25zdCBzZWxlY3RlZEJ0biA9IHRoaXMubW9kYWxFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRgW2RhdGEtY29sb3I9XCIke2NvbG9yfVwiXWBcclxuXHRcdCk7XHJcblx0XHRzZWxlY3RlZEJ0bj8uYWRkQ2xhc3MoXCJpcy1zZWxlY3RlZFwiKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgcHJldmlld1xyXG5cdFx0Y29uc3QgcHJldmlld0NvbG9yID0gdGhpcy5tb2RhbEVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLmZsdWVudC1wcm9qZWN0LWNvbG9yXCJcclxuXHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRpZiAocHJldmlld0NvbG9yKSB7XHJcblx0XHRcdHByZXZpZXdDb2xvci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBjb2xvcjtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2F2ZSgpIHtcclxuXHRcdGlmICghdGhpcy5kaXNwbGF5TmFtZUlucHV0KSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgZGlzcGxheU5hbWVWYWx1ZSA9IHRoaXMuZGlzcGxheU5hbWVJbnB1dC52YWx1ZS50cmltKCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRoZSBwcm9qZWN0IG9iamVjdFxyXG5cdFx0dGhpcy5wcm9qZWN0LmRpc3BsYXlOYW1lID0gZGlzcGxheU5hbWVWYWx1ZSB8fCB0aGlzLnByb2plY3QubmFtZTtcclxuXHRcdHRoaXMucHJvamVjdC5jb2xvciA9IHRoaXMuc2VsZWN0ZWRDb2xvcjtcclxuXHRcdHRoaXMucHJvamVjdC51cGRhdGVkQXQgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdHRoaXMub25TYXZlKHRoaXMucHJvamVjdCk7XHJcblx0XHR0aGlzLmNsb3NlKCk7XHJcblx0fVxyXG59XHJcbiJdfQ==