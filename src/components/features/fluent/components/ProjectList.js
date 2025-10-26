import { __awaiter } from "tslib";
import { Component, Platform, setIcon, Menu, Modal } from "obsidian";
import { ProjectPopover, ProjectModal, EditProjectModal, } from "./ProjectPopover";
import { t } from "@/translations/helper";
export class ProjectList extends Component {
    constructor(containerEl, plugin, onProjectSelect, isTreeView = false) {
        super();
        this.projects = [];
        this.activeProjectId = null;
        this.currentPopover = null;
        this.currentSort = "name-asc";
        this.STORAGE_KEY = "task-genius-project-sort";
        this.EXPANDED_KEY = "task-genius-project-expanded";
        this.isTreeView = false;
        this.expandedNodes = new Set();
        this.treeNodes = [];
        this.containerEl = containerEl;
        this.plugin = plugin;
        this.onProjectSelect = onProjectSelect;
        this.isTreeView = isTreeView;
        // Initialize collator with locale-sensitive sorting
        // Use numeric option to handle numbers naturally (e.g., "Project 2" < "Project 10")
        this.collator = new Intl.Collator(undefined, {
            numeric: true,
            sensitivity: "base", // Case-insensitive comparison
        });
    }
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSortPreference();
            yield this.loadExpandedNodes();
            yield this.loadProjects();
            this.render();
        });
    }
    onunload() {
        // Clean up any open popover
        if (this.currentPopover) {
            this.removeChild(this.currentPopover);
            this.currentPopover = null;
        }
        // Clear container
        this.containerEl.empty();
    }
    loadProjects() {
        return __awaiter(this, void 0, void 0, function* () {
            let tasks = [];
            if (this.plugin.dataflowOrchestrator) {
                const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
                tasks = yield queryAPI.getAllTasks();
            }
            else {
                tasks = this.plugin.preloadedTasks || [];
            }
            const projectMap = new Map();
            tasks.forEach((task) => {
                var _a;
                const projectName = (_a = task.metadata) === null || _a === void 0 ? void 0 : _a.project;
                if (projectName) {
                    if (!projectMap.has(projectName)) {
                        // Convert dashes back to spaces for display
                        const displayName = projectName.replace(/-/g, " ");
                        projectMap.set(projectName, {
                            id: projectName,
                            name: projectName,
                            displayName: displayName,
                            color: this.generateColorForProject(projectName),
                            taskCount: 0,
                        });
                    }
                    const project = projectMap.get(projectName);
                    if (project) {
                        project.taskCount++;
                    }
                }
            });
            this.projects = Array.from(projectMap.values());
            // Load custom projects
            this.loadCustomProjects();
            // Apply sorting
            this.sortProjects();
            // Build tree structure if in tree view
            if (this.isTreeView) {
                this.buildTreeStructure();
            }
            this.render();
        });
    }
    loadSortPreference() {
        return __awaiter(this, void 0, void 0, function* () {
            const saved = yield this.plugin.app.loadLocalStorage(this.STORAGE_KEY);
            if (saved && this.isValidSortOption(saved)) {
                this.currentSort = saved;
            }
        });
    }
    saveSortPreference() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.plugin.app.saveLocalStorage(this.STORAGE_KEY, this.currentSort);
        });
    }
    isValidSortOption(value) {
        return [
            "name-asc",
            "name-desc",
            "tasks-asc",
            "tasks-desc",
            "created-asc",
            "created-desc",
        ].includes(value);
    }
    loadExpandedNodes() {
        return __awaiter(this, void 0, void 0, function* () {
            const saved = yield this.plugin.app.loadLocalStorage(this.EXPANDED_KEY);
            if (saved && Array.isArray(saved)) {
                this.expandedNodes = new Set(saved);
            }
        });
    }
    saveExpandedNodes() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.plugin.app.saveLocalStorage(this.EXPANDED_KEY, Array.from(this.expandedNodes));
        });
    }
    setViewMode(isTreeView) {
        this.isTreeView = isTreeView;
        this.render();
    }
    sortProjects() {
        this.projects.sort((a, b) => {
            switch (this.currentSort) {
                case "name-asc":
                    return this.collator.compare(a.displayName || a.name, b.displayName || b.name);
                case "name-desc":
                    return this.collator.compare(b.displayName || b.name, a.displayName || a.name);
                case "tasks-asc":
                    return a.taskCount - b.taskCount;
                case "tasks-desc":
                    return b.taskCount - a.taskCount;
                case "created-asc":
                    return (a.createdAt || 0) - (b.createdAt || 0);
                case "created-desc":
                    return (b.createdAt || 0) - (a.createdAt || 0);
                default:
                    return 0;
            }
        });
    }
    buildTreeStructure() {
        const nodeMap = new Map();
        const rootNodes = [];
        const separator = this.plugin.settings.projectPathSeparator || "/";
        // Process each project and create intermediate nodes as needed
        this.projects.forEach((project) => {
            const segments = this.parseProjectPath(project.name);
            if (segments.length === 0)
                return;
            let currentPath = "";
            let parentNode;
            // Create or get nodes for each segment in the path
            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                const isLeaf = i === segments.length - 1;
                // Build the full path up to this segment
                currentPath = currentPath
                    ? `${currentPath}${separator}${segment}`
                    : segment;
                // Check if node already exists
                let node = nodeMap.get(currentPath);
                if (!node) {
                    // Create node - use actual project for leaf, virtual for intermediate
                    const nodeProject = isLeaf
                        ? project
                        : {
                            id: currentPath,
                            name: currentPath,
                            displayName: segment,
                            color: this.generateColorForProject(currentPath),
                            taskCount: 0,
                            isVirtual: true,
                        };
                    node = {
                        project: nodeProject,
                        children: [],
                        level: i,
                        expanded: this.expandedNodes.has(currentPath),
                        path: segments.slice(0, i + 1),
                        fullPath: currentPath,
                        parent: parentNode,
                    };
                    nodeMap.set(currentPath, node);
                    // Add to parent's children or root
                    if (parentNode) {
                        parentNode.children.push(node);
                    }
                    else {
                        rootNodes.push(node);
                    }
                }
                else if (isLeaf && node.project.isVirtual) {
                    // Update virtual node with actual project data
                    node.project = project;
                }
                parentNode = node;
            }
        });
        // Sort tree nodes recursively
        this.sortTreeNodes(rootNodes);
        this.treeNodes = rootNodes;
        // Update task counts for parent nodes
        this.updateParentTaskCounts(rootNodes);
    }
    parseProjectPath(projectName) {
        // Parse project path using / as separator
        // For example: "parent/child" becomes ["parent", "child"]
        const separator = this.plugin.settings.projectPathSeparator || "/";
        if (!projectName || !projectName.trim()) {
            return [];
        }
        // Normalize the path by trimming and removing duplicate separators
        const normalized = projectName
            .trim()
            .replace(new RegExp(`${this.escapeRegExp(separator)}+`, "g"), separator)
            .replace(new RegExp(`^${this.escapeRegExp(separator)}|${this.escapeRegExp(separator)}$`, "g"), "");
        if (!normalized) {
            return [];
        }
        return normalized.split(separator);
    }
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    sortTreeNodes(nodes) {
        nodes.forEach((node) => {
            if (node.children.length > 0) {
                this.sortTreeNodes(node.children);
            }
        });
        nodes.sort((a, b) => {
            switch (this.currentSort) {
                case "name-asc":
                    return this.collator.compare(a.project.displayName || a.project.name, b.project.displayName || b.project.name);
                case "name-desc":
                    return this.collator.compare(b.project.displayName || b.project.name, a.project.displayName || a.project.name);
                case "tasks-asc":
                    return a.project.taskCount - b.project.taskCount;
                case "tasks-desc":
                    return b.project.taskCount - a.project.taskCount;
                case "created-asc":
                    return ((a.project.createdAt || 0) - (b.project.createdAt || 0));
                case "created-desc":
                    return ((b.project.createdAt || 0) - (a.project.createdAt || 0));
                default:
                    return 0;
            }
        });
    }
    updateParentTaskCounts(nodes) {
        nodes.forEach((node) => {
            if (node.children.length > 0) {
                this.updateParentTaskCounts(node.children);
                // Sum up child task counts
                const childTotal = node.children.reduce((sum, child) => sum + child.project.taskCount, 0);
                // For virtual nodes, set count to child total
                // For real nodes, add child total to existing count
                if (node.project.isVirtual) {
                    node.project.taskCount = childTotal;
                }
                else {
                    node.project.taskCount =
                        node.project.taskCount + childTotal;
                }
            }
        });
    }
    toggleNodeExpanded(nodePath) {
        if (this.expandedNodes.has(nodePath)) {
            this.expandedNodes.delete(nodePath);
        }
        else {
            this.expandedNodes.add(nodePath);
        }
        this.saveExpandedNodes();
        this.render();
    }
    generateColorForProject(projectName) {
        const colors = [
            "#e74c3c",
            "#3498db",
            "#2ecc71",
            "#f39c12",
            "#9b59b6",
            "#1abc9c",
            "#34495e",
            "#e67e22",
        ];
        let hash = 0;
        for (let i = 0; i < projectName.length; i++) {
            hash = projectName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }
    render() {
        this.containerEl.empty();
        this.containerEl.addClass("fluent-project-list");
        if (this.isTreeView) {
            this.containerEl.addClass("is-tree-view");
        }
        else {
            this.containerEl.removeClass("is-tree-view");
        }
        const scrollArea = this.containerEl.createDiv({
            cls: "fluent-project-scroll",
        });
        if (this.isTreeView) {
            // Build tree structure first
            this.buildTreeStructure();
            // Render tree view
            this.renderTreeNodes(scrollArea, this.treeNodes, 0);
        }
        else {
            // Render flat list view
            this.projects.forEach((project) => {
                this.renderProjectItem(scrollArea, project, 0, false);
            });
        }
        // Add new project button
        const addProjectBtn = scrollArea.createDiv({
            cls: "fluent-project-item fluent-add-project",
        });
        const addIcon = addProjectBtn.createDiv({
            cls: "fluent-project-add-icon",
        });
        addIcon.createDiv({ cls: "fluent-project-color-dashed" });
        addProjectBtn.createSpan({
            cls: "fluent-project-name",
            text: t("Add Project"),
        });
        this.registerDomEvent(addProjectBtn, "click", () => {
            this.handleAddProject(addProjectBtn);
        });
    }
    renderTreeNodes(container, nodes, level) {
        nodes.forEach((node) => {
            const hasChildren = node.children.length > 0;
            this.renderProjectItem(container, node.project, level, hasChildren, node);
            if (hasChildren && node.expanded) {
                this.renderTreeNodes(container, node.children, level + 1);
            }
        });
    }
    renderProjectItem(container, project, level, hasChildren, treeNode) {
        const projectItem = container.createDiv({
            cls: "fluent-project-item",
            attr: {
                "data-project-id": project.id,
                "data-level": String(level),
            },
        });
        // Add virtual class for styling
        if (project.isVirtual) {
            projectItem.addClass("is-virtual");
        }
        if (this.activeProjectId === project.id) {
            projectItem.addClass("is-active");
        }
        if (this.isTreeView && level > 0) {
            projectItem.style.paddingLeft = `${level * 20 + 8}px`;
        }
        // Expand/collapse chevron for tree view
        if (this.isTreeView && hasChildren) {
            const chevron = projectItem.createDiv({
                cls: "fluent-project-chevron",
            });
            const isExpanded = (treeNode === null || treeNode === void 0 ? void 0 : treeNode.expanded) || false;
            setIcon(chevron, isExpanded ? "chevron-down" : "chevron-right");
            this.registerDomEvent(chevron, "click", (e) => {
                e.stopPropagation();
                // Use fullPath for virtual nodes
                const nodeId = (treeNode === null || treeNode === void 0 ? void 0 : treeNode.fullPath) || project.id;
                this.toggleNodeExpanded(nodeId);
            });
        }
        else if (this.isTreeView) {
            // Add spacer for items without children to align them
            projectItem.createDiv({ cls: "fluent-project-chevron-spacer" });
        }
        const projectColor = projectItem.createDiv({
            cls: "fluent-project-color",
        });
        projectColor.style.backgroundColor = project.color;
        // In tree view, show only the last segment of the path
        // In list view, show the full name
        let displayText;
        if (this.isTreeView) {
            if (project.isVirtual) {
                // Virtual nodes already have displayName as the segment
                displayText = project.displayName || project.name;
            }
            else {
                // For real projects, extract the last segment
                const separator = this.plugin.settings.projectPathSeparator || "/";
                const nameToSplit = project.name;
                const segments = nameToSplit.split(separator);
                const lastSegment = segments[segments.length - 1] || project.name;
                // If project has a custom displayName, try to preserve it
                // but still show only the relevant part for the tree level
                if (project.displayName &&
                    project.displayName !== project.name) {
                    const displaySegments = project.displayName.split(separator);
                    displayText =
                        displaySegments[displaySegments.length - 1] ||
                            lastSegment;
                }
                else {
                    displayText = lastSegment;
                }
            }
        }
        else {
            // In list view, show full name or custom displayName
            displayText = project.displayName || project.name;
        }
        const projectName = projectItem.createSpan({
            cls: "fluent-project-name",
            text: displayText,
        });
        const projectCount = projectItem.createSpan({
            cls: "fluent-project-count",
            text: String(project.taskCount),
        });
        this.registerDomEvent(projectItem, "click", (e) => {
            // Don't trigger if clicking on chevron
            if (!e.target.closest(".fluent-project-chevron")) {
                // Virtual nodes select all their children
                if (project.isVirtual && treeNode) {
                    this.selectVirtualNode(treeNode);
                }
                else {
                    this.setActiveProject(project.id);
                    this.onProjectSelect(project.id);
                }
            }
        });
        // Add context menu handler (only for non-virtual projects)
        if (!project.isVirtual) {
            this.registerDomEvent(projectItem, "contextmenu", (e) => {
                e.preventDefault();
                this.showProjectContextMenu(e, project);
            });
        }
    }
    selectVirtualNode(node) {
        // Collect all non-virtual descendant project IDs
        const projectIds = [];
        const collectProjects = (n) => {
            if (!n.project.isVirtual) {
                projectIds.push(n.project.id);
            }
            n.children.forEach((child) => collectProjects(child));
        };
        collectProjects(node);
        // Select the first real project if any
        if (projectIds.length > 0) {
            this.setActiveProject(projectIds[0]);
            this.onProjectSelect(projectIds[0]);
        }
    }
    setActiveProject(projectId) {
        this.activeProjectId = projectId;
        this.containerEl
            .querySelectorAll(".fluent-project-item")
            .forEach((el) => {
            el.removeClass("is-active");
        });
        if (projectId) {
            const activeEl = this.containerEl.querySelector(`[data-project-id="${projectId}"]`);
            if (activeEl) {
                activeEl.addClass("is-active");
            }
        }
    }
    getProjects() {
        return this.projects;
    }
    refresh() {
        this.loadProjects();
    }
    handleAddProject(buttonEl) {
        // Clean up any existing popover
        if (this.currentPopover) {
            this.removeChild(this.currentPopover);
            this.currentPopover = null;
        }
        if (Platform.isPhone) {
            // Mobile: Use Obsidian Modal
            const modal = new ProjectModal(this.plugin.app, this.plugin, (project) => __awaiter(this, void 0, void 0, function* () {
                yield this.saveProject(project);
            }));
            modal.open();
        }
        else {
            // Desktop: Use popover
            this.currentPopover = new ProjectPopover(this.plugin, buttonEl, (project) => __awaiter(this, void 0, void 0, function* () {
                yield this.saveProject(project);
                if (this.currentPopover) {
                    this.removeChild(this.currentPopover);
                    this.currentPopover = null;
                }
            }), () => {
                if (this.currentPopover) {
                    this.removeChild(this.currentPopover);
                    this.currentPopover = null;
                }
            });
            this.addChild(this.currentPopover);
        }
    }
    saveProject(project) {
        return __awaiter(this, void 0, void 0, function* () {
            // Initialize customProjects if it doesn't exist
            if (!this.plugin.settings.projectConfig) {
                this.plugin.settings.projectConfig = {
                    enableEnhancedProject: false,
                    pathMappings: [],
                    metadataConfig: {
                        metadataKey: "project",
                        enabled: false,
                    },
                    configFile: {
                        fileName: "project.md",
                        searchRecursively: true,
                        enabled: false,
                    },
                    metadataMappings: [],
                    defaultProjectNaming: {
                        strategy: "filename",
                        stripExtension: true,
                        enabled: false,
                    },
                    customProjects: [],
                };
            }
            if (!this.plugin.settings.projectConfig.customProjects) {
                this.plugin.settings.projectConfig.customProjects = [];
            }
            // Add the new project
            this.plugin.settings.projectConfig.customProjects.push(project);
            // Save settings
            yield this.plugin.saveSettings();
            // Refresh the project list
            this.loadProjects();
        });
    }
    loadCustomProjects() {
        var _a;
        const customProjects = ((_a = this.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.customProjects) || [];
        // Merge custom projects into the projects array
        customProjects.forEach((customProject) => {
            // Check if project already exists by name
            const existingIndex = this.projects.findIndex((p) => p.name === customProject.name);
            if (existingIndex === -1) {
                // Add new custom project
                this.projects.push({
                    id: customProject.id,
                    name: customProject.name,
                    displayName: customProject.displayName || customProject.name,
                    color: customProject.color,
                    taskCount: 0,
                    createdAt: customProject.createdAt,
                    updatedAt: customProject.updatedAt,
                });
            }
            else {
                // Update existing project with custom color
                this.projects[existingIndex].id = customProject.id;
                this.projects[existingIndex].color = customProject.color;
                this.projects[existingIndex].displayName =
                    customProject.displayName || customProject.name;
                this.projects[existingIndex].createdAt =
                    customProject.createdAt;
                this.projects[existingIndex].updatedAt =
                    customProject.updatedAt;
            }
        });
    }
    showSortMenu(buttonEl) {
        const menu = new Menu();
        const sortOptions = [
            { label: t("Name (A-Z)"), value: "name-asc", icon: "arrow-up-a-z" },
            {
                label: t("Name (Z-A)"),
                value: "name-desc",
                icon: "arrow-down-a-z",
            },
            {
                label: t("Tasks (Low to High)"),
                value: "tasks-asc",
                icon: "arrow-up-1-0",
            },
            {
                label: t("Tasks (High to Low)"),
                value: "tasks-desc",
                icon: "arrow-down-1-0",
            },
            {
                label: t("Created (Oldest First)"),
                value: "created-asc",
                icon: "clock",
            },
            {
                label: t("Created (Newest First)"),
                value: "created-desc",
                icon: "history",
            },
        ];
        sortOptions.forEach((option) => {
            menu.addItem((item) => {
                item.setTitle(option.label)
                    .setIcon(option.icon)
                    .onClick(() => __awaiter(this, void 0, void 0, function* () {
                    this.currentSort = option.value;
                    yield this.saveSortPreference();
                    this.sortProjects();
                    this.render();
                }));
                if (this.currentSort === option.value) {
                    item.setChecked(true);
                }
            });
        });
        menu.showAtMouseEvent(new MouseEvent("click", {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: buttonEl.getBoundingClientRect().left,
            clientY: buttonEl.getBoundingClientRect().bottom,
        }));
    }
    showProjectContextMenu(event, project) {
        var _a, _b;
        const menu = new Menu();
        // Check if this is a custom project
        const isCustomProject = (_b = (_a = this.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.customProjects) === null || _b === void 0 ? void 0 : _b.some((cp) => cp.id === project.id || cp.name === project.name);
        // Edit Project option
        menu.addItem((item) => {
            item.setTitle(t("Edit Project")).setIcon("edit");
            if (isCustomProject) {
                item.onClick(() => {
                    this.editProject(project);
                });
            }
            else {
                item.setDisabled(true);
            }
        });
        // Delete Project option
        menu.addItem((item) => {
            item.setTitle(t("Delete Project")).setIcon("trash");
            if (isCustomProject) {
                item.onClick(() => {
                    this.deleteProject(project);
                });
            }
            else {
                item.setDisabled(true);
            }
        });
        menu.showAtMouseEvent(event);
    }
    editProject(project) {
        var _a, _b;
        // Find the custom project data
        let customProject = (_b = (_a = this.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.customProjects) === null || _b === void 0 ? void 0 : _b.find((cp) => cp.id === project.id || cp.name === project.name);
        if (!customProject) {
            // Create a new custom project entry if it doesn't exist
            customProject = {
                id: project.id,
                name: project.name,
                displayName: project.displayName || project.name,
                color: project.color,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
        }
        // Open edit modal
        const modal = new EditProjectModal(this.plugin.app, this.plugin, customProject, (updatedProject) => __awaiter(this, void 0, void 0, function* () {
            yield this.updateProject(updatedProject);
        }));
        modal.open();
    }
    updateProject(updatedProject) {
        return __awaiter(this, void 0, void 0, function* () {
            // Initialize if needed
            if (!this.plugin.settings.projectConfig) {
                this.plugin.settings.projectConfig = {
                    enableEnhancedProject: false,
                    pathMappings: [],
                    metadataConfig: {
                        metadataKey: "project",
                        enabled: false,
                    },
                    configFile: {
                        fileName: "project.md",
                        searchRecursively: true,
                        enabled: false,
                    },
                    metadataMappings: [],
                    defaultProjectNaming: {
                        strategy: "filename",
                        stripExtension: true,
                        enabled: false,
                    },
                    customProjects: [],
                };
            }
            if (!this.plugin.settings.projectConfig.customProjects) {
                this.plugin.settings.projectConfig.customProjects = [];
            }
            // Find and update the project
            const index = this.plugin.settings.projectConfig.customProjects.findIndex((cp) => cp.id === updatedProject.id);
            if (index !== -1) {
                this.plugin.settings.projectConfig.customProjects[index] =
                    updatedProject;
            }
            else {
                this.plugin.settings.projectConfig.customProjects.push(updatedProject);
            }
            // Save settings
            yield this.plugin.saveSettings();
            // Refresh the project list
            this.loadProjects();
        });
    }
    deleteProject(project) {
        // Confirm deletion
        const modal = new (class extends Modal {
            constructor(app, onConfirm) {
                super(app);
                this.onConfirm = onConfirm;
            }
            onOpen() {
                const { contentEl } = this;
                contentEl.createEl("h2", { text: t("Delete Project") });
                contentEl.createEl("p", {
                    text: t(`Are you sure you want to delete "${project.displayName || project.name}"?`),
                });
                contentEl.createEl("p", {
                    cls: "mod-warning",
                    text: t("This action cannot be undone."),
                });
                const buttonContainer = contentEl.createDiv({
                    cls: "modal-button-container",
                });
                const cancelBtn = buttonContainer.createEl("button", {
                    text: t("Cancel"),
                });
                cancelBtn.addEventListener("click", () => this.close());
                const confirmBtn = buttonContainer.createEl("button", {
                    text: t("Delete"),
                    cls: "mod-warning",
                });
                confirmBtn.addEventListener("click", () => {
                    this.onConfirm();
                    this.close();
                });
            }
            onClose() {
                const { contentEl } = this;
                contentEl.empty();
            }
        })(this.plugin.app, () => __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Remove from custom projects
            if ((_a = this.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.customProjects) {
                const index = this.plugin.settings.projectConfig.customProjects.findIndex((cp) => cp.id === project.id || cp.name === project.name);
                if (index !== -1) {
                    this.plugin.settings.projectConfig.customProjects.splice(index, 1);
                    yield this.plugin.saveSettings();
                    // If this was the active project, clear selection
                    if (this.activeProjectId === project.id) {
                        this.setActiveProject(null);
                        this.onProjectSelect("");
                    }
                    // Refresh the project list
                    this.loadProjects();
                }
            }
        }));
        modal.open();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvamVjdExpc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJQcm9qZWN0TGlzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQU8sTUFBTSxVQUFVLENBQUM7QUFHMUUsT0FBTyxFQUNOLGNBQWMsRUFDZCxZQUFZLEVBQ1osZ0JBQWdCLEdBQ2hCLE1BQU0sa0JBQWtCLENBQUM7QUFFMUIsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBK0IxQyxNQUFNLE9BQU8sV0FBWSxTQUFRLFNBQVM7SUFlekMsWUFDQyxXQUF3QixFQUN4QixNQUE2QixFQUM3QixlQUE0QyxFQUM1QyxVQUFVLEdBQUcsS0FBSztRQUVsQixLQUFLLEVBQUUsQ0FBQztRQWxCRCxhQUFRLEdBQWMsRUFBRSxDQUFDO1FBQ3pCLG9CQUFlLEdBQWtCLElBQUksQ0FBQztRQUV0QyxtQkFBYyxHQUEwQixJQUFJLENBQUM7UUFDN0MsZ0JBQVcsR0FBZSxVQUFVLENBQUM7UUFDNUIsZ0JBQVcsR0FBRywwQkFBMEIsQ0FBQztRQUN6QyxpQkFBWSxHQUFHLDhCQUE4QixDQUFDO1FBRXZELGVBQVUsR0FBRyxLQUFLLENBQUM7UUFDbkIsa0JBQWEsR0FBZ0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN2QyxjQUFTLEdBQXNCLEVBQUUsQ0FBQztRQVN6QyxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUMvQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztRQUN2QyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUU3QixvREFBb0Q7UUFDcEQsb0ZBQW9GO1FBQ3BGLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRTtZ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LEVBQUUsQ0FBQztZQUNuQixDQUFDO1NBQ0QsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQVMsRUFBRTs7WUFDOUIsOEJBQThCO1lBQzlCLElBQUksTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLDBDQUFFLGNBQWMsRUFBRTtnQkFDdkQsTUFBTSxLQUFLLEdBQ1YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQzFELENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsSUFBSSxDQUN4RCxDQUFDO2dCQUVILElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFO29CQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FDdkQsS0FBSyxFQUNMLENBQUMsQ0FDRCxDQUFDO29CQUNGLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFFakMsa0RBQWtEO29CQUNsRCxJQUFJLElBQUksQ0FBQyxlQUFlLEtBQUssT0FBTyxDQUFDLEVBQUUsRUFBRTt3QkFDeEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUM1QixJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3FCQUN6QjtvQkFFRCwyQkFBMkI7b0JBQzNCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztpQkFDcEI7YUFDRDtRQUNGLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFFSCxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDZCxDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIFBsYXRmb3JtLCBzZXRJY29uLCBNZW51LCBNb2RhbCwgQXBwIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCJAL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHtcclxuXHRQcm9qZWN0UG9wb3ZlcixcclxuXHRQcm9qZWN0TW9kYWwsXHJcblx0RWRpdFByb2plY3RNb2RhbCxcclxufSBmcm9tIFwiLi9Qcm9qZWN0UG9wb3ZlclwiO1xyXG5pbXBvcnQgdHlwZSB7IEN1c3RvbVByb2plY3QgfSBmcm9tIFwiQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcblxyXG5pbnRlcmZhY2UgUHJvamVjdCB7XHJcblx0aWQ6IHN0cmluZztcclxuXHRuYW1lOiBzdHJpbmc7XHJcblx0ZGlzcGxheU5hbWU/OiBzdHJpbmc7XHJcblx0Y29sb3I6IHN0cmluZztcclxuXHR0YXNrQ291bnQ6IG51bWJlcjtcclxuXHRjcmVhdGVkQXQ/OiBudW1iZXI7XHJcblx0dXBkYXRlZEF0PzogbnVtYmVyO1xyXG5cdGlzVmlydHVhbD86IGJvb2xlYW47IC8vIEZsYWcgZm9yIGludGVybWVkaWF0ZSBub2Rlc1xyXG59XHJcblxyXG5pbnRlcmZhY2UgUHJvamVjdFRyZWVOb2RlIHtcclxuXHRwcm9qZWN0OiBQcm9qZWN0O1xyXG5cdGNoaWxkcmVuOiBQcm9qZWN0VHJlZU5vZGVbXTtcclxuXHRsZXZlbDogbnVtYmVyO1xyXG5cdHBhcmVudD86IFByb2plY3RUcmVlTm9kZTtcclxuXHRleHBhbmRlZDogYm9vbGVhbjtcclxuXHRwYXRoOiBzdHJpbmdbXTtcclxuXHRmdWxsUGF0aDogc3RyaW5nO1xyXG59XHJcblxyXG50eXBlIFNvcnRPcHRpb24gPVxyXG5cdHwgXCJuYW1lLWFzY1wiXHJcblx0fCBcIm5hbWUtZGVzY1wiXHJcblx0fCBcInRhc2tzLWFzY1wiXHJcblx0fCBcInRhc2tzLWRlc2NcIlxyXG5cdHwgXCJjcmVhdGVkLWFzY1wiXHJcblx0fCBcImNyZWF0ZWQtZGVzY1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFByb2plY3RMaXN0IGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRwcml2YXRlIGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdHByaXZhdGUgcHJvamVjdHM6IFByb2plY3RbXSA9IFtdO1xyXG5cdHByaXZhdGUgYWN0aXZlUHJvamVjdElkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIG9uUHJvamVjdFNlbGVjdDogKHByb2plY3RJZDogc3RyaW5nKSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgY3VycmVudFBvcG92ZXI6IFByb2plY3RQb3BvdmVyIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBjdXJyZW50U29ydDogU29ydE9wdGlvbiA9IFwibmFtZS1hc2NcIjtcclxuXHRwcml2YXRlIHJlYWRvbmx5IFNUT1JBR0VfS0VZID0gXCJ0YXNrLWdlbml1cy1wcm9qZWN0LXNvcnRcIjtcclxuXHRwcml2YXRlIHJlYWRvbmx5IEVYUEFOREVEX0tFWSA9IFwidGFzay1nZW5pdXMtcHJvamVjdC1leHBhbmRlZFwiO1xyXG5cdHByaXZhdGUgY29sbGF0b3I6IEludGwuQ29sbGF0b3I7XHJcblx0cHJpdmF0ZSBpc1RyZWVWaWV3ID0gZmFsc2U7XHJcblx0cHJpdmF0ZSBleHBhbmRlZE5vZGVzOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKTtcclxuXHRwcml2YXRlIHRyZWVOb2RlczogUHJvamVjdFRyZWVOb2RlW10gPSBbXTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdG9uUHJvamVjdFNlbGVjdDogKHByb2plY3RJZDogc3RyaW5nKSA9PiB2b2lkLFxyXG5cdFx0aXNUcmVlVmlldyA9IGZhbHNlXHJcblx0KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5jb250YWluZXJFbCA9IGNvbnRhaW5lckVsO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLm9uUHJvamVjdFNlbGVjdCA9IG9uUHJvamVjdFNlbGVjdDtcclxuXHRcdHRoaXMuaXNUcmVlVmlldyA9IGlzVHJlZVZpZXc7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBjb2xsYXRvciB3aXRoIGxvY2FsZS1zZW5zaXRpdmUgc29ydGluZ1xyXG5cdFx0Ly8gVXNlIG51bWVyaWMgb3B0aW9uIHRvIGhhbmRsZSBudW1iZXJzIG5hdHVyYWxseSAoZS5nLiwgXCJQcm9qZWN0IDJcIiA8IFwiUHJvamVjdCAxMFwiKVxyXG5cdFx0dGhpcy5jb2xsYXRvciA9IG5ldyBJbnRsLkNvbGxhdG9yKHVuZGVmaW5lZCwge1xyXG5cdFx0XHRudW1lcmljOiB0cnVlLFxyXG5cdFx0XHRzZW5zaXRpdml0eTogXCJiYXNlXCIsIC8vIENhc2UtaW5zZW5zaXRpdmUgY29tcGFyaXNvblxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRhc3luYyBvbmxvYWQoKSB7XHJcblx0XHRhd2FpdCB0aGlzLmxvYWRTb3J0UHJlZmVyZW5jZSgpO1xyXG5cdFx0YXdhaXQgdGhpcy5sb2FkRXhwYW5kZWROb2RlcygpO1xyXG5cdFx0YXdhaXQgdGhpcy5sb2FkUHJvamVjdHMoKTtcclxuXHRcdHRoaXMucmVuZGVyKCk7XHJcblx0fVxyXG5cclxuXHRvbnVubG9hZCgpIHtcclxuXHRcdC8vIENsZWFuIHVwIGFueSBvcGVuIHBvcG92ZXJcclxuXHRcdGlmICh0aGlzLmN1cnJlbnRQb3BvdmVyKSB7XHJcblx0XHRcdHRoaXMucmVtb3ZlQ2hpbGQodGhpcy5jdXJyZW50UG9wb3Zlcik7XHJcblx0XHRcdHRoaXMuY3VycmVudFBvcG92ZXIgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsZWFyIGNvbnRhaW5lclxyXG5cdFx0dGhpcy5jb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBsb2FkUHJvamVjdHMoKSB7XHJcblx0XHRsZXQgdGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cdFx0aWYgKHRoaXMucGx1Z2luLmRhdGFmbG93T3JjaGVzdHJhdG9yKSB7XHJcblx0XHRcdGNvbnN0IHF1ZXJ5QVBJID0gdGhpcy5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3IuZ2V0UXVlcnlBUEkoKTtcclxuXHRcdFx0dGFza3MgPSBhd2FpdCBxdWVyeUFQSS5nZXRBbGxUYXNrcygpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGFza3MgPSB0aGlzLnBsdWdpbi5wcmVsb2FkZWRUYXNrcyB8fCBbXTtcclxuXHRcdH1cclxuXHRcdGNvbnN0IHByb2plY3RNYXAgPSBuZXcgTWFwPHN0cmluZywgUHJvamVjdD4oKTtcclxuXHJcblx0XHR0YXNrcy5mb3JFYWNoKCh0YXNrOiBUYXNrKSA9PiB7XHJcblx0XHRcdGNvbnN0IHByb2plY3ROYW1lID0gdGFzay5tZXRhZGF0YT8ucHJvamVjdDtcclxuXHRcdFx0aWYgKHByb2plY3ROYW1lKSB7XHJcblx0XHRcdFx0aWYgKCFwcm9qZWN0TWFwLmhhcyhwcm9qZWN0TmFtZSkpIHtcclxuXHRcdFx0XHRcdC8vIENvbnZlcnQgZGFzaGVzIGJhY2sgdG8gc3BhY2VzIGZvciBkaXNwbGF5XHJcblx0XHRcdFx0XHRjb25zdCBkaXNwbGF5TmFtZSA9IHByb2plY3ROYW1lLnJlcGxhY2UoLy0vZywgXCIgXCIpO1xyXG5cdFx0XHRcdFx0cHJvamVjdE1hcC5zZXQocHJvamVjdE5hbWUsIHtcclxuXHRcdFx0XHRcdFx0aWQ6IHByb2plY3ROYW1lLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBwcm9qZWN0TmFtZSxcclxuXHRcdFx0XHRcdFx0ZGlzcGxheU5hbWU6IGRpc3BsYXlOYW1lLFxyXG5cdFx0XHRcdFx0XHRjb2xvcjogdGhpcy5nZW5lcmF0ZUNvbG9yRm9yUHJvamVjdChwcm9qZWN0TmFtZSksXHJcblx0XHRcdFx0XHRcdHRhc2tDb3VudDogMCxcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRjb25zdCBwcm9qZWN0ID0gcHJvamVjdE1hcC5nZXQocHJvamVjdE5hbWUpO1xyXG5cdFx0XHRcdGlmIChwcm9qZWN0KSB7XHJcblx0XHRcdFx0XHRwcm9qZWN0LnRhc2tDb3VudCsrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5wcm9qZWN0cyA9IEFycmF5LmZyb20ocHJvamVjdE1hcC52YWx1ZXMoKSk7XHJcblxyXG5cdFx0Ly8gTG9hZCBjdXN0b20gcHJvamVjdHNcclxuXHRcdHRoaXMubG9hZEN1c3RvbVByb2plY3RzKCk7XHJcblxyXG5cdFx0Ly8gQXBwbHkgc29ydGluZ1xyXG5cdFx0dGhpcy5zb3J0UHJvamVjdHMoKTtcclxuXHJcblx0XHQvLyBCdWlsZCB0cmVlIHN0cnVjdHVyZSBpZiBpbiB0cmVlIHZpZXdcclxuXHRcdGlmICh0aGlzLmlzVHJlZVZpZXcpIHtcclxuXHRcdFx0dGhpcy5idWlsZFRyZWVTdHJ1Y3R1cmUoKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBsb2FkU29ydFByZWZlcmVuY2UoKSB7XHJcblx0XHRjb25zdCBzYXZlZCA9IGF3YWl0IHRoaXMucGx1Z2luLmFwcC5sb2FkTG9jYWxTdG9yYWdlKHRoaXMuU1RPUkFHRV9LRVkpO1xyXG5cdFx0aWYgKHNhdmVkICYmIHRoaXMuaXNWYWxpZFNvcnRPcHRpb24oc2F2ZWQpKSB7XHJcblx0XHRcdHRoaXMuY3VycmVudFNvcnQgPSBzYXZlZCBhcyBTb3J0T3B0aW9uO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBzYXZlU29ydFByZWZlcmVuY2UoKSB7XHJcblx0XHRhd2FpdCB0aGlzLnBsdWdpbi5hcHAuc2F2ZUxvY2FsU3RvcmFnZShcclxuXHRcdFx0dGhpcy5TVE9SQUdFX0tFWSxcclxuXHRcdFx0dGhpcy5jdXJyZW50U29ydFxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaXNWYWxpZFNvcnRPcHRpb24odmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIFtcclxuXHRcdFx0XCJuYW1lLWFzY1wiLFxyXG5cdFx0XHRcIm5hbWUtZGVzY1wiLFxyXG5cdFx0XHRcInRhc2tzLWFzY1wiLFxyXG5cdFx0XHRcInRhc2tzLWRlc2NcIixcclxuXHRcdFx0XCJjcmVhdGVkLWFzY1wiLFxyXG5cdFx0XHRcImNyZWF0ZWQtZGVzY1wiLFxyXG5cdFx0XS5pbmNsdWRlcyh2YWx1ZSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGxvYWRFeHBhbmRlZE5vZGVzKCkge1xyXG5cdFx0Y29uc3Qgc2F2ZWQgPSBhd2FpdCB0aGlzLnBsdWdpbi5hcHAubG9hZExvY2FsU3RvcmFnZSh0aGlzLkVYUEFOREVEX0tFWSk7XHJcblx0XHRpZiAoc2F2ZWQgJiYgQXJyYXkuaXNBcnJheShzYXZlZCkpIHtcclxuXHRcdFx0dGhpcy5leHBhbmRlZE5vZGVzID0gbmV3IFNldChzYXZlZCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIHNhdmVFeHBhbmRlZE5vZGVzKCkge1xyXG5cdFx0YXdhaXQgdGhpcy5wbHVnaW4uYXBwLnNhdmVMb2NhbFN0b3JhZ2UoXHJcblx0XHRcdHRoaXMuRVhQQU5ERURfS0VZLFxyXG5cdFx0XHRBcnJheS5mcm9tKHRoaXMuZXhwYW5kZWROb2RlcylcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc2V0Vmlld01vZGUoaXNUcmVlVmlldzogYm9vbGVhbikge1xyXG5cdFx0dGhpcy5pc1RyZWVWaWV3ID0gaXNUcmVlVmlldztcclxuXHRcdHRoaXMucmVuZGVyKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNvcnRQcm9qZWN0cygpIHtcclxuXHRcdHRoaXMucHJvamVjdHMuc29ydCgoYSwgYikgPT4ge1xyXG5cdFx0XHRzd2l0Y2ggKHRoaXMuY3VycmVudFNvcnQpIHtcclxuXHRcdFx0XHRjYXNlIFwibmFtZS1hc2NcIjpcclxuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNvbGxhdG9yLmNvbXBhcmUoXHJcblx0XHRcdFx0XHRcdGEuZGlzcGxheU5hbWUgfHwgYS5uYW1lLFxyXG5cdFx0XHRcdFx0XHRiLmRpc3BsYXlOYW1lIHx8IGIubmFtZVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRjYXNlIFwibmFtZS1kZXNjXCI6XHJcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jb2xsYXRvci5jb21wYXJlKFxyXG5cdFx0XHRcdFx0XHRiLmRpc3BsYXlOYW1lIHx8IGIubmFtZSxcclxuXHRcdFx0XHRcdFx0YS5kaXNwbGF5TmFtZSB8fCBhLm5hbWVcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0Y2FzZSBcInRhc2tzLWFzY1wiOlxyXG5cdFx0XHRcdFx0cmV0dXJuIGEudGFza0NvdW50IC0gYi50YXNrQ291bnQ7XHJcblx0XHRcdFx0Y2FzZSBcInRhc2tzLWRlc2NcIjpcclxuXHRcdFx0XHRcdHJldHVybiBiLnRhc2tDb3VudCAtIGEudGFza0NvdW50O1xyXG5cdFx0XHRcdGNhc2UgXCJjcmVhdGVkLWFzY1wiOlxyXG5cdFx0XHRcdFx0cmV0dXJuIChhLmNyZWF0ZWRBdCB8fCAwKSAtIChiLmNyZWF0ZWRBdCB8fCAwKTtcclxuXHRcdFx0XHRjYXNlIFwiY3JlYXRlZC1kZXNjXCI6XHJcblx0XHRcdFx0XHRyZXR1cm4gKGIuY3JlYXRlZEF0IHx8IDApIC0gKGEuY3JlYXRlZEF0IHx8IDApO1xyXG5cdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRyZXR1cm4gMDtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGJ1aWxkVHJlZVN0cnVjdHVyZSgpIHtcclxuXHRcdGNvbnN0IG5vZGVNYXAgPSBuZXcgTWFwPHN0cmluZywgUHJvamVjdFRyZWVOb2RlPigpO1xyXG5cdFx0Y29uc3Qgcm9vdE5vZGVzOiBQcm9qZWN0VHJlZU5vZGVbXSA9IFtdO1xyXG5cdFx0Y29uc3Qgc2VwYXJhdG9yID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdFBhdGhTZXBhcmF0b3IgfHwgXCIvXCI7XHJcblxyXG5cdFx0Ly8gUHJvY2VzcyBlYWNoIHByb2plY3QgYW5kIGNyZWF0ZSBpbnRlcm1lZGlhdGUgbm9kZXMgYXMgbmVlZGVkXHJcblx0XHR0aGlzLnByb2plY3RzLmZvckVhY2goKHByb2plY3QpID0+IHtcclxuXHRcdFx0Y29uc3Qgc2VnbWVudHMgPSB0aGlzLnBhcnNlUHJvamVjdFBhdGgocHJvamVjdC5uYW1lKTtcclxuXHRcdFx0aWYgKHNlZ21lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xyXG5cclxuXHRcdFx0bGV0IGN1cnJlbnRQYXRoID0gXCJcIjtcclxuXHRcdFx0bGV0IHBhcmVudE5vZGU6IFByb2plY3RUcmVlTm9kZSB8IHVuZGVmaW5lZDtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBvciBnZXQgbm9kZXMgZm9yIGVhY2ggc2VnbWVudCBpbiB0aGUgcGF0aFxyXG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHNlZ21lbnRzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0Y29uc3Qgc2VnbWVudCA9IHNlZ21lbnRzW2ldO1xyXG5cdFx0XHRcdGNvbnN0IGlzTGVhZiA9IGkgPT09IHNlZ21lbnRzLmxlbmd0aCAtIDE7XHJcblxyXG5cdFx0XHRcdC8vIEJ1aWxkIHRoZSBmdWxsIHBhdGggdXAgdG8gdGhpcyBzZWdtZW50XHJcblx0XHRcdFx0Y3VycmVudFBhdGggPSBjdXJyZW50UGF0aFxyXG5cdFx0XHRcdFx0PyBgJHtjdXJyZW50UGF0aH0ke3NlcGFyYXRvcn0ke3NlZ21lbnR9YFxyXG5cdFx0XHRcdFx0OiBzZWdtZW50O1xyXG5cclxuXHRcdFx0XHQvLyBDaGVjayBpZiBub2RlIGFscmVhZHkgZXhpc3RzXHJcblx0XHRcdFx0bGV0IG5vZGUgPSBub2RlTWFwLmdldChjdXJyZW50UGF0aCk7XHJcblxyXG5cdFx0XHRcdGlmICghbm9kZSkge1xyXG5cdFx0XHRcdFx0Ly8gQ3JlYXRlIG5vZGUgLSB1c2UgYWN0dWFsIHByb2plY3QgZm9yIGxlYWYsIHZpcnR1YWwgZm9yIGludGVybWVkaWF0ZVxyXG5cdFx0XHRcdFx0Y29uc3Qgbm9kZVByb2plY3QgPSBpc0xlYWZcclxuXHRcdFx0XHRcdFx0PyBwcm9qZWN0XHJcblx0XHRcdFx0XHRcdDoge1xyXG5cdFx0XHRcdFx0XHRcdGlkOiBjdXJyZW50UGF0aCxcclxuXHRcdFx0XHRcdFx0XHRuYW1lOiBjdXJyZW50UGF0aCxcclxuXHRcdFx0XHRcdFx0XHRkaXNwbGF5TmFtZTogc2VnbWVudCxcclxuXHRcdFx0XHRcdFx0XHRjb2xvcjogdGhpcy5nZW5lcmF0ZUNvbG9yRm9yUHJvamVjdChcclxuXHRcdFx0XHRcdFx0XHRcdGN1cnJlbnRQYXRoXHJcblx0XHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0XHR0YXNrQ291bnQ6IDAsXHJcblx0XHRcdFx0XHRcdFx0aXNWaXJ0dWFsOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRcdG5vZGUgPSB7XHJcblx0XHRcdFx0XHRcdHByb2plY3Q6IG5vZGVQcm9qZWN0LFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRcdGxldmVsOiBpLFxyXG5cdFx0XHRcdFx0XHRleHBhbmRlZDogdGhpcy5leHBhbmRlZE5vZGVzLmhhcyhjdXJyZW50UGF0aCksXHJcblx0XHRcdFx0XHRcdHBhdGg6IHNlZ21lbnRzLnNsaWNlKDAsIGkgKyAxKSxcclxuXHRcdFx0XHRcdFx0ZnVsbFBhdGg6IGN1cnJlbnRQYXRoLFxyXG5cdFx0XHRcdFx0XHRwYXJlbnQ6IHBhcmVudE5vZGUsXHJcblx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRcdG5vZGVNYXAuc2V0KGN1cnJlbnRQYXRoLCBub2RlKTtcclxuXHJcblx0XHRcdFx0XHQvLyBBZGQgdG8gcGFyZW50J3MgY2hpbGRyZW4gb3Igcm9vdFxyXG5cdFx0XHRcdFx0aWYgKHBhcmVudE5vZGUpIHtcclxuXHRcdFx0XHRcdFx0cGFyZW50Tm9kZS5jaGlsZHJlbi5wdXNoKG5vZGUpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0cm9vdE5vZGVzLnB1c2gobm9kZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIGlmIChpc0xlYWYgJiYgbm9kZS5wcm9qZWN0LmlzVmlydHVhbCkge1xyXG5cdFx0XHRcdFx0Ly8gVXBkYXRlIHZpcnR1YWwgbm9kZSB3aXRoIGFjdHVhbCBwcm9qZWN0IGRhdGFcclxuXHRcdFx0XHRcdG5vZGUucHJvamVjdCA9IHByb2plY3Q7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRwYXJlbnROb2RlID0gbm9kZTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU29ydCB0cmVlIG5vZGVzIHJlY3Vyc2l2ZWx5XHJcblx0XHR0aGlzLnNvcnRUcmVlTm9kZXMocm9vdE5vZGVzKTtcclxuXHRcdHRoaXMudHJlZU5vZGVzID0gcm9vdE5vZGVzO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSB0YXNrIGNvdW50cyBmb3IgcGFyZW50IG5vZGVzXHJcblx0XHR0aGlzLnVwZGF0ZVBhcmVudFRhc2tDb3VudHMocm9vdE5vZGVzKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcGFyc2VQcm9qZWN0UGF0aChwcm9qZWN0TmFtZTogc3RyaW5nKTogc3RyaW5nW10ge1xyXG5cdFx0Ly8gUGFyc2UgcHJvamVjdCBwYXRoIHVzaW5nIC8gYXMgc2VwYXJhdG9yXHJcblx0XHQvLyBGb3IgZXhhbXBsZTogXCJwYXJlbnQvY2hpbGRcIiBiZWNvbWVzIFtcInBhcmVudFwiLCBcImNoaWxkXCJdXHJcblx0XHRjb25zdCBzZXBhcmF0b3IgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0UGF0aFNlcGFyYXRvciB8fCBcIi9cIjtcclxuXHRcdGlmICghcHJvamVjdE5hbWUgfHwgIXByb2plY3ROYW1lLnRyaW0oKSkge1xyXG5cdFx0XHRyZXR1cm4gW107XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gTm9ybWFsaXplIHRoZSBwYXRoIGJ5IHRyaW1taW5nIGFuZCByZW1vdmluZyBkdXBsaWNhdGUgc2VwYXJhdG9yc1xyXG5cdFx0Y29uc3Qgbm9ybWFsaXplZCA9IHByb2plY3ROYW1lXHJcblx0XHRcdC50cmltKClcclxuXHRcdFx0LnJlcGxhY2UoXHJcblx0XHRcdFx0bmV3IFJlZ0V4cChgJHt0aGlzLmVzY2FwZVJlZ0V4cChzZXBhcmF0b3IpfStgLCBcImdcIiksXHJcblx0XHRcdFx0c2VwYXJhdG9yXHJcblx0XHRcdClcclxuXHRcdFx0LnJlcGxhY2UoXHJcblx0XHRcdFx0bmV3IFJlZ0V4cChcclxuXHRcdFx0XHRcdGBeJHt0aGlzLmVzY2FwZVJlZ0V4cChzZXBhcmF0b3IpfXwke3RoaXMuZXNjYXBlUmVnRXhwKFxyXG5cdFx0XHRcdFx0XHRzZXBhcmF0b3JcclxuXHRcdFx0XHRcdCl9JGAsXHJcblx0XHRcdFx0XHRcImdcIlxyXG5cdFx0XHRcdCksXHJcblx0XHRcdFx0XCJcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdGlmICghbm9ybWFsaXplZCkge1xyXG5cdFx0XHRyZXR1cm4gW107XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG5vcm1hbGl6ZWQuc3BsaXQoc2VwYXJhdG9yKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZXNjYXBlUmVnRXhwKHN0cmluZzogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiBzdHJpbmcucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzb3J0VHJlZU5vZGVzKG5vZGVzOiBQcm9qZWN0VHJlZU5vZGVbXSkge1xyXG5cdFx0bm9kZXMuZm9yRWFjaCgobm9kZSkgPT4ge1xyXG5cdFx0XHRpZiAobm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0dGhpcy5zb3J0VHJlZU5vZGVzKG5vZGUuY2hpbGRyZW4pO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRub2Rlcy5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdHN3aXRjaCAodGhpcy5jdXJyZW50U29ydCkge1xyXG5cdFx0XHRcdGNhc2UgXCJuYW1lLWFzY1wiOlxyXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY29sbGF0b3IuY29tcGFyZShcclxuXHRcdFx0XHRcdFx0YS5wcm9qZWN0LmRpc3BsYXlOYW1lIHx8IGEucHJvamVjdC5uYW1lLFxyXG5cdFx0XHRcdFx0XHRiLnByb2plY3QuZGlzcGxheU5hbWUgfHwgYi5wcm9qZWN0Lm5hbWVcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0Y2FzZSBcIm5hbWUtZGVzY1wiOlxyXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY29sbGF0b3IuY29tcGFyZShcclxuXHRcdFx0XHRcdFx0Yi5wcm9qZWN0LmRpc3BsYXlOYW1lIHx8IGIucHJvamVjdC5uYW1lLFxyXG5cdFx0XHRcdFx0XHRhLnByb2plY3QuZGlzcGxheU5hbWUgfHwgYS5wcm9qZWN0Lm5hbWVcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0Y2FzZSBcInRhc2tzLWFzY1wiOlxyXG5cdFx0XHRcdFx0cmV0dXJuIGEucHJvamVjdC50YXNrQ291bnQgLSBiLnByb2plY3QudGFza0NvdW50O1xyXG5cdFx0XHRcdGNhc2UgXCJ0YXNrcy1kZXNjXCI6XHJcblx0XHRcdFx0XHRyZXR1cm4gYi5wcm9qZWN0LnRhc2tDb3VudCAtIGEucHJvamVjdC50YXNrQ291bnQ7XHJcblx0XHRcdFx0Y2FzZSBcImNyZWF0ZWQtYXNjXCI6XHJcblx0XHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0XHQoYS5wcm9qZWN0LmNyZWF0ZWRBdCB8fCAwKSAtIChiLnByb2plY3QuY3JlYXRlZEF0IHx8IDApXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdGNhc2UgXCJjcmVhdGVkLWRlc2NcIjpcclxuXHRcdFx0XHRcdHJldHVybiAoXHJcblx0XHRcdFx0XHRcdChiLnByb2plY3QuY3JlYXRlZEF0IHx8IDApIC0gKGEucHJvamVjdC5jcmVhdGVkQXQgfHwgMClcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdHJldHVybiAwO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdXBkYXRlUGFyZW50VGFza0NvdW50cyhub2RlczogUHJvamVjdFRyZWVOb2RlW10pIHtcclxuXHRcdG5vZGVzLmZvckVhY2goKG5vZGUpID0+IHtcclxuXHRcdFx0aWYgKG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlUGFyZW50VGFza0NvdW50cyhub2RlLmNoaWxkcmVuKTtcclxuXHRcdFx0XHQvLyBTdW0gdXAgY2hpbGQgdGFzayBjb3VudHNcclxuXHRcdFx0XHRjb25zdCBjaGlsZFRvdGFsID0gbm9kZS5jaGlsZHJlbi5yZWR1Y2UoXHJcblx0XHRcdFx0XHQoc3VtLCBjaGlsZCkgPT4gc3VtICsgY2hpbGQucHJvamVjdC50YXNrQ291bnQsXHJcblx0XHRcdFx0XHQwXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHQvLyBGb3IgdmlydHVhbCBub2Rlcywgc2V0IGNvdW50IHRvIGNoaWxkIHRvdGFsXHJcblx0XHRcdFx0Ly8gRm9yIHJlYWwgbm9kZXMsIGFkZCBjaGlsZCB0b3RhbCB0byBleGlzdGluZyBjb3VudFxyXG5cdFx0XHRcdGlmIChub2RlLnByb2plY3QuaXNWaXJ0dWFsKSB7XHJcblx0XHRcdFx0XHRub2RlLnByb2plY3QudGFza0NvdW50ID0gY2hpbGRUb3RhbDtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0bm9kZS5wcm9qZWN0LnRhc2tDb3VudCA9XHJcblx0XHRcdFx0XHRcdG5vZGUucHJvamVjdC50YXNrQ291bnQgKyBjaGlsZFRvdGFsO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHRvZ2dsZU5vZGVFeHBhbmRlZChub2RlUGF0aDogc3RyaW5nKSB7XHJcblx0XHRpZiAodGhpcy5leHBhbmRlZE5vZGVzLmhhcyhub2RlUGF0aCkpIHtcclxuXHRcdFx0dGhpcy5leHBhbmRlZE5vZGVzLmRlbGV0ZShub2RlUGF0aCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmV4cGFuZGVkTm9kZXMuYWRkKG5vZGVQYXRoKTtcclxuXHRcdH1cclxuXHRcdHRoaXMuc2F2ZUV4cGFuZGVkTm9kZXMoKTtcclxuXHRcdHRoaXMucmVuZGVyKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdlbmVyYXRlQ29sb3JGb3JQcm9qZWN0KHByb2plY3ROYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgY29sb3JzID0gW1xyXG5cdFx0XHRcIiNlNzRjM2NcIixcclxuXHRcdFx0XCIjMzQ5OGRiXCIsXHJcblx0XHRcdFwiIzJlY2M3MVwiLFxyXG5cdFx0XHRcIiNmMzljMTJcIixcclxuXHRcdFx0XCIjOWI1OWI2XCIsXHJcblx0XHRcdFwiIzFhYmM5Y1wiLFxyXG5cdFx0XHRcIiMzNDQ5NWVcIixcclxuXHRcdFx0XCIjZTY3ZTIyXCIsXHJcblx0XHRdO1xyXG5cclxuXHRcdGxldCBoYXNoID0gMDtcclxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgcHJvamVjdE5hbWUubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0aGFzaCA9IHByb2plY3ROYW1lLmNoYXJDb2RlQXQoaSkgKyAoKGhhc2ggPDwgNSkgLSBoYXNoKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gY29sb3JzW01hdGguYWJzKGhhc2gpICUgY29sb3JzLmxlbmd0aF07XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlcigpIHtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuYWRkQ2xhc3MoXCJmbHVlbnQtcHJvamVjdC1saXN0XCIpO1xyXG5cdFx0aWYgKHRoaXMuaXNUcmVlVmlldykge1xyXG5cdFx0XHR0aGlzLmNvbnRhaW5lckVsLmFkZENsYXNzKFwiaXMtdHJlZS12aWV3XCIpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5jb250YWluZXJFbC5yZW1vdmVDbGFzcyhcImlzLXRyZWUtdmlld1wiKTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBzY3JvbGxBcmVhID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXByb2plY3Qtc2Nyb2xsXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRpZiAodGhpcy5pc1RyZWVWaWV3KSB7XHJcblx0XHRcdC8vIEJ1aWxkIHRyZWUgc3RydWN0dXJlIGZpcnN0XHJcblx0XHRcdHRoaXMuYnVpbGRUcmVlU3RydWN0dXJlKCk7XHJcblx0XHRcdC8vIFJlbmRlciB0cmVlIHZpZXdcclxuXHRcdFx0dGhpcy5yZW5kZXJUcmVlTm9kZXMoc2Nyb2xsQXJlYSwgdGhpcy50cmVlTm9kZXMsIDApO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gUmVuZGVyIGZsYXQgbGlzdCB2aWV3XHJcblx0XHRcdHRoaXMucHJvamVjdHMuZm9yRWFjaCgocHJvamVjdCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMucmVuZGVyUHJvamVjdEl0ZW0oc2Nyb2xsQXJlYSwgcHJvamVjdCwgMCwgZmFsc2UpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgbmV3IHByb2plY3QgYnV0dG9uXHJcblx0XHRjb25zdCBhZGRQcm9qZWN0QnRuID0gc2Nyb2xsQXJlYS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXByb2plY3QtaXRlbSBmbHVlbnQtYWRkLXByb2plY3RcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGFkZEljb24gPSBhZGRQcm9qZWN0QnRuLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtcHJvamVjdC1hZGQtaWNvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRhZGRJY29uLmNyZWF0ZURpdih7Y2xzOiBcImZsdWVudC1wcm9qZWN0LWNvbG9yLWRhc2hlZFwifSk7XHJcblxyXG5cdFx0YWRkUHJvamVjdEJ0bi5jcmVhdGVTcGFuKHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1wcm9qZWN0LW5hbWVcIixcclxuXHRcdFx0dGV4dDogdChcIkFkZCBQcm9qZWN0XCIpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGFkZFByb2plY3RCdG4sIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUFkZFByb2plY3QoYWRkUHJvamVjdEJ0bik7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyVHJlZU5vZGVzKFxyXG5cdFx0Y29udGFpbmVyOiBIVE1MRWxlbWVudCxcclxuXHRcdG5vZGVzOiBQcm9qZWN0VHJlZU5vZGVbXSxcclxuXHRcdGxldmVsOiBudW1iZXJcclxuXHQpIHtcclxuXHRcdG5vZGVzLmZvckVhY2goKG5vZGUpID0+IHtcclxuXHRcdFx0Y29uc3QgaGFzQ2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDA7XHJcblx0XHRcdHRoaXMucmVuZGVyUHJvamVjdEl0ZW0oXHJcblx0XHRcdFx0Y29udGFpbmVyLFxyXG5cdFx0XHRcdG5vZGUucHJvamVjdCxcclxuXHRcdFx0XHRsZXZlbCxcclxuXHRcdFx0XHRoYXNDaGlsZHJlbixcclxuXHRcdFx0XHRub2RlXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRpZiAoaGFzQ2hpbGRyZW4gJiYgbm9kZS5leHBhbmRlZCkge1xyXG5cdFx0XHRcdHRoaXMucmVuZGVyVHJlZU5vZGVzKGNvbnRhaW5lciwgbm9kZS5jaGlsZHJlbiwgbGV2ZWwgKyAxKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlclByb2plY3RJdGVtKFxyXG5cdFx0Y29udGFpbmVyOiBIVE1MRWxlbWVudCxcclxuXHRcdHByb2plY3Q6IFByb2plY3QsXHJcblx0XHRsZXZlbDogbnVtYmVyLFxyXG5cdFx0aGFzQ2hpbGRyZW46IGJvb2xlYW4sXHJcblx0XHR0cmVlTm9kZT86IFByb2plY3RUcmVlTm9kZVxyXG5cdCkge1xyXG5cdFx0Y29uc3QgcHJvamVjdEl0ZW0gPSBjb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1wcm9qZWN0LWl0ZW1cIixcclxuXHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdFwiZGF0YS1wcm9qZWN0LWlkXCI6IHByb2plY3QuaWQsXHJcblx0XHRcdFx0XCJkYXRhLWxldmVsXCI6IFN0cmluZyhsZXZlbCksXHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgdmlydHVhbCBjbGFzcyBmb3Igc3R5bGluZ1xyXG5cdFx0aWYgKHByb2plY3QuaXNWaXJ0dWFsKSB7XHJcblx0XHRcdHByb2plY3RJdGVtLmFkZENsYXNzKFwiaXMtdmlydHVhbFwiKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy5hY3RpdmVQcm9qZWN0SWQgPT09IHByb2plY3QuaWQpIHtcclxuXHRcdFx0cHJvamVjdEl0ZW0uYWRkQ2xhc3MoXCJpcy1hY3RpdmVcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRoaXMuaXNUcmVlVmlldyAmJiBsZXZlbCA+IDApIHtcclxuXHRcdFx0cHJvamVjdEl0ZW0uc3R5bGUucGFkZGluZ0xlZnQgPSBgJHtsZXZlbCAqIDIwICsgOH1weGA7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRXhwYW5kL2NvbGxhcHNlIGNoZXZyb24gZm9yIHRyZWUgdmlld1xyXG5cdFx0aWYgKHRoaXMuaXNUcmVlVmlldyAmJiBoYXNDaGlsZHJlbikge1xyXG5cdFx0XHRjb25zdCBjaGV2cm9uID0gcHJvamVjdEl0ZW0uY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZmx1ZW50LXByb2plY3QtY2hldnJvblwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0Y29uc3QgaXNFeHBhbmRlZCA9IHRyZWVOb2RlPy5leHBhbmRlZCB8fCBmYWxzZTtcclxuXHRcdFx0c2V0SWNvbihjaGV2cm9uLCBpc0V4cGFuZGVkID8gXCJjaGV2cm9uLWRvd25cIiA6IFwiY2hldnJvbi1yaWdodFwiKTtcclxuXHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChjaGV2cm9uLCBcImNsaWNrXCIsIChlOiBNb3VzZUV2ZW50KSA9PiB7XHJcblx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0XHQvLyBVc2UgZnVsbFBhdGggZm9yIHZpcnR1YWwgbm9kZXNcclxuXHRcdFx0XHRjb25zdCBub2RlSWQgPSB0cmVlTm9kZT8uZnVsbFBhdGggfHwgcHJvamVjdC5pZDtcclxuXHRcdFx0XHR0aGlzLnRvZ2dsZU5vZGVFeHBhbmRlZChub2RlSWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSBpZiAodGhpcy5pc1RyZWVWaWV3KSB7XHJcblx0XHRcdC8vIEFkZCBzcGFjZXIgZm9yIGl0ZW1zIHdpdGhvdXQgY2hpbGRyZW4gdG8gYWxpZ24gdGhlbVxyXG5cdFx0XHRwcm9qZWN0SXRlbS5jcmVhdGVEaXYoe2NsczogXCJmbHVlbnQtcHJvamVjdC1jaGV2cm9uLXNwYWNlclwifSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgcHJvamVjdENvbG9yID0gcHJvamVjdEl0ZW0uY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1wcm9qZWN0LWNvbG9yXCIsXHJcblx0XHR9KTtcclxuXHRcdHByb2plY3RDb2xvci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBwcm9qZWN0LmNvbG9yO1xyXG5cclxuXHRcdC8vIEluIHRyZWUgdmlldywgc2hvdyBvbmx5IHRoZSBsYXN0IHNlZ21lbnQgb2YgdGhlIHBhdGhcclxuXHRcdC8vIEluIGxpc3Qgdmlldywgc2hvdyB0aGUgZnVsbCBuYW1lXHJcblx0XHRsZXQgZGlzcGxheVRleHQ6IHN0cmluZztcclxuXHRcdGlmICh0aGlzLmlzVHJlZVZpZXcpIHtcclxuXHRcdFx0aWYgKHByb2plY3QuaXNWaXJ0dWFsKSB7XHJcblx0XHRcdFx0Ly8gVmlydHVhbCBub2RlcyBhbHJlYWR5IGhhdmUgZGlzcGxheU5hbWUgYXMgdGhlIHNlZ21lbnRcclxuXHRcdFx0XHRkaXNwbGF5VGV4dCA9IHByb2plY3QuZGlzcGxheU5hbWUgfHwgcHJvamVjdC5uYW1lO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEZvciByZWFsIHByb2plY3RzLCBleHRyYWN0IHRoZSBsYXN0IHNlZ21lbnRcclxuXHRcdFx0XHRjb25zdCBzZXBhcmF0b3IgPVxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdFBhdGhTZXBhcmF0b3IgfHwgXCIvXCI7XHJcblx0XHRcdFx0Y29uc3QgbmFtZVRvU3BsaXQgPSBwcm9qZWN0Lm5hbWU7XHJcblx0XHRcdFx0Y29uc3Qgc2VnbWVudHMgPSBuYW1lVG9TcGxpdC5zcGxpdChzZXBhcmF0b3IpO1xyXG5cdFx0XHRcdGNvbnN0IGxhc3RTZWdtZW50ID1cclxuXHRcdFx0XHRcdHNlZ21lbnRzW3NlZ21lbnRzLmxlbmd0aCAtIDFdIHx8IHByb2plY3QubmFtZTtcclxuXHJcblx0XHRcdFx0Ly8gSWYgcHJvamVjdCBoYXMgYSBjdXN0b20gZGlzcGxheU5hbWUsIHRyeSB0byBwcmVzZXJ2ZSBpdFxyXG5cdFx0XHRcdC8vIGJ1dCBzdGlsbCBzaG93IG9ubHkgdGhlIHJlbGV2YW50IHBhcnQgZm9yIHRoZSB0cmVlIGxldmVsXHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0cHJvamVjdC5kaXNwbGF5TmFtZSAmJlxyXG5cdFx0XHRcdFx0cHJvamVjdC5kaXNwbGF5TmFtZSAhPT0gcHJvamVjdC5uYW1lXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRjb25zdCBkaXNwbGF5U2VnbWVudHMgPVxyXG5cdFx0XHRcdFx0XHRwcm9qZWN0LmRpc3BsYXlOYW1lLnNwbGl0KHNlcGFyYXRvcik7XHJcblx0XHRcdFx0XHRkaXNwbGF5VGV4dCA9XHJcblx0XHRcdFx0XHRcdGRpc3BsYXlTZWdtZW50c1tkaXNwbGF5U2VnbWVudHMubGVuZ3RoIC0gMV0gfHxcclxuXHRcdFx0XHRcdFx0bGFzdFNlZ21lbnQ7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGRpc3BsYXlUZXh0ID0gbGFzdFNlZ21lbnQ7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBJbiBsaXN0IHZpZXcsIHNob3cgZnVsbCBuYW1lIG9yIGN1c3RvbSBkaXNwbGF5TmFtZVxyXG5cdFx0XHRkaXNwbGF5VGV4dCA9IHByb2plY3QuZGlzcGxheU5hbWUgfHwgcHJvamVjdC5uYW1lO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHByb2plY3ROYW1lID0gcHJvamVjdEl0ZW0uY3JlYXRlU3Bhbih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtcHJvamVjdC1uYW1lXCIsXHJcblx0XHRcdHRleHQ6IGRpc3BsYXlUZXh0LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgcHJvamVjdENvdW50ID0gcHJvamVjdEl0ZW0uY3JlYXRlU3Bhbih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtcHJvamVjdC1jb3VudFwiLFxyXG5cdFx0XHR0ZXh0OiBTdHJpbmcocHJvamVjdC50YXNrQ291bnQpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHByb2plY3RJdGVtLCBcImNsaWNrXCIsIChlOiBNb3VzZUV2ZW50KSA9PiB7XHJcblx0XHRcdC8vIERvbid0IHRyaWdnZXIgaWYgY2xpY2tpbmcgb24gY2hldnJvblxyXG5cdFx0XHRpZiAoIShlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdChcIi5mbHVlbnQtcHJvamVjdC1jaGV2cm9uXCIpKSB7XHJcblx0XHRcdFx0Ly8gVmlydHVhbCBub2RlcyBzZWxlY3QgYWxsIHRoZWlyIGNoaWxkcmVuXHJcblx0XHRcdFx0aWYgKHByb2plY3QuaXNWaXJ0dWFsICYmIHRyZWVOb2RlKSB7XHJcblx0XHRcdFx0XHR0aGlzLnNlbGVjdFZpcnR1YWxOb2RlKHRyZWVOb2RlKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0dGhpcy5zZXRBY3RpdmVQcm9qZWN0KHByb2plY3QuaWQpO1xyXG5cdFx0XHRcdFx0dGhpcy5vblByb2plY3RTZWxlY3QocHJvamVjdC5pZCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgY29udGV4dCBtZW51IGhhbmRsZXIgKG9ubHkgZm9yIG5vbi12aXJ0dWFsIHByb2plY3RzKVxyXG5cdFx0aWYgKCFwcm9qZWN0LmlzVmlydHVhbCkge1xyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXHJcblx0XHRcdFx0cHJvamVjdEl0ZW0sXHJcblx0XHRcdFx0XCJjb250ZXh0bWVudVwiLFxyXG5cdFx0XHRcdChlOiBNb3VzZUV2ZW50KSA9PiB7XHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0XHR0aGlzLnNob3dQcm9qZWN0Q29udGV4dE1lbnUoZSwgcHJvamVjdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzZWxlY3RWaXJ0dWFsTm9kZShub2RlOiBQcm9qZWN0VHJlZU5vZGUpIHtcclxuXHRcdC8vIENvbGxlY3QgYWxsIG5vbi12aXJ0dWFsIGRlc2NlbmRhbnQgcHJvamVjdCBJRHNcclxuXHRcdGNvbnN0IHByb2plY3RJZHM6IHN0cmluZ1tdID0gW107XHJcblx0XHRjb25zdCBjb2xsZWN0UHJvamVjdHMgPSAobjogUHJvamVjdFRyZWVOb2RlKSA9PiB7XHJcblx0XHRcdGlmICghbi5wcm9qZWN0LmlzVmlydHVhbCkge1xyXG5cdFx0XHRcdHByb2plY3RJZHMucHVzaChuLnByb2plY3QuaWQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdG4uY2hpbGRyZW4uZm9yRWFjaCgoY2hpbGQpID0+IGNvbGxlY3RQcm9qZWN0cyhjaGlsZCkpO1xyXG5cdFx0fTtcclxuXHRcdGNvbGxlY3RQcm9qZWN0cyhub2RlKTtcclxuXHJcblx0XHQvLyBTZWxlY3QgdGhlIGZpcnN0IHJlYWwgcHJvamVjdCBpZiBhbnlcclxuXHRcdGlmIChwcm9qZWN0SWRzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0dGhpcy5zZXRBY3RpdmVQcm9qZWN0KHByb2plY3RJZHNbMF0pO1xyXG5cdFx0XHR0aGlzLm9uUHJvamVjdFNlbGVjdChwcm9qZWN0SWRzWzBdKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzZXRBY3RpdmVQcm9qZWN0KHByb2plY3RJZDogc3RyaW5nIHwgbnVsbCkge1xyXG5cdFx0dGhpcy5hY3RpdmVQcm9qZWN0SWQgPSBwcm9qZWN0SWQ7XHJcblxyXG5cdFx0dGhpcy5jb250YWluZXJFbFxyXG5cdFx0XHQucXVlcnlTZWxlY3RvckFsbChcIi5mbHVlbnQtcHJvamVjdC1pdGVtXCIpXHJcblx0XHRcdC5mb3JFYWNoKChlbCkgPT4ge1xyXG5cdFx0XHRcdGVsLnJlbW92ZUNsYXNzKFwiaXMtYWN0aXZlXCIpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRpZiAocHJvamVjdElkKSB7XHJcblx0XHRcdGNvbnN0IGFjdGl2ZUVsID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcdGBbZGF0YS1wcm9qZWN0LWlkPVwiJHtwcm9qZWN0SWR9XCJdYFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAoYWN0aXZlRWwpIHtcclxuXHRcdFx0XHRhY3RpdmVFbC5hZGRDbGFzcyhcImlzLWFjdGl2ZVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHVibGljIGdldFByb2plY3RzKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMucHJvamVjdHM7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgcmVmcmVzaCgpIHtcclxuXHRcdHRoaXMubG9hZFByb2plY3RzKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhbmRsZUFkZFByb2plY3QoYnV0dG9uRWw6IEhUTUxFbGVtZW50KSB7XHJcblx0XHQvLyBDbGVhbiB1cCBhbnkgZXhpc3RpbmcgcG9wb3ZlclxyXG5cdFx0aWYgKHRoaXMuY3VycmVudFBvcG92ZXIpIHtcclxuXHRcdFx0dGhpcy5yZW1vdmVDaGlsZCh0aGlzLmN1cnJlbnRQb3BvdmVyKTtcclxuXHRcdFx0dGhpcy5jdXJyZW50UG9wb3ZlciA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKFBsYXRmb3JtLmlzUGhvbmUpIHtcclxuXHRcdFx0Ly8gTW9iaWxlOiBVc2UgT2JzaWRpYW4gTW9kYWxcclxuXHRcdFx0Y29uc3QgbW9kYWwgPSBuZXcgUHJvamVjdE1vZGFsKFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLmFwcCxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRhc3luYyAocHJvamVjdCkgPT4ge1xyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5zYXZlUHJvamVjdChwcm9qZWN0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblx0XHRcdG1vZGFsLm9wZW4oKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIERlc2t0b3A6IFVzZSBwb3BvdmVyXHJcblx0XHRcdHRoaXMuY3VycmVudFBvcG92ZXIgPSBuZXcgUHJvamVjdFBvcG92ZXIoXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0YnV0dG9uRWwsXHJcblx0XHRcdFx0YXN5bmMgKHByb2plY3QpID0+IHtcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMuc2F2ZVByb2plY3QocHJvamVjdCk7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5jdXJyZW50UG9wb3Zlcikge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJlbW92ZUNoaWxkKHRoaXMuY3VycmVudFBvcG92ZXIpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmN1cnJlbnRQb3BvdmVyID0gbnVsbDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdCgpID0+IHtcclxuXHRcdFx0XHRcdGlmICh0aGlzLmN1cnJlbnRQb3BvdmVyKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMucmVtb3ZlQ2hpbGQodGhpcy5jdXJyZW50UG9wb3Zlcik7XHJcblx0XHRcdFx0XHRcdHRoaXMuY3VycmVudFBvcG92ZXIgPSBudWxsO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5hZGRDaGlsZCh0aGlzLmN1cnJlbnRQb3BvdmVyKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgc2F2ZVByb2plY3QocHJvamVjdDogQ3VzdG9tUHJvamVjdCkge1xyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBjdXN0b21Qcm9qZWN0cyBpZiBpdCBkb2Vzbid0IGV4aXN0XHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWcpIHtcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZyA9IHtcclxuXHRcdFx0XHRlbmFibGVFbmhhbmNlZFByb2plY3Q6IGZhbHNlLFxyXG5cdFx0XHRcdHBhdGhNYXBwaW5nczogW10sXHJcblx0XHRcdFx0bWV0YWRhdGFDb25maWc6IHtcclxuXHRcdFx0XHRcdG1ldGFkYXRhS2V5OiBcInByb2plY3RcIixcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Y29uZmlnRmlsZToge1xyXG5cdFx0XHRcdFx0ZmlsZU5hbWU6IFwicHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdFx0c2VhcmNoUmVjdXJzaXZlbHk6IHRydWUsXHJcblx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG1ldGFkYXRhTWFwcGluZ3M6IFtdLFxyXG5cdFx0XHRcdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiB7XHJcblx0XHRcdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiLFxyXG5cdFx0XHRcdFx0c3RyaXBFeHRlbnNpb246IHRydWUsXHJcblx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGN1c3RvbVByb2plY3RzOiBbXSxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWcuY3VzdG9tUHJvamVjdHMpIHtcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZy5jdXN0b21Qcm9qZWN0cyA9IFtdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCB0aGUgbmV3IHByb2plY3RcclxuXHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWcuY3VzdG9tUHJvamVjdHMucHVzaChwcm9qZWN0KTtcclxuXHJcblx0XHQvLyBTYXZlIHNldHRpbmdzXHJcblx0XHRhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHJcblx0XHQvLyBSZWZyZXNoIHRoZSBwcm9qZWN0IGxpc3RcclxuXHRcdHRoaXMubG9hZFByb2plY3RzKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGxvYWRDdXN0b21Qcm9qZWN0cygpIHtcclxuXHRcdGNvbnN0IGN1c3RvbVByb2plY3RzID1cclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZz8uY3VzdG9tUHJvamVjdHMgfHwgW107XHJcblxyXG5cdFx0Ly8gTWVyZ2UgY3VzdG9tIHByb2plY3RzIGludG8gdGhlIHByb2plY3RzIGFycmF5XHJcblx0XHRjdXN0b21Qcm9qZWN0cy5mb3JFYWNoKChjdXN0b21Qcm9qZWN0KSA9PiB7XHJcblx0XHRcdC8vIENoZWNrIGlmIHByb2plY3QgYWxyZWFkeSBleGlzdHMgYnkgbmFtZVxyXG5cdFx0XHRjb25zdCBleGlzdGluZ0luZGV4ID0gdGhpcy5wcm9qZWN0cy5maW5kSW5kZXgoXHJcblx0XHRcdFx0KHApID0+IHAubmFtZSA9PT0gY3VzdG9tUHJvamVjdC5uYW1lXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRpZiAoZXhpc3RpbmdJbmRleCA9PT0gLTEpIHtcclxuXHRcdFx0XHQvLyBBZGQgbmV3IGN1c3RvbSBwcm9qZWN0XHJcblx0XHRcdFx0dGhpcy5wcm9qZWN0cy5wdXNoKHtcclxuXHRcdFx0XHRcdGlkOiBjdXN0b21Qcm9qZWN0LmlkLFxyXG5cdFx0XHRcdFx0bmFtZTogY3VzdG9tUHJvamVjdC5uYW1lLFxyXG5cdFx0XHRcdFx0ZGlzcGxheU5hbWU6XHJcblx0XHRcdFx0XHRcdGN1c3RvbVByb2plY3QuZGlzcGxheU5hbWUgfHwgY3VzdG9tUHJvamVjdC5uYW1lLFxyXG5cdFx0XHRcdFx0Y29sb3I6IGN1c3RvbVByb2plY3QuY29sb3IsXHJcblx0XHRcdFx0XHR0YXNrQ291bnQ6IDAsIC8vIFdpbGwgYmUgdXBkYXRlZCBieSB0YXNrIGNvdW50aW5nXHJcblx0XHRcdFx0XHRjcmVhdGVkQXQ6IGN1c3RvbVByb2plY3QuY3JlYXRlZEF0LFxyXG5cdFx0XHRcdFx0dXBkYXRlZEF0OiBjdXN0b21Qcm9qZWN0LnVwZGF0ZWRBdCxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBVcGRhdGUgZXhpc3RpbmcgcHJvamVjdCB3aXRoIGN1c3RvbSBjb2xvclxyXG5cdFx0XHRcdHRoaXMucHJvamVjdHNbZXhpc3RpbmdJbmRleF0uaWQgPSBjdXN0b21Qcm9qZWN0LmlkO1xyXG5cdFx0XHRcdHRoaXMucHJvamVjdHNbZXhpc3RpbmdJbmRleF0uY29sb3IgPSBjdXN0b21Qcm9qZWN0LmNvbG9yO1xyXG5cdFx0XHRcdHRoaXMucHJvamVjdHNbZXhpc3RpbmdJbmRleF0uZGlzcGxheU5hbWUgPVxyXG5cdFx0XHRcdFx0Y3VzdG9tUHJvamVjdC5kaXNwbGF5TmFtZSB8fCBjdXN0b21Qcm9qZWN0Lm5hbWU7XHJcblx0XHRcdFx0dGhpcy5wcm9qZWN0c1tleGlzdGluZ0luZGV4XS5jcmVhdGVkQXQgPVxyXG5cdFx0XHRcdFx0Y3VzdG9tUHJvamVjdC5jcmVhdGVkQXQ7XHJcblx0XHRcdFx0dGhpcy5wcm9qZWN0c1tleGlzdGluZ0luZGV4XS51cGRhdGVkQXQgPVxyXG5cdFx0XHRcdFx0Y3VzdG9tUHJvamVjdC51cGRhdGVkQXQ7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzaG93U29ydE1lbnUoYnV0dG9uRWw6IEhUTUxFbGVtZW50KSB7XHJcblx0XHRjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcclxuXHJcblx0XHRjb25zdCBzb3J0T3B0aW9uczoge1xyXG5cdFx0XHRsYWJlbDogc3RyaW5nO1xyXG5cdFx0XHR2YWx1ZTogU29ydE9wdGlvbjtcclxuXHRcdFx0aWNvbjogc3RyaW5nO1xyXG5cdFx0fVtdID0gW1xyXG5cdFx0XHR7bGFiZWw6IHQoXCJOYW1lIChBLVopXCIpLCB2YWx1ZTogXCJuYW1lLWFzY1wiLCBpY29uOiBcImFycm93LXVwLWEtelwifSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGxhYmVsOiB0KFwiTmFtZSAoWi1BKVwiKSxcclxuXHRcdFx0XHR2YWx1ZTogXCJuYW1lLWRlc2NcIixcclxuXHRcdFx0XHRpY29uOiBcImFycm93LWRvd24tYS16XCIsXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRsYWJlbDogdChcIlRhc2tzIChMb3cgdG8gSGlnaClcIiksXHJcblx0XHRcdFx0dmFsdWU6IFwidGFza3MtYXNjXCIsXHJcblx0XHRcdFx0aWNvbjogXCJhcnJvdy11cC0xLTBcIixcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGxhYmVsOiB0KFwiVGFza3MgKEhpZ2ggdG8gTG93KVwiKSxcclxuXHRcdFx0XHR2YWx1ZTogXCJ0YXNrcy1kZXNjXCIsXHJcblx0XHRcdFx0aWNvbjogXCJhcnJvdy1kb3duLTEtMFwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bGFiZWw6IHQoXCJDcmVhdGVkIChPbGRlc3QgRmlyc3QpXCIpLFxyXG5cdFx0XHRcdHZhbHVlOiBcImNyZWF0ZWQtYXNjXCIsXHJcblx0XHRcdFx0aWNvbjogXCJjbG9ja1wiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bGFiZWw6IHQoXCJDcmVhdGVkIChOZXdlc3QgRmlyc3QpXCIpLFxyXG5cdFx0XHRcdHZhbHVlOiBcImNyZWF0ZWQtZGVzY1wiLFxyXG5cdFx0XHRcdGljb246IFwiaGlzdG9yeVwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XTtcclxuXHJcblx0XHRzb3J0T3B0aW9ucy5mb3JFYWNoKChvcHRpb24pID0+IHtcclxuXHRcdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0aXRlbS5zZXRUaXRsZShvcHRpb24ubGFiZWwpXHJcblx0XHRcdFx0XHQuc2V0SWNvbihvcHRpb24uaWNvbilcclxuXHRcdFx0XHRcdC5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5jdXJyZW50U29ydCA9IG9wdGlvbi52YWx1ZTtcclxuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5zYXZlU29ydFByZWZlcmVuY2UoKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5zb3J0UHJvamVjdHMoKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5yZW5kZXIoKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGlmICh0aGlzLmN1cnJlbnRTb3J0ID09PSBvcHRpb24udmFsdWUpIHtcclxuXHRcdFx0XHRcdGl0ZW0uc2V0Q2hlY2tlZCh0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0bWVudS5zaG93QXRNb3VzZUV2ZW50KFxyXG5cdFx0XHRuZXcgTW91c2VFdmVudChcImNsaWNrXCIsIHtcclxuXHRcdFx0XHR2aWV3OiB3aW5kb3csXHJcblx0XHRcdFx0YnViYmxlczogdHJ1ZSxcclxuXHRcdFx0XHRjYW5jZWxhYmxlOiB0cnVlLFxyXG5cdFx0XHRcdGNsaWVudFg6IGJ1dHRvbkVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnQsXHJcblx0XHRcdFx0Y2xpZW50WTogYnV0dG9uRWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuYm90dG9tLFxyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2hvd1Byb2plY3RDb250ZXh0TWVudShldmVudDogTW91c2VFdmVudCwgcHJvamVjdDogUHJvamVjdCkge1xyXG5cdFx0Y29uc3QgbWVudSA9IG5ldyBNZW51KCk7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgdGhpcyBpcyBhIGN1c3RvbSBwcm9qZWN0XHJcblx0XHRjb25zdCBpc0N1c3RvbVByb2plY3QgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnPy5jdXN0b21Qcm9qZWN0cz8uc29tZShcclxuXHRcdFx0XHQoY3ApID0+IGNwLmlkID09PSBwcm9qZWN0LmlkIHx8IGNwLm5hbWUgPT09IHByb2plY3QubmFtZVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdC8vIEVkaXQgUHJvamVjdCBvcHRpb25cclxuXHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJFZGl0IFByb2plY3RcIikpLnNldEljb24oXCJlZGl0XCIpO1xyXG5cclxuXHRcdFx0aWYgKGlzQ3VzdG9tUHJvamVjdCkge1xyXG5cdFx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmVkaXRQcm9qZWN0KHByb2plY3QpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGl0ZW0uc2V0RGlzYWJsZWQodHJ1ZSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIERlbGV0ZSBQcm9qZWN0IG9wdGlvblxyXG5cdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIkRlbGV0ZSBQcm9qZWN0XCIpKS5zZXRJY29uKFwidHJhc2hcIik7XHJcblxyXG5cdFx0XHRpZiAoaXNDdXN0b21Qcm9qZWN0KSB7XHJcblx0XHRcdFx0aXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuZGVsZXRlUHJvamVjdChwcm9qZWN0KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRpdGVtLnNldERpc2FibGVkKHRydWUpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRtZW51LnNob3dBdE1vdXNlRXZlbnQoZXZlbnQpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBlZGl0UHJvamVjdChwcm9qZWN0OiBQcm9qZWN0KSB7XHJcblx0XHQvLyBGaW5kIHRoZSBjdXN0b20gcHJvamVjdCBkYXRhXHJcblx0XHRsZXQgY3VzdG9tUHJvamVjdCA9XHJcblx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWc/LmN1c3RvbVByb2plY3RzPy5maW5kKFxyXG5cdFx0XHRcdChjcCkgPT4gY3AuaWQgPT09IHByb2plY3QuaWQgfHwgY3AubmFtZSA9PT0gcHJvamVjdC5uYW1lXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0aWYgKCFjdXN0b21Qcm9qZWN0KSB7XHJcblx0XHRcdC8vIENyZWF0ZSBhIG5ldyBjdXN0b20gcHJvamVjdCBlbnRyeSBpZiBpdCBkb2Vzbid0IGV4aXN0XHJcblx0XHRcdGN1c3RvbVByb2plY3QgPSB7XHJcblx0XHRcdFx0aWQ6IHByb2plY3QuaWQsXHJcblx0XHRcdFx0bmFtZTogcHJvamVjdC5uYW1lLFxyXG5cdFx0XHRcdGRpc3BsYXlOYW1lOiBwcm9qZWN0LmRpc3BsYXlOYW1lIHx8IHByb2plY3QubmFtZSxcclxuXHRcdFx0XHRjb2xvcjogcHJvamVjdC5jb2xvcixcclxuXHRcdFx0XHRjcmVhdGVkQXQ6IERhdGUubm93KCksXHJcblx0XHRcdFx0dXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE9wZW4gZWRpdCBtb2RhbFxyXG5cdFx0Y29uc3QgbW9kYWwgPSBuZXcgRWRpdFByb2plY3RNb2RhbChcclxuXHRcdFx0dGhpcy5wbHVnaW4uYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0Y3VzdG9tUHJvamVjdCxcclxuXHRcdFx0YXN5bmMgKHVwZGF0ZWRQcm9qZWN0KSA9PiB7XHJcblx0XHRcdFx0YXdhaXQgdGhpcy51cGRhdGVQcm9qZWN0KHVwZGF0ZWRQcm9qZWN0KTtcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHRcdG1vZGFsLm9wZW4oKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgdXBkYXRlUHJvamVjdCh1cGRhdGVkUHJvamVjdDogQ3VzdG9tUHJvamVjdCkge1xyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBpZiBuZWVkZWRcclxuXHRcdGlmICghdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZykge1xyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnID0ge1xyXG5cdFx0XHRcdGVuYWJsZUVuaGFuY2VkUHJvamVjdDogZmFsc2UsXHJcblx0XHRcdFx0cGF0aE1hcHBpbmdzOiBbXSxcclxuXHRcdFx0XHRtZXRhZGF0YUNvbmZpZzoge1xyXG5cdFx0XHRcdFx0bWV0YWRhdGFLZXk6IFwicHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRjb25maWdGaWxlOiB7XHJcblx0XHRcdFx0XHRmaWxlTmFtZTogXCJwcm9qZWN0Lm1kXCIsXHJcblx0XHRcdFx0XHRzZWFyY2hSZWN1cnNpdmVseTogdHJ1ZSxcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bWV0YWRhdGFNYXBwaW5nczogW10sXHJcblx0XHRcdFx0ZGVmYXVsdFByb2plY3ROYW1pbmc6IHtcclxuXHRcdFx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0XHRzdHJpcEV4dGVuc2lvbjogdHJ1ZSxcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Y3VzdG9tUHJvamVjdHM6IFtdLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZy5jdXN0b21Qcm9qZWN0cykge1xyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnLmN1c3RvbVByb2plY3RzID0gW107XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRmluZCBhbmQgdXBkYXRlIHRoZSBwcm9qZWN0XHJcblx0XHRjb25zdCBpbmRleCA9XHJcblx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWcuY3VzdG9tUHJvamVjdHMuZmluZEluZGV4KFxyXG5cdFx0XHRcdChjcCkgPT4gY3AuaWQgPT09IHVwZGF0ZWRQcm9qZWN0LmlkXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0aWYgKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnLmN1c3RvbVByb2plY3RzW2luZGV4XSA9XHJcblx0XHRcdFx0dXBkYXRlZFByb2plY3Q7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnLmN1c3RvbVByb2plY3RzLnB1c2goXHJcblx0XHRcdFx0dXBkYXRlZFByb2plY3RcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTYXZlIHNldHRpbmdzXHJcblx0XHRhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHJcblx0XHQvLyBSZWZyZXNoIHRoZSBwcm9qZWN0IGxpc3RcclxuXHRcdHRoaXMubG9hZFByb2plY3RzKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGRlbGV0ZVByb2plY3QocHJvamVjdDogUHJvamVjdCkge1xyXG5cdFx0Ly8gQ29uZmlybSBkZWxldGlvblxyXG5cdFx0Y29uc3QgbW9kYWwgPSBuZXcgKGNsYXNzIGV4dGVuZHMgTW9kYWwge1xyXG5cdFx0XHRwcml2YXRlIG9uQ29uZmlybTogKCkgPT4gdm9pZDtcclxuXHJcblx0XHRcdGNvbnN0cnVjdG9yKGFwcDogQXBwLCBvbkNvbmZpcm06ICgpID0+IHZvaWQpIHtcclxuXHRcdFx0XHRzdXBlcihhcHApO1xyXG5cdFx0XHRcdHRoaXMub25Db25maXJtID0gb25Db25maXJtO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRvbk9wZW4oKSB7XHJcblx0XHRcdFx0Y29uc3Qge2NvbnRlbnRFbH0gPSB0aGlzO1xyXG5cdFx0XHRcdGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHt0ZXh0OiB0KFwiRGVsZXRlIFByb2plY3RcIil9KTtcclxuXHRcdFx0XHRjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XHRcdGBBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIFwiJHtcclxuXHRcdFx0XHRcdFx0XHRwcm9qZWN0LmRpc3BsYXlOYW1lIHx8IHByb2plY3QubmFtZVxyXG5cdFx0XHRcdFx0XHR9XCI/YFxyXG5cdFx0XHRcdFx0KSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0XHRcdGNsczogXCJtb2Qtd2FybmluZ1wiLFxyXG5cdFx0XHRcdFx0dGV4dDogdChcIlRoaXMgYWN0aW9uIGNhbm5vdCBiZSB1bmRvbmUuXCIpLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRjb25zdCBidXR0b25Db250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdGNsczogXCJtb2RhbC1idXR0b24tY29udGFpbmVyXCIsXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGNvbnN0IGNhbmNlbEJ0biA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdFx0XHR0ZXh0OiB0KFwiQ2FuY2VsXCIpLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGNhbmNlbEJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5jbG9zZSgpKTtcclxuXHJcblx0XHRcdFx0Y29uc3QgY29uZmlybUJ0biA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdFx0XHR0ZXh0OiB0KFwiRGVsZXRlXCIpLFxyXG5cdFx0XHRcdFx0Y2xzOiBcIm1vZC13YXJuaW5nXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0Y29uZmlybUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5vbkNvbmZpcm0oKTtcclxuXHRcdFx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0b25DbG9zZSgpIHtcclxuXHRcdFx0XHRjb25zdCB7Y29udGVudEVsfSA9IHRoaXM7XHJcblx0XHRcdFx0Y29udGVudEVsLmVtcHR5KCk7XHJcblx0XHRcdH1cclxuXHRcdH0pKHRoaXMucGx1Z2luLmFwcCwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHQvLyBSZW1vdmUgZnJvbSBjdXN0b20gcHJvamVjdHNcclxuXHRcdFx0aWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWc/LmN1c3RvbVByb2plY3RzKSB7XHJcblx0XHRcdFx0Y29uc3QgaW5kZXggPVxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZy5jdXN0b21Qcm9qZWN0cy5maW5kSW5kZXgoXHJcblx0XHRcdFx0XHRcdChjcCkgPT4gY3AuaWQgPT09IHByb2plY3QuaWQgfHwgY3AubmFtZSA9PT0gcHJvamVjdC5uYW1lXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRpZiAoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnLmN1c3RvbVByb2plY3RzLnNwbGljZShcclxuXHRcdFx0XHRcdFx0aW5kZXgsXHJcblx0XHRcdFx0XHRcdDFcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHJcblx0XHRcdFx0XHQvLyBJZiB0aGlzIHdhcyB0aGUgYWN0aXZlIHByb2plY3QsIGNsZWFyIHNlbGVjdGlvblxyXG5cdFx0XHRcdFx0aWYgKHRoaXMuYWN0aXZlUHJvamVjdElkID09PSBwcm9qZWN0LmlkKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc2V0QWN0aXZlUHJvamVjdChudWxsKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5vblByb2plY3RTZWxlY3QoXCJcIik7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gUmVmcmVzaCB0aGUgcHJvamVjdCBsaXN0XHJcblx0XHRcdFx0XHR0aGlzLmxvYWRQcm9qZWN0cygpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0bW9kYWwub3BlbigpO1xyXG5cdH1cclxufVxyXG4iXX0=