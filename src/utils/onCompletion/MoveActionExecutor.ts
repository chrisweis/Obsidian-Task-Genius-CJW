import { TFile } from "obsidian";
import { BaseActionExecutor } from "./BaseActionExecutor";
import {
	OnCompletionConfig,
	OnCompletionExecutionContext,
	OnCompletionExecutionResult,
	OnCompletionActionType,
	OnCompletionMoveConfig,
} from "../../types/onCompletion";

/**
 * Executor for move action - moves the completed task to another file/section
 */
export class MoveActionExecutor extends BaseActionExecutor {
	/**
	 * Execute move action for Canvas tasks
	 */
	protected async executeForCanvas(
		context: OnCompletionExecutionContext,
		config: OnCompletionConfig
	): Promise<OnCompletionExecutionResult> {
		const moveConfig = config as OnCompletionMoveConfig;
		const { task, app } = context;

		try {
			const canvasUpdater = this.getCanvasTaskUpdater(context);

			// Check if target is a Canvas file
			if (moveConfig.targetFile.endsWith(".canvas")) {
				// Canvas to Canvas move
				const result = await canvasUpdater.moveCanvasTask(
					task,
					moveConfig.targetFile,
					undefined, // targetNodeId - could be enhanced later
					moveConfig.targetSection
				);

				if (result.success) {
					const sectionText = moveConfig.targetSection
						? ` (section: ${moveConfig.targetSection})`
						: "";
					return this.createSuccessResult(
						`Task moved to Canvas file ${moveConfig.targetFile}${sectionText}`
					);
				} else {
					return this.createErrorResult(
						result.error || "Failed to move Canvas task"
					);
				}
			} else {
				// Canvas to Markdown move
				return this.moveCanvasToMarkdown(context, moveConfig);
			}
		} catch (error) {
			return this.createErrorResult(
				`Error moving Canvas task: ${error.message}`
			);
		}
	}

	/**
	 * Execute move action for Markdown tasks
	 */
	protected async executeForMarkdown(
		context: OnCompletionExecutionContext,
		config: OnCompletionConfig
	): Promise<OnCompletionExecutionResult> {
		const moveConfig = config as OnCompletionMoveConfig;
		const { task, app } = context;

		try {
			// Get the source file containing the task
			const sourceFile = app.vault.getFileByPath(task.filePath);
			if (!sourceFile) {
				return this.createErrorResult(
					`Source file not found: ${task.filePath}`
				);
			}

			// Get or create the target file
			let targetFile = app.vault.getFileByPath(moveConfig.targetFile);
			if (!targetFile) {
				// Try to create the target file if it doesn't exist
				try {
					targetFile = await app.vault.create(
						moveConfig.targetFile,
						""
					);
				} catch (error) {
					return this.createErrorResult(
						`Failed to create target file: ${moveConfig.targetFile}`
					);
				}
			}

			// Read source and target file contents
			const sourceContent = await app.vault.read(sourceFile);
			const targetContent = await app.vault.read(targetFile);

			const sourceLines = sourceContent.split("\n");
			const targetLines = targetContent.split("\n");

			// Find and extract the task line from source
			if (task.line === undefined || task.line >= sourceLines.length) {
				return this.createErrorResult(
					"Task line not found in source file"
				);
			}

			const taskLine = sourceLines[task.line];

			// Remove the task from source file
			sourceLines.splice(task.line, 1);

			// Add the task to target file
			if (moveConfig.targetSection) {
				// Find the target section and insert after it
				const sectionIndex = targetLines.findIndex(
					(line) =>
						line.trim().startsWith("#") &&
						line.includes(moveConfig.targetSection!)
				);

				if (sectionIndex !== -1) {
					// Insert after the section header
					targetLines.splice(sectionIndex + 1, 0, taskLine);
				} else {
					// Section not found, create it and add the task
					targetLines.push(
						"",
						`## ${moveConfig.targetSection}`,
						taskLine
					);
				}
			} else {
				// No specific section, add to the end
				targetLines.push(taskLine);
			}

			// Write updated contents back to files
			await app.vault.modify(sourceFile, sourceLines.join("\n"));
			await app.vault.modify(targetFile, targetLines.join("\n"));

			const sectionText = moveConfig.targetSection
				? ` (section: ${moveConfig.targetSection})`
				: "";
			return this.createSuccessResult(
				`Task moved to ${moveConfig.targetFile}${sectionText}`
			);
		} catch (error) {
			return this.createErrorResult(
				`Failed to move task: ${error.message}`
			);
		}
	}

