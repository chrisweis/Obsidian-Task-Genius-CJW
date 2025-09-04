require('dotenv').config();

const { execSync } = require('child_process');
const semver = require('semver');

// 智能获取上一个正式版本标签（排除预发布版本）
function getLastStableTag() {
	try {
		// 获取所有标签
		const allTags = execSync('git tag -l', { encoding: 'utf8' })
			.trim()
			.split('\n')
			.filter(Boolean);
		
		// 过滤出在当前分支历史中的标签，并排除预发布版本
		const stableTags = [];
		for (const tag of allTags) {
			try {
				// 检查标签是否可以从 HEAD 访问到
				execSync(`git merge-base --is-ancestor ${tag} HEAD`, { encoding: 'utf8' });
				// 尝试解析版本号（移除可能的 'v' 前缀）
				const versionString = tag.replace(/^v/, '');
				const version = semver.valid(versionString);
				// 只保留正式版本（排除带有预发布标识的版本）
				if (version && !semver.prerelease(version)) {
					stableTags.push({ tag, version });
				}
			} catch (e) {
				// 标签不在当前分支历史中，跳过
			}
		}
		
		if (stableTags.length === 0) {
			console.log('No stable version tags found, using HEAD~30');
			return 'HEAD~30';
		}
		
		// 按照 semver 排序，从高到低
		const sortedTags = stableTags.sort((a, b) => {
			return semver.rcompare(a.version, b.version);
		});
		
		const latestStableTag = sortedTags[0];
		console.log(`Using last stable version tag: ${latestStableTag.tag} (version: ${latestStableTag.version})`);
		
		// 显示将包含的提交数量
		try {
			const commitCount = execSync(`git rev-list --count ${latestStableTag.tag}..HEAD`, { encoding: 'utf8' }).trim();
			console.log(`Will include ${commitCount} commits since ${latestStableTag.tag}`);
		} catch (e) {
			// 忽略错误，这只是信息性输出
		}
		
		return latestStableTag.tag;
		
	} catch (error) {
		console.warn('Warning: Could not determine last stable tag, using HEAD~30', error.message);
		return 'HEAD~30';
	}
}

module.exports = {
	interactive: true,
	hooks: {
		"before:init": ["node esbuild.config.mjs production"],
		"after:bump": [
			"node esbuild.config.mjs production",
			"node ./scripts/zip.mjs",
			"git add .",
		],
		"after:release":
			"echo Successfully released Task Genius v${version} to ${repo.repository}.",
	},
	git: {
		requireBranch: "master",
		requireCleanWorkingDir: true,
		pushArgs: "--follow-tags -o ci.skip",
		commitMessage: "chore(release): bump version to ${version}",
		tagName: "${version}",
		tagAnnotation: "Release ${version}",
		addUntrackedFiles: true,
	},
	plugins: {
		"@release-it/conventional-changelog": {
			preset: {
				name: "conventionalcommits",
				types: [
					{type: "feat", section: "Features"},
					{type: "fix", section: "Bug Fixes"},
					{type: "perf", section: "Performance"},
					{type: "refactor", section: "Refactors"},
					{type: "docs", section: "Documentation"},
					{type: "style", section: "Styles"},
					{type: "test", section: "Tests"},
					{type: "revert", section: "Reverts"}
				]
			},
			infile: "CHANGELOG.md",
			header: "# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n",
			// 只生成当前版本的 changelog，但包含从上一个正式版以来的所有提交
			releaseCount: 0,
			// 限制 git log 的提交范围，从上一个正式版开始（排除 beta 版本）
			gitRawCommitsOpts: {
				from: getLastStableTag() // 智能获取上一个正式版本
			},
			writerOpts: {
				// 自定义提交转换，过滤掉 beta 相关的 chore commits
				transform: (commit, context) => {
					// 过滤掉 beta 版本的 release commits
					if (commit.type === 'chore' && commit.subject) {
						// 过滤包含 beta 的 release commits
						if (commit.subject.includes('beta') || 
							commit.subject.includes('-beta.') ||
							commit.subject.match(/v\d+\.\d+\.\d+-beta/)) {
							return null;
						}
						// 过滤 release scope 的 commits（通常是版本发布相关）
						if (commit.scope === 'release' && 
							(commit.subject.includes('bump version') || 
							 commit.subject.includes('v9.8.0'))) {
							return null;
						}
					}
					
					// 保留其他所有提交
					return commit;
				},
				// 确保比较链接使用正确的版本范围
				finalizeContext: (context) => {
					const lastStableTag = getLastStableTag();
					if (lastStableTag) {
						context.previousTag = lastStableTag;
						context.currentTag = context.version;
						// 更新比较 URL
						context.compareUrl = `https://github.com/Quorafind/Obsidian-Task-Genius/compare/${lastStableTag}...${context.version}`;
					}
					return context;
				}
			}
		},
		"./scripts/ob-bumper.mjs": {
			indent: 2,
			copyTo: "./dist",
		},
	},
	npm: {
		publish: false,
	},
	github: {
		release: true,
		assets: [
			"dist/main.js",
			"dist/manifest.json",
			"dist/styles.css",
			"dist/task-genius-${version}.zip",
		],
		proxy: process.env.HTTPS_PROXY,
		releaseName: "${version}",
	},
};
