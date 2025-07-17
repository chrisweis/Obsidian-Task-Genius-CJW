import { Editor, EditorPosition, Notice } from "obsidian";
import TaskProgressBarPlugin from "../../index";
import { SuggestOption } from "./UniversalEditorSuggest";
import { t } from "../../translations/helper";

/**
 * Priority suggest options based on existing priority system
 */
export function createPrioritySuggestOptions(): SuggestOption[] {
	return [
		{
			id: "priority-highest",
			label: t("Highest Priority"),
			icon: "arrow-up",
			description: t("🔺 Highest priority task"),
			replacement: "! 🔺",
			trigger: "!",
			action: (editor: Editor, cursor: EditorPosition) => {
				// Priority is already inserted, no additional action needed
				new Notice(t("Highest priority set"));
			},
		},
		{
			id: "priority-high",
			label: t("High Priority"),
			icon: "arrow-up",
			description: t("⏫ High priority task"),
			replacement: "! ⏫",
			trigger: "!",
			action: (editor: Editor, cursor: EditorPosition) => {
				new Notice(t("High priority set"));
			},
		},
		{
			id: "priority-medium",
			label: t("Medium Priority"),
			icon: "minus",
			description: t("🔼 Medium priority task"),
			replacement: "! 🔼",
			trigger: "!",
			action: (editor: Editor, cursor: EditorPosition) => {
				new Notice(t("Medium priority set"));
			},
		},
		{
			id: "priority-low",
			label: t("Low Priority"),
			icon: "arrow-down",
			description: t("🔽 Low priority task"),
			replacement: "! 🔽",
			trigger: "!",
			action: (editor: Editor, cursor: EditorPosition) => {
				new Notice(t("Low priority set"));
			},
		},
		{
			id: "priority-lowest",
			label: t("Lowest Priority"),
			icon: "arrow-down",
			description: t("⏬ Lowest priority task"),
			replacement: "! ⏬",
			trigger: "!",
			action: (editor: Editor, cursor: EditorPosition) => {
				new Notice(t("Lowest priority set"));
			},
		},
	];
}

/**
 * Date suggest options for common date patterns
 */
export function createDateSuggestOptions(): SuggestOption[] {
	const today = new Date();
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);

	const formatDate = (date: Date) => {
		return date.toISOString().split("T")[0];
	};

	return [
		{
			id: "date-today",
			label: t("Today"),
			icon: "calendar-days",
			description: t("Set due date to today"),
			replacement: `~ ${formatDate(today)}`,
			trigger: "~",
			action: (editor: Editor, cursor: EditorPosition) => {
				new Notice(t("Due date set to today"));
			},
		},
		{
			id: "date-tomorrow",
			label: t("Tomorrow"),
			icon: "calendar-plus",
			description: t("Set due date to tomorrow"),
			replacement: `~ ${formatDate(tomorrow)}`,
			trigger: "~",
			action: (editor: Editor, cursor: EditorPosition) => {
				new Notice(t("Due date set to tomorrow"));
			},
		},
		{
			id: "date-picker",
			label: t("Pick Date"),
			icon: "calendar",
			description: t("Open date picker"),
			replacement: "~ ",
			trigger: "~",
			action: (editor: Editor, cursor: EditorPosition) => {
				// This will trigger the date picker modal
				// Implementation will be added when integrating with existing date picker
				new Notice(t("Date picker opened"));
			},
		},
		{
			id: "date-scheduled",
			label: t("Scheduled Date"),
			icon: "calendar-clock",
			description: t("Set scheduled date"),
			replacement: "~ ⏰ ",
			trigger: "~",
			action: (editor: Editor, cursor: EditorPosition) => {
				new Notice(t("Scheduled date format added"));
			},
		},
	];
}

/**
 * Target location suggest options
 */