	/**
	 * Move a Canvas task to a Markdown file
	 */
	private async moveCanvasToMarkdown(
		context: OnCompletionExecutionContext,
		moveConfig: OnCompletionMoveConfig
	): Promise<OnCompletionExecutionResult> {
		const { task, app } = context;

		try {
			// Get task content as markdown
			const taskContent =
				task.originalMarkdown ||
				`- [${task.completed ? "x" : " "}] ${task.content}`;

			// Add to Markdown target FIRST (before deleting from source)
			let targetFile = app.vault.getFileByPath(moveConfig.targetFile);
			if (!targetFile) {
				// Try to create the target file if it doesn't exist
				try {
					targetFile = await app.vault.create(
						moveConfig.targetFile,
						""
					);
				} catch (error) {
					return this.createErrorResult(
						`Failed to create target file: ${moveConfig.targetFile}`
					);
				}
			}

			// Read target file content
			const targetContent = await app.vault.read(targetFile as TFile);
			const targetLines = targetContent.split("\n");

			// Find insertion point
			let insertPosition = targetLines.length;
			if (moveConfig.targetSection) {
				for (let i = 0; i < targetLines.length; i++) {
					if (
						targetLines[i]
							.trim()
							.toLowerCase()
							.includes(moveConfig.targetSection.toLowerCase())
					) {
						insertPosition = i + 1;
						break;
					}
				}
			}

			// Insert task
			targetLines.splice(insertPosition, 0, taskContent);

			// Write updated target file
			await app.vault.modify(targetFile, targetLines.join("\n"));

			// Only delete from Canvas source AFTER successful target file update
			const canvasUpdater = this.getCanvasTaskUpdater(context);
			const deleteResult = await canvasUpdater.deleteCanvasTask(task);

			if (!deleteResult.success) {
				// Move succeeded but deletion failed - this is less critical
				// The task is safely moved, just not removed from source
				const sectionText = moveConfig.targetSection
					? ` (section: ${moveConfig.targetSection})`
					: "";
				return this.createErrorResult(
					`Task moved successfully to ${moveConfig.targetFile}${sectionText}, but failed to remove from Canvas: ${deleteResult.error}`
				);
			}

			const sectionText = moveConfig.targetSection
				? ` (section: ${moveConfig.targetSection})`
				: "";
			return this.createSuccessResult(
				`Task moved from Canvas to ${moveConfig.targetFile}${sectionText}`
			);
		} catch (error) {
			return this.createErrorResult(
				`Failed to move Canvas task to Markdown: ${error.message}`
			);
		}
	}

	protected validateConfig(config: OnCompletionConfig): boolean {
		if (config.type !== OnCompletionActionType.MOVE) {
			return false;
		}

		const moveConfig = config as OnCompletionMoveConfig;
		return (
			typeof moveConfig.targetFile === "string" &&
			moveConfig.targetFile.trim().length > 0
		);
	}

	public getDescription(config: OnCompletionConfig): string {
		const moveConfig = config as OnCompletionMoveConfig;
		const sectionText = moveConfig.targetSection
			? ` (section: ${moveConfig.targetSection})`
			: "";
		return `Move task to ${moveConfig.targetFile}${sectionText}`;
	}
}
