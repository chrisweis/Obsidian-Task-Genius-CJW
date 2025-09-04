#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import semver from 'semver';

// 获取上一个正式版本标签
function getLastStableTag() {
	try {
		const allTags = execSync('git tag -l', { encoding: 'utf8' })
			.trim()
			.split('\n')
			.filter(Boolean);
		
		const stableTags = [];
		for (const tag of allTags) {
			try {
				execSync(`git merge-base --is-ancestor ${tag} HEAD`, { encoding: 'utf8' });
				const versionString = tag.replace(/^v/, '');
				const version = semver.valid(versionString);
				if (version && !semver.prerelease(version)) {
					stableTags.push({ tag, version });
				}
			} catch (e) {
				// 标签不在当前分支历史中，跳过
			}
		}
		
		if (stableTags.length === 0) {
			return 'HEAD~30';
		}
		
		const sortedTags = stableTags.sort((a, b) => {
			return semver.rcompare(a.version, b.version);
		});
		
		return sortedTags[0].tag;
	} catch (error) {
		console.warn('Warning: Could not determine last stable tag', error.message);
		return 'HEAD~30';
	}
}

const lastStableTag = getLastStableTag();
console.log(`📦 Last stable tag: ${lastStableTag}`);

// 获取从上一个正式版到现在的所有提交
const rawCommits = execSync(`git log ${lastStableTag}..HEAD --pretty=format:"%H|||%s|||%b" --no-merges`, { encoding: 'utf8' }).trim();
const commits = rawCommits ? rawCommits.split('\n').filter(Boolean) : [];

console.log(`📝 Total commits since ${lastStableTag}: ${commits.length}`);

// 按类型分组提交
const groupedCommits = {
	'Features': [],
	'Bug Fixes': [],
	'Performance': [],
	'Refactors': [],
	'Documentation': [],
	'Styles': [],
	'Tests': [],
	'Reverts': [],
	'Others': []
};

// 解析提交并分组
commits.forEach(commit => {
	const parts = commit.split('|||');
	if (parts.length < 2) return;
	
	const [hash, subject, body] = parts;
	if (!subject) return;
	
	// 解析 conventional commit 格式
	const match = subject.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/);
	if (!match) {
		groupedCommits['Others'].push({ hash: hash.substring(0, 7), subject });
		return;
	}
	
	const [, type, scope, description] = match;
	
	// 过滤掉 beta release commits
	if (type === 'chore' && description.includes('beta')) {
		return;
	}
	
	// 映射提交类型到分组
	const typeMap = {
		'feat': 'Features',
		'fix': 'Bug Fixes',
		'perf': 'Performance',
		'refactor': 'Refactors',
		'docs': 'Documentation',
		'style': 'Styles',
		'test': 'Tests',
		'revert': 'Reverts'
	};
	
	const section = typeMap[type] || 'Others';
	const shortHash = hash.substring(0, 7);
	
	groupedCommits[section].push({
		hash: shortHash,
		scope,
		description,
		subject: scope ? `**${scope}:** ${description}` : description
	});
});

// 生成 changelog 内容
let changelog = `## [9.8.0](https://github.com/Quorafind/Obsidian-Task-Genius/compare/${lastStableTag}...9.8.0) (${new Date().toISOString().split('T')[0]})\n\n`;

// 按顺序输出各个分组
Object.entries(groupedCommits).forEach(([section, commits]) => {
	if (commits.length > 0 && section !== 'Others') {
		changelog += `### ${section}\n\n`;
		commits.forEach(commit => {
			const commitUrl = `https://github.com/Quorafind/Obsidian-Task-Genius/commit/${commit.hash}`;
			changelog += `* ${commit.subject} ([${commit.hash}](${commitUrl}))\n`;
		});
		changelog += '\n';
	}
});

// 输出结果
console.log('\n📋 Generated Changelog:\n');
console.log(changelog);

// 保存到测试文件
writeFileSync('CHANGELOG-TEST.md', `# Test Changelog\n\n${changelog}`);
console.log('\n✅ Test changelog saved to CHANGELOG-TEST.md');

// 统计信息
console.log('\n📊 Statistics:');
Object.entries(groupedCommits).forEach(([section, commits]) => {
	if (commits.length > 0) {
		console.log(`  ${section}: ${commits.length} commits`);
	}
});