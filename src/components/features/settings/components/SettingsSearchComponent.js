import { Component, setIcon, debounce } from "obsidian";
import { SettingsIndexer } from "@/components/features/settings/core/SettingsIndexer";
import { t } from "@/translations/helper";
import { WorkspaceSettingsSelector } from "./WorkspaceSettingsSelector";
/**
 * 设置搜索组件
 * 提供设置项的搜索和导航功能
 * 继承 Component 以获得自动的事件生命周期管理
 */
export class SettingsSearchComponent extends Component {
    constructor(settingTab, containerEl) {
        super();
        this.currentResults = [];
        this.selectedIndex = -1;
        this.isVisible = false;
        this.blurTimeoutId = 0;
        this.workspaceSelector = null;
        this.settingTab = settingTab;
        this.indexer = new SettingsIndexer(containerEl);
        this.containerEl = containerEl;
        // Initialize debounced search function
        this.debouncedSearch = debounce((query) => this.performSearch(query), 100, true);
        this.createSearchUI();
        this.setupEventListeners();
    }
    /**
     * 创建搜索界面
     */
    createSearchUI() {
        // 创建主容器
        const mainContainer = this.containerEl.createDiv();
        mainContainer.addClass("tg-settings-main-container");
        // 创建头部栏（包含workspace选择器和搜索框）
        const headerBar = mainContainer.createDiv();
        headerBar.addClass("tg-settings-header-bar");
        // 创建workspace选择器容器
        const workspaceSelectorContainer = headerBar.createDiv();
        workspaceSelectorContainer.addClass("tg-workspace-selector-container");
        // 初始化workspace选择器
        if (this.settingTab.plugin.workspaceManager) {
            this.workspaceSelector = new WorkspaceSettingsSelector(workspaceSelectorContainer, this.settingTab.plugin, this.settingTab);
        }
        // 创建搜索容器
        const searchContainer = headerBar.createDiv();
        searchContainer.addClass("tg-settings-search-container");
        // 创建搜索输入框容器
        const searchInputContainer = searchContainer.createDiv();
        searchInputContainer.addClass("tg-settings-search-input-container");
        // 创建搜索图标
        const searchIcon = searchInputContainer.createSpan();
        searchIcon.addClass("tg-settings-search-icon");
        setIcon(searchIcon, "search");
        // 创建搜索输入框
        this.searchInputEl = searchInputContainer.createEl("input");
        this.searchInputEl.type = "text";
        this.searchInputEl.placeholder = t("Search settings...") + " (Ctrl+K)";
        this.searchInputEl.addClass("tg-settings-search-input");
        this.searchInputEl.setAttribute("aria-label", t("Search settings"));
        this.searchInputEl.setAttribute("autocomplete", "off");
        this.searchInputEl.setAttribute("spellcheck", "false");
        // 创建清除按钮
        this.clearButton = searchInputContainer.createEl("button");
        this.clearButton.addClass("tg-settings-search-clear");
        this.clearButton.setAttribute("aria-label", t("Clear search"));
        setIcon(this.clearButton, "x");
        this.clearButton.style.display = "none";
        // 创建搜索结果容器（在header bar外面）
        this.resultsContainerEl = mainContainer.createDiv();
        this.resultsContainerEl.addClass("tg-settings-search-results");
        this.resultsContainerEl.style.display = "none";
        this.resultsContainerEl.setAttribute("role", "listbox");
        this.resultsContainerEl.setAttribute("aria-label", t("Search results"));
    }
    /**
     * 设置事件监听器
     * 使用 registerDomEvent 进行自动的生命周期管理
     */
    setupEventListeners() {
        // 清除按钮点击事件
        this.registerDomEvent(this.clearButton, "click", () => {
            this.clearSearch();
            this.searchInputEl.focus();
        });
        // 输入事件
        this.registerDomEvent(this.searchInputEl, "input", (e) => {
            const query = e.target.value;
            this.handleSearchInput(query);
        });
        // 键盘事件
        this.registerDomEvent(this.searchInputEl, "keydown", (e) => {
            this.handleKeyDown(e);
        });
        // 全局 Ctrl+K / Cmd+K 快捷键监听
        this.registerDomEvent(document, "keydown", (e) => {
            // 检查是否是 Ctrl+K (Windows/Linux) 或 Cmd+K (macOS)
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
            if (isCtrlOrCmd && e.key.toLowerCase() === 'k') {
                // 确保当前在设置页面中
                if (this.containerEl.isConnected && document.body.contains(this.containerEl)) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.searchInputEl.focus();
                    // 如果有文本，全选以便用户可以快速替换
                    if (this.searchInputEl.value) {
                        this.searchInputEl.select();
                    }
                }
            }
        });
        // 焦点事件
        this.registerDomEvent(this.searchInputEl, "focus", () => {
            if (this.currentResults.length > 0) {
                this.showResults();
            }
        });
        // 失去焦点事件
        this.registerDomEvent(this.searchInputEl, "blur", () => {
            // 延迟隐藏，允许点击搜索结果
            this.blurTimeoutId = window.setTimeout(() => {
                if (!this.resultsContainerEl.contains(document.activeElement)) {
                    this.hideResults();
                }
            }, 200);
        });
        // 点击外部隐藏结果
        this.registerDomEvent(document, "click", (e) => {
            if (!this.containerEl.contains(e.target)) {
                this.hideResults();
            }
        });
    }
    /**
     * 处理搜索输入
     */
    handleSearchInput(query) {
        // 更新清除按钮显示状态
        this.clearButton.style.display = query.length > 0 ? "block" : "none";
        // 防抖搜索 - 减少延迟以提升响应速度
        this.debouncedSearch(query);
    }
    /**
     * 执行搜索
     */
    performSearch(query) {
        console.log(`[SettingsSearch] Performing search for: "${query}"`);
        if (query.length === 0) {
            console.log(`[SettingsSearch] Empty query, hiding results`);
            this.hideResults();
            return;
        }
        // 最少输入1个字符开始搜索，提升响应性
        if (query.length < 1) {
            console.log(`[SettingsSearch] Query too short (${query.length} chars), skipping search`);
            return;
        }
        // 增加搜索结果数量，让用户有更多选择
        this.currentResults = this.indexer.search(query, 12);
        this.selectedIndex = -1;
        console.log(`[SettingsSearch] Found ${this.currentResults.length} results:`);
        this.currentResults.forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.item.name} (${result.matchType}, score: ${result.score})`);
        });
        if (this.currentResults.length > 0) {
            this.renderResults();
            this.showResults();
            // 自动选中第一个结果
            if (this.selectedIndex === -1) {
                this.setSelectedIndex(0);
            }
        }
        else {
            this.renderNoResults();
            this.showResults();
        }
    }
    /**
     * 渲染搜索结果
     */
    renderResults() {
        this.resultsContainerEl.empty();
        this.currentResults.forEach((result, index) => {
            const resultEl = this.resultsContainerEl.createDiv();
            resultEl.addClass("tg-settings-search-result");
            resultEl.setAttribute("data-index", index.toString());
            // 设置项名称
            const nameEl = resultEl.createDiv();
            nameEl.addClass("tg-settings-search-result-name");
            nameEl.textContent = result.item.name;
            // 所属分类和标签页
            const metaEl = resultEl.createDiv();
            metaEl.addClass("tg-settings-search-result-meta");
            const categoryEl = metaEl.createSpan();
            categoryEl.addClass("tg-settings-search-result-category");
            categoryEl.textContent = this.getCategoryDisplayName(result.item.category);
            // 描述（如果有）
            if (result.item.description && result.matchType === "description") {
                const descEl = resultEl.createDiv();
                descEl.addClass("tg-settings-search-result-desc");
                descEl.textContent = this.truncateText(result.item.description, 80);
            }
            // 使用 registerDomEvent 注册点击事件
            this.registerDomEvent(resultEl, "click", () => {
                this.selectResult(result);
            });
            // 使用 registerDomEvent 注册鼠标悬停事件
            this.registerDomEvent(resultEl, "mouseenter", () => {
                this.setSelectedIndex(index);
            });
        });
    }
    /**
     * 渲染无结果状态
     */
    renderNoResults() {
        this.resultsContainerEl.empty();
        const noResultEl = this.resultsContainerEl.createDiv();
        noResultEl.addClass("tg-settings-search-no-result");
        noResultEl.textContent = t("No settings found");
    }
    /**
     * 处理键盘事件
     */
    handleKeyDown(e) {
        if (!this.isVisible || this.currentResults.length === 0) {
            if (e.key === "Escape") {
                this.clearSearch();
            }
            return;
        }
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                this.moveSelection(1);
                break;
            case "ArrowUp":
                e.preventDefault();
                this.moveSelection(-1);
                break;
            case "Enter":
                e.preventDefault();
                if (this.selectedIndex >= 0 &&
                    this.currentResults[this.selectedIndex]) {
                    this.selectResult(this.currentResults[this.selectedIndex]);
                }
                break;
            case "Escape":
                e.preventDefault();
                this.clearSearch();
                break;
        }
    }
    /**
     * 移动选择
     */
    moveSelection(direction) {
        const newIndex = this.selectedIndex + direction;
        if (newIndex >= 0 && newIndex < this.currentResults.length) {
            this.setSelectedIndex(newIndex);
        }
    }
    /**
     * 设置选中索引
     */
    setSelectedIndex(index) {
        // 移除之前的选中状态
        const previousSelected = this.resultsContainerEl.querySelector(".tg-settings-search-result-selected");
        if (previousSelected) {
            previousSelected.removeClass("tg-settings-search-result-selected");
        }
        this.selectedIndex = index;
        // 添加新的选中状态
        if (index >= 0) {
            const selectedEl = this.resultsContainerEl.querySelector(`[data-index="${index}"]`);
            if (selectedEl) {
                selectedEl.addClass("tg-settings-search-result-selected");
                selectedEl.scrollIntoView({ block: "nearest" });
            }
        }
    }
    /**
     * 选择搜索结果
     */
    selectResult(result) {
        // 跳转到对应的标签页和设置项
        this.navigateToSetting(result.item.tabId, result.item.id);
        // 清除搜索
        this.clearSearch();
    }
    /**
     * 导航到指定设置项
     */
    navigateToSetting(tabId, settingId) {
        // 切换到对应标签页
        this.settingTab.switchToTab(tabId);
        // 延迟滚动到设置项（等待标签页切换完成）
        // 使用 register 注册 timeout 以确保正确清理
        const timeoutId = window.setTimeout(() => {
            this.scrollToSetting(settingId);
        }, 100);
        this.register(() => clearTimeout(timeoutId));
    }
    /**
     * 滚动到指定设置项
     */
    scrollToSetting(settingId) {
        // 查找具有对应ID的设置项元素
        const settingElement = this.containerEl.querySelector(`[data-setting-id="${settingId}"]`);
        if (settingElement) {
            // 滚动到设置项
            settingElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
            // 添加临时高亮效果
            settingElement.addClass("tg-settings-search-highlight");
            const timeoutId = window.setTimeout(() => {
                settingElement.removeClass("tg-settings-search-highlight");
            }, 2000);
            this.register(() => clearTimeout(timeoutId));
        }
    }
    /**
     * 显示搜索结果
     */
    showResults() {
        this.resultsContainerEl.style.display = "block";
        this.isVisible = true;
    }
    /**
     * 隐藏搜索结果
     */
    hideResults() {
        this.resultsContainerEl.style.display = "none";
        this.isVisible = false;
        this.selectedIndex = -1;
    }
    /**
     * 清除搜索
     */
    clearSearch() {
        this.searchInputEl.value = "";
        this.currentResults = [];
        this.hideResults();
        // 隐藏清除按钮
        this.clearButton.style.display = "none";
    }
    /**
     * 获取分类显示名称
     */
    getCategoryDisplayName(category) {
        const categoryNames = {
            core: t("Core Settings"),
            display: t("Display & Progress"),
            management: t("Task Management"),
            workflow: t("Workflow & Automation"),
            gamification: t("Gamification"),
            integration: t("Integration"),
            advanced: t("Advanced"),
            info: t("Information"),
        };
        return categoryNames[category] || category;
    }
    /**
     * 截断文本
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - 3) + "...";
    }
    /**
     * 重写 onunload 方法以进行清理
     * Component 会自动调用此方法
     */
    onunload() {
        // 清理定时器
        clearTimeout(this.blurTimeoutId);
        // 清空容器
        this.containerEl.empty();
        // Component 基类会自动清理所有通过 registerDomEvent 注册的事件
    }
    /**
     * 销毁组件（为了向后兼容保留此方法）
     */
    destroy() {
        this.unload();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2V0dGluZ3NTZWFyY2hDb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJTZXR0aW5nc1NlYXJjaENvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUV4RTs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLHVCQUF3QixTQUFRLFNBQVM7SUFjckQsWUFDQyxVQUFxQyxFQUNyQyxXQUF3QjtRQUV4QixLQUFLLEVBQUUsQ0FBQztRQVhELG1CQUFjLEdBQW1CLEVBQUUsQ0FBQztRQUNwQyxrQkFBYSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRW5CLGNBQVMsR0FBRyxLQUFLLENBQUM7UUFDbEIsa0JBQWEsR0FBRyxDQUFDLENBQUM7UUFDbEIsc0JBQWlCLEdBQXFDLElBQUksQ0FBQztRQU9sRSxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUM3QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksZUFBZSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBRS9CLHVDQUF1QztRQUN2QyxJQUFJLENBQUMsZUFBZSxHQUFHLFFBQVEsQ0FDOUIsQ0FBQyxLQUFhLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQzVDLEdBQUcsRUFDSCxJQUFJLENBQ0osQ0FBQztRQUVGLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUN0QixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRUQ7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QixDQUFDO1lBQ2hDLFFBQVEsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUM7WUFDcEMsWUFBWSxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUM7WUFDL0IsV0FBVyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUM7WUFDN0IsUUFBUSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUM7WUFDdkIsSUFBSSxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUM7U0FDdEIsQ0FBQztRQUVGLE9BQU8sYUFBYSxDQUFDLFFBQVEsQ0FBQyxJQUFJLFFBQVEsQ0FBQztJQUM1QyxDQUFDO0lBRUQ7O09BRUc7SUFDSyxZQUFZLENBQUMsSUFBWSxFQUFFLFNBQWlCO1FBQ25ELElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxTQUFTLEVBQUU7WUFDN0IsT0FBTyxJQUFJLENBQUM7U0FDWjtRQUNELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUNqRCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsUUFBUTtRQUNQLFFBQVE7UUFDUixZQUFZLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRWpDLE9BQU87UUFDUCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRXpCLCtDQUErQztJQUNoRCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxPQUFPO1FBQ2IsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2YsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBzZXRJY29uLCBkZWJvdW5jZSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBTZXR0aW5nc0luZGV4ZXIgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL3NldHRpbmdzL2NvcmUvU2V0dGluZ3NJbmRleGVyXCI7XHJcbmltcG9ydCB7IFNlYXJjaFJlc3VsdCB9IGZyb20gXCJAL3R5cGVzL1NldHRpbmdzU2VhcmNoXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIgfSBmcm9tIFwiQC9zZXR0aW5nXCI7XHJcbmltcG9ydCB7IFdvcmtzcGFjZVNldHRpbmdzU2VsZWN0b3IgfSBmcm9tIFwiLi9Xb3Jrc3BhY2VTZXR0aW5nc1NlbGVjdG9yXCI7XHJcblxyXG4vKipcclxuICog6K6+572u5pCc57Si57uE5Lu2XHJcbiAqIOaPkOS+m+iuvue9rumhueeahOaQnOe0ouWSjOWvvOiIquWKn+iDvVxyXG4gKiDnu6fmib8gQ29tcG9uZW50IOS7peiOt+W+l+iHquWKqOeahOS6i+S7tueUn+WRveWRqOacn+euoeeQhlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFNldHRpbmdzU2VhcmNoQ29tcG9uZW50IGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRwcml2YXRlIHNldHRpbmdUYWI6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWI7XHJcblx0cHJpdmF0ZSBpbmRleGVyOiBTZXR0aW5nc0luZGV4ZXI7XHJcblx0cHJpdmF0ZSBjb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBzZWFyY2hJbnB1dEVsOiBIVE1MSW5wdXRFbGVtZW50O1xyXG5cdHByaXZhdGUgcmVzdWx0c0NvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGNsZWFyQnV0dG9uOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGN1cnJlbnRSZXN1bHRzOiBTZWFyY2hSZXN1bHRbXSA9IFtdO1xyXG5cdHByaXZhdGUgc2VsZWN0ZWRJbmRleCA9IC0xO1xyXG5cdHByaXZhdGUgZGVib3VuY2VkU2VhcmNoOiAocXVlcnk6IHN0cmluZykgPT4gdm9pZDtcclxuXHRwcml2YXRlIGlzVmlzaWJsZSA9IGZhbHNlO1xyXG5cdHByaXZhdGUgYmx1clRpbWVvdXRJZCA9IDA7XHJcblx0cHJpdmF0ZSB3b3Jrc3BhY2VTZWxlY3RvcjogV29ya3NwYWNlU2V0dGluZ3NTZWxlY3RvciB8IG51bGwgPSBudWxsO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHNldHRpbmdUYWI6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIsXHJcblx0XHRjb250YWluZXJFbDogSFRNTEVsZW1lbnRcclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLnNldHRpbmdUYWIgPSBzZXR0aW5nVGFiO1xyXG5cdFx0dGhpcy5pbmRleGVyID0gbmV3IFNldHRpbmdzSW5kZXhlcihjb250YWluZXJFbCk7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsID0gY29udGFpbmVyRWw7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBkZWJvdW5jZWQgc2VhcmNoIGZ1bmN0aW9uXHJcblx0XHR0aGlzLmRlYm91bmNlZFNlYXJjaCA9IGRlYm91bmNlKFxyXG5cdFx0XHQocXVlcnk6IHN0cmluZykgPT4gdGhpcy5wZXJmb3JtU2VhcmNoKHF1ZXJ5KSxcclxuXHRcdFx0MTAwLFxyXG5cdFx0XHR0cnVlXHJcblx0XHQpO1xyXG5cclxuXHRcdHRoaXMuY3JlYXRlU2VhcmNoVUkoKTtcclxuXHRcdHRoaXMuc2V0dXBFdmVudExpc3RlbmVycygpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog5Yib5bu65pCc57Si55WM6Z2iXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVTZWFyY2hVSSgpOiB2b2lkIHtcclxuXHRcdC8vIOWIm+W7uuS4u+WuueWZqFxyXG5cdFx0Y29uc3QgbWFpbkNvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KCk7XHJcblx0XHRtYWluQ29udGFpbmVyLmFkZENsYXNzKFwidGctc2V0dGluZ3MtbWFpbi1jb250YWluZXJcIik7XHJcblxyXG5cdFx0Ly8g5Yib5bu65aS06YOo5qCP77yI5YyF5ZCrd29ya3NwYWNl6YCJ5oup5Zmo5ZKM5pCc57Si5qGG77yJXHJcblx0XHRjb25zdCBoZWFkZXJCYXIgPSBtYWluQ29udGFpbmVyLmNyZWF0ZURpdigpO1xyXG5cdFx0aGVhZGVyQmFyLmFkZENsYXNzKFwidGctc2V0dGluZ3MtaGVhZGVyLWJhclwiKTtcclxuXHJcblx0XHQvLyDliJvlu7p3b3Jrc3BhY2XpgInmi6nlmajlrrnlmahcclxuXHRcdGNvbnN0IHdvcmtzcGFjZVNlbGVjdG9yQ29udGFpbmVyID0gaGVhZGVyQmFyLmNyZWF0ZURpdigpO1xyXG5cdFx0d29ya3NwYWNlU2VsZWN0b3JDb250YWluZXIuYWRkQ2xhc3MoXCJ0Zy13b3Jrc3BhY2Utc2VsZWN0b3ItY29udGFpbmVyXCIpO1xyXG5cclxuXHRcdC8vIOWIneWni+WMlndvcmtzcGFjZemAieaLqeWZqFxyXG5cdFx0aWYgKHRoaXMuc2V0dGluZ1RhYi5wbHVnaW4ud29ya3NwYWNlTWFuYWdlcikge1xyXG5cdFx0XHR0aGlzLndvcmtzcGFjZVNlbGVjdG9yID0gbmV3IFdvcmtzcGFjZVNldHRpbmdzU2VsZWN0b3IoXHJcblx0XHRcdFx0d29ya3NwYWNlU2VsZWN0b3JDb250YWluZXIsXHJcblx0XHRcdFx0dGhpcy5zZXR0aW5nVGFiLnBsdWdpbixcclxuXHRcdFx0XHR0aGlzLnNldHRpbmdUYWJcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyDliJvlu7rmkJzntKLlrrnlmahcclxuXHRcdGNvbnN0IHNlYXJjaENvbnRhaW5lciA9IGhlYWRlckJhci5jcmVhdGVEaXYoKTtcclxuXHRcdHNlYXJjaENvbnRhaW5lci5hZGRDbGFzcyhcInRnLXNldHRpbmdzLXNlYXJjaC1jb250YWluZXJcIik7XHJcblxyXG5cdFx0Ly8g5Yib5bu65pCc57Si6L6T5YWl5qGG5a655ZmoXHJcblx0XHRjb25zdCBzZWFyY2hJbnB1dENvbnRhaW5lciA9IHNlYXJjaENvbnRhaW5lci5jcmVhdGVEaXYoKTtcclxuXHRcdHNlYXJjaElucHV0Q29udGFpbmVyLmFkZENsYXNzKFwidGctc2V0dGluZ3Mtc2VhcmNoLWlucHV0LWNvbnRhaW5lclwiKTtcclxuXHJcblx0XHQvLyDliJvlu7rmkJzntKLlm77moIdcclxuXHRcdGNvbnN0IHNlYXJjaEljb24gPSBzZWFyY2hJbnB1dENvbnRhaW5lci5jcmVhdGVTcGFuKCk7XHJcblx0XHRzZWFyY2hJY29uLmFkZENsYXNzKFwidGctc2V0dGluZ3Mtc2VhcmNoLWljb25cIik7XHJcblx0XHRzZXRJY29uKHNlYXJjaEljb24sIFwic2VhcmNoXCIpO1xyXG5cclxuXHRcdC8vIOWIm+W7uuaQnOe0oui+k+WFpeahhlxyXG5cdFx0dGhpcy5zZWFyY2hJbnB1dEVsID0gc2VhcmNoSW5wdXRDb250YWluZXIuY3JlYXRlRWwoXCJpbnB1dFwiKTtcclxuXHRcdHRoaXMuc2VhcmNoSW5wdXRFbC50eXBlID0gXCJ0ZXh0XCI7XHJcblx0XHR0aGlzLnNlYXJjaElucHV0RWwucGxhY2Vob2xkZXIgPSB0KFwiU2VhcmNoIHNldHRpbmdzLi4uXCIpICsgXCIgKEN0cmwrSylcIjtcclxuXHRcdHRoaXMuc2VhcmNoSW5wdXRFbC5hZGRDbGFzcyhcInRnLXNldHRpbmdzLXNlYXJjaC1pbnB1dFwiKTtcclxuXHRcdHRoaXMuc2VhcmNoSW5wdXRFbC5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIHQoXCJTZWFyY2ggc2V0dGluZ3NcIikpO1xyXG5cdFx0dGhpcy5zZWFyY2hJbnB1dEVsLnNldEF0dHJpYnV0ZShcImF1dG9jb21wbGV0ZVwiLCBcIm9mZlwiKTtcclxuXHRcdHRoaXMuc2VhcmNoSW5wdXRFbC5zZXRBdHRyaWJ1dGUoXCJzcGVsbGNoZWNrXCIsIFwiZmFsc2VcIik7XHJcblxyXG5cdFx0Ly8g5Yib5bu65riF6Zmk5oyJ6ZKuXHJcblx0XHR0aGlzLmNsZWFyQnV0dG9uID0gc2VhcmNoSW5wdXRDb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIik7XHJcblx0XHR0aGlzLmNsZWFyQnV0dG9uLmFkZENsYXNzKFwidGctc2V0dGluZ3Mtc2VhcmNoLWNsZWFyXCIpO1xyXG5cdFx0dGhpcy5jbGVhckJ1dHRvbi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIHQoXCJDbGVhciBzZWFyY2hcIikpO1xyXG5cdFx0c2V0SWNvbih0aGlzLmNsZWFyQnV0dG9uLCBcInhcIik7XHJcblx0XHR0aGlzLmNsZWFyQnV0dG9uLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHJcblx0XHQvLyDliJvlu7rmkJzntKLnu5PmnpzlrrnlmajvvIjlnKhoZWFkZXIgYmFy5aSW6Z2i77yJXHJcblx0XHR0aGlzLnJlc3VsdHNDb250YWluZXJFbCA9IG1haW5Db250YWluZXIuY3JlYXRlRGl2KCk7XHJcblx0XHR0aGlzLnJlc3VsdHNDb250YWluZXJFbC5hZGRDbGFzcyhcInRnLXNldHRpbmdzLXNlYXJjaC1yZXN1bHRzXCIpO1xyXG5cdFx0dGhpcy5yZXN1bHRzQ29udGFpbmVyRWwuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG5cdFx0dGhpcy5yZXN1bHRzQ29udGFpbmVyRWwuc2V0QXR0cmlidXRlKFwicm9sZVwiLCBcImxpc3Rib3hcIik7XHJcblx0XHR0aGlzLnJlc3VsdHNDb250YWluZXJFbC5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIHQoXCJTZWFyY2ggcmVzdWx0c1wiKSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDorr7nva7kuovku7bnm5HlkKzlmahcclxuXHQgKiDkvb/nlKggcmVnaXN0ZXJEb21FdmVudCDov5vooYzoh6rliqjnmoTnlJ/lkb3lkajmnJ/nrqHnkIZcclxuXHQgKi9cclxuXHRwcml2YXRlIHNldHVwRXZlbnRMaXN0ZW5lcnMoKTogdm9pZCB7XHJcblx0XHQvLyDmuIXpmaTmjInpkq7ngrnlh7vkuovku7ZcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh0aGlzLmNsZWFyQnV0dG9uLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy5jbGVhclNlYXJjaCgpO1xyXG5cdFx0XHR0aGlzLnNlYXJjaElucHV0RWwuZm9jdXMoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIOi+k+WFpeS6i+S7tlxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHRoaXMuc2VhcmNoSW5wdXRFbCwgXCJpbnB1dFwiLCAoZTogRXZlbnQpID0+IHtcclxuXHRcdFx0Y29uc3QgcXVlcnkgPSAoZS50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XHJcblx0XHRcdHRoaXMuaGFuZGxlU2VhcmNoSW5wdXQocXVlcnkpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8g6ZSu55uY5LqL5Lu2XHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXHJcblx0XHRcdHRoaXMuc2VhcmNoSW5wdXRFbCxcclxuXHRcdFx0XCJrZXlkb3duXCIsXHJcblx0XHRcdChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XHJcblx0XHRcdFx0dGhpcy5oYW5kbGVLZXlEb3duKGUpO1xyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cdFx0XHJcblx0XHQvLyDlhajlsYAgQ3RybCtLIC8gQ21kK0sg5b+r5o236ZSu55uR5ZCsXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZG9jdW1lbnQsIFwia2V5ZG93blwiLCAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG5cdFx0XHQvLyDmo4Dmn6XmmK/lkKbmmK8gQ3RybCtLIChXaW5kb3dzL0xpbnV4KSDmiJYgQ21kK0sgKG1hY09TKVxyXG5cdFx0XHRjb25zdCBpc01hYyA9IG5hdmlnYXRvci5wbGF0Zm9ybS50b1VwcGVyQ2FzZSgpLmluZGV4T2YoJ01BQycpID49IDA7XHJcblx0XHRcdGNvbnN0IGlzQ3RybE9yQ21kID0gaXNNYWMgPyBlLm1ldGFLZXkgOiBlLmN0cmxLZXk7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoaXNDdHJsT3JDbWQgJiYgZS5rZXkudG9Mb3dlckNhc2UoKSA9PT0gJ2snKSB7XHJcblx0XHRcdFx0Ly8g56Gu5L+d5b2T5YmN5Zyo6K6+572u6aG16Z2i5LitXHJcblx0XHRcdFx0aWYgKHRoaXMuY29udGFpbmVyRWwuaXNDb25uZWN0ZWQgJiYgZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLmNvbnRhaW5lckVsKSkge1xyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0XHRcdHRoaXMuc2VhcmNoSW5wdXRFbC5mb2N1cygpO1xyXG5cdFx0XHRcdFx0Ly8g5aaC5p6c5pyJ5paH5pys77yM5YWo6YCJ5Lul5L6/55So5oi35Y+v5Lul5b+r6YCf5pu/5o2iXHJcblx0XHRcdFx0XHRpZiAodGhpcy5zZWFyY2hJbnB1dEVsLnZhbHVlKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc2VhcmNoSW5wdXRFbC5zZWxlY3QoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIOeEpueCueS6i+S7tlxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHRoaXMuc2VhcmNoSW5wdXRFbCwgXCJmb2N1c1wiLCAoKSA9PiB7XHJcblx0XHRcdGlmICh0aGlzLmN1cnJlbnRSZXN1bHRzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHR0aGlzLnNob3dSZXN1bHRzKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIOWkseWOu+eEpueCueS6i+S7tlxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHRoaXMuc2VhcmNoSW5wdXRFbCwgXCJibHVyXCIsICgpID0+IHtcclxuXHRcdFx0Ly8g5bu26L+f6ZqQ6JeP77yM5YWB6K6454K55Ye75pCc57Si57uT5p6cXHJcblx0XHRcdHRoaXMuYmx1clRpbWVvdXRJZCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRpZiAoIXRoaXMucmVzdWx0c0NvbnRhaW5lckVsLmNvbnRhaW5zKGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpKSB7XHJcblx0XHRcdFx0XHR0aGlzLmhpZGVSZXN1bHRzKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LCAyMDApO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8g54K55Ye75aSW6YOo6ZqQ6JeP57uT5p6cXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZG9jdW1lbnQsIFwiY2xpY2tcIiwgKGU6IE1vdXNlRXZlbnQpID0+IHtcclxuXHRcdFx0aWYgKCF0aGlzLmNvbnRhaW5lckVsLmNvbnRhaW5zKGUudGFyZ2V0IGFzIE5vZGUpKSB7XHJcblx0XHRcdFx0dGhpcy5oaWRlUmVzdWx0cygpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIOWkhOeQhuaQnOe0oui+k+WFpVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaGFuZGxlU2VhcmNoSW5wdXQocXVlcnk6IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0Ly8g5pu05paw5riF6Zmk5oyJ6ZKu5pi+56S654q25oCBXHJcblx0XHR0aGlzLmNsZWFyQnV0dG9uLnN0eWxlLmRpc3BsYXkgPSBxdWVyeS5sZW5ndGggPiAwID8gXCJibG9ja1wiIDogXCJub25lXCI7XHJcblxyXG5cdFx0Ly8g6Ziy5oqW5pCc57SiIC0g5YeP5bCR5bu26L+f5Lul5o+Q5Y2H5ZON5bqU6YCf5bqmXHJcblx0XHR0aGlzLmRlYm91bmNlZFNlYXJjaChxdWVyeSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDmiafooYzmkJzntKJcclxuXHQgKi9cclxuXHRwdWJsaWMgcGVyZm9ybVNlYXJjaChxdWVyeTogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRjb25zb2xlLmxvZyhgW1NldHRpbmdzU2VhcmNoXSBQZXJmb3JtaW5nIHNlYXJjaCBmb3I6IFwiJHtxdWVyeX1cImApO1xyXG5cclxuXHRcdGlmIChxdWVyeS5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0Y29uc29sZS5sb2coYFtTZXR0aW5nc1NlYXJjaF0gRW1wdHkgcXVlcnksIGhpZGluZyByZXN1bHRzYCk7XHJcblx0XHRcdHRoaXMuaGlkZVJlc3VsdHMoKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIOacgOWwkei+k+WFpTHkuKrlrZfnrKblvIDlp4vmkJzntKLvvIzmj5DljYflk43lupTmgKdcclxuXHRcdGlmIChxdWVyeS5sZW5ndGggPCAxKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdGBbU2V0dGluZ3NTZWFyY2hdIFF1ZXJ5IHRvbyBzaG9ydCAoJHtxdWVyeS5sZW5ndGh9IGNoYXJzKSwgc2tpcHBpbmcgc2VhcmNoYFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8g5aKe5Yqg5pCc57Si57uT5p6c5pWw6YeP77yM6K6p55So5oi35pyJ5pu05aSa6YCJ5oupXHJcblx0XHR0aGlzLmN1cnJlbnRSZXN1bHRzID0gdGhpcy5pbmRleGVyLnNlYXJjaChxdWVyeSwgMTIpO1xyXG5cdFx0dGhpcy5zZWxlY3RlZEluZGV4ID0gLTE7XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdGBbU2V0dGluZ3NTZWFyY2hdIEZvdW5kICR7dGhpcy5jdXJyZW50UmVzdWx0cy5sZW5ndGh9IHJlc3VsdHM6YFxyXG5cdFx0KTtcclxuXHRcdHRoaXMuY3VycmVudFJlc3VsdHMuZm9yRWFjaCgocmVzdWx0LCBpbmRleCkgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgICAke2luZGV4ICsgMX0uICR7cmVzdWx0Lml0ZW0ubmFtZX0gKCR7XHJcblx0XHRcdFx0XHRyZXN1bHQubWF0Y2hUeXBlXHJcblx0XHRcdFx0fSwgc2NvcmU6ICR7cmVzdWx0LnNjb3JlfSlgXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpZiAodGhpcy5jdXJyZW50UmVzdWx0cy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdHRoaXMucmVuZGVyUmVzdWx0cygpO1xyXG5cdFx0XHR0aGlzLnNob3dSZXN1bHRzKCk7XHJcblx0XHRcdC8vIOiHquWKqOmAieS4reesrOS4gOS4que7k+aenFxyXG5cdFx0XHRpZiAodGhpcy5zZWxlY3RlZEluZGV4ID09PSAtMSkge1xyXG5cdFx0XHRcdHRoaXMuc2V0U2VsZWN0ZWRJbmRleCgwKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5yZW5kZXJOb1Jlc3VsdHMoKTtcclxuXHRcdFx0dGhpcy5zaG93UmVzdWx0cygpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog5riy5p+T5pCc57Si57uT5p6cXHJcblx0ICovXHJcblx0cHJpdmF0ZSByZW5kZXJSZXN1bHRzKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5yZXN1bHRzQ29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHJcblx0XHR0aGlzLmN1cnJlbnRSZXN1bHRzLmZvckVhY2goKHJlc3VsdCwgaW5kZXgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0RWwgPSB0aGlzLnJlc3VsdHNDb250YWluZXJFbC5jcmVhdGVEaXYoKTtcclxuXHRcdFx0cmVzdWx0RWwuYWRkQ2xhc3MoXCJ0Zy1zZXR0aW5ncy1zZWFyY2gtcmVzdWx0XCIpO1xyXG5cdFx0XHRyZXN1bHRFbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLWluZGV4XCIsIGluZGV4LnRvU3RyaW5nKCkpO1xyXG5cclxuXHRcdFx0Ly8g6K6+572u6aG55ZCN56ewXHJcblx0XHRcdGNvbnN0IG5hbWVFbCA9IHJlc3VsdEVsLmNyZWF0ZURpdigpO1xyXG5cdFx0XHRuYW1lRWwuYWRkQ2xhc3MoXCJ0Zy1zZXR0aW5ncy1zZWFyY2gtcmVzdWx0LW5hbWVcIik7XHJcblx0XHRcdG5hbWVFbC50ZXh0Q29udGVudCA9IHJlc3VsdC5pdGVtLm5hbWU7XHJcblxyXG5cdFx0XHQvLyDmiYDlsZ7liIbnsbvlkozmoIfnrb7pobVcclxuXHRcdFx0Y29uc3QgbWV0YUVsID0gcmVzdWx0RWwuY3JlYXRlRGl2KCk7XHJcblx0XHRcdG1ldGFFbC5hZGRDbGFzcyhcInRnLXNldHRpbmdzLXNlYXJjaC1yZXN1bHQtbWV0YVwiKTtcclxuXHJcblx0XHRcdGNvbnN0IGNhdGVnb3J5RWwgPSBtZXRhRWwuY3JlYXRlU3BhbigpO1xyXG5cdFx0XHRjYXRlZ29yeUVsLmFkZENsYXNzKFwidGctc2V0dGluZ3Mtc2VhcmNoLXJlc3VsdC1jYXRlZ29yeVwiKTtcclxuXHRcdFx0Y2F0ZWdvcnlFbC50ZXh0Q29udGVudCA9IHRoaXMuZ2V0Q2F0ZWdvcnlEaXNwbGF5TmFtZShcclxuXHRcdFx0XHRyZXN1bHQuaXRlbS5jYXRlZ29yeVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8g5o+P6L+w77yI5aaC5p6c5pyJ77yJXHJcblx0XHRcdGlmIChyZXN1bHQuaXRlbS5kZXNjcmlwdGlvbiAmJiByZXN1bHQubWF0Y2hUeXBlID09PSBcImRlc2NyaXB0aW9uXCIpIHtcclxuXHRcdFx0XHRjb25zdCBkZXNjRWwgPSByZXN1bHRFbC5jcmVhdGVEaXYoKTtcclxuXHRcdFx0XHRkZXNjRWwuYWRkQ2xhc3MoXCJ0Zy1zZXR0aW5ncy1zZWFyY2gtcmVzdWx0LWRlc2NcIik7XHJcblx0XHRcdFx0ZGVzY0VsLnRleHRDb250ZW50ID0gdGhpcy50cnVuY2F0ZVRleHQoXHJcblx0XHRcdFx0XHRyZXN1bHQuaXRlbS5kZXNjcmlwdGlvbixcclxuXHRcdFx0XHRcdDgwXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8g5L2/55SoIHJlZ2lzdGVyRG9tRXZlbnQg5rOo5YaM54K55Ye75LqL5Lu2XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChyZXN1bHRFbCwgXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5zZWxlY3RSZXN1bHQocmVzdWx0KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyDkvb/nlKggcmVnaXN0ZXJEb21FdmVudCDms6jlhozpvKDmoIfmgqzlgZzkuovku7ZcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHJlc3VsdEVsLCBcIm1vdXNlZW50ZXJcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuc2V0U2VsZWN0ZWRJbmRleChpbmRleCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDmuLLmn5Pml6Dnu5PmnpznirbmgIFcclxuXHQgKi9cclxuXHRwcml2YXRlIHJlbmRlck5vUmVzdWx0cygpOiB2b2lkIHtcclxuXHRcdHRoaXMucmVzdWx0c0NvbnRhaW5lckVsLmVtcHR5KCk7XHJcblxyXG5cdFx0Y29uc3Qgbm9SZXN1bHRFbCA9IHRoaXMucmVzdWx0c0NvbnRhaW5lckVsLmNyZWF0ZURpdigpO1xyXG5cdFx0bm9SZXN1bHRFbC5hZGRDbGFzcyhcInRnLXNldHRpbmdzLXNlYXJjaC1uby1yZXN1bHRcIik7XHJcblx0XHRub1Jlc3VsdEVsLnRleHRDb250ZW50ID0gdChcIk5vIHNldHRpbmdzIGZvdW5kXCIpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog5aSE55CG6ZSu55uY5LqL5Lu2XHJcblx0ICovXHJcblx0cHJpdmF0ZSBoYW5kbGVLZXlEb3duKGU6IEtleWJvYXJkRXZlbnQpOiB2b2lkIHtcclxuXHRcdGlmICghdGhpcy5pc1Zpc2libGUgfHwgdGhpcy5jdXJyZW50UmVzdWx0cy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0aWYgKGUua2V5ID09PSBcIkVzY2FwZVwiKSB7XHJcblx0XHRcdFx0dGhpcy5jbGVhclNlYXJjaCgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRzd2l0Y2ggKGUua2V5KSB7XHJcblx0XHRcdGNhc2UgXCJBcnJvd0Rvd25cIjpcclxuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0dGhpcy5tb3ZlU2VsZWN0aW9uKDEpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiQXJyb3dVcFwiOlxyXG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHR0aGlzLm1vdmVTZWxlY3Rpb24oLTEpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiRW50ZXJcIjpcclxuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0dGhpcy5zZWxlY3RlZEluZGV4ID49IDAgJiZcclxuXHRcdFx0XHRcdHRoaXMuY3VycmVudFJlc3VsdHNbdGhpcy5zZWxlY3RlZEluZGV4XVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0dGhpcy5zZWxlY3RSZXN1bHQodGhpcy5jdXJyZW50UmVzdWx0c1t0aGlzLnNlbGVjdGVkSW5kZXhdKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJFc2NhcGVcIjpcclxuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0dGhpcy5jbGVhclNlYXJjaCgpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog56e75Yqo6YCJ5oupXHJcblx0ICovXHJcblx0cHJpdmF0ZSBtb3ZlU2VsZWN0aW9uKGRpcmVjdGlvbjogbnVtYmVyKTogdm9pZCB7XHJcblx0XHRjb25zdCBuZXdJbmRleCA9IHRoaXMuc2VsZWN0ZWRJbmRleCArIGRpcmVjdGlvbjtcclxuXHJcblx0XHRpZiAobmV3SW5kZXggPj0gMCAmJiBuZXdJbmRleCA8IHRoaXMuY3VycmVudFJlc3VsdHMubGVuZ3RoKSB7XHJcblx0XHRcdHRoaXMuc2V0U2VsZWN0ZWRJbmRleChuZXdJbmRleCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDorr7nva7pgInkuK3ntKLlvJVcclxuXHQgKi9cclxuXHRwcml2YXRlIHNldFNlbGVjdGVkSW5kZXgoaW5kZXg6IG51bWJlcik6IHZvaWQge1xyXG5cdFx0Ly8g56e76Zmk5LmL5YmN55qE6YCJ5Lit54q25oCBXHJcblx0XHRjb25zdCBwcmV2aW91c1NlbGVjdGVkID0gdGhpcy5yZXN1bHRzQ29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XCIudGctc2V0dGluZ3Mtc2VhcmNoLXJlc3VsdC1zZWxlY3RlZFwiXHJcblx0XHQpO1xyXG5cdFx0aWYgKHByZXZpb3VzU2VsZWN0ZWQpIHtcclxuXHRcdFx0cHJldmlvdXNTZWxlY3RlZC5yZW1vdmVDbGFzcyhcInRnLXNldHRpbmdzLXNlYXJjaC1yZXN1bHQtc2VsZWN0ZWRcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5zZWxlY3RlZEluZGV4ID0gaW5kZXg7XHJcblxyXG5cdFx0Ly8g5re75Yqg5paw55qE6YCJ5Lit54q25oCBXHJcblx0XHRpZiAoaW5kZXggPj0gMCkge1xyXG5cdFx0XHRjb25zdCBzZWxlY3RlZEVsID0gdGhpcy5yZXN1bHRzQ29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XHRgW2RhdGEtaW5kZXg9XCIke2luZGV4fVwiXWBcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKHNlbGVjdGVkRWwpIHtcclxuXHRcdFx0XHRzZWxlY3RlZEVsLmFkZENsYXNzKFwidGctc2V0dGluZ3Mtc2VhcmNoLXJlc3VsdC1zZWxlY3RlZFwiKTtcclxuXHRcdFx0XHRzZWxlY3RlZEVsLnNjcm9sbEludG9WaWV3KHsgYmxvY2s6IFwibmVhcmVzdFwiIH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDpgInmi6nmkJzntKLnu5PmnpxcclxuXHQgKi9cclxuXHRwcml2YXRlIHNlbGVjdFJlc3VsdChyZXN1bHQ6IFNlYXJjaFJlc3VsdCk6IHZvaWQge1xyXG5cdFx0Ly8g6Lez6L2s5Yiw5a+55bqU55qE5qCH562+6aG15ZKM6K6+572u6aG5XHJcblx0XHR0aGlzLm5hdmlnYXRlVG9TZXR0aW5nKHJlc3VsdC5pdGVtLnRhYklkLCByZXN1bHQuaXRlbS5pZCk7XHJcblxyXG5cdFx0Ly8g5riF6Zmk5pCc57SiXHJcblx0XHR0aGlzLmNsZWFyU2VhcmNoKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDlr7zoiKrliLDmjIflrprorr7nva7poblcclxuXHQgKi9cclxuXHRwcml2YXRlIG5hdmlnYXRlVG9TZXR0aW5nKHRhYklkOiBzdHJpbmcsIHNldHRpbmdJZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHQvLyDliIfmjaLliLDlr7nlupTmoIfnrb7pobVcclxuXHRcdHRoaXMuc2V0dGluZ1RhYi5zd2l0Y2hUb1RhYih0YWJJZCk7XHJcblxyXG5cdFx0Ly8g5bu26L+f5rua5Yqo5Yiw6K6+572u6aG577yI562J5b6F5qCH562+6aG15YiH5o2i5a6M5oiQ77yJXHJcblx0XHQvLyDkvb/nlKggcmVnaXN0ZXIg5rOo5YaMIHRpbWVvdXQg5Lul56Gu5L+d5q2j56Gu5riF55CGXHJcblx0XHRjb25zdCB0aW1lb3V0SWQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdHRoaXMuc2Nyb2xsVG9TZXR0aW5nKHNldHRpbmdJZCk7XHJcblx0XHR9LCAxMDApO1xyXG5cdFx0dGhpcy5yZWdpc3RlcigoKSA9PiBjbGVhclRpbWVvdXQodGltZW91dElkKSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDmu5rliqjliLDmjIflrprorr7nva7poblcclxuXHQgKi9cclxuXHRwcml2YXRlIHNjcm9sbFRvU2V0dGluZyhzZXR0aW5nSWQ6IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0Ly8g5p+l5om+5YW35pyJ5a+55bqUSUTnmoTorr7nva7pobnlhYPntKBcclxuXHRcdGNvbnN0IHNldHRpbmdFbGVtZW50ID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRgW2RhdGEtc2V0dGluZy1pZD1cIiR7c2V0dGluZ0lkfVwiXWBcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKHNldHRpbmdFbGVtZW50KSB7XHJcblx0XHRcdC8vIOa7muWKqOWIsOiuvue9rumhuVxyXG5cdFx0XHRzZXR0aW5nRWxlbWVudC5zY3JvbGxJbnRvVmlldyh7XHJcblx0XHRcdFx0YmVoYXZpb3I6IFwic21vb3RoXCIsXHJcblx0XHRcdFx0YmxvY2s6IFwiY2VudGVyXCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8g5re75Yqg5Li05pe26auY5Lqu5pWI5p6cXHJcblx0XHRcdHNldHRpbmdFbGVtZW50LmFkZENsYXNzKFwidGctc2V0dGluZ3Mtc2VhcmNoLWhpZ2hsaWdodFwiKTtcclxuXHRcdFx0Y29uc3QgdGltZW91dElkID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdHNldHRpbmdFbGVtZW50LnJlbW92ZUNsYXNzKFwidGctc2V0dGluZ3Mtc2VhcmNoLWhpZ2hsaWdodFwiKTtcclxuXHRcdFx0fSwgMjAwMCk7XHJcblx0XHRcdHRoaXMucmVnaXN0ZXIoKCkgPT4gY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCkpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog5pi+56S65pCc57Si57uT5p6cXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzaG93UmVzdWx0cygpOiB2b2lkIHtcclxuXHRcdHRoaXMucmVzdWx0c0NvbnRhaW5lckVsLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcblx0XHR0aGlzLmlzVmlzaWJsZSA9IHRydWU7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDpmpDol4/mkJzntKLnu5PmnpxcclxuXHQgKi9cclxuXHRwcml2YXRlIGhpZGVSZXN1bHRzKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5yZXN1bHRzQ29udGFpbmVyRWwuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG5cdFx0dGhpcy5pc1Zpc2libGUgPSBmYWxzZTtcclxuXHRcdHRoaXMuc2VsZWN0ZWRJbmRleCA9IC0xO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog5riF6Zmk5pCc57SiXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjbGVhclNlYXJjaCgpOiB2b2lkIHtcclxuXHRcdHRoaXMuc2VhcmNoSW5wdXRFbC52YWx1ZSA9IFwiXCI7XHJcblx0XHR0aGlzLmN1cnJlbnRSZXN1bHRzID0gW107XHJcblx0XHR0aGlzLmhpZGVSZXN1bHRzKCk7XHJcblxyXG5cdFx0Ly8g6ZqQ6JeP5riF6Zmk5oyJ6ZKuXHJcblx0XHR0aGlzLmNsZWFyQnV0dG9uLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIOiOt+WPluWIhuexu+aYvuekuuWQjeensFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZ2V0Q2F0ZWdvcnlEaXNwbGF5TmFtZShjYXRlZ29yeTogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IGNhdGVnb3J5TmFtZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcblx0XHRcdGNvcmU6IHQoXCJDb3JlIFNldHRpbmdzXCIpLFxyXG5cdFx0XHRkaXNwbGF5OiB0KFwiRGlzcGxheSAmIFByb2dyZXNzXCIpLFxyXG5cdFx0XHRtYW5hZ2VtZW50OiB0KFwiVGFzayBNYW5hZ2VtZW50XCIpLFxyXG5cdFx0XHR3b3JrZmxvdzogdChcIldvcmtmbG93ICYgQXV0b21hdGlvblwiKSxcclxuXHRcdFx0Z2FtaWZpY2F0aW9uOiB0KFwiR2FtaWZpY2F0aW9uXCIpLFxyXG5cdFx0XHRpbnRlZ3JhdGlvbjogdChcIkludGVncmF0aW9uXCIpLFxyXG5cdFx0XHRhZHZhbmNlZDogdChcIkFkdmFuY2VkXCIpLFxyXG5cdFx0XHRpbmZvOiB0KFwiSW5mb3JtYXRpb25cIiksXHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiBjYXRlZ29yeU5hbWVzW2NhdGVnb3J5XSB8fCBjYXRlZ29yeTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIOaIquaWreaWh+acrFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgdHJ1bmNhdGVUZXh0KHRleHQ6IHN0cmluZywgbWF4TGVuZ3RoOiBudW1iZXIpOiBzdHJpbmcge1xyXG5cdFx0aWYgKHRleHQubGVuZ3RoIDw9IG1heExlbmd0aCkge1xyXG5cdFx0XHRyZXR1cm4gdGV4dDtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0ZXh0LnN1YnN0cmluZygwLCBtYXhMZW5ndGggLSAzKSArIFwiLi4uXCI7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDph43lhpkgb251bmxvYWQg5pa55rOV5Lul6L+b6KGM5riF55CGXHJcblx0ICogQ29tcG9uZW50IOS8muiHquWKqOiwg+eUqOatpOaWueazlVxyXG5cdCAqL1xyXG5cdG9udW5sb2FkKCk6IHZvaWQge1xyXG5cdFx0Ly8g5riF55CG5a6a5pe25ZmoXHJcblx0XHRjbGVhclRpbWVvdXQodGhpcy5ibHVyVGltZW91dElkKTtcclxuXHJcblx0XHQvLyDmuIXnqbrlrrnlmahcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHJcblx0XHQvLyBDb21wb25lbnQg5Z+657G75Lya6Ieq5Yqo5riF55CG5omA5pyJ6YCa6L+HIHJlZ2lzdGVyRG9tRXZlbnQg5rOo5YaM55qE5LqL5Lu2XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDplIDmr4Hnu4Tku7bvvIjkuLrkuoblkJHlkI7lhbzlrrnkv53nlZnmraTmlrnms5XvvIlcclxuXHQgKi9cclxuXHRwdWJsaWMgZGVzdHJveSgpOiB2b2lkIHtcclxuXHRcdHRoaXMudW5sb2FkKCk7XHJcblx0fVxyXG59XHJcbiJdfQ==