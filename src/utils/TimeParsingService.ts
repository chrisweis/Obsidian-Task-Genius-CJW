// Use require for chrono-node to avoid import issues in browser environment
import * as chrono from "chrono-node";

export interface ParsedTimeResult {
	startDate?: Date;
	dueDate?: Date;
	scheduledDate?: Date;
	originalText: string;
	cleanedText: string;
	parsedExpressions: Array<{
		text: string;
		date: Date;
		type: "start" | "due" | "scheduled";
		index: number;
		length: number;
	}>;
}

export interface TimeParsingConfig {
	enabled: boolean;
	supportedLanguages: string[];
	dateKeywords: {
		start: string[];
		due: string[];
		scheduled: string[];
	};
	removeOriginalText: boolean;
}

export class TimeParsingService {
	private config: TimeParsingConfig;

	constructor(config: TimeParsingConfig) {
		this.config = config;
	}

	/**
	 * Parse time expressions from text and return structured result
	 * @param text - Input text containing potential time expressions
	 * @returns ParsedTimeResult with extracted dates and cleaned text
	 */
	parseTimeExpressions(text: string): ParsedTimeResult {
		if (!this.config.enabled) {
			return {
				originalText: text,
				cleanedText: text,
				parsedExpressions: [],
			};
		}

		const result: ParsedTimeResult = {
			originalText: text,
			cleanedText: text,
			parsedExpressions: [],
		};

		try {
			// Parse all date expressions using chrono-node
			// For better Chinese support, we can use specific locale parsers
			const chronoModule = chrono;
			let parseResults = chronoModule.parse(text);

			// If no results found with default parser and text contains Chinese characters,
			// try with Chinese-specific parsing patterns
			if (parseResults.length === 0 && /[\u4e00-\u9fff]/.test(text)) {
				// Try parsing with common Chinese date patterns
				parseResults = this.parseChineseTimeExpressions(text);
			}

			for (const parseResult of parseResults) {
				const expressionText = parseResult.text;
				const date = parseResult.start.date();
				const index = parseResult.index;
				const length = expressionText.length;

				// Determine the type of date based on keywords in the surrounding context
				const type = this.determineTimeType(
					text,
					expressionText,
					index
				);

				const expression = {
					text: expressionText,
					date: date,
					type: type,
					index: index,
					length: length,
				};

				result.parsedExpressions.push(expression);

				// Set the appropriate date field based on type
				switch (type) {
					case "start":
						if (!result.startDate) result.startDate = date;
						break;
					case "due":
						if (!result.dueDate) result.dueDate = date;
						break;
					case "scheduled":
						if (!result.scheduledDate) result.scheduledDate = date;
						break;
				}
			}

			// Clean the text by removing parsed expressions
			result.cleanedText = this.cleanTextFromTimeExpressions(
				text,
				result.parsedExpressions
			);
		} catch (error) {
			console.warn("Time parsing error:", error);
			// Return original text if parsing fails
		}

		return result;
	}

	/**
	 * Clean text by removing parsed time expressions
	 * @param text - Original text
	 * @param expressions - Parsed expressions to remove
	 * @returns Cleaned text
	 */
	cleanTextFromTimeExpressions(
		text: string,
		expressions: ParsedTimeResult["parsedExpressions"]
	): string {
		if (!this.config.removeOriginalText || expressions.length === 0) {
			return text;
		}

		// Sort expressions by index in descending order to remove from end to start
		// This prevents index shifting issues when removing multiple expressions
		const sortedExpressions = [...expressions].sort(
			(a, b) => b.index - a.index
		);

		let cleanedText = text;

		for (const expression of sortedExpressions) {
			const beforeExpression = cleanedText.substring(0, expression.index);
			const afterExpression = cleanedText.substring(
				expression.index + expression.length
			);

			// Check if we need to clean up extra whitespace
			let cleanedBefore = beforeExpression;
			let cleanedAfter = afterExpression;

			// Remove trailing whitespace from before text if the expression is at word boundary
			if (
				beforeExpression.endsWith(" ") &&
				afterExpression.startsWith(" ")
			) {
				cleanedAfter = afterExpression.trimStart();
			} else if (
				beforeExpression.endsWith(" ") &&
				!afterExpression.startsWith(" ")
			) {
				// Keep one space if there's no space after
				cleanedBefore = beforeExpression.trimEnd() + " ";
			}

			// Remove leading/trailing punctuation and whitespace around time expressions
			cleanedBefore = cleanedBefore.replace(/[,;]\s*$/, "");
			cleanedAfter = cleanedAfter.replace(/^[,;]\s*/, "");

			cleanedText = cleanedBefore + cleanedAfter;
		}

		// Clean up multiple consecutive spaces
		cleanedText = cleanedText.replace(/\s+/g, " ").trim();

		return cleanedText;
	}

