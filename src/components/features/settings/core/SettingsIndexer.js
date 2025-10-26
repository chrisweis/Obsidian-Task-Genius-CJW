import { prepareFuzzySearch } from "obsidian";
import { SETTINGS_METADATA } from "@/common/settings-metadata";
import { t } from "@/translations/helper";
/**
 * 高性能设置项索引器
 * 提供快速的设置项搜索和导航功能
 */
export class SettingsIndexer {
    constructor(rootEl) {
        this.isInitialized = false;
        this.rootEl = null;
        this.index = {
            items: [],
            keywordMap: new Map(),
            tabMap: new Map(),
        };
        this.rootEl = rootEl !== null && rootEl !== void 0 ? rootEl : null;
    }
    /**
     * 初始化索引 - 懒加载模式
     */
    initialize() {
        if (this.isInitialized)
            return;
        const startTime = performance.now();
        // 优先从 DOM 构建；如果不可用，则回退到静态元数据
        if (this.rootEl) {
            this.buildIndexFromDOM(this.rootEl);
        }
        else {
            this.buildIndexFromStatic();
        }
        const endTime = performance.now();
        console.log(`[SettingsIndexer] Index built in ${(endTime - startTime).toFixed(2)}ms with ${this.index.items.length} items`);
        this.isInitialized = true;
    }
    /**
     * 从静态 SETTINGS_METADATA 构建索引（回退）
     */
    buildIndexFromStatic() {
        for (const item of SETTINGS_METADATA) {
            const translatedItem = Object.assign(Object.assign({}, item), { name: t(item.translationKey), description: item.descriptionKey
                    ? t(item.descriptionKey)
                    : item.description });
            this.addItemToIndex(translatedItem);
        }
    }
    /**
     * 从 DOM 收集所有设置项，自动生成可导航的 ID、关键字等
     */
    buildIndexFromDOM(root) {
        // 查找所有设置 section
        const sectionEls = Array.from(root.querySelectorAll(".settings-tab-section"));
        const seenIds = new Set();
        sectionEls.forEach((section) => {
            const tabId = section.getAttribute("data-tab-id") || "general";
            const category = section.getAttribute("data-category") || "core";
            const settingItems = Array.from(section.querySelectorAll(".setting-item"));
            settingItems.forEach((el, idx) => {
                const nameEl = el.querySelector(".setting-item-name");
                const descEl = el.querySelector(".setting-item-description");
                const name = ((nameEl === null || nameEl === void 0 ? void 0 : nameEl.textContent) || "").trim();
                const description = ((descEl === null || descEl === void 0 ? void 0 : descEl.textContent) || "").trim();
                if (!name)
                    return; // 跳过无名设置项（如纯容器/标题）
                // 复用已有 ID，否则生成稳定 ID
                let id = el.getAttribute("data-setting-id");
                if (!id || seenIds.has(id)) {
                    id = this.generateStableId(tabId, name, idx);
                    el.setAttribute("data-setting-id", id);
                }
                seenIds.add(id);
                const keywords = this.generateKeywords(name, description);
                const item = {
                    id,
                    tabId,
                    name,
                    description: description || undefined,
                    keywords,
                    translationKey: name,
                    descriptionKey: description || undefined,
                    category,
                };
                this.addItemToIndex(item);
            });
        });
    }
    addItemToIndex(item) {
        this.index.items.push(item);
        // 关键词映射
        for (const keyword of item.keywords) {
            const normalizedKeyword = keyword.toLowerCase();
            if (!this.index.keywordMap.has(normalizedKeyword)) {
                this.index.keywordMap.set(normalizedKeyword, []);
            }
            this.index.keywordMap.get(normalizedKeyword).push(item.id);
        }
        // 标签页映射
        if (!this.index.tabMap.has(item.tabId)) {
            this.index.tabMap.set(item.tabId, []);
        }
        this.index.tabMap.get(item.tabId).push(item);
    }
    generateStableId(tabId, name, idx) {
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        return `${tabId}-${slug || "setting"}-${idx}`;
    }
    generateKeywords(name, description) {
        const text = `${name} ${description || ""}`.toLowerCase();
        const tokens = text
            .replace(/[^a-z0-9\s]+/g, " ")
            .split(/\s+/)
            .filter(Boolean);
        // 去重并限制数量，优先较长的词
        const uniq = Array.from(new Set(tokens));
        return uniq.sort((a, b) => b.length - a.length).slice(0, 12);
    }
    /**
     * 构建设置项索引
     */
    buildIndex() {
        // 向后兼容：保留方法名，但内部不再使用；索引在 initialize 中构建
        this.index.items.length = 0;
        this.index.keywordMap.clear();
        this.index.tabMap.clear();
        if (this.rootEl) {
            this.buildIndexFromDOM(this.rootEl);
        }
        else {
            this.buildIndexFromStatic();
        }
    }
    /**
     * 搜索设置项
     * @param query 搜索查询
     * @param maxResults 最大结果数量
     * @returns 搜索结果数组
     */
    search(query, maxResults = 10) {
        if (!this.isInitialized) {
            this.initialize();
        }
        if (!query || query.trim().length < 2) {
            return [];
        }
        const normalizedQuery = query.toLowerCase().trim();
        const results = [];
        const seenIds = new Set();
        // 使用 Obsidian 的模糊搜索
        const fuzzySearch = prepareFuzzySearch(normalizedQuery);
        // 搜索设置项名称
        for (const item of this.index.items) {
            if (seenIds.has(item.id))
                continue;
            const nameMatch = fuzzySearch(item.name.toLowerCase());
            if (nameMatch) {
                results.push({
                    item,
                    score: this.calculateScore(normalizedQuery, item.name, "name"),
                    matchType: "name",
                });
                seenIds.add(item.id);
            }
        }
        // 搜索设置项描述
        for (const item of this.index.items) {
            if (seenIds.has(item.id) || !item.description)
                continue;
            const descMatch = fuzzySearch(item.description.toLowerCase());
            if (descMatch) {
                results.push({
                    item,
                    score: this.calculateScore(normalizedQuery, item.description, "description"),
                    matchType: "description",
                });
                seenIds.add(item.id);
            }
        }
        // 搜索关键词
        for (const item of this.index.items) {
            if (seenIds.has(item.id))
                continue;
            for (const keyword of item.keywords) {
                const keywordMatch = fuzzySearch(keyword.toLowerCase());
                if (keywordMatch) {
                    results.push({
                        item,
                        score: this.calculateScore(normalizedQuery, keyword, "keyword"),
                        matchType: "keyword",
                    });
                    seenIds.add(item.id);
                    break; // 只需要一个关键词匹配即可
                }
            }
        }
        // 按分数排序并限制结果数量
        return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
    }
    /**
     * 计算匹配分数
     * @param query 查询字符串
     * @param target 目标字符串
     * @param matchType 匹配类型
     * @returns 匹配分数
     */
    calculateScore(query, target, matchType) {
        const lowerTarget = target.toLowerCase();
        const lowerQuery = query.toLowerCase();
        let score = 0;
        // 基础分数根据匹配类型
        const baseScores = {
            name: 100,
            description: 60,
            keyword: 80,
        };
        score += baseScores[matchType];
        // 精确匹配加分
        if (lowerTarget.includes(lowerQuery)) {
            score += 50;
            // 开头匹配额外加分
            if (lowerTarget.startsWith(lowerQuery)) {
                score += 30;
            }
        }
        // 长度相似性加分
        const lengthRatio = Math.min(query.length / target.length, 1);
        score += lengthRatio * 20;
        return score;
    }
    /**
     * 根据标签页ID获取设置项
     * @param tabId 标签页ID
     * @returns 设置项数组
     */
    getItemsByTab(tabId) {
        if (!this.isInitialized) {
            this.initialize();
        }
        return this.index.tabMap.get(tabId) || [];
    }
    /**
     * 根据设置项ID获取设置项
     * @param itemId 设置项ID
     * @returns 设置项或undefined
     */
    getItemById(itemId) {
        if (!this.isInitialized) {
            this.initialize();
        }
        return this.index.items.find((item) => item.id === itemId);
    }
    /**
     * 获取所有可用的标签页ID
     * @returns 标签页ID数组
     */
    getAllTabIds() {
        if (!this.isInitialized) {
            this.initialize();
        }
        return Array.from(this.index.tabMap.keys());
    }
    /**
     * 获取索引统计信息
     * @returns 索引统计
     */
    getStats() {
        if (!this.isInitialized) {
            this.initialize();
        }
        return {
            itemCount: this.index.items.length,
            tabCount: this.index.tabMap.size,
            keywordCount: this.index.keywordMap.size,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2V0dGluZ3NJbmRleGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiU2V0dGluZ3NJbmRleGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUM5QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQU0vRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFMUM7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGVBQWU7SUFLM0IsWUFBWSxNQUEyQjtRQUgvQixrQkFBYSxHQUFZLEtBQUssQ0FBQztRQUMvQixXQUFNLEdBQXVCLElBQUksQ0FBQztRQUd6QyxJQUFJLENBQUMsS0FBSyxHQUFHO1lBQ1osS0FBSyxFQUFFLEVBQUU7WUFDVCxVQUFVLEVBQUUsSUFBSSxHQUFHLEVBQUU7WUFDckIsTUFBTSxFQUFFLElBQUksR0FBRyxFQUFFO1NBQ2pCLENBQUM7UUFDRixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sYUFBTixNQUFNLGNBQU4sTUFBTSxHQUFJLElBQUksQ0FBQztJQUM5QixDQUFDO0lBRUQ7O09BRUc7SUFDSSxVQUFVO1FBQ2hCLElBQUksSUFBSSxDQUFDLGFBQWE7WUFBRSxPQUFPO1FBRS9CLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUVwQyw2QkFBNkI7UUFDN0IsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2hCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDcEM7YUFBTTtZQUNOLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1NBQzVCO1FBRUQsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQ1Ysb0NBQW9DLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxDQUFDLE9B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QyxDQUFDO0lBQ0gsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcHJlcGFyZUZ1enp5U2VhcmNoIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFNFVFRJTkdTX01FVEFEQVRBIH0gZnJvbSBcIkAvY29tbW9uL3NldHRpbmdzLW1ldGFkYXRhXCI7XHJcbmltcG9ydCB7XHJcblx0U2V0dGluZ3NTZWFyY2hJbmRleCxcclxuXHRTZXR0aW5nU2VhcmNoSXRlbSxcclxuXHRTZWFyY2hSZXN1bHQsXHJcbn0gZnJvbSBcIkAvdHlwZXMvU2V0dGluZ3NTZWFyY2hcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuXHJcbi8qKlxyXG4gKiDpq5jmgKfog73orr7nva7pobnntKLlvJXlmahcclxuICog5o+Q5L6b5b+r6YCf55qE6K6+572u6aG55pCc57Si5ZKM5a+86Iiq5Yqf6IO9XHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgU2V0dGluZ3NJbmRleGVyIHtcclxuXHRwcml2YXRlIGluZGV4OiBTZXR0aW5nc1NlYXJjaEluZGV4O1xyXG5cdHByaXZhdGUgaXNJbml0aWFsaXplZDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdHByaXZhdGUgcm9vdEVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cclxuXHRjb25zdHJ1Y3Rvcihyb290RWw/OiBIVE1MRWxlbWVudCB8IG51bGwpIHtcclxuXHRcdHRoaXMuaW5kZXggPSB7XHJcblx0XHRcdGl0ZW1zOiBbXSxcclxuXHRcdFx0a2V5d29yZE1hcDogbmV3IE1hcCgpLFxyXG5cdFx0XHR0YWJNYXA6IG5ldyBNYXAoKSxcclxuXHRcdH07XHJcblx0XHR0aGlzLnJvb3RFbCA9IHJvb3RFbCA/PyBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog5Yid5aeL5YyW57Si5byVIC0g5oeS5Yqg6L295qih5byPXHJcblx0ICovXHJcblx0cHVibGljIGluaXRpYWxpemUoKTogdm9pZCB7XHJcblx0XHRpZiAodGhpcy5pc0luaXRpYWxpemVkKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3Qgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblxyXG5cdFx0Ly8g5LyY5YWI5LuOIERPTSDmnoTlu7rvvJvlpoLmnpzkuI3lj6/nlKjvvIzliJnlm57pgIDliLDpnZnmgIHlhYPmlbDmja5cclxuXHRcdGlmICh0aGlzLnJvb3RFbCkge1xyXG5cdFx0XHR0aGlzLmJ1aWxkSW5kZXhGcm9tRE9NKHRoaXMucm9vdEVsKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuYnVpbGRJbmRleEZyb21TdGF0aWMoKTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBlbmRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0YFtTZXR0aW5nc0luZGV4ZXJdIEluZGV4IGJ1aWx0IGluICR7KGVuZFRpbWUgLSBzdGFydFRpbWUpLnRvRml4ZWQoXHJcblx0XHRcdFx0MlxyXG5cdFx0XHQpfW1zIHdpdGggJHt0aGlzLmluZGV4Lml0ZW1zLmxlbmd0aH0gaXRlbXNgXHJcblx0XHQpO1xyXG5cclxuXHRcdHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDku47pnZnmgIEgU0VUVElOR1NfTUVUQURBVEEg5p6E5bu657Si5byV77yI5Zue6YCA77yJXHJcblx0ICovXHJcblx0cHJpdmF0ZSBidWlsZEluZGV4RnJvbVN0YXRpYygpOiB2b2lkIHtcclxuXHRcdGZvciAoY29uc3QgaXRlbSBvZiBTRVRUSU5HU19NRVRBREFUQSkge1xyXG5cdFx0XHRjb25zdCB0cmFuc2xhdGVkSXRlbTogU2V0dGluZ1NlYXJjaEl0ZW0gPSB7XHJcblx0XHRcdFx0Li4uaXRlbSxcclxuXHRcdFx0XHRuYW1lOiB0KGl0ZW0udHJhbnNsYXRpb25LZXkpLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBpdGVtLmRlc2NyaXB0aW9uS2V5XHJcblx0XHRcdFx0XHQ/IHQoaXRlbS5kZXNjcmlwdGlvbktleSlcclxuXHRcdFx0XHRcdDogaXRlbS5kZXNjcmlwdGlvbixcclxuXHRcdFx0fTtcclxuXHRcdFx0dGhpcy5hZGRJdGVtVG9JbmRleCh0cmFuc2xhdGVkSXRlbSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDku44gRE9NIOaUtumbhuaJgOacieiuvue9rumhue+8jOiHquWKqOeUn+aIkOWPr+WvvOiIqueahCBJROOAgeWFs+mUruWtl+etiVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYnVpbGRJbmRleEZyb21ET00ocm9vdDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdC8vIOafpeaJvuaJgOacieiuvue9riBzZWN0aW9uXHJcblx0XHRjb25zdCBzZWN0aW9uRWxzID0gQXJyYXkuZnJvbShcclxuXHRcdFx0cm9vdC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihcIi5zZXR0aW5ncy10YWItc2VjdGlvblwiKVxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IHNlZW5JZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHJcblx0XHRzZWN0aW9uRWxzLmZvckVhY2goKHNlY3Rpb24pID0+IHtcclxuXHRcdFx0Y29uc3QgdGFiSWQgPSBzZWN0aW9uLmdldEF0dHJpYnV0ZShcImRhdGEtdGFiLWlkXCIpIHx8IFwiZ2VuZXJhbFwiO1xyXG5cdFx0XHRjb25zdCBjYXRlZ29yeSA9IHNlY3Rpb24uZ2V0QXR0cmlidXRlKFwiZGF0YS1jYXRlZ29yeVwiKSB8fCBcImNvcmVcIjtcclxuXHJcblx0XHRcdGNvbnN0IHNldHRpbmdJdGVtcyA9IEFycmF5LmZyb20oXHJcblx0XHRcdFx0c2VjdGlvbi5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihcIi5zZXR0aW5nLWl0ZW1cIilcclxuXHRcdFx0KTtcclxuXHRcdFx0c2V0dGluZ0l0ZW1zLmZvckVhY2goKGVsLCBpZHgpID0+IHtcclxuXHRcdFx0XHRjb25zdCBuYW1lRWwgPVxyXG5cdFx0XHRcdFx0ZWwucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oXCIuc2V0dGluZy1pdGVtLW5hbWVcIik7XHJcblx0XHRcdFx0Y29uc3QgZGVzY0VsID0gZWwucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oXHJcblx0XHRcdFx0XHRcIi5zZXR0aW5nLWl0ZW0tZGVzY3JpcHRpb25cIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0Y29uc3QgbmFtZSA9IChuYW1lRWw/LnRleHRDb250ZW50IHx8IFwiXCIpLnRyaW0oKTtcclxuXHRcdFx0XHRjb25zdCBkZXNjcmlwdGlvbiA9IChkZXNjRWw/LnRleHRDb250ZW50IHx8IFwiXCIpLnRyaW0oKTtcclxuXHJcblx0XHRcdFx0aWYgKCFuYW1lKSByZXR1cm47IC8vIOi3s+i/h+aXoOWQjeiuvue9rumhue+8iOWmgue6r+WuueWZqC/moIfpopjvvIlcclxuXHJcblx0XHRcdFx0Ly8g5aSN55So5bey5pyJIElE77yM5ZCm5YiZ55Sf5oiQ56iz5a6aIElEXHJcblx0XHRcdFx0bGV0IGlkID0gZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1zZXR0aW5nLWlkXCIpO1xyXG5cdFx0XHRcdGlmICghaWQgfHwgc2Vlbklkcy5oYXMoaWQpKSB7XHJcblx0XHRcdFx0XHRpZCA9IHRoaXMuZ2VuZXJhdGVTdGFibGVJZCh0YWJJZCwgbmFtZSwgaWR4KTtcclxuXHRcdFx0XHRcdGVsLnNldEF0dHJpYnV0ZShcImRhdGEtc2V0dGluZy1pZFwiLCBpZCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHNlZW5JZHMuYWRkKGlkKTtcclxuXHJcblx0XHRcdFx0Y29uc3Qga2V5d29yZHMgPSB0aGlzLmdlbmVyYXRlS2V5d29yZHMobmFtZSwgZGVzY3JpcHRpb24pO1xyXG5cclxuXHRcdFx0XHRjb25zdCBpdGVtOiBTZXR0aW5nU2VhcmNoSXRlbSA9IHtcclxuXHRcdFx0XHRcdGlkLFxyXG5cdFx0XHRcdFx0dGFiSWQsXHJcblx0XHRcdFx0XHRuYW1lLFxyXG5cdFx0XHRcdFx0ZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uIHx8IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdGtleXdvcmRzLFxyXG5cdFx0XHRcdFx0dHJhbnNsYXRpb25LZXk6IG5hbWUsIC8vIOW3sue7j+aYr+WxleekuuaWh+ahiFxyXG5cdFx0XHRcdFx0ZGVzY3JpcHRpb25LZXk6IGRlc2NyaXB0aW9uIHx8IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdGNhdGVnb3J5LFxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdHRoaXMuYWRkSXRlbVRvSW5kZXgoaXRlbSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFkZEl0ZW1Ub0luZGV4KGl0ZW06IFNldHRpbmdTZWFyY2hJdGVtKTogdm9pZCB7XHJcblx0XHR0aGlzLmluZGV4Lml0ZW1zLnB1c2goaXRlbSk7XHJcblxyXG5cdFx0Ly8g5YWz6ZSu6K+N5pig5bCEXHJcblx0XHRmb3IgKGNvbnN0IGtleXdvcmQgb2YgaXRlbS5rZXl3b3Jkcykge1xyXG5cdFx0XHRjb25zdCBub3JtYWxpemVkS2V5d29yZCA9IGtleXdvcmQudG9Mb3dlckNhc2UoKTtcclxuXHRcdFx0aWYgKCF0aGlzLmluZGV4LmtleXdvcmRNYXAuaGFzKG5vcm1hbGl6ZWRLZXl3b3JkKSkge1xyXG5cdFx0XHRcdHRoaXMuaW5kZXgua2V5d29yZE1hcC5zZXQobm9ybWFsaXplZEtleXdvcmQsIFtdKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLmluZGV4LmtleXdvcmRNYXAuZ2V0KG5vcm1hbGl6ZWRLZXl3b3JkKSEucHVzaChpdGVtLmlkKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyDmoIfnrb7pobXmmKDlsIRcclxuXHRcdGlmICghdGhpcy5pbmRleC50YWJNYXAuaGFzKGl0ZW0udGFiSWQpKSB7XHJcblx0XHRcdHRoaXMuaW5kZXgudGFiTWFwLnNldChpdGVtLnRhYklkLCBbXSk7XHJcblx0XHR9XHJcblx0XHR0aGlzLmluZGV4LnRhYk1hcC5nZXQoaXRlbS50YWJJZCkhLnB1c2goaXRlbSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdlbmVyYXRlU3RhYmxlSWQodGFiSWQ6IHN0cmluZywgbmFtZTogc3RyaW5nLCBpZHg6IG51bWJlcik6IHN0cmluZyB7XHJcblx0XHRjb25zdCBzbHVnID0gbmFtZVxyXG5cdFx0XHQudG9Mb3dlckNhc2UoKVxyXG5cdFx0XHQucmVwbGFjZSgvW15hLXowLTldKy9nLCBcIi1cIilcclxuXHRcdFx0LnJlcGxhY2UoL14tK3wtKyQvZywgXCJcIik7XHJcblx0XHRyZXR1cm4gYCR7dGFiSWR9LSR7c2x1ZyB8fCBcInNldHRpbmdcIn0tJHtpZHh9YDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2VuZXJhdGVLZXl3b3JkcyhuYW1lOiBzdHJpbmcsIGRlc2NyaXB0aW9uPzogc3RyaW5nKTogc3RyaW5nW10ge1xyXG5cdFx0Y29uc3QgdGV4dCA9IGAke25hbWV9ICR7ZGVzY3JpcHRpb24gfHwgXCJcIn1gLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRjb25zdCB0b2tlbnMgPSB0ZXh0XHJcblx0XHRcdC5yZXBsYWNlKC9bXmEtejAtOVxcc10rL2csIFwiIFwiKVxyXG5cdFx0XHQuc3BsaXQoL1xccysvKVxyXG5cdFx0XHQuZmlsdGVyKEJvb2xlYW4pO1xyXG5cdFx0Ly8g5Y676YeN5bm26ZmQ5Yi25pWw6YeP77yM5LyY5YWI6L6D6ZW/55qE6K+NXHJcblx0XHRjb25zdCB1bmlxID0gQXJyYXkuZnJvbShuZXcgU2V0KHRva2VucykpO1xyXG5cdFx0cmV0dXJuIHVuaXEuc29ydCgoYSwgYikgPT4gYi5sZW5ndGggLSBhLmxlbmd0aCkuc2xpY2UoMCwgMTIpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog5p6E5bu66K6+572u6aG557Si5byVXHJcblx0ICovXHJcblx0cHJpdmF0ZSBidWlsZEluZGV4KCk6IHZvaWQge1xyXG5cdFx0Ly8g5ZCR5ZCO5YW85a6577ya5L+d55WZ5pa55rOV5ZCN77yM5L2G5YaF6YOo5LiN5YaN5L2/55So77yb57Si5byV5ZyoIGluaXRpYWxpemUg5Lit5p6E5bu6XHJcblx0XHR0aGlzLmluZGV4Lml0ZW1zLmxlbmd0aCA9IDA7XHJcblx0XHR0aGlzLmluZGV4LmtleXdvcmRNYXAuY2xlYXIoKTtcclxuXHRcdHRoaXMuaW5kZXgudGFiTWFwLmNsZWFyKCk7XHJcblx0XHRpZiAodGhpcy5yb290RWwpIHtcclxuXHRcdFx0dGhpcy5idWlsZEluZGV4RnJvbURPTSh0aGlzLnJvb3RFbCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmJ1aWxkSW5kZXhGcm9tU3RhdGljKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDmkJzntKLorr7nva7poblcclxuXHQgKiBAcGFyYW0gcXVlcnkg5pCc57Si5p+l6K+iXHJcblx0ICogQHBhcmFtIG1heFJlc3VsdHMg5pyA5aSn57uT5p6c5pWw6YePXHJcblx0ICogQHJldHVybnMg5pCc57Si57uT5p6c5pWw57uEXHJcblx0ICovXHJcblx0cHVibGljIHNlYXJjaChxdWVyeTogc3RyaW5nLCBtYXhSZXN1bHRzOiBudW1iZXIgPSAxMCk6IFNlYXJjaFJlc3VsdFtdIHtcclxuXHRcdGlmICghdGhpcy5pc0luaXRpYWxpemVkKSB7XHJcblx0XHRcdHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghcXVlcnkgfHwgcXVlcnkudHJpbSgpLmxlbmd0aCA8IDIpIHtcclxuXHRcdFx0cmV0dXJuIFtdO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IG5vcm1hbGl6ZWRRdWVyeSA9IHF1ZXJ5LnRvTG93ZXJDYXNlKCkudHJpbSgpO1xyXG5cdFx0Y29uc3QgcmVzdWx0czogU2VhcmNoUmVzdWx0W10gPSBbXTtcclxuXHRcdGNvbnN0IHNlZW5JZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHJcblx0XHQvLyDkvb/nlKggT2JzaWRpYW4g55qE5qih57OK5pCc57SiXHJcblx0XHRjb25zdCBmdXp6eVNlYXJjaCA9IHByZXBhcmVGdXp6eVNlYXJjaChub3JtYWxpemVkUXVlcnkpO1xyXG5cclxuXHRcdC8vIOaQnOe0ouiuvue9rumhueWQjeensFxyXG5cdFx0Zm9yIChjb25zdCBpdGVtIG9mIHRoaXMuaW5kZXguaXRlbXMpIHtcclxuXHRcdFx0aWYgKHNlZW5JZHMuaGFzKGl0ZW0uaWQpKSBjb250aW51ZTtcclxuXHJcblx0XHRcdGNvbnN0IG5hbWVNYXRjaCA9IGZ1enp5U2VhcmNoKGl0ZW0ubmFtZS50b0xvd2VyQ2FzZSgpKTtcclxuXHRcdFx0aWYgKG5hbWVNYXRjaCkge1xyXG5cdFx0XHRcdHJlc3VsdHMucHVzaCh7XHJcblx0XHRcdFx0XHRpdGVtLFxyXG5cdFx0XHRcdFx0c2NvcmU6IHRoaXMuY2FsY3VsYXRlU2NvcmUoXHJcblx0XHRcdFx0XHRcdG5vcm1hbGl6ZWRRdWVyeSxcclxuXHRcdFx0XHRcdFx0aXRlbS5uYW1lLFxyXG5cdFx0XHRcdFx0XHRcIm5hbWVcIlxyXG5cdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdG1hdGNoVHlwZTogXCJuYW1lXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0c2Vlbklkcy5hZGQoaXRlbS5pZCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyDmkJzntKLorr7nva7pobnmj4/ov7BcclxuXHRcdGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLmluZGV4Lml0ZW1zKSB7XHJcblx0XHRcdGlmIChzZWVuSWRzLmhhcyhpdGVtLmlkKSB8fCAhaXRlbS5kZXNjcmlwdGlvbikgY29udGludWU7XHJcblxyXG5cdFx0XHRjb25zdCBkZXNjTWF0Y2ggPSBmdXp6eVNlYXJjaChpdGVtLmRlc2NyaXB0aW9uLnRvTG93ZXJDYXNlKCkpO1xyXG5cdFx0XHRpZiAoZGVzY01hdGNoKSB7XHJcblx0XHRcdFx0cmVzdWx0cy5wdXNoKHtcclxuXHRcdFx0XHRcdGl0ZW0sXHJcblx0XHRcdFx0XHRzY29yZTogdGhpcy5jYWxjdWxhdGVTY29yZShcclxuXHRcdFx0XHRcdFx0bm9ybWFsaXplZFF1ZXJ5LFxyXG5cdFx0XHRcdFx0XHRpdGVtLmRlc2NyaXB0aW9uLFxyXG5cdFx0XHRcdFx0XHRcImRlc2NyaXB0aW9uXCJcclxuXHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRtYXRjaFR5cGU6IFwiZGVzY3JpcHRpb25cIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRzZWVuSWRzLmFkZChpdGVtLmlkKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIOaQnOe0ouWFs+mUruivjVxyXG5cdFx0Zm9yIChjb25zdCBpdGVtIG9mIHRoaXMuaW5kZXguaXRlbXMpIHtcclxuXHRcdFx0aWYgKHNlZW5JZHMuaGFzKGl0ZW0uaWQpKSBjb250aW51ZTtcclxuXHJcblx0XHRcdGZvciAoY29uc3Qga2V5d29yZCBvZiBpdGVtLmtleXdvcmRzKSB7XHJcblx0XHRcdFx0Y29uc3Qga2V5d29yZE1hdGNoID0gZnV6enlTZWFyY2goa2V5d29yZC50b0xvd2VyQ2FzZSgpKTtcclxuXHRcdFx0XHRpZiAoa2V5d29yZE1hdGNoKSB7XHJcblx0XHRcdFx0XHRyZXN1bHRzLnB1c2goe1xyXG5cdFx0XHRcdFx0XHRpdGVtLFxyXG5cdFx0XHRcdFx0XHRzY29yZTogdGhpcy5jYWxjdWxhdGVTY29yZShcclxuXHRcdFx0XHRcdFx0XHRub3JtYWxpemVkUXVlcnksXHJcblx0XHRcdFx0XHRcdFx0a2V5d29yZCxcclxuXHRcdFx0XHRcdFx0XHRcImtleXdvcmRcIlxyXG5cdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHRtYXRjaFR5cGU6IFwia2V5d29yZFwiLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRzZWVuSWRzLmFkZChpdGVtLmlkKTtcclxuXHRcdFx0XHRcdGJyZWFrOyAvLyDlj6rpnIDopoHkuIDkuKrlhbPplK7or43ljLnphY3ljbPlj69cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyDmjInliIbmlbDmjpLluo/lubbpmZDliLbnu5PmnpzmlbDph49cclxuXHRcdHJldHVybiByZXN1bHRzLnNvcnQoKGEsIGIpID0+IGIuc2NvcmUgLSBhLnNjb3JlKS5zbGljZSgwLCBtYXhSZXN1bHRzKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIOiuoeeul+WMuemFjeWIhuaVsFxyXG5cdCAqIEBwYXJhbSBxdWVyeSDmn6Xor6LlrZfnrKbkuLJcclxuXHQgKiBAcGFyYW0gdGFyZ2V0IOebruagh+Wtl+espuS4slxyXG5cdCAqIEBwYXJhbSBtYXRjaFR5cGUg5Yy56YWN57G75Z6LXHJcblx0ICogQHJldHVybnMg5Yy56YWN5YiG5pWwXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjYWxjdWxhdGVTY29yZShcclxuXHRcdHF1ZXJ5OiBzdHJpbmcsXHJcblx0XHR0YXJnZXQ6IHN0cmluZyxcclxuXHRcdG1hdGNoVHlwZTogXCJuYW1lXCIgfCBcImRlc2NyaXB0aW9uXCIgfCBcImtleXdvcmRcIlxyXG5cdCk6IG51bWJlciB7XHJcblx0XHRjb25zdCBsb3dlclRhcmdldCA9IHRhcmdldC50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0Y29uc3QgbG93ZXJRdWVyeSA9IHF1ZXJ5LnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdFx0bGV0IHNjb3JlID0gMDtcclxuXHJcblx0XHQvLyDln7rnoYDliIbmlbDmoLnmja7ljLnphY3nsbvlnotcclxuXHRcdGNvbnN0IGJhc2VTY29yZXMgPSB7XHJcblx0XHRcdG5hbWU6IDEwMCxcclxuXHRcdFx0ZGVzY3JpcHRpb246IDYwLFxyXG5cdFx0XHRrZXl3b3JkOiA4MCxcclxuXHRcdH07XHJcblx0XHRzY29yZSArPSBiYXNlU2NvcmVzW21hdGNoVHlwZV07XHJcblxyXG5cdFx0Ly8g57K+56Gu5Yy56YWN5Yqg5YiGXHJcblx0XHRpZiAobG93ZXJUYXJnZXQuaW5jbHVkZXMobG93ZXJRdWVyeSkpIHtcclxuXHRcdFx0c2NvcmUgKz0gNTA7XHJcblxyXG5cdFx0XHQvLyDlvIDlpLTljLnphY3pop3lpJbliqDliIZcclxuXHRcdFx0aWYgKGxvd2VyVGFyZ2V0LnN0YXJ0c1dpdGgobG93ZXJRdWVyeSkpIHtcclxuXHRcdFx0XHRzY29yZSArPSAzMDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIOmVv+W6puebuOS8vOaAp+WKoOWIhlxyXG5cdFx0Y29uc3QgbGVuZ3RoUmF0aW8gPSBNYXRoLm1pbihxdWVyeS5sZW5ndGggLyB0YXJnZXQubGVuZ3RoLCAxKTtcclxuXHRcdHNjb3JlICs9IGxlbmd0aFJhdGlvICogMjA7XHJcblxyXG5cdFx0cmV0dXJuIHNjb3JlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog5qC55o2u5qCH562+6aG1SUTojrflj5borr7nva7poblcclxuXHQgKiBAcGFyYW0gdGFiSWQg5qCH562+6aG1SURcclxuXHQgKiBAcmV0dXJucyDorr7nva7pobnmlbDnu4RcclxuXHQgKi9cclxuXHRwdWJsaWMgZ2V0SXRlbXNCeVRhYih0YWJJZDogc3RyaW5nKTogU2V0dGluZ1NlYXJjaEl0ZW1bXSB7XHJcblx0XHRpZiAoIXRoaXMuaXNJbml0aWFsaXplZCkge1xyXG5cdFx0XHR0aGlzLmluaXRpYWxpemUoKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcy5pbmRleC50YWJNYXAuZ2V0KHRhYklkKSB8fCBbXTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIOagueaNruiuvue9rumhuUlE6I635Y+W6K6+572u6aG5XHJcblx0ICogQHBhcmFtIGl0ZW1JZCDorr7nva7poblJRFxyXG5cdCAqIEByZXR1cm5zIOiuvue9rumhueaIlnVuZGVmaW5lZFxyXG5cdCAqL1xyXG5cdHB1YmxpYyBnZXRJdGVtQnlJZChpdGVtSWQ6IHN0cmluZyk6IFNldHRpbmdTZWFyY2hJdGVtIHwgdW5kZWZpbmVkIHtcclxuXHRcdGlmICghdGhpcy5pc0luaXRpYWxpemVkKSB7XHJcblx0XHRcdHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzLmluZGV4Lml0ZW1zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IGl0ZW1JZCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDojrflj5bmiYDmnInlj6/nlKjnmoTmoIfnrb7pobVJRFxyXG5cdCAqIEByZXR1cm5zIOagh+etvumhtUlE5pWw57uEXHJcblx0ICovXHJcblx0cHVibGljIGdldEFsbFRhYklkcygpOiBzdHJpbmdbXSB7XHJcblx0XHRpZiAoIXRoaXMuaXNJbml0aWFsaXplZCkge1xyXG5cdFx0XHR0aGlzLmluaXRpYWxpemUoKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmluZGV4LnRhYk1hcC5rZXlzKCkpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog6I635Y+W57Si5byV57uf6K6h5L+h5oGvXHJcblx0ICogQHJldHVybnMg57Si5byV57uf6K6hXHJcblx0ICovXHJcblx0cHVibGljIGdldFN0YXRzKCk6IHtcclxuXHRcdGl0ZW1Db3VudDogbnVtYmVyO1xyXG5cdFx0dGFiQ291bnQ6IG51bWJlcjtcclxuXHRcdGtleXdvcmRDb3VudDogbnVtYmVyO1xyXG5cdH0ge1xyXG5cdFx0aWYgKCF0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcclxuXHRcdFx0dGhpcy5pbml0aWFsaXplKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0aXRlbUNvdW50OiB0aGlzLmluZGV4Lml0ZW1zLmxlbmd0aCxcclxuXHRcdFx0dGFiQ291bnQ6IHRoaXMuaW5kZXgudGFiTWFwLnNpemUsXHJcblx0XHRcdGtleXdvcmRDb3VudDogdGhpcy5pbmRleC5rZXl3b3JkTWFwLnNpemUsXHJcblx0XHR9O1xyXG5cdH1cclxufVxyXG4iXX0=