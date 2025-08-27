require('dotenv').config();

const { execSync } = require('child_process');

// 智能获取上一个相关版本标签
function getLastRelevantTag() {
	try {
		// 获取当前版本
		const currentVersion = require('./package.json').version;
		const [major, minor] = currentVersion.split('.');
		
		// 尝试找到同一主版本.次版本系列的最新beta标签
		const betaTags = execSync(`git tag -l "v${major}.${minor}.*-beta.*" --sort=-version:refname`, { encoding: 'utf8' })
			.trim()
			.split('\n')
			.filter(Boolean);
		
		if (betaTags.length > 0 && betaTags[0] !== `v${currentVersion}`) {
			console.log(`Using last beta tag: ${betaTags[0]}`);
			return betaTags[0];
		}
		
		// 如果没有找到同系列的beta，尝试找最新的正式版本
		const releaseTags = execSync(`git tag -l "${major}.*" --sort=-version:refname`, { encoding: 'utf8' })
			.trim()
			.split('\n')
			.filter(tag => tag && !tag.includes('beta') && !tag.includes('alpha'))
			.slice(0, 1);
		
		if (releaseTags.length > 0) {
			console.log(`Using last release tag: ${releaseTags[0]}`);
			return releaseTags[0];
		}
		
		// 如果都没有，就用最近的30个提交
		console.log('No relevant tags found, using HEAD~30');
		return 'HEAD~30';
	} catch (error) {
		console.warn('Warning: Could not determine last relevant tag, using HEAD~30', error.message);
		return 'HEAD~30';
	}
}

module.exports = {
	interactive: true,
	preRelease: 'beta',
	hooks: {
		"before:init": ["node esbuild.config.mjs production"],
		"after:bump": [
			"node esbuild.config.mjs production",
			"node ./scripts/zip.mjs",
			"git add .",
		],
		"after:release":
			"echo Successfully released Task Genius v${version} (BETA) to ${repo.repository}.",
	},
	git: {
		requireBranch: ["master", "beta", "develop", "refactor/*"],
		requireCleanWorkingDir: true,
		pushArgs: "--follow-tags -o ci.skip",
		commitMessage: "chore(release): bump version to ${version} [beta]",
		tagName: "v${version}",
		tagAnnotation: "Beta Release v${version}",
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
					{type: "chore", section: "Chores"},
					{type: "docs", section: "Documentation"},
					{type: "style", section: "Styles"},
					{type: "test", section: "Tests"}
				]
			},
			infile: "CHANGELOG-BETA.md",
			header: "# Beta Changelog\n\nAll notable changes to beta releases will be documented in this file.\n\n",
			// 限制 git log 的提交范围，避免 ENAMETOOLONG 错误
			gitRawCommitsOpts: {
				from: getLastRelevantTag(), // 智能获取上一个相关版本
				// 简化格式，减少命令行长度
				format: '%s%n%b%n-hash-%n%H%n-gitTags-%n%d',
			}
		},
		"./scripts/ob-bumper.mjs": {
			indent: 2,
			copyTo: "./dist",
		},
	},
	npm: {
		publish: false,
		tag: 'beta',
	},
	github: {
		release: true,
		preRelease: true,
		draft: false,
		assets: [
			"dist/main.js",
			"dist/manifest.json",
			"dist/styles.css",
			"dist/task-genius-${version}.zip",
		],
		proxy: process.env.HTTPS_PROXY,
		releaseName: "v${version} (Beta)",
		releaseNotes: (context) => {
			// 获取智能范围信息
			const fromTag = getLastRelevantTag();
			const rangeInfo = fromTag.startsWith('HEAD') 
				? `\n### Changes in this release (last ${fromTag.replace('HEAD~', '')} commits):\n`
				: `\n### Changes since ${fromTag}:\n`;
			
			return `## ⚠️ Beta Release\n\nThis is a beta release and may contain bugs or incomplete features. Use at your own risk.\n${rangeInfo}\n${context.changelog}`;
		},
	},
};