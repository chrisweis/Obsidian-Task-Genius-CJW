import { Modal, Setting, Notice, setIcon, ButtonComponent, ExtraButtonComponent, } from "obsidian";
import { t } from '@/translations/helper';
import { attachIconMenu } from '@/components/ui/menus/IconMenu';
import "@/styles/habit-edit-dialog.css";
export class HabitEditDialog extends Modal {
    constructor(app, plugin, habitData = null, onSubmit) {
        super(app);
        this.habitData = null;
        this.habitType = "daily";
        this.iconInput = "circle-check";
        // Input component references for data retrieval
        this.dailyInputs = null;
        this.countInputs = null;
        this.mappingPropertyInput = null;
        this.mappingInputs = [];
        this.eventInputs = [];
        this.plugin = plugin;
        this.habitData = habitData;
        this.onSubmit = onSubmit;
        this.isNew = !habitData;
        if (habitData) {
            this.habitType = habitData.type;
            this.iconInput = habitData.icon;
        }
    }
    onOpen() {
        this.titleEl.setText(this.isNew ? t("Create new habit") : t("Edit habit"));
        this.modalEl.addClass("habit-edit-dialog");
        this.buildForm();
    }
    buildForm() {
        var _a;
        const { contentEl } = this;
        contentEl.empty();
        const typeContainer = contentEl.createDiv({
            cls: "habit-type-selector",
        });
        const typeDesc = typeContainer.createDiv({
            cls: "habit-type-description",
        });
        typeDesc.setText(t("Habit type"));
        const typeGrid = typeContainer.createDiv({ cls: "habit-type-grid" });
        const types = [
            {
                id: "daily",
                name: t("Daily habit"),
                icon: "calendar-check",
                description: t("Simple daily check-in habit"),
            },
            {
                id: "count",
                name: t("Count habit"),
                icon: "bar-chart",
                description: t("Record numeric values, e.g., how many cups of water"),
            },
            {
                id: "mapping",
                name: t("Mapping habit"),
                icon: "smile",
                description: t("Use different values to map, e.g., emotion tracking"),
            },
            {
                id: "scheduled",
                name: t("Scheduled habit"),
                icon: "calendar",
                description: t("Habit with multiple events"),
            },
        ];
        types.forEach((type) => {
            const typeBtn = typeGrid.createDiv({
                cls: `habit-type-item ${type.id === this.habitType ? "selected" : ""}`,
                attr: { "data-type": type.id },
            });
            const iconDiv = typeBtn.createDiv({ cls: "habit-type-icon" }, (el) => {
                setIcon(el, type.icon);
            });
            const textDiv = typeBtn.createDiv({ cls: "habit-type-text" });
            textDiv.createDiv({ cls: "habit-type-name", text: type.name });
            textDiv.createDiv({
                cls: "habit-type-desc",
                text: type.description,
            });
            typeBtn.addEventListener("click", () => {
                document.querySelectorAll(".habit-type-item").forEach((el) => {
                    el.removeClass("selected");
                });
                // Set current selection
                typeBtn.addClass("selected");
                this.habitType = type.id;
                // Rebuild form
                this.buildTypeSpecificForm();
            });
        });
        // Common fields form
        const commonForm = contentEl.createDiv({ cls: "habit-common-form" });
        // ID field (hidden, auto-generated when creating)
        const habitId = ((_a = this.habitData) === null || _a === void 0 ? void 0 : _a.id) || this.generateId();
        // Name field
        let nameInput;
        new Setting(commonForm)
            .setName(t("Habit name"))
            .setDesc(t("Display name of the habit"))
            .addText((text) => {
            var _a;
            nameInput = text;
            text.setValue(((_a = this.habitData) === null || _a === void 0 ? void 0 : _a.name) || "");
            text.inputEl.addClass("habit-name-input");
        });
        // Description field
        let descInput;
        new Setting(commonForm)
            .setName(t("Description"))
            .setDesc(t("Optional habit description"))
            .addText((text) => {
            var _a;
            descInput = text;
            text.setValue(((_a = this.habitData) === null || _a === void 0 ? void 0 : _a.description) || "");
            text.inputEl.addClass("habit-desc-input");
        });
        // Icon selector
        let iconSelector;
        new Setting(commonForm).setName(t("Icon")).addButton((btn) => {
            try {
                btn.setIcon(this.iconInput || "circle-check");
            }
            catch (e) {
                console.error("Error setting icon:", e);
                try {
                    btn.setIcon("circle-check");
                }
                catch (err) {
                    console.error("Failed to set default icon:", err);
                }
            }
            attachIconMenu(btn, {
                containerEl: this.modalEl,
                plugin: this.plugin,
                onIconSelected: (iconId) => {
                    this.iconInput = iconId;
                    try {
                        setIcon(btn.buttonEl, iconId || "circle-check");
                    }
                    catch (e) {
                        console.error("Error setting icon:", e);
                        try {
                            setIcon(btn.buttonEl, "circle-check");
                        }
                        catch (err) {
                            console.error("Failed to set default icon:", err);
                        }
                    }
                    this.iconInput = iconId;
                },
            });
        });
        // Type-specific form container
        const typeFormContainer = contentEl.createDiv({
            cls: "habit-type-form",
        });
        // Button container
        const buttonContainer = contentEl.createDiv({
            cls: "habit-edit-buttons",
        }, (el) => {
            new ButtonComponent(el)
                .setWarning()
                .setButtonText(t("Cancel"))
                .onClick(() => {
                this.close();
            });
            new ButtonComponent(el)
                .setCta()
                .setButtonText(t("Save"))
                .onClick(() => {
                const name = nameInput.getValue().trim();
                if (!name) {
                    new Notice(t("Please enter a habit name"));
                    return;
                }
                // Collect common fields
                let habitData = {
                    id: habitId,
                    name: name,
                    description: descInput.getValue() || undefined,
                    icon: this.iconInput || "circle-check",
                    type: this.habitType,
                    // Type-specific fields from getTypeSpecificData
                };
                // Add type-specific fields
                const typeData = this.getTypeSpecificData();
                if (!typeData) {
                    return; // Validation failed
                }
                habitData = Object.assign(Object.assign({}, habitData), typeData);
                this.onSubmit(habitData);
                this.close();
            });
        });
        // Build type-specific form
        this.buildTypeSpecificForm(typeFormContainer);
    }
    // Build form based on current habit type
    buildTypeSpecificForm(container) {
        if (!container) {
            container = this.contentEl.querySelector(".habit-type-form");
            if (!container)
                return;
        }
        container.empty();
        switch (this.habitType) {
            case "daily":
                this.buildDailyHabitForm(container);
                break;
            case "count":
                this.buildCountHabitForm(container);
                break;
            case "mapping":
                this.buildMappingHabitForm(container);
                break;
            case "scheduled":
                this.buildScheduledHabitForm(container);
                break;
        }
    }
    // Daily habit form
    buildDailyHabitForm(container) {
        const dailyData = this.habitData;
        // Property field
        let propertyInput;
        let completionTextInput;
        new Setting(container)
            .setName(t("Property name"))
            .setDesc(t("The property name of the daily note front matter"))
            .addText((text) => {
            propertyInput = text;
            text.setValue((dailyData === null || dailyData === void 0 ? void 0 : dailyData.property) || "");
            text.inputEl.addClass("habit-property-input");
        });
        // Completion text field (optional)
        new Setting(container)
            .setName(t("Completion text"))
            .setDesc(t("(Optional) Specific text representing completion, leave blank for any non-empty value to be considered completed"))
            .addText((text) => {
            completionTextInput = text;
            text.setValue((dailyData === null || dailyData === void 0 ? void 0 : dailyData.completionText) || "");
            text.inputEl.addClass("habit-completion-text-input");
        });
        // Store input components in class for access during submission
        this.dailyInputs = {
            property: propertyInput,
            completionText: completionTextInput,
        };
    }
    // Count habit form
    buildCountHabitForm(container) {
        const countData = this.habitData;
        // Property field
        let propertyInput;
        let minInput;
        let maxInput;
        let unitInput;
        let noticeInput;
        new Setting(container)
            .setName(t("Property name"))
            .setDesc(t("The property name in daily note front matter to store count values"))
            .addText((text) => {
            propertyInput = text;
            text.setValue((countData === null || countData === void 0 ? void 0 : countData.property) || "");
            text.inputEl.addClass("habit-property-input");
        });
        // Minimum value
        new Setting(container)
            .setName(t("Minimum value"))
            .setDesc(t("(Optional) Minimum value for the count"))
            .addText((text) => {
            var _a;
            minInput = text;
            text.setValue(((_a = countData === null || countData === void 0 ? void 0 : countData.min) === null || _a === void 0 ? void 0 : _a.toString()) || "");
            text.inputEl.type = "number";
            text.inputEl.addClass("habit-min-input");
        });
        // Maximum value
        new Setting(container)
            .setName(t("Maximum value"))
            .setDesc(t("(Optional) Maximum value for the count"))
            .addText((text) => {
            var _a;
            maxInput = text;
            text.setValue(((_a = countData === null || countData === void 0 ? void 0 : countData.max) === null || _a === void 0 ? void 0 : _a.toString()) || "");
            text.inputEl.type = "number";
            text.inputEl.addClass("habit-max-input");
        });
        // Unit
        new Setting(container)
            .setName(t("Unit"))
            .setDesc(t("(Optional) Unit for the count, such as 'cups', 'times', etc."))
            .addText((text) => {
            unitInput = text;
            text.setValue((countData === null || countData === void 0 ? void 0 : countData.countUnit) || "");
            text.inputEl.addClass("habit-unit-input");
        });
        // Notice value
        new Setting(container)
            .setName(t("Notice threshold"))
            .setDesc(t("(Optional) Trigger a notification when this value is reached"))
            .addText((text) => {
            noticeInput = text;
            text.setValue((countData === null || countData === void 0 ? void 0 : countData.notice) || "");
            text.inputEl.addClass("habit-notice-input");
        });
        this.countInputs = {
            property: propertyInput,
            min: minInput,
            max: maxInput,
            countUnit: unitInput,
            notice: noticeInput,
        };
    }
    // Mapping habit form
    buildMappingHabitForm(container) {
        const mappingData = this.habitData;
        // Property field
        let propertyInput;
        new Setting(container)
            .setName(t("Property name"))
            .setDesc(t("The property name in daily note front matter to store mapping values"))
            .addText((text) => {
            propertyInput = text;
            text.setValue((mappingData === null || mappingData === void 0 ? void 0 : mappingData.property) || "");
            text.inputEl.addClass("habit-property-input");
        });
        // Value mapping editor
        new Setting(container)
            .setName(t("Value mapping"))
            .setDesc(t("Define mappings from numeric values to display text"));
        // Create mapping editor container
        const mappingContainer = container.createDiv({
            cls: "habit-mapping-container",
        });
        const existingMappings = (mappingData === null || mappingData === void 0 ? void 0 : mappingData.mapping) || {
            1: "😊",
            2: "😐",
            3: "😔",
        };
        // Store mapping input references
        this.mappingInputs = [];
        // Mapping editor function
        const createMappingEditor = (key, value) => {
            const row = mappingContainer.createDiv({
                cls: "habit-mapping-row",
            });
            // Key input
            const keyInput = row.createEl("input", {
                type: "number",
                value: key.toString(),
                cls: "habit-mapping-key",
            });
            // Add separator
            row.createSpan({ text: "→", cls: "habit-mapping-arrow" });
            // Value input
            const valueInput = row.createEl("input", {
                type: "text",
                value: value,
                cls: "habit-mapping-value",
            });
            // Delete button
            new ExtraButtonComponent(row)
                .setIcon("trash")
                .setTooltip(t("Delete"))
                .onClick(() => {
                row.remove();
                // Update input array
                const index = this.mappingInputs.findIndex((m) => m.keyInput === keyInput &&
                    m.valueInput === valueInput);
                if (index > -1) {
                    this.mappingInputs.splice(index, 1);
                }
            });
            // Save references
            this.mappingInputs.push({ keyInput, valueInput });
        };
        // Add existing mappings
        Object.entries(existingMappings).forEach(([key, value]) => {
            createMappingEditor(parseInt(key), value);
        });
        // Add mapping button
        const addMappingBtn = container.createEl("button", {
            cls: "habit-add-mapping-button",
            text: t("Add new mapping"),
        });
        addMappingBtn.addEventListener("click", () => {
            // Find max key and increment by 1
            let maxKey = 0;
            this.mappingInputs.forEach((input) => {
                const key = parseInt(input.keyInput.value);
                if (!isNaN(key) && key > maxKey)
                    maxKey = key;
            });
            createMappingEditor(maxKey + 1, "");
        });
        this.mappingPropertyInput = propertyInput;
    }
    // Scheduled habit form
    buildScheduledHabitForm(container) {
        const scheduledData = this.habitData;
        // Event editing instructions
        new Setting(container)
            .setName(t("Scheduled events"))
            .setDesc(t("Add multiple events that need to be completed"));
        // Create event editor container
        const eventsContainer = container.createDiv({
            cls: "habit-events-container",
        });
        const existingEvents = (scheduledData === null || scheduledData === void 0 ? void 0 : scheduledData.events) || [];
        const existingMap = (scheduledData === null || scheduledData === void 0 ? void 0 : scheduledData.propertiesMap) || {};
        // Store event input references
        this.eventInputs = [];
        // Event editor function
        const createEventEditor = (event = { name: "", details: "" }, propertyKey = "") => {
            const row = eventsContainer.createDiv({ cls: "habit-event-row" });
            // Name input
            const nameInput = row.createEl("input", {
                type: "text",
                value: event.name,
                cls: "habit-event-name",
                placeholder: t("Event name"),
            });
            // Details input
            const detailsInput = row.createEl("input", {
                type: "text",
                value: event.details,
                cls: "habit-event-details",
                placeholder: t("Event details"),
            });
            // Property key input
            const propertyInput = row.createEl("input", {
                type: "text",
                value: propertyKey,
                cls: "habit-event-property",
                placeholder: t("Property name"),
            });
            // Delete button
            new ExtraButtonComponent(row)
                .setIcon("trash")
                .setTooltip(t("Delete"))
                .onClick(() => {
                row.remove();
                // Update input array
                const index = this.eventInputs.findIndex((e) => e.nameInput === nameInput &&
                    e.detailsInput === detailsInput &&
                    e.propertyInput === propertyInput);
                if (index > -1) {
                    this.eventInputs.splice(index, 1);
                }
            });
            // Save references
            this.eventInputs.push({ nameInput, detailsInput, propertyInput });
        };
        // Add existing events
        if (existingEvents.length > 0) {
            existingEvents.forEach((event) => {
                const propertyKey = existingMap[event.name] || "";
                createEventEditor(event, propertyKey);
            });
        }
        else {
            // Add a default empty event
            createEventEditor();
        }
        // Add event button
        const addEventBtn = container.createEl("button", {
            cls: "habit-add-event-button",
            text: t("Add new event"),
        });
        addEventBtn.addEventListener("click", () => {
            createEventEditor();
        });
    }
    // Get type-specific field data
    getTypeSpecificData() {
        switch (this.habitType) {
            case "daily":
                return this.getDailyHabitData();
            case "count":
                return this.getCountHabitData();
            case "mapping":
                return this.getMappingHabitData();
            case "scheduled":
                return this.getScheduledHabitData();
        }
        return null;
    }
    // Get daily habit data
    getDailyHabitData() {
        if (!this.dailyInputs)
            return null;
        const property = this.dailyInputs.property.getValue().trim();
        if (!property) {
            new Notice(t("Please enter a property name"));
            return null;
        }
        return {
            type: "daily",
            property: property,
            completionText: this.dailyInputs.completionText.getValue() || undefined,
        };
    }
    // Get count habit data
    getCountHabitData() {
        if (!this.countInputs)
            return null;
        const property = this.countInputs.property.getValue().trim();
        if (!property) {
            new Notice(t("Please enter a property name"));
            return null;
        }
        const minValue = this.countInputs.min.getValue();
        const maxValue = this.countInputs.max.getValue();
        const noticeValue = this.countInputs.notice.getValue();
        return {
            type: "count",
            property: property,
            min: minValue ? parseInt(minValue) : undefined,
            max: maxValue ? parseInt(maxValue) : undefined,
            notice: noticeValue || undefined,
            countUnit: this.countInputs.countUnit.getValue() || undefined,
        };
    }
    // Get mapping habit data
    getMappingHabitData() {
        if (!this.mappingPropertyInput || !this.mappingInputs)
            return null;
        const property = this.mappingPropertyInput.getValue().trim();
        if (!property) {
            new Notice(t("Please enter a property name"));
            return null;
        }
        // Validate if there are mapping values
        if (this.mappingInputs.length === 0) {
            new Notice(t("Please add at least one mapping value"));
            return null;
        }
        // Build mapping object
        const mapping = {};
        for (const input of this.mappingInputs) {
            const key = parseInt(input.keyInput.value);
            const value = input.valueInput.value;
            if (isNaN(key)) {
                new Notice(t("Mapping key must be a number"));
                return null;
            }
            if (!value) {
                new Notice(t("Please enter text for all mapping values"));
                return null;
            }
            mapping[key] = value;
        }
        return {
            type: "mapping",
            property: property,
            mapping: mapping,
        };
    }
    // Get scheduled habit data
    getScheduledHabitData() {
        if (!this.eventInputs)
            return null;
        // Validate if there are events
        if (this.eventInputs.length === 0) {
            new Notice(t("Please add at least one event"));
            return null;
        }
        // Build event list and property mapping
        const events = [];
        const propertiesMap = {};
        for (const input of this.eventInputs) {
            const name = input.nameInput.value.trim();
            const details = input.detailsInput.value.trim();
            const property = input.propertyInput.value.trim();
            if (!name) {
                new Notice(t("Event name cannot be empty"));
                return null;
            }
            events.push({
                name: name,
                details: details,
            });
            if (property) {
                propertiesMap[name] = property;
            }
        }
        return {
            type: "scheduled",
            events: events,
            propertiesMap: propertiesMap,
        };
    }
    // Generate unique ID
    generateId() {
        return (Date.now().toString() + Math.random().toString(36).substring(2, 9));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSGFiaXRFZGl0RGlhbG9nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiSGFiaXRFZGl0RGlhbG9nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFFTixLQUFLLEVBQ0wsT0FBTyxFQUdQLE1BQU0sRUFDTixPQUFPLEVBQ1AsZUFBZSxFQUNmLG9CQUFvQixHQUNwQixNQUFNLFVBQVUsQ0FBQztBQVVsQixPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2hFLE9BQU8sZ0NBQWdDLENBQUM7QUFFeEMsTUFBTSxPQUFPLGVBQWdCLFNBQVEsS0FBSztJQVF6QyxZQUNDLEdBQVEsRUFDUixNQUE2QixFQUM3QixZQUFrQyxJQUFJLEVBQ3RDLFFBQXdDO1FBRXhDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQVpaLGNBQVMsR0FBeUIsSUFBSSxDQUFDO1FBR3ZDLGNBQVMsR0FBVyxPQUFPLENBQUM7UUFDNUIsY0FBUyxHQUFXLGNBQWMsQ0FBQztRQThzQm5DLGdEQUFnRDtRQUN4QyxnQkFBVyxHQUdSLElBQUksQ0FBQztRQUVSLGdCQUFXLEdBTVIsSUFBSSxDQUFDO1FBRVIseUJBQW9CLEdBQXlCLElBQUksQ0FBQztRQUNsRCxrQkFBYSxHQUdoQixFQUFFLENBQUM7UUFFQSxnQkFBVyxHQUlkLEVBQUUsQ0FBQztRQTd0QlAsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLFNBQVMsQ0FBQztRQUV4QixJQUFJLFNBQVMsRUFBRTtZQUNkLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQztZQUNoQyxJQUFJLENBQUMsU0FBUyxH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QUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVsRCxJQUFJLENBQUMsSUFBSSxFQUFFO2dCQUNWLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUM7Z0JBQzVDLE9BQU8sSUFBSSxDQUFDO2FBQ1o7WUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUNYLElBQUksRUFBRSxJQUFJO2dCQUNWLE9BQU8sRUFBRSxPQUFPO2FBQ2hCLENBQUMsQ0FBQztZQUVILElBQUksUUFBUSxFQUFFO2dCQUNiLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUM7YUFDL0I7U0FDRDtRQUVELE9BQU87WUFDTixJQUFJLEVBQUUsV0FBVztZQUNqQixNQUFNLEVBQUUsTUFBTTtZQUNkLGFBQWEsRUFBRSxhQUFhO1NBQzVCLENBQUM7SUFDSCxDQUFDO0lBRUQscUJBQXFCO0lBQ3JCLFVBQVU7UUFDVCxPQUFPLENBQ04sSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDbEUsQ0FBQztJQUNILENBQUM7Q0EyQkQiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdEFwcCxcclxuXHRNb2RhbCxcclxuXHRTZXR0aW5nLFxyXG5cdERyb3Bkb3duQ29tcG9uZW50LFxyXG5cdFRleHRDb21wb25lbnQsXHJcblx0Tm90aWNlLFxyXG5cdHNldEljb24sXHJcblx0QnV0dG9uQ29tcG9uZW50LFxyXG5cdEV4dHJhQnV0dG9uQ29tcG9uZW50LFxyXG59IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQge1xyXG5cdEJhc2VIYWJpdERhdGEsXHJcblx0QmFzZURhaWx5SGFiaXREYXRhLFxyXG5cdEJhc2VDb3VudEhhYml0RGF0YSxcclxuXHRCYXNlTWFwcGluZ0hhYml0RGF0YSxcclxuXHRCYXNlU2NoZWR1bGVkSGFiaXREYXRhLFxyXG5cdFNjaGVkdWxlZEV2ZW50LFxyXG59IGZyb20gJ0AvdHlwZXMvaGFiaXQtY2FyZCc7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSAnQC9pbmRleCc7XHJcbmltcG9ydCB7IHQgfSBmcm9tICdAL3RyYW5zbGF0aW9ucy9oZWxwZXInO1xyXG5pbXBvcnQgeyBhdHRhY2hJY29uTWVudSB9IGZyb20gJ0AvY29tcG9uZW50cy91aS9tZW51cy9JY29uTWVudSc7XHJcbmltcG9ydCBcIkAvc3R5bGVzL2hhYml0LWVkaXQtZGlhbG9nLmNzc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEhhYml0RWRpdERpYWxvZyBleHRlbmRzIE1vZGFsIHtcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHRoYWJpdERhdGE6IEJhc2VIYWJpdERhdGEgfCBudWxsID0gbnVsbDtcclxuXHRvblN1Ym1pdDogKGhhYml0OiBCYXNlSGFiaXREYXRhKSA9PiB2b2lkO1xyXG5cdGlzTmV3OiBib29sZWFuO1xyXG5cdGhhYml0VHlwZTogc3RyaW5nID0gXCJkYWlseVwiO1xyXG5cdGljb25JbnB1dDogc3RyaW5nID0gXCJjaXJjbGUtY2hlY2tcIjtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0aGFiaXREYXRhOiBCYXNlSGFiaXREYXRhIHwgbnVsbCA9IG51bGwsXHJcblx0XHRvblN1Ym1pdDogKGhhYml0OiBCYXNlSGFiaXREYXRhKSA9PiB2b2lkXHJcblx0KSB7XHJcblx0XHRzdXBlcihhcHApO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLmhhYml0RGF0YSA9IGhhYml0RGF0YTtcclxuXHRcdHRoaXMub25TdWJtaXQgPSBvblN1Ym1pdDtcclxuXHRcdHRoaXMuaXNOZXcgPSAhaGFiaXREYXRhO1xyXG5cclxuXHRcdGlmIChoYWJpdERhdGEpIHtcclxuXHRcdFx0dGhpcy5oYWJpdFR5cGUgPSBoYWJpdERhdGEudHlwZTtcclxuXHRcdFx0dGhpcy5pY29uSW5wdXQgPSBoYWJpdERhdGEuaWNvbjtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdG9uT3BlbigpIHtcclxuXHRcdHRoaXMudGl0bGVFbC5zZXRUZXh0KFxyXG5cdFx0XHR0aGlzLmlzTmV3ID8gdChcIkNyZWF0ZSBuZXcgaGFiaXRcIikgOiB0KFwiRWRpdCBoYWJpdFwiKVxyXG5cdFx0KTtcclxuXHRcdHRoaXMubW9kYWxFbC5hZGRDbGFzcyhcImhhYml0LWVkaXQtZGlhbG9nXCIpO1xyXG5cclxuXHRcdHRoaXMuYnVpbGRGb3JtKCk7XHJcblx0fVxyXG5cclxuXHRidWlsZEZvcm0oKSB7XHJcblx0XHRjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cclxuXHRcdGNvbnN0IHR5cGVDb250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImhhYml0LXR5cGUtc2VsZWN0b3JcIixcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3QgdHlwZURlc2MgPSB0eXBlQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJoYWJpdC10eXBlLWRlc2NyaXB0aW9uXCIsXHJcblx0XHR9KTtcclxuXHRcdHR5cGVEZXNjLnNldFRleHQodChcIkhhYml0IHR5cGVcIikpO1xyXG5cclxuXHRcdGNvbnN0IHR5cGVHcmlkID0gdHlwZUNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwiaGFiaXQtdHlwZS1ncmlkXCIgfSk7XHJcblxyXG5cdFx0Y29uc3QgdHlwZXMgPSBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJkYWlseVwiLFxyXG5cdFx0XHRcdG5hbWU6IHQoXCJEYWlseSBoYWJpdFwiKSxcclxuXHRcdFx0XHRpY29uOiBcImNhbGVuZGFyLWNoZWNrXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IHQoXCJTaW1wbGUgZGFpbHkgY2hlY2staW4gaGFiaXRcIiksXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJjb3VudFwiLFxyXG5cdFx0XHRcdG5hbWU6IHQoXCJDb3VudCBoYWJpdFwiKSxcclxuXHRcdFx0XHRpY29uOiBcImJhci1jaGFydFwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiB0KFxyXG5cdFx0XHRcdFx0XCJSZWNvcmQgbnVtZXJpYyB2YWx1ZXMsIGUuZy4sIGhvdyBtYW55IGN1cHMgb2Ygd2F0ZXJcIlxyXG5cdFx0XHRcdCksXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJtYXBwaW5nXCIsXHJcblx0XHRcdFx0bmFtZTogdChcIk1hcHBpbmcgaGFiaXRcIiksXHJcblx0XHRcdFx0aWNvbjogXCJzbWlsZVwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiB0KFxyXG5cdFx0XHRcdFx0XCJVc2UgZGlmZmVyZW50IHZhbHVlcyB0byBtYXAsIGUuZy4sIGVtb3Rpb24gdHJhY2tpbmdcIlxyXG5cdFx0XHRcdCksXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJzY2hlZHVsZWRcIixcclxuXHRcdFx0XHRuYW1lOiB0KFwiU2NoZWR1bGVkIGhhYml0XCIpLFxyXG5cdFx0XHRcdGljb246IFwiY2FsZW5kYXJcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogdChcIkhhYml0IHdpdGggbXVsdGlwbGUgZXZlbnRzXCIpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XTtcclxuXHJcblx0XHR0eXBlcy5mb3JFYWNoKCh0eXBlKSA9PiB7XHJcblx0XHRcdGNvbnN0IHR5cGVCdG4gPSB0eXBlR3JpZC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogYGhhYml0LXR5cGUtaXRlbSAke1xyXG5cdFx0XHRcdFx0dHlwZS5pZCA9PT0gdGhpcy5oYWJpdFR5cGUgPyBcInNlbGVjdGVkXCIgOiBcIlwiXHJcblx0XHRcdFx0fWAsXHJcblx0XHRcdFx0YXR0cjogeyBcImRhdGEtdHlwZVwiOiB0eXBlLmlkIH0sXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgaWNvbkRpdiA9IHR5cGVCdG4uY3JlYXRlRGl2KFxyXG5cdFx0XHRcdHsgY2xzOiBcImhhYml0LXR5cGUtaWNvblwiIH0sXHJcblx0XHRcdFx0KGVsKSA9PiB7XHJcblx0XHRcdFx0XHRzZXRJY29uKGVsLCB0eXBlLmljb24pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHRcdFx0Y29uc3QgdGV4dERpdiA9IHR5cGVCdG4uY3JlYXRlRGl2KHsgY2xzOiBcImhhYml0LXR5cGUtdGV4dFwiIH0pO1xyXG5cdFx0XHR0ZXh0RGl2LmNyZWF0ZURpdih7IGNsczogXCJoYWJpdC10eXBlLW5hbWVcIiwgdGV4dDogdHlwZS5uYW1lIH0pO1xyXG5cdFx0XHR0ZXh0RGl2LmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcImhhYml0LXR5cGUtZGVzY1wiLFxyXG5cdFx0XHRcdHRleHQ6IHR5cGUuZGVzY3JpcHRpb24sXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dHlwZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuaGFiaXQtdHlwZS1pdGVtXCIpLmZvckVhY2goKGVsKSA9PiB7XHJcblx0XHRcdFx0XHRlbC5yZW1vdmVDbGFzcyhcInNlbGVjdGVkXCIpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdC8vIFNldCBjdXJyZW50IHNlbGVjdGlvblxyXG5cdFx0XHRcdHR5cGVCdG4uYWRkQ2xhc3MoXCJzZWxlY3RlZFwiKTtcclxuXHRcdFx0XHR0aGlzLmhhYml0VHlwZSA9IHR5cGUuaWQ7XHJcblx0XHRcdFx0Ly8gUmVidWlsZCBmb3JtXHJcblx0XHRcdFx0dGhpcy5idWlsZFR5cGVTcGVjaWZpY0Zvcm0oKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDb21tb24gZmllbGRzIGZvcm1cclxuXHRcdGNvbnN0IGNvbW1vbkZvcm0gPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcImhhYml0LWNvbW1vbi1mb3JtXCIgfSk7XHJcblxyXG5cdFx0Ly8gSUQgZmllbGQgKGhpZGRlbiwgYXV0by1nZW5lcmF0ZWQgd2hlbiBjcmVhdGluZylcclxuXHRcdGNvbnN0IGhhYml0SWQgPSB0aGlzLmhhYml0RGF0YT8uaWQgfHwgdGhpcy5nZW5lcmF0ZUlkKCk7XHJcblxyXG5cdFx0Ly8gTmFtZSBmaWVsZFxyXG5cdFx0bGV0IG5hbWVJbnB1dDogVGV4dENvbXBvbmVudDtcclxuXHRcdG5ldyBTZXR0aW5nKGNvbW1vbkZvcm0pXHJcblx0XHRcdC5zZXROYW1lKHQoXCJIYWJpdCBuYW1lXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiRGlzcGxheSBuYW1lIG9mIHRoZSBoYWJpdFwiKSlcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHRuYW1lSW5wdXQgPSB0ZXh0O1xyXG5cdFx0XHRcdHRleHQuc2V0VmFsdWUodGhpcy5oYWJpdERhdGE/Lm5hbWUgfHwgXCJcIik7XHJcblx0XHRcdFx0dGV4dC5pbnB1dEVsLmFkZENsYXNzKFwiaGFiaXQtbmFtZS1pbnB1dFwiKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gRGVzY3JpcHRpb24gZmllbGRcclxuXHRcdGxldCBkZXNjSW5wdXQ6IFRleHRDb21wb25lbnQ7XHJcblx0XHRuZXcgU2V0dGluZyhjb21tb25Gb3JtKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiRGVzY3JpcHRpb25cIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJPcHRpb25hbCBoYWJpdCBkZXNjcmlwdGlvblwiKSlcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHRkZXNjSW5wdXQgPSB0ZXh0O1xyXG5cdFx0XHRcdHRleHQuc2V0VmFsdWUodGhpcy5oYWJpdERhdGE/LmRlc2NyaXB0aW9uIHx8IFwiXCIpO1xyXG5cdFx0XHRcdHRleHQuaW5wdXRFbC5hZGRDbGFzcyhcImhhYml0LWRlc2MtaW5wdXRcIik7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIEljb24gc2VsZWN0b3JcclxuXHRcdGxldCBpY29uU2VsZWN0b3I6IFRleHRDb21wb25lbnQ7XHJcblx0XHRuZXcgU2V0dGluZyhjb21tb25Gb3JtKS5zZXROYW1lKHQoXCJJY29uXCIpKS5hZGRCdXR0b24oKGJ0bikgPT4ge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGJ0bi5zZXRJY29uKHRoaXMuaWNvbklucHV0IHx8IFwiY2lyY2xlLWNoZWNrXCIpO1xyXG5cdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIHNldHRpbmcgaWNvbjpcIiwgZSk7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdGJ0bi5zZXRJY29uKFwiY2lyY2xlLWNoZWNrXCIpO1xyXG5cdFx0XHRcdH0gY2F0Y2ggKGVycikge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBzZXQgZGVmYXVsdCBpY29uOlwiLCBlcnIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRhdHRhY2hJY29uTWVudShidG4sIHtcclxuXHRcdFx0XHRjb250YWluZXJFbDogdGhpcy5tb2RhbEVsLFxyXG5cdFx0XHRcdHBsdWdpbjogdGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0b25JY29uU2VsZWN0ZWQ6IChpY29uSWQpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaWNvbklucHV0ID0gaWNvbklkO1xyXG5cdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0c2V0SWNvbihidG4uYnV0dG9uRWwsIGljb25JZCB8fCBcImNpcmNsZS1jaGVja1wiKTtcclxuXHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIHNldHRpbmcgaWNvbjpcIiwgZSk7XHJcblx0XHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdFx0c2V0SWNvbihidG4uYnV0dG9uRWwsIFwiY2lyY2xlLWNoZWNrXCIpO1xyXG5cdFx0XHRcdFx0XHR9IGNhdGNoIChlcnIpIHtcclxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHNldCBkZWZhdWx0IGljb246XCIsIGVycik7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHRoaXMuaWNvbklucHV0ID0gaWNvbklkO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gVHlwZS1zcGVjaWZpYyBmb3JtIGNvbnRhaW5lclxyXG5cdFx0Y29uc3QgdHlwZUZvcm1Db250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImhhYml0LXR5cGUtZm9ybVwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQnV0dG9uIGNvbnRhaW5lclxyXG5cdFx0Y29uc3QgYnV0dG9uQ29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdihcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsczogXCJoYWJpdC1lZGl0LWJ1dHRvbnNcIixcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVsKSA9PiB7XHJcblx0XHRcdFx0bmV3IEJ1dHRvbkNvbXBvbmVudChlbClcclxuXHRcdFx0XHRcdC5zZXRXYXJuaW5nKClcclxuXHRcdFx0XHRcdC5zZXRCdXR0b25UZXh0KHQoXCJDYW5jZWxcIikpXHJcblx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdG5ldyBCdXR0b25Db21wb25lbnQoZWwpXHJcblx0XHRcdFx0XHQuc2V0Q3RhKClcclxuXHRcdFx0XHRcdC5zZXRCdXR0b25UZXh0KHQoXCJTYXZlXCIpKVxyXG5cdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBuYW1lID0gbmFtZUlucHV0LmdldFZhbHVlKCkudHJpbSgpO1xyXG5cdFx0XHRcdFx0XHRpZiAoIW5hbWUpIHtcclxuXHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJQbGVhc2UgZW50ZXIgYSBoYWJpdCBuYW1lXCIpKTtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIENvbGxlY3QgY29tbW9uIGZpZWxkc1xyXG5cdFx0XHRcdFx0XHRsZXQgaGFiaXREYXRhOiBCYXNlSGFiaXREYXRhID0ge1xyXG5cdFx0XHRcdFx0XHRcdGlkOiBoYWJpdElkLFxyXG5cdFx0XHRcdFx0XHRcdG5hbWU6IG5hbWUsXHJcblx0XHRcdFx0XHRcdFx0ZGVzY3JpcHRpb246IGRlc2NJbnB1dC5nZXRWYWx1ZSgpIHx8IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0XHRpY29uOiB0aGlzLmljb25JbnB1dCB8fCBcImNpcmNsZS1jaGVja1wiLFxyXG5cdFx0XHRcdFx0XHRcdHR5cGU6IHRoaXMuaGFiaXRUeXBlIGFzIGFueSxcclxuXHRcdFx0XHRcdFx0XHQvLyBUeXBlLXNwZWNpZmljIGZpZWxkcyBmcm9tIGdldFR5cGVTcGVjaWZpY0RhdGFcclxuXHRcdFx0XHRcdFx0fSBhcyBhbnk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBBZGQgdHlwZS1zcGVjaWZpYyBmaWVsZHNcclxuXHRcdFx0XHRcdFx0Y29uc3QgdHlwZURhdGEgPSB0aGlzLmdldFR5cGVTcGVjaWZpY0RhdGEoKTtcclxuXHRcdFx0XHRcdFx0aWYgKCF0eXBlRGF0YSkge1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybjsgLy8gVmFsaWRhdGlvbiBmYWlsZWRcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0aGFiaXREYXRhID0geyAuLi5oYWJpdERhdGEsIC4uLnR5cGVEYXRhIH07XHJcblxyXG5cdFx0XHRcdFx0XHR0aGlzLm9uU3VibWl0KGhhYml0RGF0YSk7XHJcblx0XHRcdFx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIEJ1aWxkIHR5cGUtc3BlY2lmaWMgZm9ybVxyXG5cdFx0dGhpcy5idWlsZFR5cGVTcGVjaWZpY0Zvcm0odHlwZUZvcm1Db250YWluZXIpO1xyXG5cdH1cclxuXHJcblx0Ly8gQnVpbGQgZm9ybSBiYXNlZCBvbiBjdXJyZW50IGhhYml0IHR5cGVcclxuXHRidWlsZFR5cGVTcGVjaWZpY0Zvcm0oY29udGFpbmVyPzogSFRNTEVsZW1lbnQpIHtcclxuXHRcdGlmICghY29udGFpbmVyKSB7XHJcblx0XHRcdGNvbnRhaW5lciA9IHRoaXMuY29udGVudEVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XCIuaGFiaXQtdHlwZS1mb3JtXCJcclxuXHRcdFx0KSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0aWYgKCFjb250YWluZXIpIHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRjb250YWluZXIuZW1wdHkoKTtcclxuXHJcblx0XHRzd2l0Y2ggKHRoaXMuaGFiaXRUeXBlKSB7XHJcblx0XHRcdGNhc2UgXCJkYWlseVwiOlxyXG5cdFx0XHRcdHRoaXMuYnVpbGREYWlseUhhYml0Rm9ybShjb250YWluZXIpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiY291bnRcIjpcclxuXHRcdFx0XHR0aGlzLmJ1aWxkQ291bnRIYWJpdEZvcm0oY29udGFpbmVyKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcIm1hcHBpbmdcIjpcclxuXHRcdFx0XHR0aGlzLmJ1aWxkTWFwcGluZ0hhYml0Rm9ybShjb250YWluZXIpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwic2NoZWR1bGVkXCI6XHJcblx0XHRcdFx0dGhpcy5idWlsZFNjaGVkdWxlZEhhYml0Rm9ybShjb250YWluZXIpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gRGFpbHkgaGFiaXQgZm9ybVxyXG5cdGJ1aWxkRGFpbHlIYWJpdEZvcm0oY29udGFpbmVyOiBIVE1MRWxlbWVudCkge1xyXG5cdFx0Y29uc3QgZGFpbHlEYXRhID0gdGhpcy5oYWJpdERhdGEgYXMgQmFzZURhaWx5SGFiaXREYXRhIHwgbnVsbDtcclxuXHJcblx0XHQvLyBQcm9wZXJ0eSBmaWVsZFxyXG5cdFx0bGV0IHByb3BlcnR5SW5wdXQ6IFRleHRDb21wb25lbnQ7XHJcblx0XHRsZXQgY29tcGxldGlvblRleHRJbnB1dDogVGV4dENvbXBvbmVudDtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJQcm9wZXJ0eSBuYW1lXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiVGhlIHByb3BlcnR5IG5hbWUgb2YgdGhlIGRhaWx5IG5vdGUgZnJvbnQgbWF0dGVyXCIpKVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdHByb3BlcnR5SW5wdXQgPSB0ZXh0O1xyXG5cdFx0XHRcdHRleHQuc2V0VmFsdWUoZGFpbHlEYXRhPy5wcm9wZXJ0eSB8fCBcIlwiKTtcclxuXHRcdFx0XHR0ZXh0LmlucHV0RWwuYWRkQ2xhc3MoXCJoYWJpdC1wcm9wZXJ0eS1pbnB1dFwiKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ29tcGxldGlvbiB0ZXh0IGZpZWxkIChvcHRpb25hbClcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcclxuXHRcdFx0LnNldE5hbWUodChcIkNvbXBsZXRpb24gdGV4dFwiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiKE9wdGlvbmFsKSBTcGVjaWZpYyB0ZXh0IHJlcHJlc2VudGluZyBjb21wbGV0aW9uLCBsZWF2ZSBibGFuayBmb3IgYW55IG5vbi1lbXB0eSB2YWx1ZSB0byBiZSBjb25zaWRlcmVkIGNvbXBsZXRlZFwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0Y29tcGxldGlvblRleHRJbnB1dCA9IHRleHQ7XHJcblx0XHRcdFx0dGV4dC5zZXRWYWx1ZShkYWlseURhdGE/LmNvbXBsZXRpb25UZXh0IHx8IFwiXCIpO1xyXG5cdFx0XHRcdHRleHQuaW5wdXRFbC5hZGRDbGFzcyhcImhhYml0LWNvbXBsZXRpb24tdGV4dC1pbnB1dFwiKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gU3RvcmUgaW5wdXQgY29tcG9uZW50cyBpbiBjbGFzcyBmb3IgYWNjZXNzIGR1cmluZyBzdWJtaXNzaW9uXHJcblx0XHR0aGlzLmRhaWx5SW5wdXRzID0ge1xyXG5cdFx0XHRwcm9wZXJ0eTogcHJvcGVydHlJbnB1dCEsXHJcblx0XHRcdGNvbXBsZXRpb25UZXh0OiBjb21wbGV0aW9uVGV4dElucHV0ISxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvLyBDb3VudCBoYWJpdCBmb3JtXHJcblx0YnVpbGRDb3VudEhhYml0Rm9ybShjb250YWluZXI6IEhUTUxFbGVtZW50KSB7XHJcblx0XHRjb25zdCBjb3VudERhdGEgPSB0aGlzLmhhYml0RGF0YSBhcyBCYXNlQ291bnRIYWJpdERhdGEgfCBudWxsO1xyXG5cclxuXHRcdC8vIFByb3BlcnR5IGZpZWxkXHJcblx0XHRsZXQgcHJvcGVydHlJbnB1dDogVGV4dENvbXBvbmVudDtcclxuXHRcdGxldCBtaW5JbnB1dDogVGV4dENvbXBvbmVudDtcclxuXHRcdGxldCBtYXhJbnB1dDogVGV4dENvbXBvbmVudDtcclxuXHRcdGxldCB1bml0SW5wdXQ6IFRleHRDb21wb25lbnQ7XHJcblx0XHRsZXQgbm90aWNlSW5wdXQ6IFRleHRDb21wb25lbnQ7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiUHJvcGVydHkgbmFtZVwiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiVGhlIHByb3BlcnR5IG5hbWUgaW4gZGFpbHkgbm90ZSBmcm9udCBtYXR0ZXIgdG8gc3RvcmUgY291bnQgdmFsdWVzXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHRwcm9wZXJ0eUlucHV0ID0gdGV4dDtcclxuXHRcdFx0XHR0ZXh0LnNldFZhbHVlKGNvdW50RGF0YT8ucHJvcGVydHkgfHwgXCJcIik7XHJcblx0XHRcdFx0dGV4dC5pbnB1dEVsLmFkZENsYXNzKFwiaGFiaXQtcHJvcGVydHktaW5wdXRcIik7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIE1pbmltdW0gdmFsdWVcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcclxuXHRcdFx0LnNldE5hbWUodChcIk1pbmltdW0gdmFsdWVcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCIoT3B0aW9uYWwpIE1pbmltdW0gdmFsdWUgZm9yIHRoZSBjb3VudFwiKSlcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHRtaW5JbnB1dCA9IHRleHQ7XHJcblx0XHRcdFx0dGV4dC5zZXRWYWx1ZShjb3VudERhdGE/Lm1pbj8udG9TdHJpbmcoKSB8fCBcIlwiKTtcclxuXHRcdFx0XHR0ZXh0LmlucHV0RWwudHlwZSA9IFwibnVtYmVyXCI7XHJcblx0XHRcdFx0dGV4dC5pbnB1dEVsLmFkZENsYXNzKFwiaGFiaXQtbWluLWlucHV0XCIpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBNYXhpbXVtIHZhbHVlXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJNYXhpbXVtIHZhbHVlXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiKE9wdGlvbmFsKSBNYXhpbXVtIHZhbHVlIGZvciB0aGUgY291bnRcIikpXHJcblx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0bWF4SW5wdXQgPSB0ZXh0O1xyXG5cdFx0XHRcdHRleHQuc2V0VmFsdWUoY291bnREYXRhPy5tYXg/LnRvU3RyaW5nKCkgfHwgXCJcIik7XHJcblx0XHRcdFx0dGV4dC5pbnB1dEVsLnR5cGUgPSBcIm51bWJlclwiO1xyXG5cdFx0XHRcdHRleHQuaW5wdXRFbC5hZGRDbGFzcyhcImhhYml0LW1heC1pbnB1dFwiKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gVW5pdFxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiVW5pdFwiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiKE9wdGlvbmFsKSBVbml0IGZvciB0aGUgY291bnQsIHN1Y2ggYXMgJ2N1cHMnLCAndGltZXMnLCBldGMuXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHR1bml0SW5wdXQgPSB0ZXh0O1xyXG5cdFx0XHRcdHRleHQuc2V0VmFsdWUoY291bnREYXRhPy5jb3VudFVuaXQgfHwgXCJcIik7XHJcblx0XHRcdFx0dGV4dC5pbnB1dEVsLmFkZENsYXNzKFwiaGFiaXQtdW5pdC1pbnB1dFwiKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gTm90aWNlIHZhbHVlXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJOb3RpY2UgdGhyZXNob2xkXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCIoT3B0aW9uYWwpIFRyaWdnZXIgYSBub3RpZmljYXRpb24gd2hlbiB0aGlzIHZhbHVlIGlzIHJlYWNoZWRcIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdG5vdGljZUlucHV0ID0gdGV4dDtcclxuXHRcdFx0XHR0ZXh0LnNldFZhbHVlKGNvdW50RGF0YT8ubm90aWNlIHx8IFwiXCIpO1xyXG5cdFx0XHRcdHRleHQuaW5wdXRFbC5hZGRDbGFzcyhcImhhYml0LW5vdGljZS1pbnB1dFwiKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5jb3VudElucHV0cyA9IHtcclxuXHRcdFx0cHJvcGVydHk6IHByb3BlcnR5SW5wdXQhLFxyXG5cdFx0XHRtaW46IG1pbklucHV0ISxcclxuXHRcdFx0bWF4OiBtYXhJbnB1dCEsXHJcblx0XHRcdGNvdW50VW5pdDogdW5pdElucHV0ISxcclxuXHRcdFx0bm90aWNlOiBub3RpY2VJbnB1dCEsXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0Ly8gTWFwcGluZyBoYWJpdCBmb3JtXHJcblx0YnVpbGRNYXBwaW5nSGFiaXRGb3JtKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpIHtcclxuXHRcdGNvbnN0IG1hcHBpbmdEYXRhID0gdGhpcy5oYWJpdERhdGEgYXMgQmFzZU1hcHBpbmdIYWJpdERhdGEgfCBudWxsO1xyXG5cclxuXHRcdC8vIFByb3BlcnR5IGZpZWxkXHJcblx0XHRsZXQgcHJvcGVydHlJbnB1dDogVGV4dENvbXBvbmVudDtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJQcm9wZXJ0eSBuYW1lXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJUaGUgcHJvcGVydHkgbmFtZSBpbiBkYWlseSBub3RlIGZyb250IG1hdHRlciB0byBzdG9yZSBtYXBwaW5nIHZhbHVlc1wiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0cHJvcGVydHlJbnB1dCA9IHRleHQ7XHJcblx0XHRcdFx0dGV4dC5zZXRWYWx1ZShtYXBwaW5nRGF0YT8ucHJvcGVydHkgfHwgXCJcIik7XHJcblx0XHRcdFx0dGV4dC5pbnB1dEVsLmFkZENsYXNzKFwiaGFiaXQtcHJvcGVydHktaW5wdXRcIik7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIFZhbHVlIG1hcHBpbmcgZWRpdG9yXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJWYWx1ZSBtYXBwaW5nXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiRGVmaW5lIG1hcHBpbmdzIGZyb20gbnVtZXJpYyB2YWx1ZXMgdG8gZGlzcGxheSB0ZXh0XCIpKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgbWFwcGluZyBlZGl0b3IgY29udGFpbmVyXHJcblx0XHRjb25zdCBtYXBwaW5nQ29udGFpbmVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJoYWJpdC1tYXBwaW5nLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBleGlzdGluZ01hcHBpbmdzID0gbWFwcGluZ0RhdGE/Lm1hcHBpbmcgfHwge1xyXG5cdFx0XHQxOiBcIvCfmIpcIixcclxuXHRcdFx0MjogXCLwn5iQXCIsXHJcblx0XHRcdDM6IFwi8J+YlFwiLFxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBTdG9yZSBtYXBwaW5nIGlucHV0IHJlZmVyZW5jZXNcclxuXHRcdHRoaXMubWFwcGluZ0lucHV0cyA9IFtdO1xyXG5cclxuXHRcdC8vIE1hcHBpbmcgZWRpdG9yIGZ1bmN0aW9uXHJcblx0XHRjb25zdCBjcmVhdGVNYXBwaW5nRWRpdG9yID0gKGtleTogbnVtYmVyLCB2YWx1ZTogc3RyaW5nKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJvdyA9IG1hcHBpbmdDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiaGFiaXQtbWFwcGluZy1yb3dcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBLZXkgaW5wdXRcclxuXHRcdFx0Y29uc3Qga2V5SW5wdXQgPSByb3cuY3JlYXRlRWwoXCJpbnB1dFwiLCB7XHJcblx0XHRcdFx0dHlwZTogXCJudW1iZXJcIixcclxuXHRcdFx0XHR2YWx1ZToga2V5LnRvU3RyaW5nKCksXHJcblx0XHRcdFx0Y2xzOiBcImhhYml0LW1hcHBpbmcta2V5XCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQWRkIHNlcGFyYXRvclxyXG5cdFx0XHRyb3cuY3JlYXRlU3Bhbih7IHRleHQ6IFwi4oaSXCIsIGNsczogXCJoYWJpdC1tYXBwaW5nLWFycm93XCIgfSk7XHJcblxyXG5cdFx0XHQvLyBWYWx1ZSBpbnB1dFxyXG5cdFx0XHRjb25zdCB2YWx1ZUlucHV0ID0gcm93LmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRcdHZhbHVlOiB2YWx1ZSxcclxuXHRcdFx0XHRjbHM6IFwiaGFiaXQtbWFwcGluZy12YWx1ZVwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIERlbGV0ZSBidXR0b25cclxuXHRcdFx0bmV3IEV4dHJhQnV0dG9uQ29tcG9uZW50KHJvdylcclxuXHRcdFx0XHQuc2V0SWNvbihcInRyYXNoXCIpXHJcblx0XHRcdFx0LnNldFRvb2x0aXAodChcIkRlbGV0ZVwiKSlcclxuXHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRyb3cucmVtb3ZlKCk7XHJcblx0XHRcdFx0XHQvLyBVcGRhdGUgaW5wdXQgYXJyYXlcclxuXHRcdFx0XHRcdGNvbnN0IGluZGV4ID0gdGhpcy5tYXBwaW5nSW5wdXRzLmZpbmRJbmRleChcclxuXHRcdFx0XHRcdFx0KG0pID0+XHJcblx0XHRcdFx0XHRcdFx0bS5rZXlJbnB1dCA9PT0ga2V5SW5wdXQgJiZcclxuXHRcdFx0XHRcdFx0XHRtLnZhbHVlSW5wdXQgPT09IHZhbHVlSW5wdXRcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRpZiAoaW5kZXggPiAtMSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLm1hcHBpbmdJbnB1dHMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFNhdmUgcmVmZXJlbmNlc1xyXG5cdFx0XHR0aGlzLm1hcHBpbmdJbnB1dHMucHVzaCh7IGtleUlucHV0LCB2YWx1ZUlucHV0IH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBBZGQgZXhpc3RpbmcgbWFwcGluZ3NcclxuXHRcdE9iamVjdC5lbnRyaWVzKGV4aXN0aW5nTWFwcGluZ3MpLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xyXG5cdFx0XHRjcmVhdGVNYXBwaW5nRWRpdG9yKHBhcnNlSW50KGtleSksIHZhbHVlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFkZCBtYXBwaW5nIGJ1dHRvblxyXG5cdFx0Y29uc3QgYWRkTWFwcGluZ0J0biA9IGNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdGNsczogXCJoYWJpdC1hZGQtbWFwcGluZy1idXR0b25cIixcclxuXHRcdFx0dGV4dDogdChcIkFkZCBuZXcgbWFwcGluZ1wiKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGFkZE1hcHBpbmdCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gRmluZCBtYXgga2V5IGFuZCBpbmNyZW1lbnQgYnkgMVxyXG5cdFx0XHRsZXQgbWF4S2V5ID0gMDtcclxuXHRcdFx0dGhpcy5tYXBwaW5nSW5wdXRzLmZvckVhY2goKGlucHV0KSA9PiB7XHJcblx0XHRcdFx0Y29uc3Qga2V5ID0gcGFyc2VJbnQoaW5wdXQua2V5SW5wdXQudmFsdWUpO1xyXG5cdFx0XHRcdGlmICghaXNOYU4oa2V5KSAmJiBrZXkgPiBtYXhLZXkpIG1heEtleSA9IGtleTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdGNyZWF0ZU1hcHBpbmdFZGl0b3IobWF4S2V5ICsgMSwgXCJcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLm1hcHBpbmdQcm9wZXJ0eUlucHV0ID0gcHJvcGVydHlJbnB1dCE7XHJcblx0fVxyXG5cclxuXHQvLyBTY2hlZHVsZWQgaGFiaXQgZm9ybVxyXG5cdGJ1aWxkU2NoZWR1bGVkSGFiaXRGb3JtKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpIHtcclxuXHRcdGNvbnN0IHNjaGVkdWxlZERhdGEgPSB0aGlzLmhhYml0RGF0YSBhcyBCYXNlU2NoZWR1bGVkSGFiaXREYXRhIHwgbnVsbDtcclxuXHJcblx0XHQvLyBFdmVudCBlZGl0aW5nIGluc3RydWN0aW9uc1xyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiU2NoZWR1bGVkIGV2ZW50c1wiKSlcclxuXHRcdFx0LnNldERlc2ModChcIkFkZCBtdWx0aXBsZSBldmVudHMgdGhhdCBuZWVkIHRvIGJlIGNvbXBsZXRlZFwiKSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGV2ZW50IGVkaXRvciBjb250YWluZXJcclxuXHRcdGNvbnN0IGV2ZW50c0NvbnRhaW5lciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiaGFiaXQtZXZlbnRzLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBleGlzdGluZ0V2ZW50cyA9IHNjaGVkdWxlZERhdGE/LmV2ZW50cyB8fCBbXTtcclxuXHRcdGNvbnN0IGV4aXN0aW5nTWFwID0gc2NoZWR1bGVkRGF0YT8ucHJvcGVydGllc01hcCB8fCB7fTtcclxuXHJcblx0XHQvLyBTdG9yZSBldmVudCBpbnB1dCByZWZlcmVuY2VzXHJcblx0XHR0aGlzLmV2ZW50SW5wdXRzID0gW107XHJcblxyXG5cdFx0Ly8gRXZlbnQgZWRpdG9yIGZ1bmN0aW9uXHJcblx0XHRjb25zdCBjcmVhdGVFdmVudEVkaXRvciA9IChcclxuXHRcdFx0ZXZlbnQ6IFNjaGVkdWxlZEV2ZW50ID0geyBuYW1lOiBcIlwiLCBkZXRhaWxzOiBcIlwiIH0sXHJcblx0XHRcdHByb3BlcnR5S2V5OiBzdHJpbmcgPSBcIlwiXHJcblx0XHQpID0+IHtcclxuXHRcdFx0Y29uc3Qgcm93ID0gZXZlbnRzQ29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJoYWJpdC1ldmVudC1yb3dcIiB9KTtcclxuXHJcblx0XHRcdC8vIE5hbWUgaW5wdXRcclxuXHRcdFx0Y29uc3QgbmFtZUlucHV0ID0gcm93LmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRcdHZhbHVlOiBldmVudC5uYW1lLFxyXG5cdFx0XHRcdGNsczogXCJoYWJpdC1ldmVudC1uYW1lXCIsXHJcblx0XHRcdFx0cGxhY2Vob2xkZXI6IHQoXCJFdmVudCBuYW1lXCIpLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIERldGFpbHMgaW5wdXRcclxuXHRcdFx0Y29uc3QgZGV0YWlsc0lucHV0ID0gcm93LmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRcdHZhbHVlOiBldmVudC5kZXRhaWxzLFxyXG5cdFx0XHRcdGNsczogXCJoYWJpdC1ldmVudC1kZXRhaWxzXCIsXHJcblx0XHRcdFx0cGxhY2Vob2xkZXI6IHQoXCJFdmVudCBkZXRhaWxzXCIpLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFByb3BlcnR5IGtleSBpbnB1dFxyXG5cdFx0XHRjb25zdCBwcm9wZXJ0eUlucHV0ID0gcm93LmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRcdHZhbHVlOiBwcm9wZXJ0eUtleSxcclxuXHRcdFx0XHRjbHM6IFwiaGFiaXQtZXZlbnQtcHJvcGVydHlcIixcclxuXHRcdFx0XHRwbGFjZWhvbGRlcjogdChcIlByb3BlcnR5IG5hbWVcIiksXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gRGVsZXRlIGJ1dHRvblxyXG5cdFx0XHRuZXcgRXh0cmFCdXR0b25Db21wb25lbnQocm93KVxyXG5cdFx0XHRcdC5zZXRJY29uKFwidHJhc2hcIilcclxuXHRcdFx0XHQuc2V0VG9vbHRpcCh0KFwiRGVsZXRlXCIpKVxyXG5cdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHJvdy5yZW1vdmUoKTtcclxuXHRcdFx0XHRcdC8vIFVwZGF0ZSBpbnB1dCBhcnJheVxyXG5cdFx0XHRcdFx0Y29uc3QgaW5kZXggPSB0aGlzLmV2ZW50SW5wdXRzLmZpbmRJbmRleChcclxuXHRcdFx0XHRcdFx0KGUpID0+XHJcblx0XHRcdFx0XHRcdFx0ZS5uYW1lSW5wdXQgPT09IG5hbWVJbnB1dCAmJlxyXG5cdFx0XHRcdFx0XHRcdGUuZGV0YWlsc0lucHV0ID09PSBkZXRhaWxzSW5wdXQgJiZcclxuXHRcdFx0XHRcdFx0XHRlLnByb3BlcnR5SW5wdXQgPT09IHByb3BlcnR5SW5wdXRcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRpZiAoaW5kZXggPiAtMSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmV2ZW50SW5wdXRzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBTYXZlIHJlZmVyZW5jZXNcclxuXHRcdFx0dGhpcy5ldmVudElucHV0cy5wdXNoKHsgbmFtZUlucHV0LCBkZXRhaWxzSW5wdXQsIHByb3BlcnR5SW5wdXQgfSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIEFkZCBleGlzdGluZyBldmVudHNcclxuXHRcdGlmIChleGlzdGluZ0V2ZW50cy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGV4aXN0aW5nRXZlbnRzLmZvckVhY2goKGV2ZW50KSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgcHJvcGVydHlLZXkgPSBleGlzdGluZ01hcFtldmVudC5uYW1lXSB8fCBcIlwiO1xyXG5cdFx0XHRcdGNyZWF0ZUV2ZW50RWRpdG9yKGV2ZW50LCBwcm9wZXJ0eUtleSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gQWRkIGEgZGVmYXVsdCBlbXB0eSBldmVudFxyXG5cdFx0XHRjcmVhdGVFdmVudEVkaXRvcigpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCBldmVudCBidXR0b25cclxuXHRcdGNvbnN0IGFkZEV2ZW50QnRuID0gY29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0Y2xzOiBcImhhYml0LWFkZC1ldmVudC1idXR0b25cIixcclxuXHRcdFx0dGV4dDogdChcIkFkZCBuZXcgZXZlbnRcIiksXHJcblx0XHR9KTtcclxuXHJcblx0XHRhZGRFdmVudEJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRjcmVhdGVFdmVudEVkaXRvcigpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBHZXQgdHlwZS1zcGVjaWZpYyBmaWVsZCBkYXRhXHJcblx0Z2V0VHlwZVNwZWNpZmljRGF0YSgpOiBhbnkge1xyXG5cdFx0c3dpdGNoICh0aGlzLmhhYml0VHlwZSkge1xyXG5cdFx0XHRjYXNlIFwiZGFpbHlcIjpcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5nZXREYWlseUhhYml0RGF0YSgpO1xyXG5cdFx0XHRjYXNlIFwiY291bnRcIjpcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5nZXRDb3VudEhhYml0RGF0YSgpO1xyXG5cdFx0XHRjYXNlIFwibWFwcGluZ1wiOlxyXG5cdFx0XHRcdHJldHVybiB0aGlzLmdldE1hcHBpbmdIYWJpdERhdGEoKTtcclxuXHRcdFx0Y2FzZSBcInNjaGVkdWxlZFwiOlxyXG5cdFx0XHRcdHJldHVybiB0aGlzLmdldFNjaGVkdWxlZEhhYml0RGF0YSgpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHQvLyBHZXQgZGFpbHkgaGFiaXQgZGF0YVxyXG5cdGdldERhaWx5SGFiaXREYXRhKCk6IFBhcnRpYWw8QmFzZURhaWx5SGFiaXREYXRhPiB8IG51bGwge1xyXG5cdFx0aWYgKCF0aGlzLmRhaWx5SW5wdXRzKSByZXR1cm4gbnVsbDtcclxuXHJcblx0XHRjb25zdCBwcm9wZXJ0eSA9IHRoaXMuZGFpbHlJbnB1dHMucHJvcGVydHkuZ2V0VmFsdWUoKS50cmltKCk7XHJcblx0XHRpZiAoIXByb3BlcnR5KSB7XHJcblx0XHRcdG5ldyBOb3RpY2UodChcIlBsZWFzZSBlbnRlciBhIHByb3BlcnR5IG5hbWVcIikpO1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR0eXBlOiBcImRhaWx5XCIsXHJcblx0XHRcdHByb3BlcnR5OiBwcm9wZXJ0eSxcclxuXHRcdFx0Y29tcGxldGlvblRleHQ6XHJcblx0XHRcdFx0dGhpcy5kYWlseUlucHV0cy5jb21wbGV0aW9uVGV4dC5nZXRWYWx1ZSgpIHx8IHVuZGVmaW5lZCxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvLyBHZXQgY291bnQgaGFiaXQgZGF0YVxyXG5cdGdldENvdW50SGFiaXREYXRhKCk6IFBhcnRpYWw8QmFzZUNvdW50SGFiaXREYXRhPiB8IG51bGwge1xyXG5cdFx0aWYgKCF0aGlzLmNvdW50SW5wdXRzKSByZXR1cm4gbnVsbDtcclxuXHJcblx0XHRjb25zdCBwcm9wZXJ0eSA9IHRoaXMuY291bnRJbnB1dHMucHJvcGVydHkuZ2V0VmFsdWUoKS50cmltKCk7XHJcblx0XHRpZiAoIXByb3BlcnR5KSB7XHJcblx0XHRcdG5ldyBOb3RpY2UodChcIlBsZWFzZSBlbnRlciBhIHByb3BlcnR5IG5hbWVcIikpO1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBtaW5WYWx1ZSA9IHRoaXMuY291bnRJbnB1dHMubWluLmdldFZhbHVlKCk7XHJcblx0XHRjb25zdCBtYXhWYWx1ZSA9IHRoaXMuY291bnRJbnB1dHMubWF4LmdldFZhbHVlKCk7XHJcblx0XHRjb25zdCBub3RpY2VWYWx1ZSA9IHRoaXMuY291bnRJbnB1dHMubm90aWNlLmdldFZhbHVlKCk7XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0dHlwZTogXCJjb3VudFwiLFxyXG5cdFx0XHRwcm9wZXJ0eTogcHJvcGVydHksXHJcblx0XHRcdG1pbjogbWluVmFsdWUgPyBwYXJzZUludChtaW5WYWx1ZSkgOiB1bmRlZmluZWQsXHJcblx0XHRcdG1heDogbWF4VmFsdWUgPyBwYXJzZUludChtYXhWYWx1ZSkgOiB1bmRlZmluZWQsXHJcblx0XHRcdG5vdGljZTogbm90aWNlVmFsdWUgfHwgdW5kZWZpbmVkLFxyXG5cdFx0XHRjb3VudFVuaXQ6IHRoaXMuY291bnRJbnB1dHMuY291bnRVbml0LmdldFZhbHVlKCkgfHwgdW5kZWZpbmVkLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8vIEdldCBtYXBwaW5nIGhhYml0IGRhdGFcclxuXHRnZXRNYXBwaW5nSGFiaXREYXRhKCk6IFBhcnRpYWw8QmFzZU1hcHBpbmdIYWJpdERhdGE+IHwgbnVsbCB7XHJcblx0XHRpZiAoIXRoaXMubWFwcGluZ1Byb3BlcnR5SW5wdXQgfHwgIXRoaXMubWFwcGluZ0lucHV0cykgcmV0dXJuIG51bGw7XHJcblxyXG5cdFx0Y29uc3QgcHJvcGVydHkgPSB0aGlzLm1hcHBpbmdQcm9wZXJ0eUlucHV0LmdldFZhbHVlKCkudHJpbSgpO1xyXG5cdFx0aWYgKCFwcm9wZXJ0eSkge1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJQbGVhc2UgZW50ZXIgYSBwcm9wZXJ0eSBuYW1lXCIpKTtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVmFsaWRhdGUgaWYgdGhlcmUgYXJlIG1hcHBpbmcgdmFsdWVzXHJcblx0XHRpZiAodGhpcy5tYXBwaW5nSW5wdXRzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJQbGVhc2UgYWRkIGF0IGxlYXN0IG9uZSBtYXBwaW5nIHZhbHVlXCIpKTtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQnVpbGQgbWFwcGluZyBvYmplY3RcclxuXHRcdGNvbnN0IG1hcHBpbmc6IFJlY29yZDxudW1iZXIsIHN0cmluZz4gPSB7fTtcclxuXHRcdGZvciAoY29uc3QgaW5wdXQgb2YgdGhpcy5tYXBwaW5nSW5wdXRzKSB7XHJcblx0XHRcdGNvbnN0IGtleSA9IHBhcnNlSW50KGlucHV0LmtleUlucHV0LnZhbHVlKTtcclxuXHRcdFx0Y29uc3QgdmFsdWUgPSBpbnB1dC52YWx1ZUlucHV0LnZhbHVlO1xyXG5cclxuXHRcdFx0aWYgKGlzTmFOKGtleSkpIHtcclxuXHRcdFx0XHRuZXcgTm90aWNlKHQoXCJNYXBwaW5nIGtleSBtdXN0IGJlIGEgbnVtYmVyXCIpKTtcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKCF2YWx1ZSkge1xyXG5cdFx0XHRcdG5ldyBOb3RpY2UodChcIlBsZWFzZSBlbnRlciB0ZXh0IGZvciBhbGwgbWFwcGluZyB2YWx1ZXNcIikpO1xyXG5cdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRtYXBwaW5nW2tleV0gPSB2YWx1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR0eXBlOiBcIm1hcHBpbmdcIixcclxuXHRcdFx0cHJvcGVydHk6IHByb3BlcnR5LFxyXG5cdFx0XHRtYXBwaW5nOiBtYXBwaW5nLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8vIEdldCBzY2hlZHVsZWQgaGFiaXQgZGF0YVxyXG5cdGdldFNjaGVkdWxlZEhhYml0RGF0YSgpOiBQYXJ0aWFsPEJhc2VTY2hlZHVsZWRIYWJpdERhdGE+IHwgbnVsbCB7XHJcblx0XHRpZiAoIXRoaXMuZXZlbnRJbnB1dHMpIHJldHVybiBudWxsO1xyXG5cclxuXHRcdC8vIFZhbGlkYXRlIGlmIHRoZXJlIGFyZSBldmVudHNcclxuXHRcdGlmICh0aGlzLmV2ZW50SW5wdXRzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJQbGVhc2UgYWRkIGF0IGxlYXN0IG9uZSBldmVudFwiKSk7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEJ1aWxkIGV2ZW50IGxpc3QgYW5kIHByb3BlcnR5IG1hcHBpbmdcclxuXHRcdGNvbnN0IGV2ZW50czogU2NoZWR1bGVkRXZlbnRbXSA9IFtdO1xyXG5cdFx0Y29uc3QgcHJvcGVydGllc01hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xyXG5cclxuXHRcdGZvciAoY29uc3QgaW5wdXQgb2YgdGhpcy5ldmVudElucHV0cykge1xyXG5cdFx0XHRjb25zdCBuYW1lID0gaW5wdXQubmFtZUlucHV0LnZhbHVlLnRyaW0oKTtcclxuXHRcdFx0Y29uc3QgZGV0YWlscyA9IGlucHV0LmRldGFpbHNJbnB1dC52YWx1ZS50cmltKCk7XHJcblx0XHRcdGNvbnN0IHByb3BlcnR5ID0gaW5wdXQucHJvcGVydHlJbnB1dC52YWx1ZS50cmltKCk7XHJcblxyXG5cdFx0XHRpZiAoIW5hbWUpIHtcclxuXHRcdFx0XHRuZXcgTm90aWNlKHQoXCJFdmVudCBuYW1lIGNhbm5vdCBiZSBlbXB0eVwiKSk7XHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGV2ZW50cy5wdXNoKHtcclxuXHRcdFx0XHRuYW1lOiBuYW1lLFxyXG5cdFx0XHRcdGRldGFpbHM6IGRldGFpbHMsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aWYgKHByb3BlcnR5KSB7XHJcblx0XHRcdFx0cHJvcGVydGllc01hcFtuYW1lXSA9IHByb3BlcnR5O1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0dHlwZTogXCJzY2hlZHVsZWRcIixcclxuXHRcdFx0ZXZlbnRzOiBldmVudHMsXHJcblx0XHRcdHByb3BlcnRpZXNNYXA6IHByb3BlcnRpZXNNYXAsXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0Ly8gR2VuZXJhdGUgdW5pcXVlIElEXHJcblx0Z2VuZXJhdGVJZCgpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0RGF0ZS5ub3coKS50b1N0cmluZygpICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDIsIDkpXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0Ly8gSW5wdXQgY29tcG9uZW50IHJlZmVyZW5jZXMgZm9yIGRhdGEgcmV0cmlldmFsXHJcblx0cHJpdmF0ZSBkYWlseUlucHV0czoge1xyXG5cdFx0cHJvcGVydHk6IFRleHRDb21wb25lbnQ7XHJcblx0XHRjb21wbGV0aW9uVGV4dDogVGV4dENvbXBvbmVudDtcclxuXHR9IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdHByaXZhdGUgY291bnRJbnB1dHM6IHtcclxuXHRcdHByb3BlcnR5OiBUZXh0Q29tcG9uZW50O1xyXG5cdFx0bWluOiBUZXh0Q29tcG9uZW50O1xyXG5cdFx0bWF4OiBUZXh0Q29tcG9uZW50O1xyXG5cdFx0Y291bnRVbml0OiBUZXh0Q29tcG9uZW50O1xyXG5cdFx0bm90aWNlOiBUZXh0Q29tcG9uZW50O1xyXG5cdH0gfCBudWxsID0gbnVsbDtcclxuXHJcblx0cHJpdmF0ZSBtYXBwaW5nUHJvcGVydHlJbnB1dDogVGV4dENvbXBvbmVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgbWFwcGluZ0lucHV0czogQXJyYXk8e1xyXG5cdFx0a2V5SW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQ7XHJcblx0XHR2YWx1ZUlucHV0OiBIVE1MSW5wdXRFbGVtZW50O1xyXG5cdH0+ID0gW107XHJcblxyXG5cdHByaXZhdGUgZXZlbnRJbnB1dHM6IEFycmF5PHtcclxuXHRcdG5hbWVJbnB1dDogSFRNTElucHV0RWxlbWVudDtcclxuXHRcdGRldGFpbHNJbnB1dDogSFRNTElucHV0RWxlbWVudDtcclxuXHRcdHByb3BlcnR5SW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQ7XHJcblx0fT4gPSBbXTtcclxufVxyXG4iXX0=