export function createTargetSuggestOptions(
	plugin: TaskProgressBarPlugin
): SuggestOption[] {
	const options: SuggestOption[] = [
		{
			id: "target-inbox",
			label: t("Inbox"),
			icon: "inbox",
			description: t("Save to inbox"),
			replacement: "* Inbox",
			trigger: "*",
			action: (editor: Editor, cursor: EditorPosition) => {
				new Notice(t("Target set to Inbox"));
			},
		},
		{
			id: "target-daily",
			label: t("Daily Note"),
			icon: "calendar-days",
			description: t("Save to today's daily note"),
			replacement: "* Daily",
			trigger: "*",
			action: (editor: Editor, cursor: EditorPosition) => {
				new Notice(t("Target set to Daily Note"));
			},
		},
		{
			id: "target-current",
			label: t("Current File"),
			icon: "file-text",
			description: t("Save to current file"),
			replacement: "* Current",
			trigger: "*",
			action: (editor: Editor, cursor: EditorPosition) => {
				new Notice(t("Target set to Current File"));
			},
		},
		{
			id: "target-picker",
			label: t("Choose File"),
			icon: "folder-open",
			description: t("Open file picker"),
			replacement: "* ",
			trigger: "*",
			action: (editor: Editor, cursor: EditorPosition) => {
				// This will trigger the file picker modal
				new Notice(t("File picker opened"));
			},
		},
	];

	// Add recent files if available
	const recentFiles = plugin.app.workspace.getLastOpenFiles();
	recentFiles.slice(0, 3).forEach((filePath, index) => {
		const fileName =
			filePath.split("/").pop()?.replace(".md", "") || filePath;
		options.push({
			id: `target-recent-${index}`,
			label: fileName,
			icon: "file",
			description: t("Save to recent file"),
			replacement: `* ${fileName}`,
			trigger: "*",
			action: (editor: Editor, cursor: EditorPosition) => {
				new Notice(t("Target set to") + ` ${fileName}`);
			},
		});
	});

	return options;
}

/**
 * Tag suggest options
 */
export function createTagSuggestOptions(
	plugin: TaskProgressBarPlugin
): SuggestOption[] {
	const options: SuggestOption[] = [
		{
			id: "tag-important",
			label: t("Important"),
			icon: "star",
			description: t("Mark as important"),
			replacement: "# important",
			trigger: "#",
			action: (editor: Editor, cursor: EditorPosition) => {
				new Notice(t("Tagged as important"));
			},
		},
		{
			id: "tag-urgent",
			label: t("Urgent"),
			icon: "zap",
			description: t("Mark as urgent"),
			replacement: "# urgent",
			trigger: "#",
			action: (editor: Editor, cursor: EditorPosition) => {
				new Notice(t("Tagged as urgent"));
			},
		},
		{
			id: "tag-work",
			label: t("Work"),
			icon: "briefcase",
			description: t("Work related task"),
			replacement: "# work",
			trigger: "#",
			action: (editor: Editor, cursor: EditorPosition) => {
				new Notice(t("Tagged as work"));
			},
		},
		{
			id: "tag-personal",
			label: t("Personal"),
			icon: "user",
			description: t("Personal task"),
			replacement: "# personal",
			trigger: "#",
			action: (editor: Editor, cursor: EditorPosition) => {
				new Notice(t("Tagged as personal"));
			},
		},
		{
			id: "tag-picker",
			label: t("Choose Tag"),
			icon: "tag",
			description: t("Open tag picker"),
			replacement: "# ",
			trigger: "#",
			action: (editor: Editor, cursor: EditorPosition) => {
				// This will trigger the tag picker modal
				new Notice(t("Tag picker opened"));
			},
		},
	];

	// Add existing tags from vault
	try {
		const allTags = plugin.app.metadataCache.getTags();
		const tagNames = Object.keys(allTags)
			.map((tag) => tag.replace("#", ""))
			.filter(
				(tag) =>
					!["important", "urgent", "work", "personal"].includes(tag)
			)
			.slice(0, 5); // Limit to 5 most common tags

		tagNames.forEach((tagName, index) => {
			options.push({
				id: `tag-existing-${index}`,
				label: `#${tagName}`,
				icon: "tag",
				description: t("Existing tag"),
				replacement: `# ${tagName}`,
				trigger: "#",
				action: (editor: Editor, cursor: EditorPosition) => {
					new Notice(t("Tagged with") + ` #${tagName}`);
				},
			});
		});
	} catch (error) {
		console.warn("Failed to load existing tags:", error);
	}

	return options;
}

/**
 * Create all suggest options for a given plugin instance
 */
export function createAllSuggestOptions(plugin: TaskProgressBarPlugin): {
	priority: SuggestOption[];
	date: SuggestOption[];
	target: SuggestOption[];
	tag: SuggestOption[];
} {
	return {
		priority: createPrioritySuggestOptions(),
		date: createDateSuggestOptions(),
		target: createTargetSuggestOptions(plugin),
		tag: createTagSuggestOptions(plugin),
	};
}

/**
 * Get suggest options by trigger character
 */
export function getSuggestOptionsByTrigger(
	trigger: string,
	plugin: TaskProgressBarPlugin
): SuggestOption[] {
	const allOptions = createAllSuggestOptions(plugin);

	switch (trigger) {
		case "!":
			return allOptions.priority;
		case "~":
			return allOptions.date;
		case "*":
			return allOptions.target;
		case "#":
			return allOptions.tag;
		default:
			return [];
	}
}
