/**
 * Tests for Canvas task updater functionality
 */
import { __awaiter } from "tslib";
import { CanvasTaskUpdater } from '../parsers/canvas-task-updater';
// Mock Vault and TFile
class MockVault {
    constructor() {
        this.files = new Map();
    }
    getFileByPath(path) {
        if (this.files.has(path)) {
            return new MockTFile(path);
        }
        return null;
    }
    read(file) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.files.get(file.path) || '';
        });
    }
    modify(file, content) {
        return __awaiter(this, void 0, void 0, function* () {
            this.files.set(file.path, content);
        });
    }
    setFileContent(path, content) {
        this.files.set(path, content);
    }
    getFileContent(path) {
        return this.files.get(path);
    }
}
class MockTFile {
    constructor(path) {
        this.path = path;
    }
    // Add properties to make it compatible with TFile interface
    get name() {
        return this.path.split('/').pop() || '';
    }
    get extension() {
        return this.path.split('.').pop() || '';
    }
}
// Mock Plugin
class MockPlugin {
    constructor() {
        this.settings = {
            preferMetadataFormat: 'tasks',
            projectTagPrefix: {
                tasks: 'project',
                dataview: 'project'
            },
            contextTagPrefix: {
                tasks: '@',
                dataview: 'context'
            }
        };
    }
}
describe('CanvasTaskUpdater', () => {
    let mockVault;
    let mockPlugin;
    let updater;
    beforeEach(() => {
        mockVault = new MockVault();
        mockPlugin = new MockPlugin();
        updater = new CanvasTaskUpdater(mockVault, mockPlugin);
    });
    describe('isCanvasTask', () => {
        it('should identify Canvas tasks correctly', () => {
            const canvasTask = {
                id: 'test-1',
                content: 'Test task',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Test task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };
            const markdownTask = {
                id: 'test-2',
                content: 'Test task',
                filePath: 'test.md',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Test task',
                metadata: {
                    tags: [],
                    children: []
                }
            };
            expect(CanvasTaskUpdater.isCanvasTask(canvasTask)).toBe(true);
            expect(CanvasTaskUpdater.isCanvasTask(markdownTask)).toBe(false);
        });
    });
    describe('updateCanvasTask', () => {
        const sampleCanvasData = {
            nodes: [
                {
                    id: 'node-1',
                    type: 'text',
                    text: '# Test Node\n\n- [ ] Original task\n- [x] Completed task',
                    x: 100,
                    y: 100,
                    width: 300,
                    height: 200
                },
                {
                    id: 'node-2',
                    type: 'text',
                    text: '# Another Node\n\n- [ ] Another task',
                    x: 400,
                    y: 100,
                    width: 300,
                    height: 200
                }
            ],
            edges: []
        };
        beforeEach(() => {
            mockVault.setFileContent('test.canvas', JSON.stringify(sampleCanvasData, null, 2));
        });
        it('should update task status in Canvas file', () => __awaiter(void 0, void 0, void 0, function* () {
            const originalTask = {
                id: 'test-1',
                content: 'Original task',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Original task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };
            const updatedTask = Object.assign(Object.assign({}, originalTask), { completed: true, status: 'x' });
            const result = yield updater.updateCanvasTask(originalTask, updatedTask);
            if (!result.success) {
                throw new Error(`Update failed with error: ${result.error}`);
            }
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
            // Verify the Canvas file was updated
            const updatedContent = mockVault.getFileContent('test.canvas');
            expect(updatedContent).toBeDefined();
            const updatedCanvasData = JSON.parse(updatedContent);
            const updatedNode = updatedCanvasData.nodes.find((n) => n.id === 'node-1');
            expect(updatedNode.text).toContain('- [x] Original task');
        }));
        it('should handle missing Canvas file', () => __awaiter(void 0, void 0, void 0, function* () {
            const task = {
                id: 'test-1',
                content: 'Test task',
                filePath: 'nonexistent.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Test task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };
            const result = yield updater.updateCanvasTask(task, task);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Canvas file not found');
        }));
        it('should handle missing Canvas node ID', () => __awaiter(void 0, void 0, void 0, function* () {
            const task = {
                id: 'test-1',
                content: 'Test task',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Test task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas'
                    // Missing canvasNodeId
                }
            };
            const result = yield updater.updateCanvasTask(task, task);
            expect(result.success).toBe(false);
            expect(result.error).toContain('does not have a Canvas node ID');
        }));
        it('should handle missing Canvas node', () => __awaiter(void 0, void 0, void 0, function* () {
            const task = {
                id: 'test-1',
                content: 'Test task',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Test task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'nonexistent-node'
                }
            };
            const result = yield updater.updateCanvasTask(task, task);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Canvas text node not found');
        }));
        it('should handle invalid Canvas JSON', () => __awaiter(void 0, void 0, void 0, function* () {
            mockVault.setFileContent('test.canvas', 'invalid json');
            const task = {
                id: 'test-1',
                content: 'Test task',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Test task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };
            const result = yield updater.updateCanvasTask(task, task);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to parse Canvas JSON');
        }));
        it('should handle task not found in node', () => __awaiter(void 0, void 0, void 0, function* () {
            const task = {
                id: 'test-1',
                content: 'Nonexistent task',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Nonexistent task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };
            const result = yield updater.updateCanvasTask(task, task);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Task not found in Canvas text node');
        }));
        it('should update multiple different task statuses', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test updating from incomplete to complete
            const task1 = {
                id: 'test-1',
                content: 'Original task',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Original task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };
            const updatedTask1 = Object.assign(Object.assign({}, task1), { completed: true, status: 'x' });
            yield updater.updateCanvasTask(task1, updatedTask1);
            // Test updating from complete to incomplete
            const task2 = {
                id: 'test-2',
                content: 'Completed task',
                filePath: 'test.canvas',
                line: 0,
                completed: true,
                status: 'x',
                originalMarkdown: '- [x] Completed task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };
            const updatedTask2 = Object.assign(Object.assign({}, task2), { completed: false, status: ' ' });
            const result = yield updater.updateCanvasTask(task2, updatedTask2);
            expect(result.success).toBe(true);
            // Verify both updates
            const updatedContent = mockVault.getFileContent('test.canvas');
            const updatedCanvasData = JSON.parse(updatedContent);
            const updatedNode = updatedCanvasData.nodes.find((n) => n.id === 'node-1');
            expect(updatedNode.text).toContain('- [x] Original task');
            expect(updatedNode.text).toContain('- [ ] Completed task');
        }));
        it('should update task with due date metadata', () => __awaiter(void 0, void 0, void 0, function* () {
            const originalTask = {
                id: 'test-1',
                content: 'Task with due date',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Task with due date',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };
            const dueDate = new Date('2024-12-25').getTime();
            const updatedTask = Object.assign(Object.assign({}, originalTask), { content: 'Task with due date', metadata: Object.assign(Object.assign({}, originalTask.metadata), { dueDate: dueDate }) });
            // First, add the task to the canvas
            const canvasData = JSON.parse(mockVault.getFileContent('test.canvas'));
            canvasData.nodes[0].text = '# Test Node\n\n- [ ] Task with due date\n- [x] Completed task';
            mockVault.setFileContent('test.canvas', JSON.stringify(canvasData, null, 2));
            const result = yield updater.updateCanvasTask(originalTask, updatedTask);
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
            // Verify the Canvas file was updated with due date
            const updatedContent = mockVault.getFileContent('test.canvas');
            expect(updatedContent).toBeDefined();
            const updatedCanvasData = JSON.parse(updatedContent);
            const updatedNode = updatedCanvasData.nodes.find((n) => n.id === 'node-1');
            expect(updatedNode.text).toContain('Task with due date 📅 2024-12-25');
        }));
        it('should update task with priority and tags', () => __awaiter(void 0, void 0, void 0, function* () {
            const originalTask = {
                id: 'test-1',
                content: 'Task with metadata',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Task with metadata',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };
            const updatedTask = Object.assign(Object.assign({}, originalTask), { content: 'Task with metadata', metadata: Object.assign(Object.assign({}, originalTask.metadata), { priority: 4, tags: ['#important', '#work'], project: 'TestProject', context: 'office' }) });
            // First, add the task to the canvas
            const canvasData = JSON.parse(mockVault.getFileContent('test.canvas'));
            canvasData.nodes[0].text = '# Test Node\n\n- [ ] Task with metadata\n- [x] Completed task';
            mockVault.setFileContent('test.canvas', JSON.stringify(canvasData, null, 2));
            const result = yield updater.updateCanvasTask(originalTask, updatedTask);
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
            // Verify the Canvas file was updated with metadata
            const updatedContent = mockVault.getFileContent('test.canvas');
            expect(updatedContent).toBeDefined();
            const updatedCanvasData = JSON.parse(updatedContent);
            const updatedNode = updatedCanvasData.nodes.find((n) => n.id === 'node-1');
            // Check for tags, project, context, and priority
            expect(updatedNode.text).toContain('#important');
            expect(updatedNode.text).toContain('#work');
            expect(updatedNode.text).toContain('#project/TestProject');
            expect(updatedNode.text).toContain('@office');
            expect(updatedNode.text).toContain('⏫'); // High priority emoji
        }));
        it('should handle multiple tasks with same name correctly', () => __awaiter(void 0, void 0, void 0, function* () {
            // Create a complex canvas with multiple same-named tasks
            const complexCanvasData = {
                nodes: [
                    {
                        id: 'project-planning',
                        type: 'text',
                        text: '# Project Planning\n\n## Initial Setup\n- [ ] Define project scope\n- [ ] Set up development environment\n- [x] Create project repository\n- [ ] Configure CI/CD pipeline\n\n## Research Phase\n- [ ] Market research\n- [ ] Competitor analysis\n- [ ] Technology stack evaluation',
                        x: 100,
                        y: 100,
                        width: 350,
                        height: 280,
                        color: '1'
                    },
                    {
                        id: 'development-tasks',
                        type: 'text',
                        text: '# Development Tasks\n\n## Frontend\n- [ ] Design user interface mockups\n- [ ] Implement responsive layout\n- [ ] Add user authentication\n- [ ] Create dashboard components\n\n## Backend\n- [ ] Set up database schema\n- [ ] Implement REST API\n- [ ] Add data validation\n- [ ] Configure security middleware',
                        x: 500,
                        y: 100,
                        width: 350,
                        height: 280,
                        color: '2'
                    },
                    {
                        id: 'testing-qa',
                        type: 'text',
                        text: '# Testing & QA\n\n## Unit Testing\n- [ ] Write component tests\n- [ ] API endpoint tests\n- [ ] Database integration tests\n\n## Integration Testing\n- [ ] End-to-end testing\n- [ ] Performance testing\n- [ ] Security testing\n\n## Quality Assurance\n- [ ] Code review process\n- [ ] Documentation review\n- [ ] User acceptance testing',
                        x: 100,
                        y: 420,
                        width: 350,
                        height: 300,
                        color: '3'
                    },
                    {
                        id: 'deployment',
                        type: 'text',
                        text: '# Deployment & Maintenance\n\n## Deployment\n- [ ] Set up production environment\n- [ ] Configure monitoring\n- [ ] Deploy application\n- [ ] Verify deployment\n\n## Post-Launch\n- [ ] Monitor performance\n- [ ] Gather user feedback\n- [ ] Bug fixes and improvements\n- [ ] Feature enhancements',
                        x: 500,
                        y: 420,
                        width: 350,
                        height: 300,
                        color: '4'
                    },
                    {
                        id: 'meeting-notes',
                        type: 'text',
                        text: '# Meeting Notes\n\n## Daily Standup - 2024-01-15\n- [x] Discussed project progress\n- [ ] Review sprint goals\n- [ ] Address blockers\n\n## Sprint Planning\n- [ ] Estimate story points\n- [ ] Assign tasks to team members\n- [ ] Set sprint timeline',
                        x: 900,
                        y: 280,
                        width: 300,
                        height: 250,
                        color: '5'
                    }
                ],
                edges: [
                    {
                        id: 'edge1',
                        fromNode: 'project-planning',
                        toNode: 'development-tasks',
                        fromSide: 'right',
                        toSide: 'left'
                    },
                    {
                        id: 'edge2',
                        fromNode: 'development-tasks',
                        toNode: 'testing-qa',
                        fromSide: 'bottom',
                        toSide: 'top'
                    },
                    {
                        id: 'edge3',
                        fromNode: 'testing-qa',
                        toNode: 'deployment',
                        fromSide: 'right',
                        toSide: 'left'
                    }
                ]
            };
            mockVault.setFileContent('complex.canvas', JSON.stringify(complexCanvasData, null, 2));
            // Test updating a specific task in the first node
            const originalTask = {
                id: 'test-1',
                content: 'Define project scope',
                filePath: 'complex.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Define project scope',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'project-planning'
                }
            };
            const updatedTask = Object.assign(Object.assign({}, originalTask), { completed: true, status: 'x' });
            const result = yield updater.updateCanvasTask(originalTask, updatedTask);
            expect(result.success).toBe(true);
            // Verify only the correct task was updated
            const updatedContent = mockVault.getFileContent('complex.canvas');
            const updatedCanvasData = JSON.parse(updatedContent);
            const updatedNode = updatedCanvasData.nodes.find((n) => n.id === 'project-planning');
            expect(updatedNode.text).toContain('- [x] Define project scope');
            expect(updatedNode.text).toContain('- [ ] Set up development environment'); // Should remain unchanged
            expect(updatedNode.text).toContain('- [x] Create project repository'); // Should remain unchanged
        }));
        it('should handle tasks with identical names and metadata correctly', () => __awaiter(void 0, void 0, void 0, function* () {
            // Create a canvas with multiple identical task names but different metadata
            const identicalTasksCanvasData = {
                nodes: [
                    {
                        id: 'identical-tasks-node',
                        type: 'text',
                        text: '# Tasks with Same Names\n\n- [ ] Task In Canvas 📅 2025-06-21\n- [ ] Task In Canvas 🛫 2025-06-21\n- [ ] Task In Canvas #SO/旅行\n- [ ] Task In Canvas\n- [ ] A new day',
                        x: 100,
                        y: 100,
                        width: 350,
                        height: 280,
                        color: '1'
                    }
                ],
                edges: []
            };
            mockVault.setFileContent('identical-tasks.canvas', JSON.stringify(identicalTasksCanvasData, null, 2));
            // Test updating the third task (with #SO/旅行 tag)
            const originalTask = {
                id: 'test-1',
                content: 'Task In Canvas',
                filePath: 'identical-tasks.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Task In Canvas #SO/旅行',
                metadata: {
                    tags: ['#SO/旅行'],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'identical-tasks-node'
                }
            };
            const updatedTask = Object.assign(Object.assign({}, originalTask), { completed: true, status: 'x' });
            const result = yield updater.updateCanvasTask(originalTask, updatedTask);
            expect(result.success).toBe(true);
            // Verify only the correct task was updated
            const updatedContent = mockVault.getFileContent('identical-tasks.canvas');
            const updatedCanvasData = JSON.parse(updatedContent);
            const updatedNode = updatedCanvasData.nodes.find((n) => n.id === 'identical-tasks-node');
            // Check that only the task with #SO/旅行 was updated
            expect(updatedNode.text).toContain('- [ ] Task In Canvas 📅 2025-06-21'); // Should remain unchanged
            expect(updatedNode.text).toContain('- [ ] Task In Canvas 🛫 2025-06-21'); // Should remain unchanged
            expect(updatedNode.text).toContain('- [x] Task In Canvas #SO/旅行'); // Should be updated
            expect(updatedNode.text).toContain('- [ ] Task In Canvas'); // Should remain unchanged (plain task)
            expect(updatedNode.text).toContain('- [ ] A new day'); // Should remain unchanged
        }));
        it('should properly remove and add metadata without affecting other tasks', () => __awaiter(void 0, void 0, void 0, function* () {
            // Create a canvas with tasks that have metadata to be removed/modified
            const metadataTestCanvasData = {
                nodes: [
                    {
                        id: 'metadata-test-node',
                        type: 'text',
                        text: '# Metadata Test\n\n- [ ] Task with due date 📅 2025-06-21\n- [ ] Task with start date 🛫 2025-06-20\n- [ ] Task with priority ⏫\n- [ ] Task with multiple metadata 📅 2025-06-21 🛫 2025-06-20 #important @work',
                        x: 100,
                        y: 100,
                        width: 350,
                        height: 280,
                        color: '1'
                    }
                ],
                edges: []
            };
            mockVault.setFileContent('metadata-test.canvas', JSON.stringify(metadataTestCanvasData, null, 2));
            // Test removing due date from the first task
            // Note: lineMatchesTask only compares content, not the full originalMarkdown
            const originalTask = {
                id: 'test-1',
                content: 'Task with due date 📅 2025-06-21',
                filePath: 'metadata-test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Task with due date 📅 2025-06-21',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'metadata-test-node',
                    dueDate: new Date('2025-06-21').getTime()
                }
            };
            // Update task to remove due date
            const updatedTask = Object.assign(Object.assign({}, originalTask), { content: 'Task with due date', metadata: Object.assign(Object.assign({}, originalTask.metadata), { dueDate: undefined // Remove due date
                 }) });
            const result = yield updater.updateCanvasTask(originalTask, updatedTask);
            expect(result.success).toBe(true);
            // Verify metadata was properly removed from the correct task only
            const updatedContent = mockVault.getFileContent('metadata-test.canvas');
            const updatedCanvasData = JSON.parse(updatedContent);
            const updatedNode = updatedCanvasData.nodes.find((n) => n.id === 'metadata-test-node');
            // Check that due date was removed from the first task
            expect(updatedNode.text).toContain('- [ ] Task with due date\n'); // Should not contain 📅 2025-06-21
            expect(updatedNode.text).not.toMatch(/- \[ \] Task with due date 📅 2025-06-21/);
            // Check that other tasks remain unchanged
            expect(updatedNode.text).toContain('- [ ] Task with start date 🛫 2025-06-20');
            expect(updatedNode.text).toContain('- [ ] Task with priority ⏫');
            expect(updatedNode.text).toContain('- [ ] Task with multiple metadata 📅 2025-06-21 🛫 2025-06-20 #important @work');
        }));
        it('should handle updating tasks when multiple tasks have similar content', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test edge case where task content is very similar
            const similarTasksCanvasData = {
                nodes: [
                    {
                        id: 'similar-tasks-node',
                        type: 'text',
                        text: '# Similar Tasks\n\n- [ ] Review code\n- [ ] Review code changes\n- [ ] Review code for bugs\n- [x] Review code completely\n- [ ] Review',
                        x: 100,
                        y: 100,
                        width: 350,
                        height: 280,
                        color: '1'
                    }
                ],
                edges: []
            };
            mockVault.setFileContent('similar-tasks.canvas', JSON.stringify(similarTasksCanvasData, null, 2));
            // Test updating the exact "Review code" task (first one)
            const originalTask = {
                id: 'test-1',
                content: 'Review code',
                filePath: 'similar-tasks.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Review code',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'similar-tasks-node'
                }
            };
            const updatedTask = Object.assign(Object.assign({}, originalTask), { completed: true, status: 'x' });
            const result = yield updater.updateCanvasTask(originalTask, updatedTask);
            expect(result.success).toBe(true);
            // Verify only the exact match was updated
            const updatedContent = mockVault.getFileContent('similar-tasks.canvas');
            const updatedCanvasData = JSON.parse(updatedContent);
            const updatedNode = updatedCanvasData.nodes.find((n) => n.id === 'similar-tasks-node');
            // Check that only the exact "Review code" task was updated
            expect(updatedNode.text).toContain('- [x] Review code\n'); // First task should be updated
            expect(updatedNode.text).toContain('- [ ] Review code changes'); // Should remain unchanged
            expect(updatedNode.text).toContain('- [ ] Review code for bugs'); // Should remain unchanged
            expect(updatedNode.text).toContain('- [x] Review code completely'); // Should remain unchanged
            expect(updatedNode.text).toContain('- [ ] Review'); // Should remain unchanged
        }));
        it('should handle canvas file monitoring and updates correctly', () => __awaiter(void 0, void 0, void 0, function* () {
            // This test simulates the file monitoring scenario
            // Create a canvas with tasks
            const monitoringTestCanvasData = {
                nodes: [
                    {
                        id: 'monitoring-test-node',
                        type: 'text',
                        text: '# File Monitoring Test\n\n- [ ] Initial task\n- [ ] Another task\n- [x] Completed task',
                        x: 100,
                        y: 100,
                        width: 350,
                        height: 280,
                        color: '1'
                    }
                ],
                edges: []
            };
            mockVault.setFileContent('monitoring-test.canvas', JSON.stringify(monitoringTestCanvasData, null, 2));
            // Simulate updating a task as if it was modified in the Canvas file
            const originalTask = {
                id: 'test-1',
                content: 'Initial task',
                filePath: 'monitoring-test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Initial task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'monitoring-test-node'
                }
            };
            const updatedTask = Object.assign(Object.assign({}, originalTask), { completed: true, status: 'x', metadata: Object.assign(Object.assign({}, originalTask.metadata), { completedDate: Date.now() }) });
            const result = yield updater.updateCanvasTask(originalTask, updatedTask);
            expect(result.success).toBe(true);
            // Verify the Canvas file was updated correctly
            const updatedContent = mockVault.getFileContent('monitoring-test.canvas');
            const updatedCanvasData = JSON.parse(updatedContent);
            const updatedNode = updatedCanvasData.nodes.find((n) => n.id === 'monitoring-test-node');
            // Check that the task was updated and completion date was added
            expect(updatedNode.text).toContain('- [x] Initial task');
            expect(updatedNode.text).toContain('- [ ] Another task'); // Should remain unchanged
            expect(updatedNode.text).toContain('- [x] Completed task'); // Should remain unchanged
            // Verify completion date was added
            const today = new Date();
            const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            expect(updatedNode.text).toContain(`✅ ${expectedDate}`);
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2FudmFzVGFza1VwZGF0ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkNhbnZhc1Rhc2tVcGRhdGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7O0FBRUgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFJbkUsdUJBQXVCO0FBQ3ZCLE1BQU0sU0FBUztJQUFmO1FBQ1ksVUFBSyxHQUF3QixJQUFJLEdBQUcsRUFBRSxDQUFDO0lBd0JuRCxDQUFDO0lBdEJHLGFBQWEsQ0FBQyxJQUFZO1FBQ3RCLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdEIsT0FBTyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUM5QjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFFSyxJQUFJLENBQUMsSUFBZTs7WUFDdEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzNDLENBQUM7S0FBQTtJQUVLLE1BQU0sQ0FBQyxJQUFlLEVBQUUsT0FBZTs7WUFDekMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN2QyxDQUFDO0tBQUE7SUFFRCxjQUFjLENBQUMsSUFBWSxFQUFFLE9BQWU7UUFDeEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRCxjQUFjLENBQUMsSUFBWTtRQUN2QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hDLENBQUM7Q0FDSjtBQUVELE1BQU0sU0FBUztJQUNYLFlBQW1CLElBQVk7UUFBWixTQUFJLEdBQUosSUFBSSxDQUFR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QUFDLEVBQUUsQ0FBQztZQUMzSSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDNUQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogVGVzdHMgZm9yIENhbnZhcyB0YXNrIHVwZGF0ZXIgZnVuY3Rpb25hbGl0eVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IENhbnZhc1Rhc2tVcGRhdGVyIH0gZnJvbSAnLi4vcGFyc2Vycy9jYW52YXMtdGFzay11cGRhdGVyJztcclxuaW1wb3J0IHsgVGFzaywgQ2FudmFzVGFza01ldGFkYXRhIH0gZnJvbSAnLi4vdHlwZXMvdGFzayc7XHJcbmltcG9ydCB7IENhbnZhc0RhdGEgfSBmcm9tICcuLi90eXBlcy9jYW52YXMnO1xyXG5cclxuLy8gTW9jayBWYXVsdCBhbmQgVEZpbGVcclxuY2xhc3MgTW9ja1ZhdWx0IHtcclxuICAgIHByaXZhdGUgZmlsZXM6IE1hcDxzdHJpbmcsIHN0cmluZz4gPSBuZXcgTWFwKCk7XHJcblxyXG4gICAgZ2V0RmlsZUJ5UGF0aChwYXRoOiBzdHJpbmcpIHtcclxuICAgICAgICBpZiAodGhpcy5maWxlcy5oYXMocGF0aCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBNb2NrVEZpbGUocGF0aCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIHJlYWQoZmlsZTogTW9ja1RGaWxlKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAgICAgICByZXR1cm4gdGhpcy5maWxlcy5nZXQoZmlsZS5wYXRoKSB8fCAnJztcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBtb2RpZnkoZmlsZTogTW9ja1RGaWxlLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICB0aGlzLmZpbGVzLnNldChmaWxlLnBhdGgsIGNvbnRlbnQpO1xyXG4gICAgfVxyXG5cclxuICAgIHNldEZpbGVDb250ZW50KHBhdGg6IHN0cmluZywgY29udGVudDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5maWxlcy5zZXQocGF0aCwgY29udGVudCk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0RmlsZUNvbnRlbnQocGF0aDogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5maWxlcy5nZXQocGF0aCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIE1vY2tURmlsZSB7XHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcGF0aDogc3RyaW5nKSB7fVxyXG5cclxuICAgIC8vIEFkZCBwcm9wZXJ0aWVzIHRvIG1ha2UgaXQgY29tcGF0aWJsZSB3aXRoIFRGaWxlIGludGVyZmFjZVxyXG4gICAgZ2V0IG5hbWUoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucGF0aC5zcGxpdCgnLycpLnBvcCgpIHx8ICcnO1xyXG4gICAgfVxyXG5cclxuICAgIGdldCBleHRlbnNpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucGF0aC5zcGxpdCgnLicpLnBvcCgpIHx8ICcnO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyBNb2NrIFBsdWdpblxyXG5jbGFzcyBNb2NrUGx1Z2luIHtcclxuICAgIHNldHRpbmdzID0ge1xyXG4gICAgICAgIHByZWZlck1ldGFkYXRhRm9ybWF0OiAndGFza3MnIGFzIGNvbnN0LFxyXG4gICAgICAgIHByb2plY3RUYWdQcmVmaXg6IHtcclxuICAgICAgICAgICAgdGFza3M6ICdwcm9qZWN0JyxcclxuICAgICAgICAgICAgZGF0YXZpZXc6ICdwcm9qZWN0J1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY29udGV4dFRhZ1ByZWZpeDoge1xyXG4gICAgICAgICAgICB0YXNrczogJ0AnLFxyXG4gICAgICAgICAgICBkYXRhdmlldzogJ2NvbnRleHQnXHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufVxyXG5cclxuZGVzY3JpYmUoJ0NhbnZhc1Rhc2tVcGRhdGVyJywgKCkgPT4ge1xyXG4gICAgbGV0IG1vY2tWYXVsdDogTW9ja1ZhdWx0O1xyXG4gICAgbGV0IG1vY2tQbHVnaW46IE1vY2tQbHVnaW47XHJcbiAgICBsZXQgdXBkYXRlcjogQ2FudmFzVGFza1VwZGF0ZXI7XHJcblxyXG4gICAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICAgICAgbW9ja1ZhdWx0ID0gbmV3IE1vY2tWYXVsdCgpO1xyXG4gICAgICAgIG1vY2tQbHVnaW4gPSBuZXcgTW9ja1BsdWdpbigpO1xyXG4gICAgICAgIHVwZGF0ZXIgPSBuZXcgQ2FudmFzVGFza1VwZGF0ZXIobW9ja1ZhdWx0IGFzIGFueSwgbW9ja1BsdWdpbiBhcyBhbnkpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgZGVzY3JpYmUoJ2lzQ2FudmFzVGFzaycsICgpID0+IHtcclxuICAgICAgICBpdCgnc2hvdWxkIGlkZW50aWZ5IENhbnZhcyB0YXNrcyBjb3JyZWN0bHknLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNhbnZhc1Rhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiAndGVzdC0xJyxcclxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6ICdUZXN0IHRhc2snLFxyXG4gICAgICAgICAgICAgICAgZmlsZVBhdGg6ICd0ZXN0LmNhbnZhcycsXHJcbiAgICAgICAgICAgICAgICBsaW5lOiAwLFxyXG4gICAgICAgICAgICAgICAgY29tcGxldGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHN0YXR1czogJyAnLFxyXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxNYXJrZG93bjogJy0gWyBdIFRlc3QgdGFzaycsXHJcbiAgICAgICAgICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhZ3M6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2VUeXBlOiAnY2FudmFzJyxcclxuICAgICAgICAgICAgICAgICAgICBjYW52YXNOb2RlSWQ6ICdub2RlLTEnXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjb25zdCBtYXJrZG93blRhc2s6IFRhc2sgPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogJ3Rlc3QtMicsXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnVGVzdCB0YXNrJyxcclxuICAgICAgICAgICAgICAgIGZpbGVQYXRoOiAndGVzdC5tZCcsXHJcbiAgICAgICAgICAgICAgICBsaW5lOiAwLFxyXG4gICAgICAgICAgICAgICAgY29tcGxldGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHN0YXR1czogJyAnLFxyXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxNYXJrZG93bjogJy0gWyBdIFRlc3QgdGFzaycsXHJcbiAgICAgICAgICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhZ3M6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgZXhwZWN0KENhbnZhc1Rhc2tVcGRhdGVyLmlzQ2FudmFzVGFzayhjYW52YXNUYXNrKSkudG9CZSh0cnVlKTtcclxuICAgICAgICAgICAgZXhwZWN0KENhbnZhc1Rhc2tVcGRhdGVyLmlzQ2FudmFzVGFzayhtYXJrZG93blRhc2spKS50b0JlKGZhbHNlKTtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIGRlc2NyaWJlKCd1cGRhdGVDYW52YXNUYXNrJywgKCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHNhbXBsZUNhbnZhc0RhdGE6IENhbnZhc0RhdGEgPSB7XHJcbiAgICAgICAgICAgIG5vZGVzOiBbXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6ICdub2RlLTEnLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiAnIyBUZXN0IE5vZGVcXG5cXG4tIFsgXSBPcmlnaW5hbCB0YXNrXFxuLSBbeF0gQ29tcGxldGVkIHRhc2snLFxyXG4gICAgICAgICAgICAgICAgICAgIHg6IDEwMCxcclxuICAgICAgICAgICAgICAgICAgICB5OiAxMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IDMwMCxcclxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDIwMFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogJ25vZGUtMicsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6ICcjIEFub3RoZXIgTm9kZVxcblxcbi0gWyBdIEFub3RoZXIgdGFzaycsXHJcbiAgICAgICAgICAgICAgICAgICAgeDogNDAwLFxyXG4gICAgICAgICAgICAgICAgICAgIHk6IDEwMCxcclxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogMzAwLFxyXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogMjAwXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIGVkZ2VzOiBbXVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGJlZm9yZUVhY2goKCkgPT4ge1xyXG4gICAgICAgICAgICBtb2NrVmF1bHQuc2V0RmlsZUNvbnRlbnQoJ3Rlc3QuY2FudmFzJywgSlNPTi5zdHJpbmdpZnkoc2FtcGxlQ2FudmFzRGF0YSwgbnVsbCwgMikpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpdCgnc2hvdWxkIHVwZGF0ZSB0YXNrIHN0YXR1cyBpbiBDYW52YXMgZmlsZScsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogJ3Rlc3QtMScsXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnT3JpZ2luYWwgdGFzaycsXHJcbiAgICAgICAgICAgICAgICBmaWxlUGF0aDogJ3Rlc3QuY2FudmFzJyxcclxuICAgICAgICAgICAgICAgIGxpbmU6IDAsXHJcbiAgICAgICAgICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiAnICcsXHJcbiAgICAgICAgICAgICAgICBvcmlnaW5hbE1hcmtkb3duOiAnLSBbIF0gT3JpZ2luYWwgdGFzaycsXHJcbiAgICAgICAgICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhZ3M6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2VUeXBlOiAnY2FudmFzJyxcclxuICAgICAgICAgICAgICAgICAgICBjYW52YXNOb2RlSWQ6ICdub2RlLTEnXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVkVGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG4gICAgICAgICAgICAgICAgLi4ub3JpZ2luYWxUYXNrLFxyXG4gICAgICAgICAgICAgICAgY29tcGxldGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiAneCdcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHVwZGF0ZXIudXBkYXRlQ2FudmFzVGFzayhvcmlnaW5hbFRhc2ssIHVwZGF0ZWRUYXNrKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVXBkYXRlIGZhaWxlZCB3aXRoIGVycm9yOiAke3Jlc3VsdC5lcnJvcn1gKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG4gICAgICAgICAgICBleHBlY3QocmVzdWx0LmVycm9yKS50b0JlVW5kZWZpbmVkKCk7XHJcblxyXG4gICAgICAgICAgICAvLyBWZXJpZnkgdGhlIENhbnZhcyBmaWxlIHdhcyB1cGRhdGVkXHJcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWRDb250ZW50ID0gbW9ja1ZhdWx0LmdldEZpbGVDb250ZW50KCd0ZXN0LmNhbnZhcycpO1xyXG4gICAgICAgICAgICBleHBlY3QodXBkYXRlZENvbnRlbnQpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVkQ2FudmFzRGF0YSA9IEpTT04ucGFyc2UodXBkYXRlZENvbnRlbnQhKTtcclxuICAgICAgICAgICAgY29uc3QgdXBkYXRlZE5vZGUgPSB1cGRhdGVkQ2FudmFzRGF0YS5ub2Rlcy5maW5kKChuOiBhbnkpID0+IG4uaWQgPT09ICdub2RlLTEnKTtcclxuICAgICAgICAgICAgZXhwZWN0KHVwZGF0ZWROb2RlLnRleHQpLnRvQ29udGFpbignLSBbeF0gT3JpZ2luYWwgdGFzaycpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpdCgnc2hvdWxkIGhhbmRsZSBtaXNzaW5nIENhbnZhcyBmaWxlJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB0YXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogJ3Rlc3QtMScsXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnVGVzdCB0YXNrJyxcclxuICAgICAgICAgICAgICAgIGZpbGVQYXRoOiAnbm9uZXhpc3RlbnQuY2FudmFzJyxcclxuICAgICAgICAgICAgICAgIGxpbmU6IDAsXHJcbiAgICAgICAgICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiAnICcsXHJcbiAgICAgICAgICAgICAgICBvcmlnaW5hbE1hcmtkb3duOiAnLSBbIF0gVGVzdCB0YXNrJyxcclxuICAgICAgICAgICAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFnczogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZVR5cGU6ICdjYW52YXMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhbnZhc05vZGVJZDogJ25vZGUtMSdcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHVwZGF0ZXIudXBkYXRlQ2FudmFzVGFzayh0YXNrLCB0YXNrKTtcclxuXHJcbiAgICAgICAgICAgIGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcbiAgICAgICAgICAgIGV4cGVjdChyZXN1bHQuZXJyb3IpLnRvQ29udGFpbignQ2FudmFzIGZpbGUgbm90IGZvdW5kJyk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGl0KCdzaG91bGQgaGFuZGxlIG1pc3NpbmcgQ2FudmFzIG5vZGUgSUQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiAndGVzdC0xJyxcclxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6ICdUZXN0IHRhc2snLFxyXG4gICAgICAgICAgICAgICAgZmlsZVBhdGg6ICd0ZXN0LmNhbnZhcycsXHJcbiAgICAgICAgICAgICAgICBsaW5lOiAwLFxyXG4gICAgICAgICAgICAgICAgY29tcGxldGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHN0YXR1czogJyAnLFxyXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxNYXJrZG93bjogJy0gWyBdIFRlc3QgdGFzaycsXHJcbiAgICAgICAgICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhZ3M6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2VUeXBlOiAnY2FudmFzJ1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIE1pc3NpbmcgY2FudmFzTm9kZUlkXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB1cGRhdGVyLnVwZGF0ZUNhbnZhc1Rhc2sodGFzaywgdGFzayk7XHJcblxyXG4gICAgICAgICAgICBleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG4gICAgICAgICAgICBleHBlY3QocmVzdWx0LmVycm9yKS50b0NvbnRhaW4oJ2RvZXMgbm90IGhhdmUgYSBDYW52YXMgbm9kZSBJRCcpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpdCgnc2hvdWxkIGhhbmRsZSBtaXNzaW5nIENhbnZhcyBub2RlJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB0YXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogJ3Rlc3QtMScsXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnVGVzdCB0YXNrJyxcclxuICAgICAgICAgICAgICAgIGZpbGVQYXRoOiAndGVzdC5jYW52YXMnLFxyXG4gICAgICAgICAgICAgICAgbGluZTogMCxcclxuICAgICAgICAgICAgICAgIGNvbXBsZXRlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBzdGF0dXM6ICcgJyxcclxuICAgICAgICAgICAgICAgIG9yaWdpbmFsTWFya2Rvd246ICctIFsgXSBUZXN0IHRhc2snLFxyXG4gICAgICAgICAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0YWdzOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgc291cmNlVHlwZTogJ2NhbnZhcycsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FudmFzTm9kZUlkOiAnbm9uZXhpc3RlbnQtbm9kZSdcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHVwZGF0ZXIudXBkYXRlQ2FudmFzVGFzayh0YXNrLCB0YXNrKTtcclxuXHJcbiAgICAgICAgICAgIGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcbiAgICAgICAgICAgIGV4cGVjdChyZXN1bHQuZXJyb3IpLnRvQ29udGFpbignQ2FudmFzIHRleHQgbm9kZSBub3QgZm91bmQnKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaXQoJ3Nob3VsZCBoYW5kbGUgaW52YWxpZCBDYW52YXMgSlNPTicsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgbW9ja1ZhdWx0LnNldEZpbGVDb250ZW50KCd0ZXN0LmNhbnZhcycsICdpbnZhbGlkIGpzb24nKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHRhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiAndGVzdC0xJyxcclxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6ICdUZXN0IHRhc2snLFxyXG4gICAgICAgICAgICAgICAgZmlsZVBhdGg6ICd0ZXN0LmNhbnZhcycsXHJcbiAgICAgICAgICAgICAgICBsaW5lOiAwLFxyXG4gICAgICAgICAgICAgICAgY29tcGxldGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHN0YXR1czogJyAnLFxyXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxNYXJrZG93bjogJy0gWyBdIFRlc3QgdGFzaycsXHJcbiAgICAgICAgICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhZ3M6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2VUeXBlOiAnY2FudmFzJyxcclxuICAgICAgICAgICAgICAgICAgICBjYW52YXNOb2RlSWQ6ICdub2RlLTEnXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB1cGRhdGVyLnVwZGF0ZUNhbnZhc1Rhc2sodGFzaywgdGFzayk7XHJcblxyXG4gICAgICAgICAgICBleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG4gICAgICAgICAgICBleHBlY3QocmVzdWx0LmVycm9yKS50b0NvbnRhaW4oJ0ZhaWxlZCB0byBwYXJzZSBDYW52YXMgSlNPTicpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpdCgnc2hvdWxkIGhhbmRsZSB0YXNrIG5vdCBmb3VuZCBpbiBub2RlJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB0YXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogJ3Rlc3QtMScsXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnTm9uZXhpc3RlbnQgdGFzaycsXHJcbiAgICAgICAgICAgICAgICBmaWxlUGF0aDogJ3Rlc3QuY2FudmFzJyxcclxuICAgICAgICAgICAgICAgIGxpbmU6IDAsXHJcbiAgICAgICAgICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiAnICcsXHJcbiAgICAgICAgICAgICAgICBvcmlnaW5hbE1hcmtkb3duOiAnLSBbIF0gTm9uZXhpc3RlbnQgdGFzaycsXHJcbiAgICAgICAgICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhZ3M6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2VUeXBlOiAnY2FudmFzJyxcclxuICAgICAgICAgICAgICAgICAgICBjYW52YXNOb2RlSWQ6ICdub2RlLTEnXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB1cGRhdGVyLnVwZGF0ZUNhbnZhc1Rhc2sodGFzaywgdGFzayk7XHJcblxyXG4gICAgICAgICAgICBleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG4gICAgICAgICAgICBleHBlY3QocmVzdWx0LmVycm9yKS50b0NvbnRhaW4oJ1Rhc2sgbm90IGZvdW5kIGluIENhbnZhcyB0ZXh0IG5vZGUnKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaXQoJ3Nob3VsZCB1cGRhdGUgbXVsdGlwbGUgZGlmZmVyZW50IHRhc2sgc3RhdHVzZXMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIFRlc3QgdXBkYXRpbmcgZnJvbSBpbmNvbXBsZXRlIHRvIGNvbXBsZXRlXHJcbiAgICAgICAgICAgIGNvbnN0IHRhc2sxOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogJ3Rlc3QtMScsXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnT3JpZ2luYWwgdGFzaycsXHJcbiAgICAgICAgICAgICAgICBmaWxlUGF0aDogJ3Rlc3QuY2FudmFzJyxcclxuICAgICAgICAgICAgICAgIGxpbmU6IDAsXHJcbiAgICAgICAgICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiAnICcsXHJcbiAgICAgICAgICAgICAgICBvcmlnaW5hbE1hcmtkb3duOiAnLSBbIF0gT3JpZ2luYWwgdGFzaycsXHJcbiAgICAgICAgICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhZ3M6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2VUeXBlOiAnY2FudmFzJyxcclxuICAgICAgICAgICAgICAgICAgICBjYW52YXNOb2RlSWQ6ICdub2RlLTEnXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVkVGFzazEgPSB7IC4uLnRhc2sxLCBjb21wbGV0ZWQ6IHRydWUsIHN0YXR1czogJ3gnIH07XHJcbiAgICAgICAgICAgIGF3YWl0IHVwZGF0ZXIudXBkYXRlQ2FudmFzVGFzayh0YXNrMSwgdXBkYXRlZFRhc2sxKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFRlc3QgdXBkYXRpbmcgZnJvbSBjb21wbGV0ZSB0byBpbmNvbXBsZXRlXHJcbiAgICAgICAgICAgIGNvbnN0IHRhc2syOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogJ3Rlc3QtMicsXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnQ29tcGxldGVkIHRhc2snLFxyXG4gICAgICAgICAgICAgICAgZmlsZVBhdGg6ICd0ZXN0LmNhbnZhcycsXHJcbiAgICAgICAgICAgICAgICBsaW5lOiAwLFxyXG4gICAgICAgICAgICAgICAgY29tcGxldGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiAneCcsXHJcbiAgICAgICAgICAgICAgICBvcmlnaW5hbE1hcmtkb3duOiAnLSBbeF0gQ29tcGxldGVkIHRhc2snLFxyXG4gICAgICAgICAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0YWdzOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgc291cmNlVHlwZTogJ2NhbnZhcycsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FudmFzTm9kZUlkOiAnbm9kZS0xJ1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgdXBkYXRlZFRhc2syID0geyAuLi50YXNrMiwgY29tcGxldGVkOiBmYWxzZSwgc3RhdHVzOiAnICcgfTtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdXBkYXRlci51cGRhdGVDYW52YXNUYXNrKHRhc2syLCB1cGRhdGVkVGFzazIpO1xyXG5cclxuICAgICAgICAgICAgZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cclxuICAgICAgICAgICAgLy8gVmVyaWZ5IGJvdGggdXBkYXRlc1xyXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVkQ29udGVudCA9IG1vY2tWYXVsdC5nZXRGaWxlQ29udGVudCgndGVzdC5jYW52YXMnKTtcclxuICAgICAgICAgICAgY29uc3QgdXBkYXRlZENhbnZhc0RhdGEgPSBKU09OLnBhcnNlKHVwZGF0ZWRDb250ZW50ISk7XHJcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWROb2RlID0gdXBkYXRlZENhbnZhc0RhdGEubm9kZXMuZmluZCgobjogYW55KSA9PiBuLmlkID09PSAnbm9kZS0xJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBleHBlY3QodXBkYXRlZE5vZGUudGV4dCkudG9Db250YWluKCctIFt4XSBPcmlnaW5hbCB0YXNrJyk7XHJcbiAgICAgICAgICAgIGV4cGVjdCh1cGRhdGVkTm9kZS50ZXh0KS50b0NvbnRhaW4oJy0gWyBdIENvbXBsZXRlZCB0YXNrJyk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGl0KCdzaG91bGQgdXBkYXRlIHRhc2sgd2l0aCBkdWUgZGF0ZSBtZXRhZGF0YScsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogJ3Rlc3QtMScsXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnVGFzayB3aXRoIGR1ZSBkYXRlJyxcclxuICAgICAgICAgICAgICAgIGZpbGVQYXRoOiAndGVzdC5jYW52YXMnLFxyXG4gICAgICAgICAgICAgICAgbGluZTogMCxcclxuICAgICAgICAgICAgICAgIGNvbXBsZXRlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBzdGF0dXM6ICcgJyxcclxuICAgICAgICAgICAgICAgIG9yaWdpbmFsTWFya2Rvd246ICctIFsgXSBUYXNrIHdpdGggZHVlIGRhdGUnLFxyXG4gICAgICAgICAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0YWdzOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgc291cmNlVHlwZTogJ2NhbnZhcycsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FudmFzTm9kZUlkOiAnbm9kZS0xJ1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgZHVlRGF0ZSA9IG5ldyBEYXRlKCcyMDI0LTEyLTI1JykuZ2V0VGltZSgpO1xyXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVkVGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG4gICAgICAgICAgICAgICAgLi4ub3JpZ2luYWxUYXNrLFxyXG4gICAgICAgICAgICAgICAgY29udGVudDogJ1Rhc2sgd2l0aCBkdWUgZGF0ZScsXHJcbiAgICAgICAgICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIC4uLm9yaWdpbmFsVGFzay5tZXRhZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICBkdWVEYXRlOiBkdWVEYXRlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAvLyBGaXJzdCwgYWRkIHRoZSB0YXNrIHRvIHRoZSBjYW52YXNcclxuICAgICAgICAgICAgY29uc3QgY2FudmFzRGF0YSA9IEpTT04ucGFyc2UobW9ja1ZhdWx0LmdldEZpbGVDb250ZW50KCd0ZXN0LmNhbnZhcycpISk7XHJcbiAgICAgICAgICAgIGNhbnZhc0RhdGEubm9kZXNbMF0udGV4dCA9ICcjIFRlc3QgTm9kZVxcblxcbi0gWyBdIFRhc2sgd2l0aCBkdWUgZGF0ZVxcbi0gW3hdIENvbXBsZXRlZCB0YXNrJztcclxuICAgICAgICAgICAgbW9ja1ZhdWx0LnNldEZpbGVDb250ZW50KCd0ZXN0LmNhbnZhcycsIEpTT04uc3RyaW5naWZ5KGNhbnZhc0RhdGEsIG51bGwsIDIpKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHVwZGF0ZXIudXBkYXRlQ2FudmFzVGFzayhvcmlnaW5hbFRhc2ssIHVwZGF0ZWRUYXNrKTtcclxuXHJcbiAgICAgICAgICAgIGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuICAgICAgICAgICAgZXhwZWN0KHJlc3VsdC5lcnJvcikudG9CZVVuZGVmaW5lZCgpO1xyXG5cclxuICAgICAgICAgICAgLy8gVmVyaWZ5IHRoZSBDYW52YXMgZmlsZSB3YXMgdXBkYXRlZCB3aXRoIGR1ZSBkYXRlXHJcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWRDb250ZW50ID0gbW9ja1ZhdWx0LmdldEZpbGVDb250ZW50KCd0ZXN0LmNhbnZhcycpO1xyXG4gICAgICAgICAgICBleHBlY3QodXBkYXRlZENvbnRlbnQpLnRvQmVEZWZpbmVkKCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVkQ2FudmFzRGF0YSA9IEpTT04ucGFyc2UodXBkYXRlZENvbnRlbnQhKTtcclxuICAgICAgICAgICAgY29uc3QgdXBkYXRlZE5vZGUgPSB1cGRhdGVkQ2FudmFzRGF0YS5ub2Rlcy5maW5kKChuOiBhbnkpID0+IG4uaWQgPT09ICdub2RlLTEnKTtcclxuICAgICAgICAgICAgZXhwZWN0KHVwZGF0ZWROb2RlLnRleHQpLnRvQ29udGFpbignVGFzayB3aXRoIGR1ZSBkYXRlIPCfk4UgMjAyNC0xMi0yNScpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpdCgnc2hvdWxkIHVwZGF0ZSB0YXNrIHdpdGggcHJpb3JpdHkgYW5kIHRhZ3MnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsVGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6ICd0ZXN0LTEnLFxyXG4gICAgICAgICAgICAgICAgY29udGVudDogJ1Rhc2sgd2l0aCBtZXRhZGF0YScsXHJcbiAgICAgICAgICAgICAgICBmaWxlUGF0aDogJ3Rlc3QuY2FudmFzJyxcclxuICAgICAgICAgICAgICAgIGxpbmU6IDAsXHJcbiAgICAgICAgICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiAnICcsXHJcbiAgICAgICAgICAgICAgICBvcmlnaW5hbE1hcmtkb3duOiAnLSBbIF0gVGFzayB3aXRoIG1ldGFkYXRhJyxcclxuICAgICAgICAgICAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFnczogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZVR5cGU6ICdjYW52YXMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhbnZhc05vZGVJZDogJ25vZGUtMSdcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWRUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcbiAgICAgICAgICAgICAgICAuLi5vcmlnaW5hbFRhc2ssXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnVGFzayB3aXRoIG1ldGFkYXRhJyxcclxuICAgICAgICAgICAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLi4ub3JpZ2luYWxUYXNrLm1ldGFkYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiA0LFxyXG4gICAgICAgICAgICAgICAgICAgIHRhZ3M6IFsnI2ltcG9ydGFudCcsICcjd29yayddLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb2plY3Q6ICdUZXN0UHJvamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dDogJ29mZmljZSdcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIC8vIEZpcnN0LCBhZGQgdGhlIHRhc2sgdG8gdGhlIGNhbnZhc1xyXG4gICAgICAgICAgICBjb25zdCBjYW52YXNEYXRhID0gSlNPTi5wYXJzZShtb2NrVmF1bHQuZ2V0RmlsZUNvbnRlbnQoJ3Rlc3QuY2FudmFzJykhKTtcclxuICAgICAgICAgICAgY2FudmFzRGF0YS5ub2Rlc1swXS50ZXh0ID0gJyMgVGVzdCBOb2RlXFxuXFxuLSBbIF0gVGFzayB3aXRoIG1ldGFkYXRhXFxuLSBbeF0gQ29tcGxldGVkIHRhc2snO1xyXG4gICAgICAgICAgICBtb2NrVmF1bHQuc2V0RmlsZUNvbnRlbnQoJ3Rlc3QuY2FudmFzJywgSlNPTi5zdHJpbmdpZnkoY2FudmFzRGF0YSwgbnVsbCwgMikpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdXBkYXRlci51cGRhdGVDYW52YXNUYXNrKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spO1xyXG5cclxuICAgICAgICAgICAgZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG4gICAgICAgICAgICBleHBlY3QocmVzdWx0LmVycm9yKS50b0JlVW5kZWZpbmVkKCk7XHJcblxyXG4gICAgICAgICAgICAvLyBWZXJpZnkgdGhlIENhbnZhcyBmaWxlIHdhcyB1cGRhdGVkIHdpdGggbWV0YWRhdGFcclxuICAgICAgICAgICAgY29uc3QgdXBkYXRlZENvbnRlbnQgPSBtb2NrVmF1bHQuZ2V0RmlsZUNvbnRlbnQoJ3Rlc3QuY2FudmFzJyk7XHJcbiAgICAgICAgICAgIGV4cGVjdCh1cGRhdGVkQ29udGVudCkudG9CZURlZmluZWQoKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWRDYW52YXNEYXRhID0gSlNPTi5wYXJzZSh1cGRhdGVkQ29udGVudCEpO1xyXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVkTm9kZSA9IHVwZGF0ZWRDYW52YXNEYXRhLm5vZGVzLmZpbmQoKG46IGFueSkgPT4gbi5pZCA9PT0gJ25vZGUtMScpO1xyXG5cclxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHRhZ3MsIHByb2plY3QsIGNvbnRleHQsIGFuZCBwcmlvcml0eVxyXG4gICAgICAgICAgICBleHBlY3QodXBkYXRlZE5vZGUudGV4dCkudG9Db250YWluKCcjaW1wb3J0YW50Jyk7XHJcbiAgICAgICAgICAgIGV4cGVjdCh1cGRhdGVkTm9kZS50ZXh0KS50b0NvbnRhaW4oJyN3b3JrJyk7XHJcbiAgICAgICAgICAgIGV4cGVjdCh1cGRhdGVkTm9kZS50ZXh0KS50b0NvbnRhaW4oJyNwcm9qZWN0L1Rlc3RQcm9qZWN0Jyk7XHJcbiAgICAgICAgICAgIGV4cGVjdCh1cGRhdGVkTm9kZS50ZXh0KS50b0NvbnRhaW4oJ0BvZmZpY2UnKTtcclxuICAgICAgICAgICAgZXhwZWN0KHVwZGF0ZWROb2RlLnRleHQpLnRvQ29udGFpbign4o+rJyk7IC8vIEhpZ2ggcHJpb3JpdHkgZW1vamlcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaXQoJ3Nob3VsZCBoYW5kbGUgbXVsdGlwbGUgdGFza3Mgd2l0aCBzYW1lIG5hbWUgY29ycmVjdGx5JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAvLyBDcmVhdGUgYSBjb21wbGV4IGNhbnZhcyB3aXRoIG11bHRpcGxlIHNhbWUtbmFtZWQgdGFza3NcclxuICAgICAgICAgICAgY29uc3QgY29tcGxleENhbnZhc0RhdGE6IENhbnZhc0RhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICBub2RlczogW1xyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6ICdwcm9qZWN0LXBsYW5uaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiAnIyBQcm9qZWN0IFBsYW5uaW5nXFxuXFxuIyMgSW5pdGlhbCBTZXR1cFxcbi0gWyBdIERlZmluZSBwcm9qZWN0IHNjb3BlXFxuLSBbIF0gU2V0IHVwIGRldmVsb3BtZW50IGVudmlyb25tZW50XFxuLSBbeF0gQ3JlYXRlIHByb2plY3QgcmVwb3NpdG9yeVxcbi0gWyBdIENvbmZpZ3VyZSBDSS9DRCBwaXBlbGluZVxcblxcbiMjIFJlc2VhcmNoIFBoYXNlXFxuLSBbIF0gTWFya2V0IHJlc2VhcmNoXFxuLSBbIF0gQ29tcGV0aXRvciBhbmFseXNpc1xcbi0gWyBdIFRlY2hub2xvZ3kgc3RhY2sgZXZhbHVhdGlvbicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IDEwMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeTogMTAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogMzUwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDI4MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6ICcxJ1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogJ2RldmVsb3BtZW50LXRhc2tzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiAnIyBEZXZlbG9wbWVudCBUYXNrc1xcblxcbiMjIEZyb250ZW5kXFxuLSBbIF0gRGVzaWduIHVzZXIgaW50ZXJmYWNlIG1vY2t1cHNcXG4tIFsgXSBJbXBsZW1lbnQgcmVzcG9uc2l2ZSBsYXlvdXRcXG4tIFsgXSBBZGQgdXNlciBhdXRoZW50aWNhdGlvblxcbi0gWyBdIENyZWF0ZSBkYXNoYm9hcmQgY29tcG9uZW50c1xcblxcbiMjIEJhY2tlbmRcXG4tIFsgXSBTZXQgdXAgZGF0YWJhc2Ugc2NoZW1hXFxuLSBbIF0gSW1wbGVtZW50IFJFU1QgQVBJXFxuLSBbIF0gQWRkIGRhdGEgdmFsaWRhdGlvblxcbi0gWyBdIENvbmZpZ3VyZSBzZWN1cml0eSBtaWRkbGV3YXJlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeDogNTAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiAxMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiAzNTAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogMjgwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjogJzInXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiAndGVzdGluZy1xYScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogJyMgVGVzdGluZyAmIFFBXFxuXFxuIyMgVW5pdCBUZXN0aW5nXFxuLSBbIF0gV3JpdGUgY29tcG9uZW50IHRlc3RzXFxuLSBbIF0gQVBJIGVuZHBvaW50IHRlc3RzXFxuLSBbIF0gRGF0YWJhc2UgaW50ZWdyYXRpb24gdGVzdHNcXG5cXG4jIyBJbnRlZ3JhdGlvbiBUZXN0aW5nXFxuLSBbIF0gRW5kLXRvLWVuZCB0ZXN0aW5nXFxuLSBbIF0gUGVyZm9ybWFuY2UgdGVzdGluZ1xcbi0gWyBdIFNlY3VyaXR5IHRlc3RpbmdcXG5cXG4jIyBRdWFsaXR5IEFzc3VyYW5jZVxcbi0gWyBdIENvZGUgcmV2aWV3IHByb2Nlc3NcXG4tIFsgXSBEb2N1bWVudGF0aW9uIHJldmlld1xcbi0gWyBdIFVzZXIgYWNjZXB0YW5jZSB0ZXN0aW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeDogMTAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiA0MjAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiAzNTAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogMzAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjogJzMnXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiAnZGVwbG95bWVudCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogJyMgRGVwbG95bWVudCAmIE1haW50ZW5hbmNlXFxuXFxuIyMgRGVwbG95bWVudFxcbi0gWyBdIFNldCB1cCBwcm9kdWN0aW9uIGVudmlyb25tZW50XFxuLSBbIF0gQ29uZmlndXJlIG1vbml0b3JpbmdcXG4tIFsgXSBEZXBsb3kgYXBwbGljYXRpb25cXG4tIFsgXSBWZXJpZnkgZGVwbG95bWVudFxcblxcbiMjIFBvc3QtTGF1bmNoXFxuLSBbIF0gTW9uaXRvciBwZXJmb3JtYW5jZVxcbi0gWyBdIEdhdGhlciB1c2VyIGZlZWRiYWNrXFxuLSBbIF0gQnVnIGZpeGVzIGFuZCBpbXByb3ZlbWVudHNcXG4tIFsgXSBGZWF0dXJlIGVuaGFuY2VtZW50cycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IDUwMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeTogNDIwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogMzUwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDMwMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6ICc0J1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogJ21lZXRpbmctbm90ZXMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6ICcjIE1lZXRpbmcgTm90ZXNcXG5cXG4jIyBEYWlseSBTdGFuZHVwIC0gMjAyNC0wMS0xNVxcbi0gW3hdIERpc2N1c3NlZCBwcm9qZWN0IHByb2dyZXNzXFxuLSBbIF0gUmV2aWV3IHNwcmludCBnb2Fsc1xcbi0gWyBdIEFkZHJlc3MgYmxvY2tlcnNcXG5cXG4jIyBTcHJpbnQgUGxhbm5pbmdcXG4tIFsgXSBFc3RpbWF0ZSBzdG9yeSBwb2ludHNcXG4tIFsgXSBBc3NpZ24gdGFza3MgdG8gdGVhbSBtZW1iZXJzXFxuLSBbIF0gU2V0IHNwcmludCB0aW1lbGluZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IDkwMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeTogMjgwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogMzAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6ICc1J1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICBlZGdlczogW1xyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6ICdlZGdlMScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyb21Ob2RlOiAncHJvamVjdC1wbGFubmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvTm9kZTogJ2RldmVsb3BtZW50LXRhc2tzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZnJvbVNpZGU6ICdyaWdodCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvU2lkZTogJ2xlZnQnXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiAnZWRnZTInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcm9tTm9kZTogJ2RldmVsb3BtZW50LXRhc2tzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9Ob2RlOiAndGVzdGluZy1xYScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyb21TaWRlOiAnYm90dG9tJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9TaWRlOiAndG9wJ1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogJ2VkZ2UzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZnJvbU5vZGU6ICd0ZXN0aW5nLXFhJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9Ob2RlOiAnZGVwbG95bWVudCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyb21TaWRlOiAncmlnaHQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b1NpZGU6ICdsZWZ0J1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIG1vY2tWYXVsdC5zZXRGaWxlQ29udGVudCgnY29tcGxleC5jYW52YXMnLCBKU09OLnN0cmluZ2lmeShjb21wbGV4Q2FudmFzRGF0YSwgbnVsbCwgMikpO1xyXG5cclxuICAgICAgICAgICAgLy8gVGVzdCB1cGRhdGluZyBhIHNwZWNpZmljIHRhc2sgaW4gdGhlIGZpcnN0IG5vZGVcclxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogJ3Rlc3QtMScsXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnRGVmaW5lIHByb2plY3Qgc2NvcGUnLFxyXG4gICAgICAgICAgICAgICAgZmlsZVBhdGg6ICdjb21wbGV4LmNhbnZhcycsXHJcbiAgICAgICAgICAgICAgICBsaW5lOiAwLFxyXG4gICAgICAgICAgICAgICAgY29tcGxldGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHN0YXR1czogJyAnLFxyXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxNYXJrZG93bjogJy0gWyBdIERlZmluZSBwcm9qZWN0IHNjb3BlJyxcclxuICAgICAgICAgICAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFnczogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZVR5cGU6ICdjYW52YXMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhbnZhc05vZGVJZDogJ3Byb2plY3QtcGxhbm5pbmcnXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVkVGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG4gICAgICAgICAgICAgICAgLi4ub3JpZ2luYWxUYXNrLFxyXG4gICAgICAgICAgICAgICAgY29tcGxldGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiAneCdcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHVwZGF0ZXIudXBkYXRlQ2FudmFzVGFzayhvcmlnaW5hbFRhc2ssIHVwZGF0ZWRUYXNrKTtcclxuXHJcbiAgICAgICAgICAgIGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFZlcmlmeSBvbmx5IHRoZSBjb3JyZWN0IHRhc2sgd2FzIHVwZGF0ZWRcclxuICAgICAgICAgICAgY29uc3QgdXBkYXRlZENvbnRlbnQgPSBtb2NrVmF1bHQuZ2V0RmlsZUNvbnRlbnQoJ2NvbXBsZXguY2FudmFzJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWRDYW52YXNEYXRhID0gSlNPTi5wYXJzZSh1cGRhdGVkQ29udGVudCEpO1xyXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVkTm9kZSA9IHVwZGF0ZWRDYW52YXNEYXRhLm5vZGVzLmZpbmQoKG46IGFueSkgPT4gbi5pZCA9PT0gJ3Byb2plY3QtcGxhbm5pbmcnKTtcclxuXHJcbiAgICAgICAgICAgIGV4cGVjdCh1cGRhdGVkTm9kZS50ZXh0KS50b0NvbnRhaW4oJy0gW3hdIERlZmluZSBwcm9qZWN0IHNjb3BlJyk7XHJcbiAgICAgICAgICAgIGV4cGVjdCh1cGRhdGVkTm9kZS50ZXh0KS50b0NvbnRhaW4oJy0gWyBdIFNldCB1cCBkZXZlbG9wbWVudCBlbnZpcm9ubWVudCcpOyAvLyBTaG91bGQgcmVtYWluIHVuY2hhbmdlZFxyXG4gICAgICAgICAgICBleHBlY3QodXBkYXRlZE5vZGUudGV4dCkudG9Db250YWluKCctIFt4XSBDcmVhdGUgcHJvamVjdCByZXBvc2l0b3J5Jyk7IC8vIFNob3VsZCByZW1haW4gdW5jaGFuZ2VkXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGl0KCdzaG91bGQgaGFuZGxlIHRhc2tzIHdpdGggaWRlbnRpY2FsIG5hbWVzIGFuZCBtZXRhZGF0YSBjb3JyZWN0bHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIGNhbnZhcyB3aXRoIG11bHRpcGxlIGlkZW50aWNhbCB0YXNrIG5hbWVzIGJ1dCBkaWZmZXJlbnQgbWV0YWRhdGFcclxuICAgICAgICAgICAgY29uc3QgaWRlbnRpY2FsVGFza3NDYW52YXNEYXRhOiBDYW52YXNEYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgbm9kZXM6IFtcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiAnaWRlbnRpY2FsLXRhc2tzLW5vZGUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6ICcjIFRhc2tzIHdpdGggU2FtZSBOYW1lc1xcblxcbi0gWyBdIFRhc2sgSW4gQ2FudmFzIPCfk4UgMjAyNS0wNi0yMVxcbi0gWyBdIFRhc2sgSW4gQ2FudmFzIPCfm6sgMjAyNS0wNi0yMVxcbi0gWyBdIFRhc2sgSW4gQ2FudmFzICNTTy/ml4XooYxcXG4tIFsgXSBUYXNrIEluIENhbnZhc1xcbi0gWyBdIEEgbmV3IGRheScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IDEwMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeTogMTAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogMzUwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDI4MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6ICcxJ1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICBlZGdlczogW11cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIG1vY2tWYXVsdC5zZXRGaWxlQ29udGVudCgnaWRlbnRpY2FsLXRhc2tzLmNhbnZhcycsIEpTT04uc3RyaW5naWZ5KGlkZW50aWNhbFRhc2tzQ2FudmFzRGF0YSwgbnVsbCwgMikpO1xyXG5cclxuICAgICAgICAgICAgLy8gVGVzdCB1cGRhdGluZyB0aGUgdGhpcmQgdGFzayAod2l0aCAjU08v5peF6KGMIHRhZylcclxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogJ3Rlc3QtMScsXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnVGFzayBJbiBDYW52YXMnLFxyXG4gICAgICAgICAgICAgICAgZmlsZVBhdGg6ICdpZGVudGljYWwtdGFza3MuY2FudmFzJyxcclxuICAgICAgICAgICAgICAgIGxpbmU6IDAsXHJcbiAgICAgICAgICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiAnICcsXHJcbiAgICAgICAgICAgICAgICBvcmlnaW5hbE1hcmtkb3duOiAnLSBbIF0gVGFzayBJbiBDYW52YXMgI1NPL+aXheihjCcsXHJcbiAgICAgICAgICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhZ3M6IFsnI1NPL+aXheihjCddLFxyXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2VUeXBlOiAnY2FudmFzJyxcclxuICAgICAgICAgICAgICAgICAgICBjYW52YXNOb2RlSWQ6ICdpZGVudGljYWwtdGFza3Mtbm9kZSdcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWRUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcbiAgICAgICAgICAgICAgICAuLi5vcmlnaW5hbFRhc2ssXHJcbiAgICAgICAgICAgICAgICBjb21wbGV0ZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBzdGF0dXM6ICd4J1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdXBkYXRlci51cGRhdGVDYW52YXNUYXNrKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spO1xyXG5cclxuICAgICAgICAgICAgZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cclxuICAgICAgICAgICAgLy8gVmVyaWZ5IG9ubHkgdGhlIGNvcnJlY3QgdGFzayB3YXMgdXBkYXRlZFxyXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVkQ29udGVudCA9IG1vY2tWYXVsdC5nZXRGaWxlQ29udGVudCgnaWRlbnRpY2FsLXRhc2tzLmNhbnZhcycpO1xyXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVkQ2FudmFzRGF0YSA9IEpTT04ucGFyc2UodXBkYXRlZENvbnRlbnQhKTtcclxuICAgICAgICAgICAgY29uc3QgdXBkYXRlZE5vZGUgPSB1cGRhdGVkQ2FudmFzRGF0YS5ub2Rlcy5maW5kKChuOiBhbnkpID0+IG4uaWQgPT09ICdpZGVudGljYWwtdGFza3Mtbm9kZScpO1xyXG5cclxuICAgICAgICAgICAgLy8gQ2hlY2sgdGhhdCBvbmx5IHRoZSB0YXNrIHdpdGggI1NPL+aXheihjCB3YXMgdXBkYXRlZFxyXG4gICAgICAgICAgICBleHBlY3QodXBkYXRlZE5vZGUudGV4dCkudG9Db250YWluKCctIFsgXSBUYXNrIEluIENhbnZhcyDwn5OFIDIwMjUtMDYtMjEnKTsgLy8gU2hvdWxkIHJlbWFpbiB1bmNoYW5nZWRcclxuICAgICAgICAgICAgZXhwZWN0KHVwZGF0ZWROb2RlLnRleHQpLnRvQ29udGFpbignLSBbIF0gVGFzayBJbiBDYW52YXMg8J+bqyAyMDI1LTA2LTIxJyk7IC8vIFNob3VsZCByZW1haW4gdW5jaGFuZ2VkXHJcbiAgICAgICAgICAgIGV4cGVjdCh1cGRhdGVkTm9kZS50ZXh0KS50b0NvbnRhaW4oJy0gW3hdIFRhc2sgSW4gQ2FudmFzICNTTy/ml4XooYwnKTsgLy8gU2hvdWxkIGJlIHVwZGF0ZWRcclxuICAgICAgICAgICAgZXhwZWN0KHVwZGF0ZWROb2RlLnRleHQpLnRvQ29udGFpbignLSBbIF0gVGFzayBJbiBDYW52YXMnKTsgLy8gU2hvdWxkIHJlbWFpbiB1bmNoYW5nZWQgKHBsYWluIHRhc2spXHJcbiAgICAgICAgICAgIGV4cGVjdCh1cGRhdGVkTm9kZS50ZXh0KS50b0NvbnRhaW4oJy0gWyBdIEEgbmV3IGRheScpOyAvLyBTaG91bGQgcmVtYWluIHVuY2hhbmdlZFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpdCgnc2hvdWxkIHByb3Blcmx5IHJlbW92ZSBhbmQgYWRkIG1ldGFkYXRhIHdpdGhvdXQgYWZmZWN0aW5nIG90aGVyIHRhc2tzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAvLyBDcmVhdGUgYSBjYW52YXMgd2l0aCB0YXNrcyB0aGF0IGhhdmUgbWV0YWRhdGEgdG8gYmUgcmVtb3ZlZC9tb2RpZmllZFxyXG4gICAgICAgICAgICBjb25zdCBtZXRhZGF0YVRlc3RDYW52YXNEYXRhOiBDYW52YXNEYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgbm9kZXM6IFtcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiAnbWV0YWRhdGEtdGVzdC1ub2RlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiAnIyBNZXRhZGF0YSBUZXN0XFxuXFxuLSBbIF0gVGFzayB3aXRoIGR1ZSBkYXRlIPCfk4UgMjAyNS0wNi0yMVxcbi0gWyBdIFRhc2sgd2l0aCBzdGFydCBkYXRlIPCfm6sgMjAyNS0wNi0yMFxcbi0gWyBdIFRhc2sgd2l0aCBwcmlvcml0eSDij6tcXG4tIFsgXSBUYXNrIHdpdGggbXVsdGlwbGUgbWV0YWRhdGEg8J+ThSAyMDI1LTA2LTIxIPCfm6sgMjAyNS0wNi0yMCAjaW1wb3J0YW50IEB3b3JrJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeDogMTAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiAxMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiAzNTAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogMjgwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjogJzEnXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIGVkZ2VzOiBbXVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgbW9ja1ZhdWx0LnNldEZpbGVDb250ZW50KCdtZXRhZGF0YS10ZXN0LmNhbnZhcycsIEpTT04uc3RyaW5naWZ5KG1ldGFkYXRhVGVzdENhbnZhc0RhdGEsIG51bGwsIDIpKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFRlc3QgcmVtb3ZpbmcgZHVlIGRhdGUgZnJvbSB0aGUgZmlyc3QgdGFza1xyXG4gICAgICAgICAgICAvLyBOb3RlOiBsaW5lTWF0Y2hlc1Rhc2sgb25seSBjb21wYXJlcyBjb250ZW50LCBub3QgdGhlIGZ1bGwgb3JpZ2luYWxNYXJrZG93blxyXG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbFRhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiAndGVzdC0xJyxcclxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6ICdUYXNrIHdpdGggZHVlIGRhdGUg8J+ThSAyMDI1LTA2LTIxJywgLy8gVGhpcyBzaG91bGQgbWF0Y2ggdGhlIGxpbmUgY29udGVudCBhZnRlciByZW1vdmluZyBjaGVja2JveFxyXG4gICAgICAgICAgICAgICAgZmlsZVBhdGg6ICdtZXRhZGF0YS10ZXN0LmNhbnZhcycsXHJcbiAgICAgICAgICAgICAgICBsaW5lOiAwLFxyXG4gICAgICAgICAgICAgICAgY29tcGxldGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHN0YXR1czogJyAnLFxyXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxNYXJrZG93bjogJy0gWyBdIFRhc2sgd2l0aCBkdWUgZGF0ZSDwn5OFIDIwMjUtMDYtMjEnLFxyXG4gICAgICAgICAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0YWdzOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgc291cmNlVHlwZTogJ2NhbnZhcycsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FudmFzTm9kZUlkOiAnbWV0YWRhdGEtdGVzdC1ub2RlJyxcclxuICAgICAgICAgICAgICAgICAgICBkdWVEYXRlOiBuZXcgRGF0ZSgnMjAyNS0wNi0yMScpLmdldFRpbWUoKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgLy8gVXBkYXRlIHRhc2sgdG8gcmVtb3ZlIGR1ZSBkYXRlXHJcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWRUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcbiAgICAgICAgICAgICAgICAuLi5vcmlnaW5hbFRhc2ssXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnVGFzayB3aXRoIGR1ZSBkYXRlJywgLy8gUmVtb3ZlIG1ldGFkYXRhIGZyb20gY29udGVudFxyXG4gICAgICAgICAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAuLi5vcmlnaW5hbFRhc2subWV0YWRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVlRGF0ZTogdW5kZWZpbmVkIC8vIFJlbW92ZSBkdWUgZGF0ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdXBkYXRlci51cGRhdGVDYW52YXNUYXNrKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spO1xyXG5cclxuICAgICAgICAgICAgZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cclxuICAgICAgICAgICAgLy8gVmVyaWZ5IG1ldGFkYXRhIHdhcyBwcm9wZXJseSByZW1vdmVkIGZyb20gdGhlIGNvcnJlY3QgdGFzayBvbmx5XHJcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWRDb250ZW50ID0gbW9ja1ZhdWx0LmdldEZpbGVDb250ZW50KCdtZXRhZGF0YS10ZXN0LmNhbnZhcycpO1xyXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVkQ2FudmFzRGF0YSA9IEpTT04ucGFyc2UodXBkYXRlZENvbnRlbnQhKTtcclxuICAgICAgICAgICAgY29uc3QgdXBkYXRlZE5vZGUgPSB1cGRhdGVkQ2FudmFzRGF0YS5ub2Rlcy5maW5kKChuOiBhbnkpID0+IG4uaWQgPT09ICdtZXRhZGF0YS10ZXN0LW5vZGUnKTtcclxuXHJcbiAgICAgICAgICAgIC8vIENoZWNrIHRoYXQgZHVlIGRhdGUgd2FzIHJlbW92ZWQgZnJvbSB0aGUgZmlyc3QgdGFza1xyXG4gICAgICAgICAgICBleHBlY3QodXBkYXRlZE5vZGUudGV4dCkudG9Db250YWluKCctIFsgXSBUYXNrIHdpdGggZHVlIGRhdGVcXG4nKTsgLy8gU2hvdWxkIG5vdCBjb250YWluIPCfk4UgMjAyNS0wNi0yMVxyXG4gICAgICAgICAgICBleHBlY3QodXBkYXRlZE5vZGUudGV4dCkubm90LnRvTWF0Y2goLy0gXFxbIFxcXSBUYXNrIHdpdGggZHVlIGRhdGUg8J+ThSAyMDI1LTA2LTIxLyk7XHJcblxyXG4gICAgICAgICAgICAvLyBDaGVjayB0aGF0IG90aGVyIHRhc2tzIHJlbWFpbiB1bmNoYW5nZWRcclxuICAgICAgICAgICAgZXhwZWN0KHVwZGF0ZWROb2RlLnRleHQpLnRvQ29udGFpbignLSBbIF0gVGFzayB3aXRoIHN0YXJ0IGRhdGUg8J+bqyAyMDI1LTA2LTIwJyk7XHJcbiAgICAgICAgICAgIGV4cGVjdCh1cGRhdGVkTm9kZS50ZXh0KS50b0NvbnRhaW4oJy0gWyBdIFRhc2sgd2l0aCBwcmlvcml0eSDij6snKTtcclxuICAgICAgICAgICAgZXhwZWN0KHVwZGF0ZWROb2RlLnRleHQpLnRvQ29udGFpbignLSBbIF0gVGFzayB3aXRoIG11bHRpcGxlIG1ldGFkYXRhIPCfk4UgMjAyNS0wNi0yMSDwn5urIDIwMjUtMDYtMjAgI2ltcG9ydGFudCBAd29yaycpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpdCgnc2hvdWxkIGhhbmRsZSB1cGRhdGluZyB0YXNrcyB3aGVuIG11bHRpcGxlIHRhc2tzIGhhdmUgc2ltaWxhciBjb250ZW50JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAvLyBUZXN0IGVkZ2UgY2FzZSB3aGVyZSB0YXNrIGNvbnRlbnQgaXMgdmVyeSBzaW1pbGFyXHJcbiAgICAgICAgICAgIGNvbnN0IHNpbWlsYXJUYXNrc0NhbnZhc0RhdGE6IENhbnZhc0RhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICBub2RlczogW1xyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6ICdzaW1pbGFyLXRhc2tzLW5vZGUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6ICcjIFNpbWlsYXIgVGFza3NcXG5cXG4tIFsgXSBSZXZpZXcgY29kZVxcbi0gWyBdIFJldmlldyBjb2RlIGNoYW5nZXNcXG4tIFsgXSBSZXZpZXcgY29kZSBmb3IgYnVnc1xcbi0gW3hdIFJldmlldyBjb2RlIGNvbXBsZXRlbHlcXG4tIFsgXSBSZXZpZXcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB4OiAxMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHk6IDEwMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IDM1MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAyODAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiAnMSdcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgZWRnZXM6IFtdXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBtb2NrVmF1bHQuc2V0RmlsZUNvbnRlbnQoJ3NpbWlsYXItdGFza3MuY2FudmFzJywgSlNPTi5zdHJpbmdpZnkoc2ltaWxhclRhc2tzQ2FudmFzRGF0YSwgbnVsbCwgMikpO1xyXG5cclxuICAgICAgICAgICAgLy8gVGVzdCB1cGRhdGluZyB0aGUgZXhhY3QgXCJSZXZpZXcgY29kZVwiIHRhc2sgKGZpcnN0IG9uZSlcclxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogJ3Rlc3QtMScsXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnUmV2aWV3IGNvZGUnLFxyXG4gICAgICAgICAgICAgICAgZmlsZVBhdGg6ICdzaW1pbGFyLXRhc2tzLmNhbnZhcycsXHJcbiAgICAgICAgICAgICAgICBsaW5lOiAwLFxyXG4gICAgICAgICAgICAgICAgY29tcGxldGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHN0YXR1czogJyAnLFxyXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxNYXJrZG93bjogJy0gWyBdIFJldmlldyBjb2RlJyxcclxuICAgICAgICAgICAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFnczogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZVR5cGU6ICdjYW52YXMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhbnZhc05vZGVJZDogJ3NpbWlsYXItdGFza3Mtbm9kZSdcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWRUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcbiAgICAgICAgICAgICAgICAuLi5vcmlnaW5hbFRhc2ssXHJcbiAgICAgICAgICAgICAgICBjb21wbGV0ZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBzdGF0dXM6ICd4J1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdXBkYXRlci51cGRhdGVDYW52YXNUYXNrKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spO1xyXG5cclxuICAgICAgICAgICAgZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cclxuICAgICAgICAgICAgLy8gVmVyaWZ5IG9ubHkgdGhlIGV4YWN0IG1hdGNoIHdhcyB1cGRhdGVkXHJcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWRDb250ZW50ID0gbW9ja1ZhdWx0LmdldEZpbGVDb250ZW50KCdzaW1pbGFyLXRhc2tzLmNhbnZhcycpO1xyXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVkQ2FudmFzRGF0YSA9IEpTT04ucGFyc2UodXBkYXRlZENvbnRlbnQhKTtcclxuICAgICAgICAgICAgY29uc3QgdXBkYXRlZE5vZGUgPSB1cGRhdGVkQ2FudmFzRGF0YS5ub2Rlcy5maW5kKChuOiBhbnkpID0+IG4uaWQgPT09ICdzaW1pbGFyLXRhc2tzLW5vZGUnKTtcclxuXHJcbiAgICAgICAgICAgIC8vIENoZWNrIHRoYXQgb25seSB0aGUgZXhhY3QgXCJSZXZpZXcgY29kZVwiIHRhc2sgd2FzIHVwZGF0ZWRcclxuICAgICAgICAgICAgZXhwZWN0KHVwZGF0ZWROb2RlLnRleHQpLnRvQ29udGFpbignLSBbeF0gUmV2aWV3IGNvZGVcXG4nKTsgLy8gRmlyc3QgdGFzayBzaG91bGQgYmUgdXBkYXRlZFxyXG4gICAgICAgICAgICBleHBlY3QodXBkYXRlZE5vZGUudGV4dCkudG9Db250YWluKCctIFsgXSBSZXZpZXcgY29kZSBjaGFuZ2VzJyk7IC8vIFNob3VsZCByZW1haW4gdW5jaGFuZ2VkXHJcbiAgICAgICAgICAgIGV4cGVjdCh1cGRhdGVkTm9kZS50ZXh0KS50b0NvbnRhaW4oJy0gWyBdIFJldmlldyBjb2RlIGZvciBidWdzJyk7IC8vIFNob3VsZCByZW1haW4gdW5jaGFuZ2VkXHJcbiAgICAgICAgICAgIGV4cGVjdCh1cGRhdGVkTm9kZS50ZXh0KS50b0NvbnRhaW4oJy0gW3hdIFJldmlldyBjb2RlIGNvbXBsZXRlbHknKTsgLy8gU2hvdWxkIHJlbWFpbiB1bmNoYW5nZWRcclxuICAgICAgICAgICAgZXhwZWN0KHVwZGF0ZWROb2RlLnRleHQpLnRvQ29udGFpbignLSBbIF0gUmV2aWV3Jyk7IC8vIFNob3VsZCByZW1haW4gdW5jaGFuZ2VkXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGl0KCdzaG91bGQgaGFuZGxlIGNhbnZhcyBmaWxlIG1vbml0b3JpbmcgYW5kIHVwZGF0ZXMgY29ycmVjdGx5JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAvLyBUaGlzIHRlc3Qgc2ltdWxhdGVzIHRoZSBmaWxlIG1vbml0b3Jpbmcgc2NlbmFyaW9cclxuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgY2FudmFzIHdpdGggdGFza3NcclxuICAgICAgICAgICAgY29uc3QgbW9uaXRvcmluZ1Rlc3RDYW52YXNEYXRhOiBDYW52YXNEYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgbm9kZXM6IFtcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiAnbW9uaXRvcmluZy10ZXN0LW5vZGUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6ICcjIEZpbGUgTW9uaXRvcmluZyBUZXN0XFxuXFxuLSBbIF0gSW5pdGlhbCB0YXNrXFxuLSBbIF0gQW5vdGhlciB0YXNrXFxuLSBbeF0gQ29tcGxldGVkIHRhc2snLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB4OiAxMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHk6IDEwMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IDM1MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAyODAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiAnMSdcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgZWRnZXM6IFtdXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBtb2NrVmF1bHQuc2V0RmlsZUNvbnRlbnQoJ21vbml0b3JpbmctdGVzdC5jYW52YXMnLCBKU09OLnN0cmluZ2lmeShtb25pdG9yaW5nVGVzdENhbnZhc0RhdGEsIG51bGwsIDIpKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFNpbXVsYXRlIHVwZGF0aW5nIGEgdGFzayBhcyBpZiBpdCB3YXMgbW9kaWZpZWQgaW4gdGhlIENhbnZhcyBmaWxlXHJcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsVGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6ICd0ZXN0LTEnLFxyXG4gICAgICAgICAgICAgICAgY29udGVudDogJ0luaXRpYWwgdGFzaycsXHJcbiAgICAgICAgICAgICAgICBmaWxlUGF0aDogJ21vbml0b3JpbmctdGVzdC5jYW52YXMnLFxyXG4gICAgICAgICAgICAgICAgbGluZTogMCxcclxuICAgICAgICAgICAgICAgIGNvbXBsZXRlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBzdGF0dXM6ICcgJyxcclxuICAgICAgICAgICAgICAgIG9yaWdpbmFsTWFya2Rvd246ICctIFsgXSBJbml0aWFsIHRhc2snLFxyXG4gICAgICAgICAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0YWdzOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgc291cmNlVHlwZTogJ2NhbnZhcycsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FudmFzTm9kZUlkOiAnbW9uaXRvcmluZy10ZXN0LW5vZGUnXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVkVGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG4gICAgICAgICAgICAgICAgLi4ub3JpZ2luYWxUYXNrLFxyXG4gICAgICAgICAgICAgICAgY29tcGxldGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiAneCcsXHJcbiAgICAgICAgICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIC4uLm9yaWdpbmFsVGFzay5tZXRhZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWREYXRlOiBEYXRlLm5vdygpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB1cGRhdGVyLnVwZGF0ZUNhbnZhc1Rhc2sob3JpZ2luYWxUYXNrLCB1cGRhdGVkVGFzayk7XHJcblxyXG4gICAgICAgICAgICBleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBWZXJpZnkgdGhlIENhbnZhcyBmaWxlIHdhcyB1cGRhdGVkIGNvcnJlY3RseVxyXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVkQ29udGVudCA9IG1vY2tWYXVsdC5nZXRGaWxlQ29udGVudCgnbW9uaXRvcmluZy10ZXN0LmNhbnZhcycpO1xyXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVkQ2FudmFzRGF0YSA9IEpTT04ucGFyc2UodXBkYXRlZENvbnRlbnQhKTtcclxuICAgICAgICAgICAgY29uc3QgdXBkYXRlZE5vZGUgPSB1cGRhdGVkQ2FudmFzRGF0YS5ub2Rlcy5maW5kKChuOiBhbnkpID0+IG4uaWQgPT09ICdtb25pdG9yaW5nLXRlc3Qtbm9kZScpO1xyXG5cclxuICAgICAgICAgICAgLy8gQ2hlY2sgdGhhdCB0aGUgdGFzayB3YXMgdXBkYXRlZCBhbmQgY29tcGxldGlvbiBkYXRlIHdhcyBhZGRlZFxyXG4gICAgICAgICAgICBleHBlY3QodXBkYXRlZE5vZGUudGV4dCkudG9Db250YWluKCctIFt4XSBJbml0aWFsIHRhc2snKTtcclxuICAgICAgICAgICAgZXhwZWN0KHVwZGF0ZWROb2RlLnRleHQpLnRvQ29udGFpbignLSBbIF0gQW5vdGhlciB0YXNrJyk7IC8vIFNob3VsZCByZW1haW4gdW5jaGFuZ2VkXHJcbiAgICAgICAgICAgIGV4cGVjdCh1cGRhdGVkTm9kZS50ZXh0KS50b0NvbnRhaW4oJy0gW3hdIENvbXBsZXRlZCB0YXNrJyk7IC8vIFNob3VsZCByZW1haW4gdW5jaGFuZ2VkXHJcblxyXG4gICAgICAgICAgICAvLyBWZXJpZnkgY29tcGxldGlvbiBkYXRlIHdhcyBhZGRlZFxyXG4gICAgICAgICAgICBjb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGV4cGVjdGVkRGF0ZSA9IGAke3RvZGF5LmdldEZ1bGxZZWFyKCl9LSR7U3RyaW5nKHRvZGF5LmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpfS0ke1N0cmluZyh0b2RheS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyl9YDtcclxuICAgICAgICAgICAgZXhwZWN0KHVwZGF0ZWROb2RlLnRleHQpLnRvQ29udGFpbihg4pyFICR7ZXhwZWN0ZWREYXRlfWApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn0pO1xyXG4iXX0=