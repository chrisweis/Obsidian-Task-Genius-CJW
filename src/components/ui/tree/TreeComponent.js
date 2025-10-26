import { Component } from "obsidian";
import { TreeItemRenderer } from "./TreeItemRenderer";
/**
 * Generic tree component for rendering hierarchical data
 */
export class TreeComponent extends Component {
    constructor(parentEl, config) {
        super();
        this.parentEl = parentEl;
        this.config = config;
        this.tree = null;
        this.selectedNodes = new Set();
        this.expandedNodes = new Set();
        this.nodeRenderers = new Map();
        this.isMultiSelectMode = false;
    }
    onload() {
        // Create container
        this.containerEl = this.parentEl.createDiv({
            cls: `${this.config.classPrefix || 'tree'}-container`
        });
        // Create tree container
        this.treeContainerEl = this.containerEl.createDiv({
            cls: `${this.config.classPrefix || 'tree'}`
        });
        // Set custom indent size if provided (as CSS variable)
        if (this.config.indentSize) {
            this.containerEl.style.setProperty('--tree-indent-size', `${this.config.indentSize}px`);
        }
        // Restore state if configured
        if (this.config.stateKey) {
            this.restoreTreeState();
        }
    }
    /**
     * Set the tree data and render
     */
    setTree(tree) {
        this.tree = tree;
        // Apply auto-expand if configured
        if (this.config.autoExpandLevel !== undefined && this.expandedNodes.size === 0) {
            this.autoExpandToLevel(tree, this.config.autoExpandLevel);
        }
        else if (this.expandedNodes.size > 0) {
            // Restore expanded state
            this.restoreExpandedState(tree);
        }
        // Render the tree
        this.renderTree();
    }
    /**
     * Get the current tree
     */
    getTree() {
        return this.tree;
    }
    /**
     * Render the tree
     */
    renderTree() {
        // Clear existing renderers
        this.clearRenderers();
        // Clear DOM
        this.treeContainerEl.empty();
        if (!this.tree) {
            return;
        }
        // Skip root node if it's a placeholder
        const nodesToRender = this.tree.fullPath === "" ? this.tree.children : [this.tree];
        // Render nodes
        for (const node of nodesToRender) {
            this.renderNode(node, this.treeContainerEl);
        }
        // Update selection visuals
        this.updateSelectionVisuals();
    }
    /**
     * Render a single node and its children
     */
    renderNode(node, parentEl) {
        const container = parentEl.createDiv();
        const renderer = new TreeItemRenderer(container, node, {
            renderContent: this.config.renderContent,
            iconResolver: this.config.iconResolver,
            classPrefix: this.config.classPrefix || 'tree',
            showToggle: this.config.showToggle !== false,
            enableSelection: this.config.enableSelection !== false
        }, {
            onToggle: (node, isExpanded) => {
                this.handleNodeToggle(node, isExpanded);
            },
            onSelect: (node, isMultiSelect) => {
                this.handleNodeSelection(node, isMultiSelect || this.isMultiSelectMode);
            }
        });
        // Store renderer
        this.nodeRenderers.set(node.fullPath, renderer);
        // Apply selection state
        if (this.selectedNodes.has(node.fullPath)) {
            renderer.setSelected(true);
        }
        // Add to component lifecycle
        this.addChild(renderer);
        // Render children if expanded
        if (node.isExpanded && node.children.length > 0) {
            const childrenContainer = container.createDiv({
                cls: `${this.config.classPrefix || 'tree'}-children`
            });
            for (const child of node.children) {
                this.renderNode(child, childrenContainer);
            }
        }
    }
    /**
     * Handle node selection
     */
    handleNodeSelection(node, isMultiSelect) {
        if (!this.config.enableSelection) {
            return;
        }
        if (!isMultiSelect) {
            // Single selection
            this.selectedNodes.clear();
            this.selectedNodes.add(node.fullPath);
        }
        else {
            // Multi-selection
            if (this.selectedNodes.has(node.fullPath)) {
                this.selectedNodes.delete(node.fullPath);
            }
            else {
                this.selectedNodes.add(node.fullPath);
            }
        }
        // Update visuals
        this.updateSelectionVisuals();
        // Trigger event
        if (this.config.onNodeSelected) {
            this.config.onNodeSelected(new Set(this.selectedNodes));
        }
        // Persist state
        if (this.config.stateKey) {
            this.persistTreeState();
        }
    }
    /**
     * Handle node toggle (expand/collapse)
     */
    handleNodeToggle(node, isExpanded) {
        node.isExpanded = isExpanded;
        // Update expanded nodes set
        if (isExpanded) {
            this.expandedNodes.add(node.fullPath);
        }
        else {
            this.expandedNodes.delete(node.fullPath);
        }
        // Re-render tree to show/hide children
        this.renderTree();
        // Trigger event
        if (this.config.onNodeToggled) {
            this.config.onNodeToggled(node, isExpanded);
        }
        // Persist state
        if (this.config.stateKey) {
            this.persistTreeState();
        }
    }
    /**
     * Update visual selection state for all nodes
     */
    updateSelectionVisuals() {
        for (const [path, renderer] of this.nodeRenderers) {
            renderer.setSelected(this.selectedNodes.has(path));
        }
    }
    /**
     * Clear all renderers
     */
    clearRenderers() {
        for (const renderer of this.nodeRenderers.values()) {
            this.removeChild(renderer);
        }
        this.nodeRenderers.clear();
    }
    /**
     * Auto-expand nodes to a certain level
     */
    autoExpandToLevel(node, level, currentLevel = 0) {
        if (currentLevel < level) {
            node.isExpanded = true;
            this.expandedNodes.add(node.fullPath);
            for (const child of node.children) {
                this.autoExpandToLevel(child, level, currentLevel + 1);
            }
        }
    }
    /**
     * Restore expanded state from saved set
     */
    restoreExpandedState(node) {
        node.isExpanded = this.expandedNodes.has(node.fullPath) || node.fullPath === "";
        for (const child of node.children) {
            this.restoreExpandedState(child);
        }
    }
    /**
     * Toggle multi-select mode
     */
    setMultiSelectMode(enabled) {
        this.isMultiSelectMode = enabled;
        if (!enabled && this.selectedNodes.size === 0) {
            // Clear selection when disabling multi-select with no selection
            this.updateSelectionVisuals();
        }
        // Trigger event
        if (this.config.onMultiSelectToggled) {
            this.config.onMultiSelectToggled(enabled);
        }
    }
    /**
     * Get multi-select mode status
     */
    getMultiSelectMode() {
        return this.isMultiSelectMode;
    }
    /**
     * Get selected node paths
     */
    getSelectedPaths() {
        return new Set(this.selectedNodes);
    }
    /**
     * Set selected node paths
     */
    setSelectedPaths(paths) {
        this.selectedNodes = new Set(paths);
        this.updateSelectionVisuals();
        // Trigger event
        if (this.config.onNodeSelected) {
            this.config.onNodeSelected(new Set(this.selectedNodes));
        }
    }
    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedNodes.clear();
        this.updateSelectionVisuals();
        // Trigger event
        if (this.config.onNodeSelected) {
            this.config.onNodeSelected(new Set());
        }
    }
    /**
     * Expand all nodes
     */
    expandAll() {
        if (!this.tree)
            return;
        const expandNode = (node) => {
            node.isExpanded = true;
            this.expandedNodes.add(node.fullPath);
            node.children.forEach(expandNode);
        };
        expandNode(this.tree);
        this.renderTree();
        // Persist state
        if (this.config.stateKey) {
            this.persistTreeState();
        }
    }
    /**
     * Collapse all nodes
     */
    collapseAll() {
        if (!this.tree)
            return;
        const collapseNode = (node) => {
            node.isExpanded = false;
            node.children.forEach(collapseNode);
        };
        collapseNode(this.tree);
        this.expandedNodes.clear();
        this.renderTree();
        // Persist state
        if (this.config.stateKey) {
            this.persistTreeState();
        }
    }
    /**
     * Find node by path
     */
    findNodeByPath(path) {
        if (!this.tree)
            return undefined;
        const search = (node) => {
            if (node.fullPath === path) {
                return node;
            }
            for (const child of node.children) {
                const found = search(child);
                if (found)
                    return found;
            }
            return undefined;
        };
        return search(this.tree);
    }
    /**
     * Persist tree state to localStorage
     */
    persistTreeState() {
        if (!this.config.stateKey)
            return;
        const state = {
            expandedNodes: Array.from(this.expandedNodes),
            selectedNodes: Array.from(this.selectedNodes)
        };
        localStorage.setItem(this.config.stateKey, JSON.stringify(state));
    }
    /**
     * Restore tree state from localStorage
     */
    restoreTreeState() {
        if (!this.config.stateKey)
            return;
        try {
            const stored = localStorage.getItem(this.config.stateKey);
            if (stored) {
                const state = JSON.parse(stored);
                this.expandedNodes = new Set(state.expandedNodes || []);
                this.selectedNodes = new Set(state.selectedNodes || []);
            }
        }
        catch (e) {
            console.error('Failed to restore tree state:', e);
        }
    }
    onunload() {
        // Clear renderers
        this.clearRenderers();
        // Clear DOM
        if (this.containerEl) {
            this.containerEl.empty();
            this.containerEl.remove();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJlZUNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRyZWVDb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUVyQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQTJCdEQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sYUFBaUIsU0FBUSxTQUFTO0lBUzlDLFlBQ1MsUUFBcUIsRUFDckIsTUFBOEI7UUFFdEMsS0FBSyxFQUFFLENBQUM7UUFIQSxhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ3JCLFdBQU0sR0FBTixNQUFNLENBQXdCO1FBUi9CLFNBQUksR0FBdUIsSUFBSSxDQUFDO1FBQ2hDLGtCQUFhLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDdkMsa0JBQWEsR0FBZ0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN2QyxrQkFBYSxHQUFxQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzVELHNCQUFpQixHQUFZLEtBQUssQ0FBQztJQU8zQyxDQUFDO0lBRUQsTUFBTTtRQUNMLG1CQUFtQjtRQUNuQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDO1lBQzFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxJQUFJLE1BQU0sWUFBWTtTQUNyRCxDQUFDLENBQUM7UUFFSCx3QkFBd0I7UUFDeEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQztZQUNqRCxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsSUFBSSxNQUFNLEVBQUU7U0FDM0MsQ0FBQyxDQUFDO1FBRUgsdURBQXVEO1FBQ3ZELElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUU7WUFDM0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxL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RztJQUNLLGdCQUFnQjtRQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRO1lBQUUsT0FBTztRQUVsQyxJQUFJO1lBQ0gsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFELElBQUksTUFBTSxFQUFFO2dCQUNYLE1BQU0sS0FBSyxHQUFjLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzVDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDeEQsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2FBQ3hEO1NBQ0Q7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNYLE9BQU8sQ0FBQyxLQUFLLENBQUMsK0JBQStCLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDbEQ7SUFDRixDQUFDO0lBRUQsUUFBUTtRQUNQLGtCQUFrQjtRQUNsQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFdEIsWUFBWTtRQUNaLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNyQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUM7U0FDMUI7SUFDRixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVHJlZU5vZGUsIFRyZWVTdGF0ZSB9IGZyb20gXCJAL3R5cGVzL3RyZWVcIjtcclxuaW1wb3J0IHsgVHJlZUl0ZW1SZW5kZXJlciB9IGZyb20gXCIuL1RyZWVJdGVtUmVuZGVyZXJcIjtcclxuXHJcbi8qKlxyXG4gKiBDb25maWd1cmF0aW9uIGZvciBUcmVlQ29tcG9uZW50XHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFRyZWVDb21wb25lbnRDb25maWc8VD4ge1xyXG5cdC8vIFZpc3VhbCBjb25maWd1cmF0aW9uXHJcblx0Y2xhc3NQcmVmaXg/OiBzdHJpbmc7XHJcblx0aW5kZW50U2l6ZT86IG51bWJlcjtcclxuXHRzaG93VG9nZ2xlPzogYm9vbGVhbjtcclxuXHRlbmFibGVTZWxlY3Rpb24/OiBib29sZWFuO1xyXG5cdGVuYWJsZU11bHRpU2VsZWN0PzogYm9vbGVhbjtcclxuXHRcclxuXHQvLyBDb250ZW50IHJlbmRlcmluZ1xyXG5cdHJlbmRlckNvbnRlbnQ6IChub2RlOiBUcmVlTm9kZTxUPiwgY29udGVudEVsOiBIVE1MRWxlbWVudCkgPT4gdm9pZDtcclxuXHRpY29uUmVzb2x2ZXI/OiAobm9kZTogVHJlZU5vZGU8VD4pID0+IHN0cmluZztcclxuXHRcclxuXHQvLyBTdGF0ZSBwZXJzaXN0ZW5jZVxyXG5cdHN0YXRlS2V5Pzogc3RyaW5nO1xyXG5cdGF1dG9FeHBhbmRMZXZlbD86IG51bWJlcjtcclxuXHRcclxuXHQvLyBFdmVudCBoYW5kbGVyc1xyXG5cdG9uTm9kZVNlbGVjdGVkPzogKHNlbGVjdGVkTm9kZXM6IFNldDxzdHJpbmc+KSA9PiB2b2lkO1xyXG5cdG9uTm9kZVRvZ2dsZWQ/OiAobm9kZTogVHJlZU5vZGU8VD4sIGlzRXhwYW5kZWQ6IGJvb2xlYW4pID0+IHZvaWQ7XHJcblx0b25NdWx0aVNlbGVjdFRvZ2dsZWQ/OiAoaXNNdWx0aVNlbGVjdDogYm9vbGVhbikgPT4gdm9pZDtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyaWMgdHJlZSBjb21wb25lbnQgZm9yIHJlbmRlcmluZyBoaWVyYXJjaGljYWwgZGF0YVxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFRyZWVDb21wb25lbnQ8VD4gZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgdHJlZUNvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHRyZWU6IFRyZWVOb2RlPFQ+IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBzZWxlY3RlZE5vZGVzOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKTtcclxuXHRwcml2YXRlIGV4cGFuZGVkTm9kZXM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpO1xyXG5cdHByaXZhdGUgbm9kZVJlbmRlcmVyczogTWFwPHN0cmluZywgVHJlZUl0ZW1SZW5kZXJlcjxUPj4gPSBuZXcgTWFwKCk7XHJcblx0cHJpdmF0ZSBpc011bHRpU2VsZWN0TW9kZTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdFxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBwYXJlbnRFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRwcml2YXRlIGNvbmZpZzogVHJlZUNvbXBvbmVudENvbmZpZzxUPlxyXG5cdCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHR9XHJcblx0XHJcblx0b25sb2FkKCk6IHZvaWQge1xyXG5cdFx0Ly8gQ3JlYXRlIGNvbnRhaW5lclxyXG5cdFx0dGhpcy5jb250YWluZXJFbCA9IHRoaXMucGFyZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBgJHt0aGlzLmNvbmZpZy5jbGFzc1ByZWZpeCB8fCAndHJlZSd9LWNvbnRhaW5lcmBcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHQvLyBDcmVhdGUgdHJlZSBjb250YWluZXJcclxuXHRcdHRoaXMudHJlZUNvbnRhaW5lckVsID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IGAke3RoaXMuY29uZmlnLmNsYXNzUHJlZml4IHx8ICd0cmVlJ31gXHJcblx0XHR9KTtcclxuXHRcdFxyXG5cdFx0Ly8gU2V0IGN1c3RvbSBpbmRlbnQgc2l6ZSBpZiBwcm92aWRlZCAoYXMgQ1NTIHZhcmlhYmxlKVxyXG5cdFx0aWYgKHRoaXMuY29uZmlnLmluZGVudFNpemUpIHtcclxuXHRcdFx0dGhpcy5jb250YWluZXJFbC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS10cmVlLWluZGVudC1zaXplJywgYCR7dGhpcy5jb25maWcuaW5kZW50U2l6ZX1weGApO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBSZXN0b3JlIHN0YXRlIGlmIGNvbmZpZ3VyZWRcclxuXHRcdGlmICh0aGlzLmNvbmZpZy5zdGF0ZUtleSkge1xyXG5cdFx0XHR0aGlzLnJlc3RvcmVUcmVlU3RhdGUoKTtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0LyoqXHJcblx0ICogU2V0IHRoZSB0cmVlIGRhdGEgYW5kIHJlbmRlclxyXG5cdCAqL1xyXG5cdHB1YmxpYyBzZXRUcmVlKHRyZWU6IFRyZWVOb2RlPFQ+KTogdm9pZCB7XHJcblx0XHR0aGlzLnRyZWUgPSB0cmVlO1xyXG5cdFx0XHJcblx0XHQvLyBBcHBseSBhdXRvLWV4cGFuZCBpZiBjb25maWd1cmVkXHJcblx0XHRpZiAodGhpcy5jb25maWcuYXV0b0V4cGFuZExldmVsICE9PSB1bmRlZmluZWQgJiYgdGhpcy5leHBhbmRlZE5vZGVzLnNpemUgPT09IDApIHtcclxuXHRcdFx0dGhpcy5hdXRvRXhwYW5kVG9MZXZlbCh0cmVlLCB0aGlzLmNvbmZpZy5hdXRvRXhwYW5kTGV2ZWwpO1xyXG5cdFx0fSBlbHNlIGlmICh0aGlzLmV4cGFuZGVkTm9kZXMuc2l6ZSA+IDApIHtcclxuXHRcdFx0Ly8gUmVzdG9yZSBleHBhbmRlZCBzdGF0ZVxyXG5cdFx0XHR0aGlzLnJlc3RvcmVFeHBhbmRlZFN0YXRlKHRyZWUpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBSZW5kZXIgdGhlIHRyZWVcclxuXHRcdHRoaXMucmVuZGVyVHJlZSgpO1xyXG5cdH1cclxuXHRcclxuXHQvKipcclxuXHQgKiBHZXQgdGhlIGN1cnJlbnQgdHJlZVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBnZXRUcmVlKCk6IFRyZWVOb2RlPFQ+IHwgbnVsbCB7XHJcblx0XHRyZXR1cm4gdGhpcy50cmVlO1xyXG5cdH1cclxuXHRcclxuXHQvKipcclxuXHQgKiBSZW5kZXIgdGhlIHRyZWVcclxuXHQgKi9cclxuXHRwcml2YXRlIHJlbmRlclRyZWUoKTogdm9pZCB7XHJcblx0XHQvLyBDbGVhciBleGlzdGluZyByZW5kZXJlcnNcclxuXHRcdHRoaXMuY2xlYXJSZW5kZXJlcnMoKTtcclxuXHRcdFxyXG5cdFx0Ly8gQ2xlYXIgRE9NXHJcblx0XHR0aGlzLnRyZWVDb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdFx0XHJcblx0XHRpZiAoIXRoaXMudHJlZSkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIFNraXAgcm9vdCBub2RlIGlmIGl0J3MgYSBwbGFjZWhvbGRlclxyXG5cdFx0Y29uc3Qgbm9kZXNUb1JlbmRlciA9IHRoaXMudHJlZS5mdWxsUGF0aCA9PT0gXCJcIiA/IHRoaXMudHJlZS5jaGlsZHJlbiA6IFt0aGlzLnRyZWVdO1xyXG5cdFx0XHJcblx0XHQvLyBSZW5kZXIgbm9kZXNcclxuXHRcdGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlc1RvUmVuZGVyKSB7XHJcblx0XHRcdHRoaXMucmVuZGVyTm9kZShub2RlLCB0aGlzLnRyZWVDb250YWluZXJFbCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIFVwZGF0ZSBzZWxlY3Rpb24gdmlzdWFsc1xyXG5cdFx0dGhpcy51cGRhdGVTZWxlY3Rpb25WaXN1YWxzKCk7XHJcblx0fVxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIFJlbmRlciBhIHNpbmdsZSBub2RlIGFuZCBpdHMgY2hpbGRyZW5cclxuXHQgKi9cclxuXHRwcml2YXRlIHJlbmRlck5vZGUobm9kZTogVHJlZU5vZGU8VD4sIHBhcmVudEVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgY29udGFpbmVyID0gcGFyZW50RWwuY3JlYXRlRGl2KCk7XHJcblx0XHRcclxuXHRcdGNvbnN0IHJlbmRlcmVyID0gbmV3IFRyZWVJdGVtUmVuZGVyZXI8VD4oXHJcblx0XHRcdGNvbnRhaW5lcixcclxuXHRcdFx0bm9kZSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHJlbmRlckNvbnRlbnQ6IHRoaXMuY29uZmlnLnJlbmRlckNvbnRlbnQsXHJcblx0XHRcdFx0aWNvblJlc29sdmVyOiB0aGlzLmNvbmZpZy5pY29uUmVzb2x2ZXIsXHJcblx0XHRcdFx0Y2xhc3NQcmVmaXg6IHRoaXMuY29uZmlnLmNsYXNzUHJlZml4IHx8ICd0cmVlJyxcclxuXHRcdFx0XHRzaG93VG9nZ2xlOiB0aGlzLmNvbmZpZy5zaG93VG9nZ2xlICE9PSBmYWxzZSxcclxuXHRcdFx0XHRlbmFibGVTZWxlY3Rpb246IHRoaXMuY29uZmlnLmVuYWJsZVNlbGVjdGlvbiAhPT0gZmFsc2VcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG9uVG9nZ2xlOiAobm9kZSwgaXNFeHBhbmRlZCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5oYW5kbGVOb2RlVG9nZ2xlKG5vZGUsIGlzRXhwYW5kZWQpO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b25TZWxlY3Q6IChub2RlLCBpc011bHRpU2VsZWN0KSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmhhbmRsZU5vZGVTZWxlY3Rpb24obm9kZSwgaXNNdWx0aVNlbGVjdCB8fCB0aGlzLmlzTXVsdGlTZWxlY3RNb2RlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblx0XHRcclxuXHRcdC8vIFN0b3JlIHJlbmRlcmVyXHJcblx0XHR0aGlzLm5vZGVSZW5kZXJlcnMuc2V0KG5vZGUuZnVsbFBhdGgsIHJlbmRlcmVyKTtcclxuXHRcdFxyXG5cdFx0Ly8gQXBwbHkgc2VsZWN0aW9uIHN0YXRlXHJcblx0XHRpZiAodGhpcy5zZWxlY3RlZE5vZGVzLmhhcyhub2RlLmZ1bGxQYXRoKSkge1xyXG5cdFx0XHRyZW5kZXJlci5zZXRTZWxlY3RlZCh0cnVlKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8gQWRkIHRvIGNvbXBvbmVudCBsaWZlY3ljbGVcclxuXHRcdHRoaXMuYWRkQ2hpbGQocmVuZGVyZXIpO1xyXG5cdFx0XHJcblx0XHQvLyBSZW5kZXIgY2hpbGRyZW4gaWYgZXhwYW5kZWRcclxuXHRcdGlmIChub2RlLmlzRXhwYW5kZWQgJiYgbm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGNvbnN0IGNoaWxkcmVuQ29udGFpbmVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBgJHt0aGlzLmNvbmZpZy5jbGFzc1ByZWZpeCB8fCAndHJlZSd9LWNoaWxkcmVuYFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHJcblx0XHRcdGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xyXG5cdFx0XHRcdHRoaXMucmVuZGVyTm9kZShjaGlsZCwgY2hpbGRyZW5Db250YWluZXIpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBub2RlIHNlbGVjdGlvblxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaGFuZGxlTm9kZVNlbGVjdGlvbihub2RlOiBUcmVlTm9kZTxUPiwgaXNNdWx0aVNlbGVjdDogYm9vbGVhbik6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLmNvbmZpZy5lbmFibGVTZWxlY3Rpb24pIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRpZiAoIWlzTXVsdGlTZWxlY3QpIHtcclxuXHRcdFx0Ly8gU2luZ2xlIHNlbGVjdGlvblxyXG5cdFx0XHR0aGlzLnNlbGVjdGVkTm9kZXMuY2xlYXIoKTtcclxuXHRcdFx0dGhpcy5zZWxlY3RlZE5vZGVzLmFkZChub2RlLmZ1bGxQYXRoKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIE11bHRpLXNlbGVjdGlvblxyXG5cdFx0XHRpZiAodGhpcy5zZWxlY3RlZE5vZGVzLmhhcyhub2RlLmZ1bGxQYXRoKSkge1xyXG5cdFx0XHRcdHRoaXMuc2VsZWN0ZWROb2Rlcy5kZWxldGUobm9kZS5mdWxsUGF0aCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5zZWxlY3RlZE5vZGVzLmFkZChub2RlLmZ1bGxQYXRoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBVcGRhdGUgdmlzdWFsc1xyXG5cdFx0dGhpcy51cGRhdGVTZWxlY3Rpb25WaXN1YWxzKCk7XHJcblx0XHRcclxuXHRcdC8vIFRyaWdnZXIgZXZlbnRcclxuXHRcdGlmICh0aGlzLmNvbmZpZy5vbk5vZGVTZWxlY3RlZCkge1xyXG5cdFx0XHR0aGlzLmNvbmZpZy5vbk5vZGVTZWxlY3RlZChuZXcgU2V0KHRoaXMuc2VsZWN0ZWROb2RlcykpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBQZXJzaXN0IHN0YXRlXHJcblx0XHRpZiAodGhpcy5jb25maWcuc3RhdGVLZXkpIHtcclxuXHRcdFx0dGhpcy5wZXJzaXN0VHJlZVN0YXRlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBub2RlIHRvZ2dsZSAoZXhwYW5kL2NvbGxhcHNlKVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaGFuZGxlTm9kZVRvZ2dsZShub2RlOiBUcmVlTm9kZTxUPiwgaXNFeHBhbmRlZDogYm9vbGVhbik6IHZvaWQge1xyXG5cdFx0bm9kZS5pc0V4cGFuZGVkID0gaXNFeHBhbmRlZDtcclxuXHRcdFxyXG5cdFx0Ly8gVXBkYXRlIGV4cGFuZGVkIG5vZGVzIHNldFxyXG5cdFx0aWYgKGlzRXhwYW5kZWQpIHtcclxuXHRcdFx0dGhpcy5leHBhbmRlZE5vZGVzLmFkZChub2RlLmZ1bGxQYXRoKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuZXhwYW5kZWROb2Rlcy5kZWxldGUobm9kZS5mdWxsUGF0aCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIFJlLXJlbmRlciB0cmVlIHRvIHNob3cvaGlkZSBjaGlsZHJlblxyXG5cdFx0dGhpcy5yZW5kZXJUcmVlKCk7XHJcblx0XHRcclxuXHRcdC8vIFRyaWdnZXIgZXZlbnRcclxuXHRcdGlmICh0aGlzLmNvbmZpZy5vbk5vZGVUb2dnbGVkKSB7XHJcblx0XHRcdHRoaXMuY29uZmlnLm9uTm9kZVRvZ2dsZWQobm9kZSwgaXNFeHBhbmRlZCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIFBlcnNpc3Qgc3RhdGVcclxuXHRcdGlmICh0aGlzLmNvbmZpZy5zdGF0ZUtleSkge1xyXG5cdFx0XHR0aGlzLnBlcnNpc3RUcmVlU3RhdGUoKTtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHZpc3VhbCBzZWxlY3Rpb24gc3RhdGUgZm9yIGFsbCBub2Rlc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgdXBkYXRlU2VsZWN0aW9uVmlzdWFscygpOiB2b2lkIHtcclxuXHRcdGZvciAoY29uc3QgW3BhdGgsIHJlbmRlcmVyXSBvZiB0aGlzLm5vZGVSZW5kZXJlcnMpIHtcclxuXHRcdFx0cmVuZGVyZXIuc2V0U2VsZWN0ZWQodGhpcy5zZWxlY3RlZE5vZGVzLmhhcyhwYXRoKSk7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIENsZWFyIGFsbCByZW5kZXJlcnNcclxuXHQgKi9cclxuXHRwcml2YXRlIGNsZWFyUmVuZGVyZXJzKCk6IHZvaWQge1xyXG5cdFx0Zm9yIChjb25zdCByZW5kZXJlciBvZiB0aGlzLm5vZGVSZW5kZXJlcnMudmFsdWVzKCkpIHtcclxuXHRcdFx0dGhpcy5yZW1vdmVDaGlsZChyZW5kZXJlcik7XHJcblx0XHR9XHJcblx0XHR0aGlzLm5vZGVSZW5kZXJlcnMuY2xlYXIoKTtcclxuXHR9XHJcblx0XHJcblx0LyoqXHJcblx0ICogQXV0by1leHBhbmQgbm9kZXMgdG8gYSBjZXJ0YWluIGxldmVsXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhdXRvRXhwYW5kVG9MZXZlbChub2RlOiBUcmVlTm9kZTxUPiwgbGV2ZWw6IG51bWJlciwgY3VycmVudExldmVsOiBudW1iZXIgPSAwKTogdm9pZCB7XHJcblx0XHRpZiAoY3VycmVudExldmVsIDwgbGV2ZWwpIHtcclxuXHRcdFx0bm9kZS5pc0V4cGFuZGVkID0gdHJ1ZTtcclxuXHRcdFx0dGhpcy5leHBhbmRlZE5vZGVzLmFkZChub2RlLmZ1bGxQYXRoKTtcclxuXHRcdFx0XHJcblx0XHRcdGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xyXG5cdFx0XHRcdHRoaXMuYXV0b0V4cGFuZFRvTGV2ZWwoY2hpbGQsIGxldmVsLCBjdXJyZW50TGV2ZWwgKyAxKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHQvKipcclxuXHQgKiBSZXN0b3JlIGV4cGFuZGVkIHN0YXRlIGZyb20gc2F2ZWQgc2V0XHJcblx0ICovXHJcblx0cHJpdmF0ZSByZXN0b3JlRXhwYW5kZWRTdGF0ZShub2RlOiBUcmVlTm9kZTxUPik6IHZvaWQge1xyXG5cdFx0bm9kZS5pc0V4cGFuZGVkID0gdGhpcy5leHBhbmRlZE5vZGVzLmhhcyhub2RlLmZ1bGxQYXRoKSB8fCBub2RlLmZ1bGxQYXRoID09PSBcIlwiO1xyXG5cdFx0XHJcblx0XHRmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcclxuXHRcdFx0dGhpcy5yZXN0b3JlRXhwYW5kZWRTdGF0ZShjaGlsZCk7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIFRvZ2dsZSBtdWx0aS1zZWxlY3QgbW9kZVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBzZXRNdWx0aVNlbGVjdE1vZGUoZW5hYmxlZDogYm9vbGVhbik6IHZvaWQge1xyXG5cdFx0dGhpcy5pc011bHRpU2VsZWN0TW9kZSA9IGVuYWJsZWQ7XHJcblx0XHRcclxuXHRcdGlmICghZW5hYmxlZCAmJiB0aGlzLnNlbGVjdGVkTm9kZXMuc2l6ZSA9PT0gMCkge1xyXG5cdFx0XHQvLyBDbGVhciBzZWxlY3Rpb24gd2hlbiBkaXNhYmxpbmcgbXVsdGktc2VsZWN0IHdpdGggbm8gc2VsZWN0aW9uXHJcblx0XHRcdHRoaXMudXBkYXRlU2VsZWN0aW9uVmlzdWFscygpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBUcmlnZ2VyIGV2ZW50XHJcblx0XHRpZiAodGhpcy5jb25maWcub25NdWx0aVNlbGVjdFRvZ2dsZWQpIHtcclxuXHRcdFx0dGhpcy5jb25maWcub25NdWx0aVNlbGVjdFRvZ2dsZWQoZW5hYmxlZCk7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIEdldCBtdWx0aS1zZWxlY3QgbW9kZSBzdGF0dXNcclxuXHQgKi9cclxuXHRwdWJsaWMgZ2V0TXVsdGlTZWxlY3RNb2RlKCk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuaXNNdWx0aVNlbGVjdE1vZGU7XHJcblx0fVxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIEdldCBzZWxlY3RlZCBub2RlIHBhdGhzXHJcblx0ICovXHJcblx0cHVibGljIGdldFNlbGVjdGVkUGF0aHMoKTogU2V0PHN0cmluZz4ge1xyXG5cdFx0cmV0dXJuIG5ldyBTZXQodGhpcy5zZWxlY3RlZE5vZGVzKTtcclxuXHR9XHJcblx0XHJcblx0LyoqXHJcblx0ICogU2V0IHNlbGVjdGVkIG5vZGUgcGF0aHNcclxuXHQgKi9cclxuXHRwdWJsaWMgc2V0U2VsZWN0ZWRQYXRocyhwYXRoczogU2V0PHN0cmluZz4pOiB2b2lkIHtcclxuXHRcdHRoaXMuc2VsZWN0ZWROb2RlcyA9IG5ldyBTZXQocGF0aHMpO1xyXG5cdFx0dGhpcy51cGRhdGVTZWxlY3Rpb25WaXN1YWxzKCk7XHJcblx0XHRcclxuXHRcdC8vIFRyaWdnZXIgZXZlbnRcclxuXHRcdGlmICh0aGlzLmNvbmZpZy5vbk5vZGVTZWxlY3RlZCkge1xyXG5cdFx0XHR0aGlzLmNvbmZpZy5vbk5vZGVTZWxlY3RlZChuZXcgU2V0KHRoaXMuc2VsZWN0ZWROb2RlcykpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHQvKipcclxuXHQgKiBDbGVhciBzZWxlY3Rpb25cclxuXHQgKi9cclxuXHRwdWJsaWMgY2xlYXJTZWxlY3Rpb24oKTogdm9pZCB7XHJcblx0XHR0aGlzLnNlbGVjdGVkTm9kZXMuY2xlYXIoKTtcclxuXHRcdHRoaXMudXBkYXRlU2VsZWN0aW9uVmlzdWFscygpO1xyXG5cdFx0XHJcblx0XHQvLyBUcmlnZ2VyIGV2ZW50XHJcblx0XHRpZiAodGhpcy5jb25maWcub25Ob2RlU2VsZWN0ZWQpIHtcclxuXHRcdFx0dGhpcy5jb25maWcub25Ob2RlU2VsZWN0ZWQobmV3IFNldCgpKTtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0LyoqXHJcblx0ICogRXhwYW5kIGFsbCBub2Rlc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBleHBhbmRBbGwoKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMudHJlZSkgcmV0dXJuO1xyXG5cdFx0XHJcblx0XHRjb25zdCBleHBhbmROb2RlID0gKG5vZGU6IFRyZWVOb2RlPFQ+KSA9PiB7XHJcblx0XHRcdG5vZGUuaXNFeHBhbmRlZCA9IHRydWU7XHJcblx0XHRcdHRoaXMuZXhwYW5kZWROb2Rlcy5hZGQobm9kZS5mdWxsUGF0aCk7XHJcblx0XHRcdG5vZGUuY2hpbGRyZW4uZm9yRWFjaChleHBhbmROb2RlKTtcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdGV4cGFuZE5vZGUodGhpcy50cmVlKTtcclxuXHRcdHRoaXMucmVuZGVyVHJlZSgpO1xyXG5cdFx0XHJcblx0XHQvLyBQZXJzaXN0IHN0YXRlXHJcblx0XHRpZiAodGhpcy5jb25maWcuc3RhdGVLZXkpIHtcclxuXHRcdFx0dGhpcy5wZXJzaXN0VHJlZVN0YXRlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIENvbGxhcHNlIGFsbCBub2Rlc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBjb2xsYXBzZUFsbCgpOiB2b2lkIHtcclxuXHRcdGlmICghdGhpcy50cmVlKSByZXR1cm47XHJcblx0XHRcclxuXHRcdGNvbnN0IGNvbGxhcHNlTm9kZSA9IChub2RlOiBUcmVlTm9kZTxUPikgPT4ge1xyXG5cdFx0XHRub2RlLmlzRXhwYW5kZWQgPSBmYWxzZTtcclxuXHRcdFx0bm9kZS5jaGlsZHJlbi5mb3JFYWNoKGNvbGxhcHNlTm9kZSk7XHJcblx0XHR9O1xyXG5cdFx0XHJcblx0XHRjb2xsYXBzZU5vZGUodGhpcy50cmVlKTtcclxuXHRcdHRoaXMuZXhwYW5kZWROb2Rlcy5jbGVhcigpO1xyXG5cdFx0dGhpcy5yZW5kZXJUcmVlKCk7XHJcblx0XHRcclxuXHRcdC8vIFBlcnNpc3Qgc3RhdGVcclxuXHRcdGlmICh0aGlzLmNvbmZpZy5zdGF0ZUtleSkge1xyXG5cdFx0XHR0aGlzLnBlcnNpc3RUcmVlU3RhdGUoKTtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0LyoqXHJcblx0ICogRmluZCBub2RlIGJ5IHBhdGhcclxuXHQgKi9cclxuXHRwdWJsaWMgZmluZE5vZGVCeVBhdGgocGF0aDogc3RyaW5nKTogVHJlZU5vZGU8VD4gfCB1bmRlZmluZWQge1xyXG5cdFx0aWYgKCF0aGlzLnRyZWUpIHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHRcclxuXHRcdGNvbnN0IHNlYXJjaCA9IChub2RlOiBUcmVlTm9kZTxUPik6IFRyZWVOb2RlPFQ+IHwgdW5kZWZpbmVkID0+IHtcclxuXHRcdFx0aWYgKG5vZGUuZnVsbFBhdGggPT09IHBhdGgpIHtcclxuXHRcdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Zm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XHJcblx0XHRcdFx0Y29uc3QgZm91bmQgPSBzZWFyY2goY2hpbGQpO1xyXG5cdFx0XHRcdGlmIChmb3VuZCkgcmV0dXJuIGZvdW5kO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdFx0fTtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIHNlYXJjaCh0aGlzLnRyZWUpO1xyXG5cdH1cclxuXHRcclxuXHQvKipcclxuXHQgKiBQZXJzaXN0IHRyZWUgc3RhdGUgdG8gbG9jYWxTdG9yYWdlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBwZXJzaXN0VHJlZVN0YXRlKCk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLmNvbmZpZy5zdGF0ZUtleSkgcmV0dXJuO1xyXG5cdFx0XHJcblx0XHRjb25zdCBzdGF0ZTogVHJlZVN0YXRlID0ge1xyXG5cdFx0XHRleHBhbmRlZE5vZGVzOiBBcnJheS5mcm9tKHRoaXMuZXhwYW5kZWROb2RlcyksXHJcblx0XHRcdHNlbGVjdGVkTm9kZXM6IEFycmF5LmZyb20odGhpcy5zZWxlY3RlZE5vZGVzKVxyXG5cdFx0fTtcclxuXHRcdFxyXG5cdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0odGhpcy5jb25maWcuc3RhdGVLZXksIEpTT04uc3RyaW5naWZ5KHN0YXRlKSk7XHJcblx0fVxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIFJlc3RvcmUgdHJlZSBzdGF0ZSBmcm9tIGxvY2FsU3RvcmFnZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVzdG9yZVRyZWVTdGF0ZSgpOiB2b2lkIHtcclxuXHRcdGlmICghdGhpcy5jb25maWcuc3RhdGVLZXkpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3Qgc3RvcmVkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5jb25maWcuc3RhdGVLZXkpO1xyXG5cdFx0XHRpZiAoc3RvcmVkKSB7XHJcblx0XHRcdFx0Y29uc3Qgc3RhdGU6IFRyZWVTdGF0ZSA9IEpTT04ucGFyc2Uoc3RvcmVkKTtcclxuXHRcdFx0XHR0aGlzLmV4cGFuZGVkTm9kZXMgPSBuZXcgU2V0KHN0YXRlLmV4cGFuZGVkTm9kZXMgfHwgW10pO1xyXG5cdFx0XHRcdHRoaXMuc2VsZWN0ZWROb2RlcyA9IG5ldyBTZXQoc3RhdGUuc2VsZWN0ZWROb2RlcyB8fCBbXSk7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcignRmFpbGVkIHRvIHJlc3RvcmUgdHJlZSBzdGF0ZTonLCBlKTtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0b251bmxvYWQoKTogdm9pZCB7XHJcblx0XHQvLyBDbGVhciByZW5kZXJlcnNcclxuXHRcdHRoaXMuY2xlYXJSZW5kZXJlcnMoKTtcclxuXHRcdFxyXG5cdFx0Ly8gQ2xlYXIgRE9NXHJcblx0XHRpZiAodGhpcy5jb250YWluZXJFbCkge1xyXG5cdFx0XHR0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblx0XHRcdHRoaXMuY29udGFpbmVyRWwucmVtb3ZlKCk7XHJcblx0XHR9XHJcblx0fVxyXG59Il19