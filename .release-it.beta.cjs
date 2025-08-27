require('dotenv').config();

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
			header: "# Beta Changelog\n\nAll notable changes to beta releases will be documented in this file.\n\n"
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
		releaseNotes: "## ⚠️ Beta Release\n\nThis is a beta release and may contain bugs or incomplete features. Use at your own risk.\n\n${changelog}",
	},
};