	/**
	 * Update parsing configuration
	 * @param config - New configuration
	 */
	updateConfig(config: Partial<TimeParsingConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Get current configuration
	 * @returns Current configuration
	 */
	getConfig(): TimeParsingConfig {
		return { ...this.config };
	}

	/**
	 * Determine the type of time expression based on surrounding context
	 * @param text - Full text
	 * @param expression - Time expression text
	 * @param index - Position of expression in text
	 * @returns Type of time expression
	 */
	private determineTimeType(
		text: string,
		expression: string,
		index: number
	): "start" | "due" | "scheduled" {
		// Get text before the expression (look back up to 20 characters)
		const beforeText = text
			.substring(Math.max(0, index - 20), index)
			.toLowerCase();

		// Get text after the expression (look ahead up to 20 characters)
		const afterText = text
			.substring(
				index + expression.length,
				Math.min(text.length, index + expression.length + 20)
			)
			.toLowerCase();

		// Combine surrounding context
		const context = beforeText + " " + afterText;

		// Check for start keywords
		for (const keyword of this.config.dateKeywords.start) {
			if (context.includes(keyword.toLowerCase())) {
				return "start";
			}
		}

		// Check for due keywords
		for (const keyword of this.config.dateKeywords.due) {
			if (context.includes(keyword.toLowerCase())) {
				return "due";
			}
		}

		// Check for scheduled keywords
		for (const keyword of this.config.dateKeywords.scheduled) {
			if (context.includes(keyword.toLowerCase())) {
				return "scheduled";
			}
		}

		// Default to due date if no specific keywords found
		return "due";
	}

	/**
	 * Parse Chinese time expressions using custom patterns
	 * @param text - Text containing Chinese time expressions
	 * @returns Array of parse results
	 */
	private parseChineseTimeExpressions(text: string): any[] {
		const results: any[] = [];

		// Common Chinese date patterns
		const chinesePatterns = [
			// 明天, 后天, 昨天, 前天
			/明天|后天|昨天|前天/g,
			// 下周, 上周, 这周
			/下周|上周|这周/g,
			// 下个月, 上个月, 这个月
			/下个?月|上个?月|这个?月/g,
			// 明年, 去年, 今年
			/明年|去年|今年/g,
			// 数字+天后, 数字+周后, 数字+月后
			/(\d+)[天周月]后/g,
			// 数字+天内, 数字+周内, 数字+月内
			/(\d+)[天周月]内/g,
		];

		for (const pattern of chinesePatterns) {
			let match;
			while ((match = pattern.exec(text)) !== null) {
				const matchText = match[0];
				const date = this.parseChineseDate(matchText);

				if (date) {
					results.push({
						text: matchText,
						index: match.index,
						start: {
							date: () => date,
						},
					});
				}
			}
		}

		return results;
	}

	/**
	 * Convert Chinese date expression to actual date
	 * @param expression - Chinese date expression
	 * @returns Date object or null
	 */
	private parseChineseDate(expression: string): Date | null {
		const now = new Date();
		const today = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate()
		);

		switch (expression) {
			case "明天":
				return new Date(today.getTime() + 24 * 60 * 60 * 1000);
			case "后天":
				return new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
			case "昨天":
				return new Date(today.getTime() - 24 * 60 * 60 * 1000);
			case "前天":
				return new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
			case "下周":
				return new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
			case "上周":
				return new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
			case "这周":
				return today;
			case "下个月":
			case "下月":
				return new Date(
					now.getFullYear(),
					now.getMonth() + 1,
					now.getDate()
				);
			case "上个月":
			case "上月":
				return new Date(
					now.getFullYear(),
					now.getMonth() - 1,
					now.getDate()
				);
			case "这个月":
			case "这月":
				return today;
			case "明年":
				return new Date(
					now.getFullYear() + 1,
					now.getMonth(),
					now.getDate()
				);
			case "去年":
				return new Date(
					now.getFullYear() - 1,
					now.getMonth(),
					now.getDate()
				);
			case "今年":
				return today;
			default:
				// Handle patterns like "3天后", "2周后", "1月后"
				const relativeMatch = expression.match(/(\d+)([天周月])[后内]/);
				if (relativeMatch) {
					const num = parseInt(relativeMatch[1]);
					const unit = relativeMatch[2];

					switch (unit) {
						case "天":
							return new Date(
								today.getTime() + num * 24 * 60 * 60 * 1000
							);
						case "周":
							return new Date(
								today.getTime() + num * 7 * 24 * 60 * 60 * 1000
							);
						case "月":
							return new Date(
								now.getFullYear(),
								now.getMonth() + num,
								now.getDate()
							);
					}
				}
				return null;
		}
	}
}

// Default configuration
export const DEFAULT_TIME_PARSING_CONFIG: TimeParsingConfig = {
	enabled: true,
	supportedLanguages: ["en", "zh"],
	dateKeywords: {
		start: [
			"start",
			"begin",
			"from",
			"starting",
			"begins",
			"开始",
			"从",
			"起始",
			"起",
			"始于",
			"自",
		],
		due: [
			"due",
			"deadline",
			"by",
			"until",
			"before",
			"expires",
			"ends",
			"截止",
			"到期",
			"之前",
			"期限",
			"最晚",
			"结束",
			"终止",
			"完成于",
		],
		scheduled: [
			"scheduled",
			"on",
			"at",
			"planned",
			"set for",
			"arranged",
			"安排",
			"计划",
			"在",
			"定于",
			"预定",
			"约定",
			"设定",
		],
	},
	removeOriginalText: true,
};
