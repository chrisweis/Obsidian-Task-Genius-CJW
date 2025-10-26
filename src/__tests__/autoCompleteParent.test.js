import { handleParentTaskUpdateTransaction, findTaskStatusChange, findParentTask, areAllSiblingsCompleted, anySiblingWithStatus, getParentTaskStatus, taskStatusChangeAnnotation, } from "../editor-extensions/autocomplete/parent-task-updater"; // Adjust the import path as necessary
import { buildIndentString } from "../utils";
import { createMockTransaction, createMockApp, createMockPlugin, createMockText, mockParentTaskStatusChangeAnnotation, } from "./mockUtils";
// --- Mock Setup ---
// Mock Annotation Type
// --- Tests ---
describe("autoCompleteParent Helpers", () => {
    describe("findTaskStatusChange", () => {
        it("should return null if doc did not change (though handleParentTaskUpdateTransaction checks this first)", () => {
            const tr = createMockTransaction({ docChanged: false });
            expect(findTaskStatusChange(tr)).toBeNull();
        });
        it("should return null if no task-related change occurred", () => {
            const tr = createMockTransaction({
                startStateDocContent: "Some text",
                newDocContent: "Some other text",
                changes: [
                    {
                        fromA: 5,
                        toA: 9,
                        fromB: 5,
                        toB: 10,
                        insertedText: "other",
                    },
                ],
            });
            expect(findTaskStatusChange(tr)).toBeNull();
        });
        it("should detect a task status change from [ ] to [x]", () => {
            const tr = createMockTransaction({
                startStateDocContent: "- [ ] Task 1",
                newDocContent: "- [x] Task 1",
                changes: [
                    { fromA: 3, toA: 4, fromB: 3, toB: 4, insertedText: "x" },
                ],
            });
            const result = findTaskStatusChange(tr);
            expect(result).not.toBeNull();
            expect(result === null || result === void 0 ? void 0 : result.lineNumber).toBe(1);
        });
        it("should detect a task status change from [ ] to [/]", () => {
            const tr = createMockTransaction({
                startStateDocContent: "  - [ ] Task 1",
                newDocContent: "  - [/] Task 1",
                changes: [
                    { fromA: 5, toA: 6, fromB: 5, toB: 6, insertedText: "/" },
                ],
            });
            const result = findTaskStatusChange(tr);
            expect(result).not.toBeNull();
            expect(result === null || result === void 0 ? void 0 : result.lineNumber).toBe(1);
        });
        it("should detect a new task added", () => {
            const tr = createMockTransaction({
                startStateDocContent: "Some text",
                newDocContent: "Some text\n- [ ] New Task",
                changes: [
                    {
                        fromA: 9,
                        toA: 9,
                        fromB: 9,
                        toB: 23,
                        insertedText: "\n- [ ] New Task",
                    },
                ],
            });
            const result = findTaskStatusChange(tr);
            expect(result).not.toBeNull();
            expect(result === null || result === void 0 ? void 0 : result.lineNumber).toBe(2); // Line number where the new task is
        });
        it("should detect a new task added at the beginning", () => {
            const tr = createMockTransaction({
                startStateDocContent: "Some text",
                newDocContent: "- [ ] New Task\nSome text",
                // Indices need careful calculation
                changes: [
                    {
                        fromA: 0,
                        toA: 0,
                        fromB: 0,
                        toB: 14,
                        insertedText: "- [ ] New Task\n",
                    },
                ],
            });
            const result = findTaskStatusChange(tr);
            expect(result).not.toBeNull();
            expect(result === null || result === void 0 ? void 0 : result.lineNumber).toBe(1);
        });
    });
    describe("findParentTask", () => {
        const indent = buildIndentString(createMockApp());
        const doc = createMockText("- [ ] Parent 1\n" + // 1
            `${indent}- [ ] Child 1.1\n` + // 2
            `${indent}  - [ ] Child 1.2\n` + // 3
            "- [ ] Parent 2\n" + // 4
            `${indent}- [ ] Child 2.1\n` + // 5
            `${indent}${indent}- [ ] Grandchild 2.1.1\n` + // 6
            `${indent}- [ ] Child 2.2` // 7
        );
        const mockApp = createMockApp();
        it("should return null for a top-level task", () => {
            expect(findParentTask(doc, 1)).toBeNull();
            expect(findParentTask(doc, 4)).toBeNull();
        });
        it("should find the parent of a child task", () => {
            const parent1 = findParentTask(doc, 2);
            expect(parent1).not.toBeNull();
            expect(parent1 === null || parent1 === void 0 ? void 0 : parent1.lineNumber).toBe(1);
            const parent2 = findParentTask(doc, 5);
            expect(parent2).not.toBeNull();
            expect(parent2 === null || parent2 === void 0 ? void 0 : parent2.lineNumber).toBe(4);
        });
        it("should find the parent of a grandchild task", () => {
            const parent = findParentTask(doc, 6);
            expect(parent).not.toBeNull();
            expect(parent === null || parent === void 0 ? void 0 : parent.lineNumber).toBe(5); // Direct parent, not grandparent
        });
        it("should handle different indentation levels", () => {
            const docWithTabs = createMockText("- [ ] Parent\n" +
                "\t- [ ] Child with tab\n" +
                "\t\t- [ ] Grandchild with tabs");
            const parent = findParentTask(docWithTabs, 3);
            expect(parent).not.toBeNull();
            expect(parent === null || parent === void 0 ? void 0 : parent.lineNumber).toBe(2);
        });
        it("should handle mixed indentation", () => {
            const docWithMixedIndent = createMockText("- [ ] Parent\n" +
                "    - [ ] Child with spaces\n" +
                "\t- [ ] Child with tab");
            const parent1 = findParentTask(docWithMixedIndent, 2);
            expect(parent1).not.toBeNull();
            expect(parent1 === null || parent1 === void 0 ? void 0 : parent1.lineNumber).toBe(1);
            const parent2 = findParentTask(docWithMixedIndent, 3);
            expect(parent2).not.toBeNull();
            expect(parent2 === null || parent2 === void 0 ? void 0 : parent2.lineNumber).toBe(1);
        });
    });
    describe("areAllSiblingsCompleted", () => {
        const mockPlugin = createMockPlugin();
        const indent = buildIndentString(createMockApp());
        it("should return true if all siblings are completed", () => {
            const doc = createMockText("- [ ] Parent\n" +
                `${indent}- [x] Child 1\n` +
                `${indent}- [x] Child 2`);
            expect(areAllSiblingsCompleted(doc, 1, 0, mockPlugin)).toBe(true);
        });
        it("should return false if any sibling is not completed", () => {
            const doc = createMockText("- [ ] Parent\n" +
                `${indent}- [x] Child 1\n` +
                `${indent}- [ ] Child 2`);
            expect(areAllSiblingsCompleted(doc, 1, 0, mockPlugin)).toBe(false);
        });
        it("should return false if any sibling is in progress", () => {
            const doc = createMockText("- [ ] Parent\n" + "  - [x] Child 1\n" + "  - [/] Child 2");
            expect(areAllSiblingsCompleted(doc, 1, 0, mockPlugin)).toBe(false);
        });
        it("should return true if there are no siblings", () => {
            const doc = createMockText("- [ ] Parent");
            expect(areAllSiblingsCompleted(doc, 1, 0, mockPlugin)).toBe(false);
        });
        it("should ignore grandchildren", () => {
            const doc = createMockText("- [ ] Parent\n" +
                `${indent}- [x] Child 1\n` +
                `${indent}${indent}- [ ] Grandchild 1.1\n` + // Grandchild not completed
                `${indent}- [x] Child 2`);
            expect(areAllSiblingsCompleted(doc, 1, 0, mockPlugin)).toBe(true); // Only checks Child 1 & 2
        });
    });
    describe("anySiblingWithStatus", () => {
        const mockApp = createMockApp();
        const indent = buildIndentString(createMockApp());
        it("should return true if any sibling has status [/]", () => {
            const doc = createMockText("- [ ] Parent\n" +
                `${indent}- [ ] Child 1\n` +
                `${indent}- [/] Child 2`);
            expect(anySiblingWithStatus(doc, 1, 0, mockApp)).toBe(true);
        });
        it("should return true if any sibling has status [x]", () => {
            const doc = createMockText("- [ ] Parent\n" +
                `${indent}- [ ] Child 1\n` +
                `${indent}- [x] Child 2`);
            expect(anySiblingWithStatus(doc, 1, 0, mockApp)).toBe(true);
        });
        it("should return false if all siblings are [ ]", () => {
            const doc = createMockText("- [ ] Parent\n" +
                `${indent}- [ ] Child 1\n` +
                `${indent}- [ ] Child 2`);
            expect(anySiblingWithStatus(doc, 1, 0, mockApp)).toBe(false);
        });
        it("should return false if there are no siblings", () => {
            const doc = createMockText("- [ ] Parent");
            expect(anySiblingWithStatus(doc, 1, 0, mockApp)).toBe(false);
        });
        it("should ignore grandchildren", () => {
            const doc = createMockText("- [ ] Parent\n" +
                `${indent}- [ ] Child 1\n` +
                `${indent}${indent}- [/] Grandchild 1.1\n` + // Grandchild has status
                `${indent}- [ ] Child 2`);
            expect(anySiblingWithStatus(doc, 1, 0, mockApp)).toBe(false); // Checks only Child 1 & 2
        });
    });
    describe("getParentTaskStatus", () => {
        it("should return the status character for [ ]", () => {
            const doc = createMockText("- [ ] Parent Task");
            expect(getParentTaskStatus(doc, 1)).toBe(" ");
        });
        it("should return the status character for [x]", () => {
            const doc = createMockText("  - [x] Parent Task");
            expect(getParentTaskStatus(doc, 1)).toBe("x");
        });
        it("should return the status character for [/]", () => {
            const doc = createMockText("	- [/] Parent Task");
            expect(getParentTaskStatus(doc, 1)).toBe("/");
        });
        it("should return empty string if not a task", () => {
            const doc = createMockText("Just text");
            expect(getParentTaskStatus(doc, 1)).toBe("");
        });
    });
});
describe("handleParentTaskUpdateTransaction (Integration)", () => {
    const mockApp = createMockApp();
    it("should return original transaction if docChanged is false", () => {
        const mockPlugin = createMockPlugin();
        const tr = createMockTransaction({ docChanged: false });
        const result = handleParentTaskUpdateTransaction(tr, mockApp, mockPlugin);
        expect(result).toBe(tr);
    });
    it("should return original transaction for paste events", () => {
        const mockPlugin = createMockPlugin();
        const tr = createMockTransaction({
            startStateDocContent: "- [ ] Parent\n  - [ ] Child",
            newDocContent: "- [ ] Parent\n  - [x] Child",
            changes: [
                { fromA: 18, toA: 19, fromB: 18, toB: 19, insertedText: "x" },
            ],
            isUserEvent: "input.paste",
        });
        const result = handleParentTaskUpdateTransaction(tr, mockApp, mockPlugin);
        expect(result).toBe(tr);
    });
    it("should return original transaction if no task status change detected", () => {
        const mockPlugin = createMockPlugin();
        const tr = createMockTransaction({
            startStateDocContent: "Hello",
            newDocContent: "Hello World",
            changes: [
                { fromA: 5, toA: 5, fromB: 5, toB: 11, insertedText: " World" },
            ],
        });
        const result = handleParentTaskUpdateTransaction(tr, mockApp, mockPlugin);
        expect(result).toBe(tr);
    });
    it("should return original transaction if changed task has no parent", () => {
        const mockPlugin = createMockPlugin();
        const tr = createMockTransaction({
            startStateDocContent: "- [ ] Task",
            newDocContent: "- [x] Task",
            changes: [
                { fromA: 3, toA: 4, fromB: 3, toB: 4, insertedText: "x" },
            ],
        });
        const result = handleParentTaskUpdateTransaction(tr, mockApp, mockPlugin);
        expect(result).toBe(tr);
    });
    it("should complete parent when last child is completed", () => {
        const mockPlugin = createMockPlugin({
            autoCompleteParent: true,
        });
        const indent = buildIndentString(createMockApp());
        const tr = createMockTransaction({
            startStateDocContent: "- [ ] Parent\n" + `${indent}- [ ] Child`,
            newDocContent: "- [ ] Parent\n" + `${indent}- [x] Child`,
            changes: [
                { fromA: 18, toA: 19, fromB: 18, toB: 19, insertedText: "x" },
            ], // Change in child
        });
        const result = handleParentTaskUpdateTransaction(tr, mockApp, mockPlugin);
        expect(result).not.toBe(tr);
        expect(result.changes).toHaveLength(2); // Original change + parent change
        // @ts-ignore - Accessing internal structure for test validation
        const parentChange = result.changes[1];
        expect(parentChange.from).toBe(3); // Position of space in parent: '- [ ]'
        expect(parentChange.to).toBe(4);
        expect(parentChange.insert).toBe("x");
        expect(result.annotations).toEqual([
            taskStatusChangeAnnotation.of("autoCompleteParent.DONE"),
        ]);
    });
    it("should NOT complete parent if it is already complete", () => {
        const mockPlugin = createMockPlugin({
            autoCompleteParent: true,
        });
        const indent = buildIndentString(createMockApp());
        const tr = createMockTransaction({
            startStateDocContent: "- [x] Parent\n" +
                `${indent}- [x] Child 1\n` +
                `${indent}- [ ] Child 2`,
            newDocContent: "- [x] Parent\n" +
                `${indent}- [x] Child 1\n` +
                `${indent}- [x] Child 2`,
            changes: [
                { fromA: 18, toA: 19, fromB: 18, toB: 19, insertedText: "x" },
            ], // Change in Child 1
        });
        const result = handleParentTaskUpdateTransaction(tr, mockApp, mockPlugin);
        // Parent is already 'x', no change should happen even if Child 1 is completed
        expect(result).toBe(tr);
    });
    it("should mark parent as in progress when a child is unchecked (if setting enabled)", () => {
        const mockPlugin = createMockPlugin({
            autoCompleteParent: true,
            markParentInProgressWhenPartiallyComplete: true,
            taskStatuses: {
                inProgress: "/",
                completed: "x",
                abandoned: "-",
                planned: "?",
                notStarted: " ",
            },
        });
        const indent = buildIndentString(createMockApp());
        const tr = createMockTransaction({
            startStateDocContent: "- [x] Parent\n" + `${indent}- [x] Child`,
            newDocContent: "- [x] Parent\n" + `${indent}- [ ] Child`,
            changes: [
                { fromA: 21, toA: 22, fromB: 21, toB: 22, insertedText: " " },
            ], // Child uncompleted - position adjusted for 4-space indent
        });
        const result = handleParentTaskUpdateTransaction(tr, mockApp, mockPlugin);
        expect(result).not.toBe(tr);
        expect(result.changes).toHaveLength(2);
        // @ts-ignore
        const parentChange = result.changes[1];
        expect(parentChange.from).toBe(3); // Position of 'x' in parent: '- [x]'
        expect(parentChange.to).toBe(4);
        expect(parentChange.insert).toBe("/"); // Should be in progress marker
        expect(result.annotations).toEqual([
            mockParentTaskStatusChangeAnnotation.of("autoCompleteParent.IN_PROGRESS"),
        ]);
    });
    it("should NOT mark parent as in progress when a child is unchecked (if setting disabled)", () => {
        const mockPlugin = createMockPlugin({
            autoCompleteParent: true,
            markParentInProgressWhenPartiallyComplete: false,
        });
        const indent = buildIndentString(createMockApp());
        const tr = createMockTransaction({
            startStateDocContent: "- [x] Parent\n" + `${indent}- [x] Child`,
            newDocContent: "- [x] Parent\n" + `${indent}- [ ] Child`,
            changes: [
                { fromA: 21, toA: 22, fromB: 21, toB: 22, insertedText: " " },
            ], // Child uncompleted - position adjusted for 4-space indent
        });
        const result = handleParentTaskUpdateTransaction(tr, mockApp, mockPlugin);
        expect(result).toBe(tr); // No change expected
    });
    it("should mark parent as in progress when first child gets a status (if setting enabled)", () => {
        const mockPlugin = createMockPlugin({
            autoCompleteParent: true,
            markParentInProgressWhenPartiallyComplete: true,
            taskStatuses: {
                inProgress: "/",
                completed: "x",
                abandoned: "-",
                planned: "?",
                notStarted: " ",
            },
        });
        const indent = buildIndentString(createMockApp());
        const tr = createMockTransaction({
            startStateDocContent: "- [ ] Parent\n" + `${indent}- [ ] Child`,
            newDocContent: "- [ ] Parent\n" + `${indent}- [/] Child`,
            changes: [
                { fromA: 21, toA: 22, fromB: 21, toB: 22, insertedText: "/" },
            ], // Child marked in progress - position adjusted for 4-space indent
        });
        const result = handleParentTaskUpdateTransaction(tr, mockApp, mockPlugin);
        expect(result).not.toBe(tr);
        expect(result.changes).toHaveLength(2);
        // @ts-ignore
        const parentChange = result.changes[1];
        expect(parentChange.from).toBe(3); // Position of ' ' in parent: '- [ ]'
        expect(parentChange.to).toBe(4);
        expect(parentChange.insert).toBe("/");
        expect(result.annotations).toEqual([
            mockParentTaskStatusChangeAnnotation.of("autoCompleteParent.IN_PROGRESS"),
        ]);
    });
    it("should NOT mark parent as in progress when first child gets a status (if setting disabled)", () => {
        const mockPlugin = createMockPlugin({
            autoCompleteParent: true,
            markParentInProgressWhenPartiallyComplete: false,
        });
        const indent = buildIndentString(createMockApp());
        const tr = createMockTransaction({
            startStateDocContent: "- [ ] Parent\n" + `${indent}- [ ] Child`,
            newDocContent: "- [ ] Parent\n" + `${indent}- [/] Child`,
            changes: [
                { fromA: 21, toA: 22, fromB: 21, toB: 22, insertedText: "/" },
            ], // Child marked in progress - position adjusted for 4-space indent
        });
        const result = handleParentTaskUpdateTransaction(tr, mockApp, mockPlugin);
        expect(result).toBe(tr);
    });
    it("should NOT mark parent as in progress if parent already has a status", () => {
        const mockPlugin = createMockPlugin({
            autoCompleteParent: true,
            markParentInProgressWhenPartiallyComplete: true,
            taskStatuses: {
                inProgress: "/",
                completed: "x",
                abandoned: "-",
                planned: "?",
                notStarted: " ",
            },
        });
        const indent = buildIndentString(createMockApp());
        const tr = createMockTransaction({
            startStateDocContent: "- [/] Parent\n" +
                `${indent}- [ ] Child 1\n` +
                `${indent}- [ ] Child 2`,
            newDocContent: "- [/] Parent\n" +
                `${indent}- [x] Child 1\n` +
                `${indent}- [ ] Child 2`,
            changes: [
                { fromA: 21, toA: 22, fromB: 21, toB: 22, insertedText: "x" },
            ], // Child 1 completed - position adjusted for 4-space indent
        });
        const result = handleParentTaskUpdateTransaction(tr, mockApp, mockPlugin);
        // Parent already '/' and markParentInProgress only triggers if parent is ' ', so no change.
        expect(result).toBe(tr);
    });
    it("should ignore changes triggered by its own annotation (complete)", () => {
        const mockPlugin = createMockPlugin({
            autoCompleteParent: true,
        });
        const indent = buildIndentString(createMockApp());
        const tr = createMockTransaction({
            startStateDocContent: "- [ ] Parent\n" + `${indent}- [ ] Child`,
            newDocContent: "- [ ] Parent\n" + `${indent}- [x] Child`,
            changes: [
                { fromA: 21, toA: 22, fromB: 21, toB: 22, insertedText: "x" },
            ],
            annotations: [
                mockParentTaskStatusChangeAnnotation.of("autoCompleteParent.SOME_OTHER_ACTION"),
            ], // Simulate annotation present
        });
        // Add a specific annotation value that includes 'autoCompleteParent'
        // @ts-ignore
        tr.annotation = jest.fn((type) => {
            if (type === mockParentTaskStatusChangeAnnotation) {
                return "autoCompleteParent.DONE"; // Simulate this transaction was caused by auto-complete
            }
            return undefined;
        });
        const result = handleParentTaskUpdateTransaction(tr, mockApp, mockPlugin);
        // Even though child is completed, the annotation should prevent parent completion
        expect(result).toBe(tr);
    });
    it("should ignore changes triggered by its own annotation (in progress)", () => {
        const indent = buildIndentString(createMockApp());
        const mockPlugin = createMockPlugin({
            autoCompleteParent: true,
            markParentInProgressWhenPartiallyComplete: true,
            taskStatuses: {
                inProgress: "/",
                completed: "x",
                abandoned: "-",
                planned: "?",
                notStarted: " ",
            },
        });
        const tr = createMockTransaction({
            startStateDocContent: "- [ ] Parent\n" + `${indent}- [ ] Child`,
            newDocContent: "- [ ] Parent\n" + `${indent}- [/] Child`,
            changes: [
                { fromA: 21, toA: 22, fromB: 21, toB: 22, insertedText: "/" },
            ],
            annotations: [
                mockParentTaskStatusChangeAnnotation.of("autoCompleteParent.SOME_OTHER_ACTION"),
            ], // Simulate annotation present
        });
        // @ts-ignore
        tr.annotation = jest.fn((type) => {
            if (type === mockParentTaskStatusChangeAnnotation) {
                return "autoCompleteParent.IN_PROGRESS"; // Simulate this transaction was caused by auto-complete
            }
            return undefined;
        });
        const result = handleParentTaskUpdateTransaction(tr, mockApp, mockPlugin);
        // Even though child got status, the annotation should prevent parent update
        expect(result).toBe(tr);
    });
    it("should mark parent as in progress when one child is completed but others remain incomplete", () => {
        const mockPlugin = createMockPlugin({
            autoCompleteParent: true,
            markParentInProgressWhenPartiallyComplete: true,
            taskStatuses: {
                inProgress: "/",
                completed: "x",
                abandoned: "-",
                planned: "?",
                notStarted: " ",
            },
        });
        const indent = buildIndentString(createMockApp());
        const tr = createMockTransaction({
            startStateDocContent: "- [ ] Parent\n" +
                `${indent}- [ ] Child 1\n` +
                `${indent}- [ ] Child 2`,
            newDocContent: "- [ ] Parent\n" +
                `${indent}- [x] Child 1\n` +
                `${indent}- [ ] Child 2`,
            changes: [
                { fromA: 21, toA: 22, fromB: 21, toB: 22, insertedText: "x" },
            ], // Change in Child 1
        });
        const result = handleParentTaskUpdateTransaction(tr, mockApp, mockPlugin);
        expect(result).not.toBe(tr);
        expect(result.changes).toHaveLength(2);
        // @ts-ignore
        const parentChange = result.changes[1];
        expect(parentChange.from).toBe(3); // Position of ' ' in parent: '- [ ]'
        expect(parentChange.to).toBe(4);
        expect(parentChange.insert).toBe("/"); // Should be in progress marker
        expect(result.annotations).toEqual([
            mockParentTaskStatusChangeAnnotation.of("autoCompleteParent.IN_PROGRESS"),
        ]);
    });
    it("should NOT change parent task status when deleting a dash with backspace", () => {
        const mockPlugin = createMockPlugin({
            autoCompleteParent: true,
        }); // Defaults: ' ', '/', 'x'
        // Set up a complete task and an incomplete task line below (just a dash)
        const startContent = "- [ ] Task 1\n- ";
        // After pressing Backspace to delete the dash on the second line, the first line task should not become [/]
        const newContent = "- [ ] Task 1";
        // Simulate pressing Backspace to delete the dash at the beginning of the second line
        const tr = createMockTransaction({
            startStateDocContent: startContent,
            newDocContent: newContent,
            changes: [
                {
                    fromA: 15,
                    toA: 15,
                    fromB: 12,
                    toB: 12,
                    insertedText: "", // Delete operation, no inserted text
                },
            ],
            docChanged: true,
        });
        // The function should detect this is a deletion operation, not a task status change
        const result = handleParentTaskUpdateTransaction(tr, mockApp, mockPlugin);
        // Expect the original transaction to be returned (no modification)
        expect(result).toBe(tr);
        expect(result.changes).toEqual(tr.changes);
        expect(result.selection).toEqual(tr.selection);
    });
    it("should NOT change parent task status when deleting an indented dash", () => {
        const mockPlugin = createMockPlugin({
            autoCompleteParent: true,
        }); // Defaults: ' ', '/', 'x'
        const indent = buildIndentString(createMockApp());
        // Test with indentation
        const startContentIndented = "- [ ] Task 1\n" + indent + "- ";
        const newContentIndented = "- [ ] Task 1\n" + indent; // Delete the dash after indentation
        const trIndented = createMockTransaction({
            startStateDocContent: startContentIndented,
            newDocContent: newContentIndented,
            changes: [
                {
                    fromA: 15,
                    toA: 16,
                    fromB: 15,
                    toB: 14,
                    insertedText: "", // Delete operation, no inserted text
                },
            ],
            docChanged: true,
        });
        const resultIndented = handleParentTaskUpdateTransaction(trIndented, mockApp, mockPlugin);
        // The function should not change parent task status when deleting a dash
        expect(resultIndented).toBe(trIndented);
        expect(resultIndented.changes).toEqual(trIndented.changes);
        expect(resultIndented.selection).toEqual(trIndented.selection);
        // Verify no parent task status change annotation was added
        expect(resultIndented.annotations).not.toEqual(mockParentTaskStatusChangeAnnotation.of("autoCompleteParent.COMPLETED"));
        expect(resultIndented.annotations).not.toEqual(mockParentTaskStatusChangeAnnotation.of("autoCompleteParent.IN_PROGRESS"));
    });
    it("should prevent accidental parent status changes when deleting a dash and newline marker", () => {
        const mockPlugin = createMockPlugin({
            autoCompleteParent: true,
        }); // Defaults: ' ', '/', 'x'
        // Test erroneous behavior: deleting a dash incorrectly changes the status of the previous task
        const startContent = "- [ ] Task 1\n- ";
        const newContent = "- [ ] Task 1"; // Status incorrectly changed
        const tr = createMockTransaction({
            startStateDocContent: startContent,
            newDocContent: newContent,
            changes: [
                {
                    fromA: 15,
                    toA: 15,
                    fromB: 12,
                    toB: 12,
                    insertedText: "", // Incorrectly inserted new status
                },
            ],
            docChanged: true,
        });
        // Even when receiving such a transaction, the function should detect this is not a valid status change
        const result = handleParentTaskUpdateTransaction(tr, mockApp, mockPlugin);
        // The function should identify and prevent such accidental parent status changes
        expect(result).toBe(tr);
        expect(result.changes).toEqual(tr.changes);
    });
});
// Add more tests for edge cases, different indentation levels, workflow interactions etc.
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b0NvbXBsZXRlUGFyZW50LnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhdXRvQ29tcGxldGVQYXJlbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ04saUNBQWlDLEVBQ2pDLG9CQUFvQixFQUNwQixjQUFjLEVBQ2QsdUJBQXVCLEVBQ3ZCLG9CQUFvQixFQUNwQixtQkFBbUIsRUFFbkIsMEJBQTBCLEdBQzFCLE1BQU0sdURBQXVELENBQUMsQ0FBQyxzQ0FBc0M7QUFDdEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQzdDLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsYUFBYSxFQUNiLGdCQUFnQixFQUNoQixjQUFjLEVBQ2Qsb0NBQW9DLEdBQ3BDLE1BQU0sYUFBYSxDQUFDO0FBRXJCLHFCQUFxQjtBQUVyQix1QkFBdUI7QUFFdkIsZ0JBQWdCO0FBRWhCLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7SUFDM0MsUUFBUSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtRQUNyQyxFQUFFLENBQUMsdUdBQXVHLEVBQUUsR0FBRyxFQUFFO1lBQ2hILE1BQU0sRUFBRSxHQUFHLHFCQUFxQixDQUFDLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDeEQsTUFBTSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDN0MsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsdURBQXVELEVBQUUsR0FBRyxFQUFFO1lBQ2hFLE1BQU0sRUFBRSxHQUFHLHFCQUFxQixDQUFDO2dCQUNoQyxvQkFBb0IsRUFBRSxXQUFXO2dCQUNqQyxhQUFhLEVBQUUsaUJBQWlCO2dCQUNoQyxPQUFPLEVBQUU7b0JBQ1I7d0JBQ0MsS0FBSyxFQUFFLENBQUM7d0JBQ1IsR0FBRyxFQUFFLENBQUM7d0JBQ04sS0FBSyxFQUFFLENB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QUMsT0FBTyxDQUFDLENBQUM7SUFDNUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILDBGQUEwRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0aGFuZGxlUGFyZW50VGFza1VwZGF0ZVRyYW5zYWN0aW9uLFxyXG5cdGZpbmRUYXNrU3RhdHVzQ2hhbmdlLFxyXG5cdGZpbmRQYXJlbnRUYXNrLFxyXG5cdGFyZUFsbFNpYmxpbmdzQ29tcGxldGVkLFxyXG5cdGFueVNpYmxpbmdXaXRoU3RhdHVzLFxyXG5cdGdldFBhcmVudFRhc2tTdGF0dXMsXHJcblx0aGFzQW55Q2hpbGRUYXNrc0F0TGV2ZWwsXHJcblx0dGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24sXHJcbn0gZnJvbSBcIi4uL2VkaXRvci1leHRlbnNpb25zL2F1dG9jb21wbGV0ZS9wYXJlbnQtdGFzay11cGRhdGVyXCI7IC8vIEFkanVzdCB0aGUgaW1wb3J0IHBhdGggYXMgbmVjZXNzYXJ5XHJcbmltcG9ydCB7IGJ1aWxkSW5kZW50U3RyaW5nIH0gZnJvbSBcIi4uL3V0aWxzXCI7XHJcbmltcG9ydCB7XHJcblx0Y3JlYXRlTW9ja1RyYW5zYWN0aW9uLFxyXG5cdGNyZWF0ZU1vY2tBcHAsXHJcblx0Y3JlYXRlTW9ja1BsdWdpbixcclxuXHRjcmVhdGVNb2NrVGV4dCxcclxuXHRtb2NrUGFyZW50VGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24sXHJcbn0gZnJvbSBcIi4vbW9ja1V0aWxzXCI7XHJcblxyXG4vLyAtLS0gTW9jayBTZXR1cCAtLS1cclxuXHJcbi8vIE1vY2sgQW5ub3RhdGlvbiBUeXBlXHJcblxyXG4vLyAtLS0gVGVzdHMgLS0tXHJcblxyXG5kZXNjcmliZShcImF1dG9Db21wbGV0ZVBhcmVudCBIZWxwZXJzXCIsICgpID0+IHtcclxuXHRkZXNjcmliZShcImZpbmRUYXNrU3RhdHVzQ2hhbmdlXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHJldHVybiBudWxsIGlmIGRvYyBkaWQgbm90IGNoYW5nZSAodGhvdWdoIGhhbmRsZVBhcmVudFRhc2tVcGRhdGVUcmFuc2FjdGlvbiBjaGVja3MgdGhpcyBmaXJzdClcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ciA9IGNyZWF0ZU1vY2tUcmFuc2FjdGlvbih7IGRvY0NoYW5nZWQ6IGZhbHNlIH0pO1xyXG5cdFx0XHRleHBlY3QoZmluZFRhc2tTdGF0dXNDaGFuZ2UodHIpKS50b0JlTnVsbCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgcmV0dXJuIG51bGwgaWYgbm8gdGFzay1yZWxhdGVkIGNoYW5nZSBvY2N1cnJlZFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRyID0gY3JlYXRlTW9ja1RyYW5zYWN0aW9uKHtcclxuXHRcdFx0XHRzdGFydFN0YXRlRG9jQ29udGVudDogXCJTb21lIHRleHRcIixcclxuXHRcdFx0XHRuZXdEb2NDb250ZW50OiBcIlNvbWUgb3RoZXIgdGV4dFwiLFxyXG5cdFx0XHRcdGNoYW5nZXM6IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0ZnJvbUE6IDUsXHJcblx0XHRcdFx0XHRcdHRvQTogOSxcclxuXHRcdFx0XHRcdFx0ZnJvbUI6IDUsXHJcblx0XHRcdFx0XHRcdHRvQjogMTAsXHJcblx0XHRcdFx0XHRcdGluc2VydGVkVGV4dDogXCJvdGhlclwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0ZXhwZWN0KGZpbmRUYXNrU3RhdHVzQ2hhbmdlKHRyKSkudG9CZU51bGwoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGRldGVjdCBhIHRhc2sgc3RhdHVzIGNoYW5nZSBmcm9tIFsgXSB0byBbeF1cIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ciA9IGNyZWF0ZU1vY2tUcmFuc2FjdGlvbih7XHJcblx0XHRcdFx0c3RhcnRTdGF0ZURvY0NvbnRlbnQ6IFwiLSBbIF0gVGFzayAxXCIsXHJcblx0XHRcdFx0bmV3RG9jQ29udGVudDogXCItIFt4XSBUYXNrIDFcIixcclxuXHRcdFx0XHRjaGFuZ2VzOiBbXHJcblx0XHRcdFx0XHR7IGZyb21BOiAzLCB0b0E6IDQsIGZyb21COiAzLCB0b0I6IDQsIGluc2VydGVkVGV4dDogXCJ4XCIgfSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gZmluZFRhc2tTdGF0dXNDaGFuZ2UodHIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS5ub3QudG9CZU51bGwoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdD8ubGluZU51bWJlcikudG9CZSgxKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGRldGVjdCBhIHRhc2sgc3RhdHVzIGNoYW5nZSBmcm9tIFsgXSB0byBbL11cIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ciA9IGNyZWF0ZU1vY2tUcmFuc2FjdGlvbih7XHJcblx0XHRcdFx0c3RhcnRTdGF0ZURvY0NvbnRlbnQ6IFwiICAtIFsgXSBUYXNrIDFcIixcclxuXHRcdFx0XHRuZXdEb2NDb250ZW50OiBcIiAgLSBbL10gVGFzayAxXCIsXHJcblx0XHRcdFx0Y2hhbmdlczogW1xyXG5cdFx0XHRcdFx0eyBmcm9tQTogNSwgdG9BOiA2LCBmcm9tQjogNSwgdG9COiA2LCBpbnNlcnRlZFRleHQ6IFwiL1wiIH0sXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGZpbmRUYXNrU3RhdHVzQ2hhbmdlKHRyKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkubm90LnRvQmVOdWxsKCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQ/LmxpbmVOdW1iZXIpLnRvQmUoMSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBkZXRlY3QgYSBuZXcgdGFzayBhZGRlZFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRyID0gY3JlYXRlTW9ja1RyYW5zYWN0aW9uKHtcclxuXHRcdFx0XHRzdGFydFN0YXRlRG9jQ29udGVudDogXCJTb21lIHRleHRcIixcclxuXHRcdFx0XHRuZXdEb2NDb250ZW50OiBcIlNvbWUgdGV4dFxcbi0gWyBdIE5ldyBUYXNrXCIsXHJcblx0XHRcdFx0Y2hhbmdlczogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRmcm9tQTogOSxcclxuXHRcdFx0XHRcdFx0dG9BOiA5LFxyXG5cdFx0XHRcdFx0XHRmcm9tQjogOSxcclxuXHRcdFx0XHRcdFx0dG9COiAyMyxcclxuXHRcdFx0XHRcdFx0aW5zZXJ0ZWRUZXh0OiBcIlxcbi0gWyBdIE5ldyBUYXNrXCIsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBmaW5kVGFza1N0YXR1c0NoYW5nZSh0cik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLm5vdC50b0JlTnVsbCgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Py5saW5lTnVtYmVyKS50b0JlKDIpOyAvLyBMaW5lIG51bWJlciB3aGVyZSB0aGUgbmV3IHRhc2sgaXNcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGRldGVjdCBhIG5ldyB0YXNrIGFkZGVkIGF0IHRoZSBiZWdpbm5pbmdcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ciA9IGNyZWF0ZU1vY2tUcmFuc2FjdGlvbih7XHJcblx0XHRcdFx0c3RhcnRTdGF0ZURvY0NvbnRlbnQ6IFwiU29tZSB0ZXh0XCIsXHJcblx0XHRcdFx0bmV3RG9jQ29udGVudDogXCItIFsgXSBOZXcgVGFza1xcblNvbWUgdGV4dFwiLFxyXG5cdFx0XHRcdC8vIEluZGljZXMgbmVlZCBjYXJlZnVsIGNhbGN1bGF0aW9uXHJcblx0XHRcdFx0Y2hhbmdlczogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRmcm9tQTogMCxcclxuXHRcdFx0XHRcdFx0dG9BOiAwLFxyXG5cdFx0XHRcdFx0XHRmcm9tQjogMCxcclxuXHRcdFx0XHRcdFx0dG9COiAxNCxcclxuXHRcdFx0XHRcdFx0aW5zZXJ0ZWRUZXh0OiBcIi0gWyBdIE5ldyBUYXNrXFxuXCIsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBmaW5kVGFza1N0YXR1c0NoYW5nZSh0cik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLm5vdC50b0JlTnVsbCgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Py5saW5lTnVtYmVyKS50b0JlKDEpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiZmluZFBhcmVudFRhc2tcIiwgKCkgPT4ge1xyXG5cdFx0Y29uc3QgaW5kZW50ID0gYnVpbGRJbmRlbnRTdHJpbmcoY3JlYXRlTW9ja0FwcCgpKTtcclxuXHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KFxyXG5cdFx0XHRcIi0gWyBdIFBhcmVudCAxXFxuXCIgKyAvLyAxXHJcblx0XHRcdFx0YCR7aW5kZW50fS0gWyBdIENoaWxkIDEuMVxcbmAgKyAvLyAyXHJcblx0XHRcdFx0YCR7aW5kZW50fSAgLSBbIF0gQ2hpbGQgMS4yXFxuYCArIC8vIDNcclxuXHRcdFx0XHRcIi0gWyBdIFBhcmVudCAyXFxuXCIgKyAvLyA0XHJcblx0XHRcdFx0YCR7aW5kZW50fS0gWyBdIENoaWxkIDIuMVxcbmAgKyAvLyA1XHJcblx0XHRcdFx0YCR7aW5kZW50fSR7aW5kZW50fS0gWyBdIEdyYW5kY2hpbGQgMi4xLjFcXG5gICsgLy8gNlxyXG5cdFx0XHRcdGAke2luZGVudH0tIFsgXSBDaGlsZCAyLjJgIC8vIDdcclxuXHRcdCk7XHJcblxyXG5cdFx0Y29uc3QgbW9ja0FwcCA9IGNyZWF0ZU1vY2tBcHAoKTtcclxuXHJcblx0XHRpdChcInNob3VsZCByZXR1cm4gbnVsbCBmb3IgYSB0b3AtbGV2ZWwgdGFza1wiLCAoKSA9PiB7XHJcblx0XHRcdGV4cGVjdChmaW5kUGFyZW50VGFzayhkb2MsIDEpKS50b0JlTnVsbCgpO1xyXG5cdFx0XHRleHBlY3QoZmluZFBhcmVudFRhc2soZG9jLCA0KSkudG9CZU51bGwoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGZpbmQgdGhlIHBhcmVudCBvZiBhIGNoaWxkIHRhc2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXJlbnQxID0gZmluZFBhcmVudFRhc2soZG9jLCAyKTtcclxuXHRcdFx0ZXhwZWN0KHBhcmVudDEpLm5vdC50b0JlTnVsbCgpO1xyXG5cdFx0XHRleHBlY3QocGFyZW50MT8ubGluZU51bWJlcikudG9CZSgxKTtcclxuXHJcblx0XHRcdGNvbnN0IHBhcmVudDIgPSBmaW5kUGFyZW50VGFzayhkb2MsIDUpO1xyXG5cdFx0XHRleHBlY3QocGFyZW50Mikubm90LnRvQmVOdWxsKCk7XHJcblx0XHRcdGV4cGVjdChwYXJlbnQyPy5saW5lTnVtYmVyKS50b0JlKDQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgZmluZCB0aGUgcGFyZW50IG9mIGEgZ3JhbmRjaGlsZCB0YXNrXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcGFyZW50ID0gZmluZFBhcmVudFRhc2soZG9jLCA2KTtcclxuXHRcdFx0ZXhwZWN0KHBhcmVudCkubm90LnRvQmVOdWxsKCk7XHJcblx0XHRcdGV4cGVjdChwYXJlbnQ/LmxpbmVOdW1iZXIpLnRvQmUoNSk7IC8vIERpcmVjdCBwYXJlbnQsIG5vdCBncmFuZHBhcmVudFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGRpZmZlcmVudCBpbmRlbnRhdGlvbiBsZXZlbHNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBkb2NXaXRoVGFicyA9IGNyZWF0ZU1vY2tUZXh0KFxyXG5cdFx0XHRcdFwiLSBbIF0gUGFyZW50XFxuXCIgK1xyXG5cdFx0XHRcdFx0XCJcXHQtIFsgXSBDaGlsZCB3aXRoIHRhYlxcblwiICtcclxuXHRcdFx0XHRcdFwiXFx0XFx0LSBbIF0gR3JhbmRjaGlsZCB3aXRoIHRhYnNcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcGFyZW50ID0gZmluZFBhcmVudFRhc2soZG9jV2l0aFRhYnMsIDMpO1xyXG5cdFx0XHRleHBlY3QocGFyZW50KS5ub3QudG9CZU51bGwoKTtcclxuXHRcdFx0ZXhwZWN0KHBhcmVudD8ubGluZU51bWJlcikudG9CZSgyKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBtaXhlZCBpbmRlbnRhdGlvblwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGRvY1dpdGhNaXhlZEluZGVudCA9IGNyZWF0ZU1vY2tUZXh0KFxyXG5cdFx0XHRcdFwiLSBbIF0gUGFyZW50XFxuXCIgK1xyXG5cdFx0XHRcdFx0XCIgICAgLSBbIF0gQ2hpbGQgd2l0aCBzcGFjZXNcXG5cIiArXHJcblx0XHRcdFx0XHRcIlxcdC0gWyBdIENoaWxkIHdpdGggdGFiXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnN0IHBhcmVudDEgPSBmaW5kUGFyZW50VGFzayhkb2NXaXRoTWl4ZWRJbmRlbnQsIDIpO1xyXG5cdFx0XHRleHBlY3QocGFyZW50MSkubm90LnRvQmVOdWxsKCk7XHJcblx0XHRcdGV4cGVjdChwYXJlbnQxPy5saW5lTnVtYmVyKS50b0JlKDEpO1xyXG5cclxuXHRcdFx0Y29uc3QgcGFyZW50MiA9IGZpbmRQYXJlbnRUYXNrKGRvY1dpdGhNaXhlZEluZGVudCwgMyk7XHJcblx0XHRcdGV4cGVjdChwYXJlbnQyKS5ub3QudG9CZU51bGwoKTtcclxuXHRcdFx0ZXhwZWN0KHBhcmVudDI/LmxpbmVOdW1iZXIpLnRvQmUoMSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJhcmVBbGxTaWJsaW5nc0NvbXBsZXRlZFwiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBtb2NrUGx1Z2luID0gY3JlYXRlTW9ja1BsdWdpbigpO1xyXG5cdFx0Y29uc3QgaW5kZW50ID0gYnVpbGRJbmRlbnRTdHJpbmcoY3JlYXRlTW9ja0FwcCgpKTtcclxuXHJcblx0XHRpdChcInNob3VsZCByZXR1cm4gdHJ1ZSBpZiBhbGwgc2libGluZ3MgYXJlIGNvbXBsZXRlZFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KFxyXG5cdFx0XHRcdFwiLSBbIF0gUGFyZW50XFxuXCIgK1xyXG5cdFx0XHRcdFx0YCR7aW5kZW50fS0gW3hdIENoaWxkIDFcXG5gICtcclxuXHRcdFx0XHRcdGAke2luZGVudH0tIFt4XSBDaGlsZCAyYFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QoYXJlQWxsU2libGluZ3NDb21wbGV0ZWQoZG9jLCAxLCAwLCBtb2NrUGx1Z2luKSkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHJldHVybiBmYWxzZSBpZiBhbnkgc2libGluZyBpcyBub3QgY29tcGxldGVkXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja1RleHQoXHJcblx0XHRcdFx0XCItIFsgXSBQYXJlbnRcXG5cIiArXHJcblx0XHRcdFx0XHRgJHtpbmRlbnR9LSBbeF0gQ2hpbGQgMVxcbmAgK1xyXG5cdFx0XHRcdFx0YCR7aW5kZW50fS0gWyBdIENoaWxkIDJgXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChhcmVBbGxTaWJsaW5nc0NvbXBsZXRlZChkb2MsIDEsIDAsIG1vY2tQbHVnaW4pKS50b0JlKGZhbHNlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHJldHVybiBmYWxzZSBpZiBhbnkgc2libGluZyBpcyBpbiBwcm9ncmVzc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KFxyXG5cdFx0XHRcdFwiLSBbIF0gUGFyZW50XFxuXCIgKyBcIiAgLSBbeF0gQ2hpbGQgMVxcblwiICsgXCIgIC0gWy9dIENoaWxkIDJcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QoYXJlQWxsU2libGluZ3NDb21wbGV0ZWQoZG9jLCAxLCAwLCBtb2NrUGx1Z2luKSkudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCByZXR1cm4gdHJ1ZSBpZiB0aGVyZSBhcmUgbm8gc2libGluZ3NcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBkb2MgPSBjcmVhdGVNb2NrVGV4dChcIi0gWyBdIFBhcmVudFwiKTtcclxuXHRcdFx0ZXhwZWN0KGFyZUFsbFNpYmxpbmdzQ29tcGxldGVkKGRvYywgMSwgMCwgbW9ja1BsdWdpbikpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaWdub3JlIGdyYW5kY2hpbGRyZW5cIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBkb2MgPSBjcmVhdGVNb2NrVGV4dChcclxuXHRcdFx0XHRcIi0gWyBdIFBhcmVudFxcblwiICtcclxuXHRcdFx0XHRcdGAke2luZGVudH0tIFt4XSBDaGlsZCAxXFxuYCArXHJcblx0XHRcdFx0XHRgJHtpbmRlbnR9JHtpbmRlbnR9LSBbIF0gR3JhbmRjaGlsZCAxLjFcXG5gICsgLy8gR3JhbmRjaGlsZCBub3QgY29tcGxldGVkXHJcblx0XHRcdFx0XHRgJHtpbmRlbnR9LSBbeF0gQ2hpbGQgMmBcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KGFyZUFsbFNpYmxpbmdzQ29tcGxldGVkKGRvYywgMSwgMCwgbW9ja1BsdWdpbikpLnRvQmUodHJ1ZSk7IC8vIE9ubHkgY2hlY2tzIENoaWxkIDEgJiAyXHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJhbnlTaWJsaW5nV2l0aFN0YXR1c1wiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBtb2NrQXBwID0gY3JlYXRlTW9ja0FwcCgpO1xyXG5cdFx0Y29uc3QgaW5kZW50ID0gYnVpbGRJbmRlbnRTdHJpbmcoY3JlYXRlTW9ja0FwcCgpKTtcclxuXHJcblx0XHRpdChcInNob3VsZCByZXR1cm4gdHJ1ZSBpZiBhbnkgc2libGluZyBoYXMgc3RhdHVzIFsvXVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KFxyXG5cdFx0XHRcdFwiLSBbIF0gUGFyZW50XFxuXCIgK1xyXG5cdFx0XHRcdFx0YCR7aW5kZW50fS0gWyBdIENoaWxkIDFcXG5gICtcclxuXHRcdFx0XHRcdGAke2luZGVudH0tIFsvXSBDaGlsZCAyYFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QoYW55U2libGluZ1dpdGhTdGF0dXMoZG9jLCAxLCAwLCBtb2NrQXBwKSkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHJldHVybiB0cnVlIGlmIGFueSBzaWJsaW5nIGhhcyBzdGF0dXMgW3hdXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja1RleHQoXHJcblx0XHRcdFx0XCItIFsgXSBQYXJlbnRcXG5cIiArXHJcblx0XHRcdFx0XHRgJHtpbmRlbnR9LSBbIF0gQ2hpbGQgMVxcbmAgK1xyXG5cdFx0XHRcdFx0YCR7aW5kZW50fS0gW3hdIENoaWxkIDJgXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChhbnlTaWJsaW5nV2l0aFN0YXR1cyhkb2MsIDEsIDAsIG1vY2tBcHApKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgcmV0dXJuIGZhbHNlIGlmIGFsbCBzaWJsaW5ncyBhcmUgWyBdXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja1RleHQoXHJcblx0XHRcdFx0XCItIFsgXSBQYXJlbnRcXG5cIiArXHJcblx0XHRcdFx0XHRgJHtpbmRlbnR9LSBbIF0gQ2hpbGQgMVxcbmAgK1xyXG5cdFx0XHRcdFx0YCR7aW5kZW50fS0gWyBdIENoaWxkIDJgXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChhbnlTaWJsaW5nV2l0aFN0YXR1cyhkb2MsIDEsIDAsIG1vY2tBcHApKS50b0JlKGZhbHNlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHJldHVybiBmYWxzZSBpZiB0aGVyZSBhcmUgbm8gc2libGluZ3NcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBkb2MgPSBjcmVhdGVNb2NrVGV4dChcIi0gWyBdIFBhcmVudFwiKTtcclxuXHRcdFx0ZXhwZWN0KGFueVNpYmxpbmdXaXRoU3RhdHVzKGRvYywgMSwgMCwgbW9ja0FwcCkpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaWdub3JlIGdyYW5kY2hpbGRyZW5cIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBkb2MgPSBjcmVhdGVNb2NrVGV4dChcclxuXHRcdFx0XHRcIi0gWyBdIFBhcmVudFxcblwiICtcclxuXHRcdFx0XHRcdGAke2luZGVudH0tIFsgXSBDaGlsZCAxXFxuYCArXHJcblx0XHRcdFx0XHRgJHtpbmRlbnR9JHtpbmRlbnR9LSBbL10gR3JhbmRjaGlsZCAxLjFcXG5gICsgLy8gR3JhbmRjaGlsZCBoYXMgc3RhdHVzXHJcblx0XHRcdFx0XHRgJHtpbmRlbnR9LSBbIF0gQ2hpbGQgMmBcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KGFueVNpYmxpbmdXaXRoU3RhdHVzKGRvYywgMSwgMCwgbW9ja0FwcCkpLnRvQmUoZmFsc2UpOyAvLyBDaGVja3Mgb25seSBDaGlsZCAxICYgMlxyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiZ2V0UGFyZW50VGFza1N0YXR1c1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCByZXR1cm4gdGhlIHN0YXR1cyBjaGFyYWN0ZXIgZm9yIFsgXVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KFwiLSBbIF0gUGFyZW50IFRhc2tcIik7XHJcblx0XHRcdGV4cGVjdChnZXRQYXJlbnRUYXNrU3RhdHVzKGRvYywgMSkpLnRvQmUoXCIgXCIpO1xyXG5cdFx0fSk7XHJcblx0XHRpdChcInNob3VsZCByZXR1cm4gdGhlIHN0YXR1cyBjaGFyYWN0ZXIgZm9yIFt4XVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KFwiICAtIFt4XSBQYXJlbnQgVGFza1wiKTtcclxuXHRcdFx0ZXhwZWN0KGdldFBhcmVudFRhc2tTdGF0dXMoZG9jLCAxKSkudG9CZShcInhcIik7XHJcblx0XHR9KTtcclxuXHRcdGl0KFwic2hvdWxkIHJldHVybiB0aGUgc3RhdHVzIGNoYXJhY3RlciBmb3IgWy9dXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja1RleHQoXCJcdC0gWy9dIFBhcmVudCBUYXNrXCIpO1xyXG5cdFx0XHRleHBlY3QoZ2V0UGFyZW50VGFza1N0YXR1cyhkb2MsIDEpKS50b0JlKFwiL1wiKTtcclxuXHRcdH0pO1xyXG5cdFx0aXQoXCJzaG91bGQgcmV0dXJuIGVtcHR5IHN0cmluZyBpZiBub3QgYSB0YXNrXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja1RleHQoXCJKdXN0IHRleHRcIik7XHJcblx0XHRcdGV4cGVjdChnZXRQYXJlbnRUYXNrU3RhdHVzKGRvYywgMSkpLnRvQmUoXCJcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7XHJcblxyXG5kZXNjcmliZShcImhhbmRsZVBhcmVudFRhc2tVcGRhdGVUcmFuc2FjdGlvbiAoSW50ZWdyYXRpb24pXCIsICgpID0+IHtcclxuXHRjb25zdCBtb2NrQXBwID0gY3JlYXRlTW9ja0FwcCgpO1xyXG5cclxuXHRpdChcInNob3VsZCByZXR1cm4gb3JpZ2luYWwgdHJhbnNhY3Rpb24gaWYgZG9jQ2hhbmdlZCBpcyBmYWxzZVwiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBtb2NrUGx1Z2luID0gY3JlYXRlTW9ja1BsdWdpbigpO1xyXG5cdFx0Y29uc3QgdHIgPSBjcmVhdGVNb2NrVHJhbnNhY3Rpb24oeyBkb2NDaGFuZ2VkOiBmYWxzZSB9KTtcclxuXHRcdGNvbnN0IHJlc3VsdCA9IGhhbmRsZVBhcmVudFRhc2tVcGRhdGVUcmFuc2FjdGlvbihcclxuXHRcdFx0dHIsXHJcblx0XHRcdG1vY2tBcHAsXHJcblx0XHRcdG1vY2tQbHVnaW5cclxuXHRcdCk7XHJcblx0XHRleHBlY3QocmVzdWx0KS50b0JlKHRyKTtcclxuXHR9KTtcclxuXHJcblx0aXQoXCJzaG91bGQgcmV0dXJuIG9yaWdpbmFsIHRyYW5zYWN0aW9uIGZvciBwYXN0ZSBldmVudHNcIiwgKCkgPT4ge1xyXG5cdFx0Y29uc3QgbW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oKTtcclxuXHRcdGNvbnN0IHRyID0gY3JlYXRlTW9ja1RyYW5zYWN0aW9uKHtcclxuXHRcdFx0c3RhcnRTdGF0ZURvY0NvbnRlbnQ6IFwiLSBbIF0gUGFyZW50XFxuICAtIFsgXSBDaGlsZFwiLFxyXG5cdFx0XHRuZXdEb2NDb250ZW50OiBcIi0gWyBdIFBhcmVudFxcbiAgLSBbeF0gQ2hpbGRcIixcclxuXHRcdFx0Y2hhbmdlczogW1xyXG5cdFx0XHRcdHsgZnJvbUE6IDE4LCB0b0E6IDE5LCBmcm9tQjogMTgsIHRvQjogMTksIGluc2VydGVkVGV4dDogXCJ4XCIgfSxcclxuXHRcdFx0XSxcclxuXHRcdFx0aXNVc2VyRXZlbnQ6IFwiaW5wdXQucGFzdGVcIixcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3QgcmVzdWx0ID0gaGFuZGxlUGFyZW50VGFza1VwZGF0ZVRyYW5zYWN0aW9uKFxyXG5cdFx0XHR0cixcclxuXHRcdFx0bW9ja0FwcCxcclxuXHRcdFx0bW9ja1BsdWdpblxyXG5cdFx0KTtcclxuXHRcdGV4cGVjdChyZXN1bHQpLnRvQmUodHIpO1xyXG5cdH0pO1xyXG5cclxuXHRpdChcInNob3VsZCByZXR1cm4gb3JpZ2luYWwgdHJhbnNhY3Rpb24gaWYgbm8gdGFzayBzdGF0dXMgY2hhbmdlIGRldGVjdGVkXCIsICgpID0+IHtcclxuXHRcdGNvbnN0IG1vY2tQbHVnaW4gPSBjcmVhdGVNb2NrUGx1Z2luKCk7XHJcblx0XHRjb25zdCB0ciA9IGNyZWF0ZU1vY2tUcmFuc2FjdGlvbih7XHJcblx0XHRcdHN0YXJ0U3RhdGVEb2NDb250ZW50OiBcIkhlbGxvXCIsXHJcblx0XHRcdG5ld0RvY0NvbnRlbnQ6IFwiSGVsbG8gV29ybGRcIixcclxuXHRcdFx0Y2hhbmdlczogW1xyXG5cdFx0XHRcdHsgZnJvbUE6IDUsIHRvQTogNSwgZnJvbUI6IDUsIHRvQjogMTEsIGluc2VydGVkVGV4dDogXCIgV29ybGRcIiB9LFxyXG5cdFx0XHRdLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCByZXN1bHQgPSBoYW5kbGVQYXJlbnRUYXNrVXBkYXRlVHJhbnNhY3Rpb24oXHJcblx0XHRcdHRyLFxyXG5cdFx0XHRtb2NrQXBwLFxyXG5cdFx0XHRtb2NrUGx1Z2luXHJcblx0XHQpO1xyXG5cdFx0ZXhwZWN0KHJlc3VsdCkudG9CZSh0cik7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwic2hvdWxkIHJldHVybiBvcmlnaW5hbCB0cmFuc2FjdGlvbiBpZiBjaGFuZ2VkIHRhc2sgaGFzIG5vIHBhcmVudFwiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBtb2NrUGx1Z2luID0gY3JlYXRlTW9ja1BsdWdpbigpO1xyXG5cdFx0Y29uc3QgdHIgPSBjcmVhdGVNb2NrVHJhbnNhY3Rpb24oe1xyXG5cdFx0XHRzdGFydFN0YXRlRG9jQ29udGVudDogXCItIFsgXSBUYXNrXCIsXHJcblx0XHRcdG5ld0RvY0NvbnRlbnQ6IFwiLSBbeF0gVGFza1wiLFxyXG5cdFx0XHRjaGFuZ2VzOiBbXHJcblx0XHRcdFx0eyBmcm9tQTogMywgdG9BOiA0LCBmcm9tQjogMywgdG9COiA0LCBpbnNlcnRlZFRleHQ6IFwieFwiIH0sXHJcblx0XHRcdF0sXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IHJlc3VsdCA9IGhhbmRsZVBhcmVudFRhc2tVcGRhdGVUcmFuc2FjdGlvbihcclxuXHRcdFx0dHIsXHJcblx0XHRcdG1vY2tBcHAsXHJcblx0XHRcdG1vY2tQbHVnaW5cclxuXHRcdCk7XHJcblx0XHRleHBlY3QocmVzdWx0KS50b0JlKHRyKTtcclxuXHR9KTtcclxuXHJcblx0aXQoXCJzaG91bGQgY29tcGxldGUgcGFyZW50IHdoZW4gbGFzdCBjaGlsZCBpcyBjb21wbGV0ZWRcIiwgKCkgPT4ge1xyXG5cdFx0Y29uc3QgbW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oe1xyXG5cdFx0XHRhdXRvQ29tcGxldGVQYXJlbnQ6IHRydWUsXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IGluZGVudCA9IGJ1aWxkSW5kZW50U3RyaW5nKGNyZWF0ZU1vY2tBcHAoKSk7XHJcblx0XHRjb25zdCB0ciA9IGNyZWF0ZU1vY2tUcmFuc2FjdGlvbih7XHJcblx0XHRcdHN0YXJ0U3RhdGVEb2NDb250ZW50OiBcIi0gWyBdIFBhcmVudFxcblwiICsgYCR7aW5kZW50fS0gWyBdIENoaWxkYCxcclxuXHRcdFx0bmV3RG9jQ29udGVudDogXCItIFsgXSBQYXJlbnRcXG5cIiArIGAke2luZGVudH0tIFt4XSBDaGlsZGAsIC8vIERvYyBjb250ZW50ICpiZWZvcmUqIHBhcmVudCB1cGRhdGVcclxuXHRcdFx0Y2hhbmdlczogW1xyXG5cdFx0XHRcdHsgZnJvbUE6IDE4LCB0b0E6IDE5LCBmcm9tQjogMTgsIHRvQjogMTksIGluc2VydGVkVGV4dDogXCJ4XCIgfSxcclxuXHRcdFx0XSwgLy8gQ2hhbmdlIGluIGNoaWxkXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IHJlc3VsdCA9IGhhbmRsZVBhcmVudFRhc2tVcGRhdGVUcmFuc2FjdGlvbihcclxuXHRcdFx0dHIsXHJcblx0XHRcdG1vY2tBcHAsXHJcblx0XHRcdG1vY2tQbHVnaW5cclxuXHRcdCk7XHJcblxyXG5cdFx0ZXhwZWN0KHJlc3VsdCkubm90LnRvQmUodHIpO1xyXG5cdFx0ZXhwZWN0KHJlc3VsdC5jaGFuZ2VzKS50b0hhdmVMZW5ndGgoMik7IC8vIE9yaWdpbmFsIGNoYW5nZSArIHBhcmVudCBjaGFuZ2VcclxuXHRcdC8vIEB0cy1pZ25vcmUgLSBBY2Nlc3NpbmcgaW50ZXJuYWwgc3RydWN0dXJlIGZvciB0ZXN0IHZhbGlkYXRpb25cclxuXHRcdGNvbnN0IHBhcmVudENoYW5nZSA9IHJlc3VsdC5jaGFuZ2VzWzFdO1xyXG5cdFx0ZXhwZWN0KHBhcmVudENoYW5nZS5mcm9tKS50b0JlKDMpOyAvLyBQb3NpdGlvbiBvZiBzcGFjZSBpbiBwYXJlbnQ6ICctIFsgXSdcclxuXHRcdGV4cGVjdChwYXJlbnRDaGFuZ2UudG8pLnRvQmUoNCk7XHJcblx0XHRleHBlY3QocGFyZW50Q2hhbmdlLmluc2VydCkudG9CZShcInhcIik7XHJcblx0XHRleHBlY3QocmVzdWx0LmFubm90YXRpb25zKS50b0VxdWFsKFtcclxuXHRcdFx0dGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24ub2YoXCJhdXRvQ29tcGxldGVQYXJlbnQuRE9ORVwiKSxcclxuXHRcdF0pO1xyXG5cdH0pO1xyXG5cclxuXHRpdChcInNob3VsZCBOT1QgY29tcGxldGUgcGFyZW50IGlmIGl0IGlzIGFscmVhZHkgY29tcGxldGVcIiwgKCkgPT4ge1xyXG5cdFx0Y29uc3QgbW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oe1xyXG5cdFx0XHRhdXRvQ29tcGxldGVQYXJlbnQ6IHRydWUsXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IGluZGVudCA9IGJ1aWxkSW5kZW50U3RyaW5nKGNyZWF0ZU1vY2tBcHAoKSk7XHJcblx0XHRjb25zdCB0ciA9IGNyZWF0ZU1vY2tUcmFuc2FjdGlvbih7XHJcblx0XHRcdHN0YXJ0U3RhdGVEb2NDb250ZW50OlxyXG5cdFx0XHRcdFwiLSBbeF0gUGFyZW50XFxuXCIgK1xyXG5cdFx0XHRcdGAke2luZGVudH0tIFt4XSBDaGlsZCAxXFxuYCArXHJcblx0XHRcdFx0YCR7aW5kZW50fS0gWyBdIENoaWxkIDJgLFxyXG5cdFx0XHRuZXdEb2NDb250ZW50OlxyXG5cdFx0XHRcdFwiLSBbeF0gUGFyZW50XFxuXCIgK1xyXG5cdFx0XHRcdGAke2luZGVudH0tIFt4XSBDaGlsZCAxXFxuYCArXHJcblx0XHRcdFx0YCR7aW5kZW50fS0gW3hdIENoaWxkIDJgLCAvLyBEb2MgY29udGVudCAqYmVmb3JlKiBwb3RlbnRpYWwgdXBkYXRlXHJcblx0XHRcdGNoYW5nZXM6IFtcclxuXHRcdFx0XHR7IGZyb21BOiAxOCwgdG9BOiAxOSwgZnJvbUI6IDE4LCB0b0I6IDE5LCBpbnNlcnRlZFRleHQ6IFwieFwiIH0sXHJcblx0XHRcdF0sIC8vIENoYW5nZSBpbiBDaGlsZCAxXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IHJlc3VsdCA9IGhhbmRsZVBhcmVudFRhc2tVcGRhdGVUcmFuc2FjdGlvbihcclxuXHRcdFx0dHIsXHJcblx0XHRcdG1vY2tBcHAsXHJcblx0XHRcdG1vY2tQbHVnaW5cclxuXHRcdCk7XHJcblx0XHQvLyBQYXJlbnQgaXMgYWxyZWFkeSAneCcsIG5vIGNoYW5nZSBzaG91bGQgaGFwcGVuIGV2ZW4gaWYgQ2hpbGQgMSBpcyBjb21wbGV0ZWRcclxuXHRcdGV4cGVjdChyZXN1bHQpLnRvQmUodHIpO1xyXG5cdH0pO1xyXG5cclxuXHRpdChcInNob3VsZCBtYXJrIHBhcmVudCBhcyBpbiBwcm9ncmVzcyB3aGVuIGEgY2hpbGQgaXMgdW5jaGVja2VkIChpZiBzZXR0aW5nIGVuYWJsZWQpXCIsICgpID0+IHtcclxuXHRcdGNvbnN0IG1vY2tQbHVnaW4gPSBjcmVhdGVNb2NrUGx1Z2luKHtcclxuXHRcdFx0YXV0b0NvbXBsZXRlUGFyZW50OiB0cnVlLFxyXG5cdFx0XHRtYXJrUGFyZW50SW5Qcm9ncmVzc1doZW5QYXJ0aWFsbHlDb21wbGV0ZTogdHJ1ZSxcclxuXHRcdFx0dGFza1N0YXR1c2VzOiB7XHJcblx0XHRcdFx0aW5Qcm9ncmVzczogXCIvXCIsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBcInhcIixcclxuXHRcdFx0XHRhYmFuZG9uZWQ6IFwiLVwiLFxyXG5cdFx0XHRcdHBsYW5uZWQ6IFwiP1wiLFxyXG5cdFx0XHRcdG5vdFN0YXJ0ZWQ6IFwiIFwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBpbmRlbnQgPSBidWlsZEluZGVudFN0cmluZyhjcmVhdGVNb2NrQXBwKCkpO1xyXG5cdFx0Y29uc3QgdHIgPSBjcmVhdGVNb2NrVHJhbnNhY3Rpb24oe1xyXG5cdFx0XHRzdGFydFN0YXRlRG9jQ29udGVudDogXCItIFt4XSBQYXJlbnRcXG5cIiArIGAke2luZGVudH0tIFt4XSBDaGlsZGAsXHJcblx0XHRcdG5ld0RvY0NvbnRlbnQ6IFwiLSBbeF0gUGFyZW50XFxuXCIgKyBgJHtpbmRlbnR9LSBbIF0gQ2hpbGRgLCAvLyBEb2MgY29udGVudCAqYmVmb3JlKiBwYXJlbnQgdXBkYXRlXHJcblx0XHRcdGNoYW5nZXM6IFtcclxuXHRcdFx0XHR7IGZyb21BOiAyMSwgdG9BOiAyMiwgZnJvbUI6IDIxLCB0b0I6IDIyLCBpbnNlcnRlZFRleHQ6IFwiIFwiIH0sXHJcblx0XHRcdF0sIC8vIENoaWxkIHVuY29tcGxldGVkIC0gcG9zaXRpb24gYWRqdXN0ZWQgZm9yIDQtc3BhY2UgaW5kZW50XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCByZXN1bHQgPSBoYW5kbGVQYXJlbnRUYXNrVXBkYXRlVHJhbnNhY3Rpb24oXHJcblx0XHRcdHRyLFxyXG5cdFx0XHRtb2NrQXBwLFxyXG5cdFx0XHRtb2NrUGx1Z2luXHJcblx0XHQpO1xyXG5cclxuXHRcdGV4cGVjdChyZXN1bHQpLm5vdC50b0JlKHRyKTtcclxuXHRcdGV4cGVjdChyZXN1bHQuY2hhbmdlcykudG9IYXZlTGVuZ3RoKDIpO1xyXG5cdFx0Ly8gQHRzLWlnbm9yZVxyXG5cdFx0Y29uc3QgcGFyZW50Q2hhbmdlID0gcmVzdWx0LmNoYW5nZXNbMV07XHJcblx0XHRleHBlY3QocGFyZW50Q2hhbmdlLmZyb20pLnRvQmUoMyk7IC8vIFBvc2l0aW9uIG9mICd4JyBpbiBwYXJlbnQ6ICctIFt4XSdcclxuXHRcdGV4cGVjdChwYXJlbnRDaGFuZ2UudG8pLnRvQmUoNCk7XHJcblx0XHRleHBlY3QocGFyZW50Q2hhbmdlLmluc2VydCkudG9CZShcIi9cIik7IC8vIFNob3VsZCBiZSBpbiBwcm9ncmVzcyBtYXJrZXJcclxuXHRcdGV4cGVjdChyZXN1bHQuYW5ub3RhdGlvbnMpLnRvRXF1YWwoW1xyXG5cdFx0XHRtb2NrUGFyZW50VGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24ub2YoXHJcblx0XHRcdFx0XCJhdXRvQ29tcGxldGVQYXJlbnQuSU5fUFJPR1JFU1NcIlxyXG5cdFx0XHQpLFxyXG5cdFx0XSk7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwic2hvdWxkIE5PVCBtYXJrIHBhcmVudCBhcyBpbiBwcm9ncmVzcyB3aGVuIGEgY2hpbGQgaXMgdW5jaGVja2VkIChpZiBzZXR0aW5nIGRpc2FibGVkKVwiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBtb2NrUGx1Z2luID0gY3JlYXRlTW9ja1BsdWdpbih7XHJcblx0XHRcdGF1dG9Db21wbGV0ZVBhcmVudDogdHJ1ZSxcclxuXHRcdFx0bWFya1BhcmVudEluUHJvZ3Jlc3NXaGVuUGFydGlhbGx5Q29tcGxldGU6IGZhbHNlLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBpbmRlbnQgPSBidWlsZEluZGVudFN0cmluZyhjcmVhdGVNb2NrQXBwKCkpO1xyXG5cdFx0Y29uc3QgdHIgPSBjcmVhdGVNb2NrVHJhbnNhY3Rpb24oe1xyXG5cdFx0XHRzdGFydFN0YXRlRG9jQ29udGVudDogXCItIFt4XSBQYXJlbnRcXG5cIiArIGAke2luZGVudH0tIFt4XSBDaGlsZGAsXHJcblx0XHRcdG5ld0RvY0NvbnRlbnQ6IFwiLSBbeF0gUGFyZW50XFxuXCIgKyBgJHtpbmRlbnR9LSBbIF0gQ2hpbGRgLCAvLyBEb2MgY29udGVudCAqYmVmb3JlKiBwYXJlbnQgdXBkYXRlXHJcblx0XHRcdGNoYW5nZXM6IFtcclxuXHRcdFx0XHR7IGZyb21BOiAyMSwgdG9BOiAyMiwgZnJvbUI6IDIxLCB0b0I6IDIyLCBpbnNlcnRlZFRleHQ6IFwiIFwiIH0sXHJcblx0XHRcdF0sIC8vIENoaWxkIHVuY29tcGxldGVkIC0gcG9zaXRpb24gYWRqdXN0ZWQgZm9yIDQtc3BhY2UgaW5kZW50XHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IHJlc3VsdCA9IGhhbmRsZVBhcmVudFRhc2tVcGRhdGVUcmFuc2FjdGlvbihcclxuXHRcdFx0dHIsXHJcblx0XHRcdG1vY2tBcHAsXHJcblx0XHRcdG1vY2tQbHVnaW5cclxuXHRcdCk7XHJcblx0XHRleHBlY3QocmVzdWx0KS50b0JlKHRyKTsgLy8gTm8gY2hhbmdlIGV4cGVjdGVkXHJcblx0fSk7XHJcblxyXG5cdGl0KFwic2hvdWxkIG1hcmsgcGFyZW50IGFzIGluIHByb2dyZXNzIHdoZW4gZmlyc3QgY2hpbGQgZ2V0cyBhIHN0YXR1cyAoaWYgc2V0dGluZyBlbmFibGVkKVwiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBtb2NrUGx1Z2luID0gY3JlYXRlTW9ja1BsdWdpbih7XHJcblx0XHRcdGF1dG9Db21wbGV0ZVBhcmVudDogdHJ1ZSxcclxuXHRcdFx0bWFya1BhcmVudEluUHJvZ3Jlc3NXaGVuUGFydGlhbGx5Q29tcGxldGU6IHRydWUsXHJcblx0XHRcdHRhc2tTdGF0dXNlczoge1xyXG5cdFx0XHRcdGluUHJvZ3Jlc3M6IFwiL1wiLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogXCJ4XCIsXHJcblx0XHRcdFx0YWJhbmRvbmVkOiBcIi1cIixcclxuXHRcdFx0XHRwbGFubmVkOiBcIj9cIixcclxuXHRcdFx0XHRub3RTdGFydGVkOiBcIiBcIixcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3QgaW5kZW50ID0gYnVpbGRJbmRlbnRTdHJpbmcoY3JlYXRlTW9ja0FwcCgpKTtcclxuXHRcdGNvbnN0IHRyID0gY3JlYXRlTW9ja1RyYW5zYWN0aW9uKHtcclxuXHRcdFx0c3RhcnRTdGF0ZURvY0NvbnRlbnQ6IFwiLSBbIF0gUGFyZW50XFxuXCIgKyBgJHtpbmRlbnR9LSBbIF0gQ2hpbGRgLFxyXG5cdFx0XHRuZXdEb2NDb250ZW50OiBcIi0gWyBdIFBhcmVudFxcblwiICsgYCR7aW5kZW50fS0gWy9dIENoaWxkYCxcclxuXHRcdFx0Y2hhbmdlczogW1xyXG5cdFx0XHRcdHsgZnJvbUE6IDIxLCB0b0E6IDIyLCBmcm9tQjogMjEsIHRvQjogMjIsIGluc2VydGVkVGV4dDogXCIvXCIgfSxcclxuXHRcdFx0XSwgLy8gQ2hpbGQgbWFya2VkIGluIHByb2dyZXNzIC0gcG9zaXRpb24gYWRqdXN0ZWQgZm9yIDQtc3BhY2UgaW5kZW50XHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IHJlc3VsdCA9IGhhbmRsZVBhcmVudFRhc2tVcGRhdGVUcmFuc2FjdGlvbihcclxuXHRcdFx0dHIsXHJcblx0XHRcdG1vY2tBcHAsXHJcblx0XHRcdG1vY2tQbHVnaW5cclxuXHRcdCk7XHJcblxyXG5cdFx0ZXhwZWN0KHJlc3VsdCkubm90LnRvQmUodHIpO1xyXG5cdFx0ZXhwZWN0KHJlc3VsdC5jaGFuZ2VzKS50b0hhdmVMZW5ndGgoMik7XHJcblx0XHQvLyBAdHMtaWdub3JlXHJcblx0XHRjb25zdCBwYXJlbnRDaGFuZ2UgPSByZXN1bHQuY2hhbmdlc1sxXTtcclxuXHRcdGV4cGVjdChwYXJlbnRDaGFuZ2UuZnJvbSkudG9CZSgzKTsgLy8gUG9zaXRpb24gb2YgJyAnIGluIHBhcmVudDogJy0gWyBdJ1xyXG5cdFx0ZXhwZWN0KHBhcmVudENoYW5nZS50bykudG9CZSg0KTtcclxuXHRcdGV4cGVjdChwYXJlbnRDaGFuZ2UuaW5zZXJ0KS50b0JlKFwiL1wiKTtcclxuXHRcdGV4cGVjdChyZXN1bHQuYW5ub3RhdGlvbnMpLnRvRXF1YWwoW1xyXG5cdFx0XHRtb2NrUGFyZW50VGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24ub2YoXHJcblx0XHRcdFx0XCJhdXRvQ29tcGxldGVQYXJlbnQuSU5fUFJPR1JFU1NcIlxyXG5cdFx0XHQpLFxyXG5cdFx0XSk7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwic2hvdWxkIE5PVCBtYXJrIHBhcmVudCBhcyBpbiBwcm9ncmVzcyB3aGVuIGZpcnN0IGNoaWxkIGdldHMgYSBzdGF0dXMgKGlmIHNldHRpbmcgZGlzYWJsZWQpXCIsICgpID0+IHtcclxuXHRcdGNvbnN0IG1vY2tQbHVnaW4gPSBjcmVhdGVNb2NrUGx1Z2luKHtcclxuXHRcdFx0YXV0b0NvbXBsZXRlUGFyZW50OiB0cnVlLFxyXG5cdFx0XHRtYXJrUGFyZW50SW5Qcm9ncmVzc1doZW5QYXJ0aWFsbHlDb21wbGV0ZTogZmFsc2UsXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IGluZGVudCA9IGJ1aWxkSW5kZW50U3RyaW5nKGNyZWF0ZU1vY2tBcHAoKSk7XHJcblx0XHRjb25zdCB0ciA9IGNyZWF0ZU1vY2tUcmFuc2FjdGlvbih7XHJcblx0XHRcdHN0YXJ0U3RhdGVEb2NDb250ZW50OiBcIi0gWyBdIFBhcmVudFxcblwiICsgYCR7aW5kZW50fS0gWyBdIENoaWxkYCxcclxuXHRcdFx0bmV3RG9jQ29udGVudDogXCItIFsgXSBQYXJlbnRcXG5cIiArIGAke2luZGVudH0tIFsvXSBDaGlsZGAsXHJcblx0XHRcdGNoYW5nZXM6IFtcclxuXHRcdFx0XHR7IGZyb21BOiAyMSwgdG9BOiAyMiwgZnJvbUI6IDIxLCB0b0I6IDIyLCBpbnNlcnRlZFRleHQ6IFwiL1wiIH0sXHJcblx0XHRcdF0sIC8vIENoaWxkIG1hcmtlZCBpbiBwcm9ncmVzcyAtIHBvc2l0aW9uIGFkanVzdGVkIGZvciA0LXNwYWNlIGluZGVudFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCByZXN1bHQgPSBoYW5kbGVQYXJlbnRUYXNrVXBkYXRlVHJhbnNhY3Rpb24oXHJcblx0XHRcdHRyLFxyXG5cdFx0XHRtb2NrQXBwLFxyXG5cdFx0XHRtb2NrUGx1Z2luXHJcblx0XHQpO1xyXG5cdFx0ZXhwZWN0KHJlc3VsdCkudG9CZSh0cik7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwic2hvdWxkIE5PVCBtYXJrIHBhcmVudCBhcyBpbiBwcm9ncmVzcyBpZiBwYXJlbnQgYWxyZWFkeSBoYXMgYSBzdGF0dXNcIiwgKCkgPT4ge1xyXG5cdFx0Y29uc3QgbW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oe1xyXG5cdFx0XHRhdXRvQ29tcGxldGVQYXJlbnQ6IHRydWUsXHJcblx0XHRcdG1hcmtQYXJlbnRJblByb2dyZXNzV2hlblBhcnRpYWxseUNvbXBsZXRlOiB0cnVlLFxyXG5cdFx0XHR0YXNrU3RhdHVzZXM6IHtcclxuXHRcdFx0XHRpblByb2dyZXNzOiBcIi9cIixcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IFwieFwiLFxyXG5cdFx0XHRcdGFiYW5kb25lZDogXCItXCIsXHJcblx0XHRcdFx0cGxhbm5lZDogXCI/XCIsXHJcblx0XHRcdFx0bm90U3RhcnRlZDogXCIgXCIsXHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IGluZGVudCA9IGJ1aWxkSW5kZW50U3RyaW5nKGNyZWF0ZU1vY2tBcHAoKSk7XHJcblx0XHRjb25zdCB0ciA9IGNyZWF0ZU1vY2tUcmFuc2FjdGlvbih7XHJcblx0XHRcdHN0YXJ0U3RhdGVEb2NDb250ZW50OlxyXG5cdFx0XHRcdFwiLSBbL10gUGFyZW50XFxuXCIgK1xyXG5cdFx0XHRcdGAke2luZGVudH0tIFsgXSBDaGlsZCAxXFxuYCArXHJcblx0XHRcdFx0YCR7aW5kZW50fS0gWyBdIENoaWxkIDJgLFxyXG5cdFx0XHRuZXdEb2NDb250ZW50OlxyXG5cdFx0XHRcdFwiLSBbL10gUGFyZW50XFxuXCIgK1xyXG5cdFx0XHRcdGAke2luZGVudH0tIFt4XSBDaGlsZCAxXFxuYCArXHJcblx0XHRcdFx0YCR7aW5kZW50fS0gWyBdIENoaWxkIDJgLFxyXG5cdFx0XHRjaGFuZ2VzOiBbXHJcblx0XHRcdFx0eyBmcm9tQTogMjEsIHRvQTogMjIsIGZyb21COiAyMSwgdG9COiAyMiwgaW5zZXJ0ZWRUZXh0OiBcInhcIiB9LFxyXG5cdFx0XHRdLCAvLyBDaGlsZCAxIGNvbXBsZXRlZCAtIHBvc2l0aW9uIGFkanVzdGVkIGZvciA0LXNwYWNlIGluZGVudFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCByZXN1bHQgPSBoYW5kbGVQYXJlbnRUYXNrVXBkYXRlVHJhbnNhY3Rpb24oXHJcblx0XHRcdHRyLFxyXG5cdFx0XHRtb2NrQXBwLFxyXG5cdFx0XHRtb2NrUGx1Z2luXHJcblx0XHQpO1xyXG5cdFx0Ly8gUGFyZW50IGFscmVhZHkgJy8nIGFuZCBtYXJrUGFyZW50SW5Qcm9ncmVzcyBvbmx5IHRyaWdnZXJzIGlmIHBhcmVudCBpcyAnICcsIHNvIG5vIGNoYW5nZS5cclxuXHRcdGV4cGVjdChyZXN1bHQpLnRvQmUodHIpO1xyXG5cdH0pO1xyXG5cclxuXHRpdChcInNob3VsZCBpZ25vcmUgY2hhbmdlcyB0cmlnZ2VyZWQgYnkgaXRzIG93biBhbm5vdGF0aW9uIChjb21wbGV0ZSlcIiwgKCkgPT4ge1xyXG5cdFx0Y29uc3QgbW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oe1xyXG5cdFx0XHRhdXRvQ29tcGxldGVQYXJlbnQ6IHRydWUsXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IGluZGVudCA9IGJ1aWxkSW5kZW50U3RyaW5nKGNyZWF0ZU1vY2tBcHAoKSk7XHJcblx0XHRjb25zdCB0ciA9IGNyZWF0ZU1vY2tUcmFuc2FjdGlvbih7XHJcblx0XHRcdHN0YXJ0U3RhdGVEb2NDb250ZW50OiBcIi0gWyBdIFBhcmVudFxcblwiICsgYCR7aW5kZW50fS0gWyBdIENoaWxkYCxcclxuXHRcdFx0bmV3RG9jQ29udGVudDogXCItIFsgXSBQYXJlbnRcXG5cIiArIGAke2luZGVudH0tIFt4XSBDaGlsZGAsIC8vIERvYyBjb250ZW50ICpiZWZvcmUqIHBvdGVudGlhbCBwYXJlbnQgdXBkYXRlXHJcblx0XHRcdGNoYW5nZXM6IFtcclxuXHRcdFx0XHR7IGZyb21BOiAyMSwgdG9BOiAyMiwgZnJvbUI6IDIxLCB0b0I6IDIyLCBpbnNlcnRlZFRleHQ6IFwieFwiIH0sXHJcblx0XHRcdF0sIC8vIENoYW5nZSBpbiBjaGlsZCAtIHBvc2l0aW9uIGFkanVzdGVkIGZvciA0LXNwYWNlIGluZGVudFxyXG5cdFx0XHRhbm5vdGF0aW9uczogW1xyXG5cdFx0XHRcdG1vY2tQYXJlbnRUYXNrU3RhdHVzQ2hhbmdlQW5ub3RhdGlvbi5vZihcclxuXHRcdFx0XHRcdFwiYXV0b0NvbXBsZXRlUGFyZW50LlNPTUVfT1RIRVJfQUNUSU9OXCJcclxuXHRcdFx0XHQpLFxyXG5cdFx0XHRdLCAvLyBTaW11bGF0ZSBhbm5vdGF0aW9uIHByZXNlbnRcclxuXHRcdH0pO1xyXG5cdFx0Ly8gQWRkIGEgc3BlY2lmaWMgYW5ub3RhdGlvbiB2YWx1ZSB0aGF0IGluY2x1ZGVzICdhdXRvQ29tcGxldGVQYXJlbnQnXHJcblx0XHQvLyBAdHMtaWdub3JlXHJcblx0XHR0ci5hbm5vdGF0aW9uID0gamVzdC5mbigodHlwZSkgPT4ge1xyXG5cdFx0XHRpZiAodHlwZSA9PT0gbW9ja1BhcmVudFRhc2tTdGF0dXNDaGFuZ2VBbm5vdGF0aW9uKSB7XHJcblx0XHRcdFx0cmV0dXJuIFwiYXV0b0NvbXBsZXRlUGFyZW50LkRPTkVcIjsgLy8gU2ltdWxhdGUgdGhpcyB0cmFuc2FjdGlvbiB3YXMgY2F1c2VkIGJ5IGF1dG8tY29tcGxldGVcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgcmVzdWx0ID0gaGFuZGxlUGFyZW50VGFza1VwZGF0ZVRyYW5zYWN0aW9uKFxyXG5cdFx0XHR0cixcclxuXHRcdFx0bW9ja0FwcCxcclxuXHRcdFx0bW9ja1BsdWdpblxyXG5cdFx0KTtcclxuXHRcdC8vIEV2ZW4gdGhvdWdoIGNoaWxkIGlzIGNvbXBsZXRlZCwgdGhlIGFubm90YXRpb24gc2hvdWxkIHByZXZlbnQgcGFyZW50IGNvbXBsZXRpb25cclxuXHRcdGV4cGVjdChyZXN1bHQpLnRvQmUodHIpO1xyXG5cdH0pO1xyXG5cclxuXHRpdChcInNob3VsZCBpZ25vcmUgY2hhbmdlcyB0cmlnZ2VyZWQgYnkgaXRzIG93biBhbm5vdGF0aW9uIChpbiBwcm9ncmVzcylcIiwgKCkgPT4ge1xyXG5cdFx0Y29uc3QgaW5kZW50ID0gYnVpbGRJbmRlbnRTdHJpbmcoY3JlYXRlTW9ja0FwcCgpKTtcclxuXHRcdGNvbnN0IG1vY2tQbHVnaW4gPSBjcmVhdGVNb2NrUGx1Z2luKHtcclxuXHRcdFx0YXV0b0NvbXBsZXRlUGFyZW50OiB0cnVlLFxyXG5cdFx0XHRtYXJrUGFyZW50SW5Qcm9ncmVzc1doZW5QYXJ0aWFsbHlDb21wbGV0ZTogdHJ1ZSxcclxuXHRcdFx0dGFza1N0YXR1c2VzOiB7XHJcblx0XHRcdFx0aW5Qcm9ncmVzczogXCIvXCIsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBcInhcIixcclxuXHRcdFx0XHRhYmFuZG9uZWQ6IFwiLVwiLFxyXG5cdFx0XHRcdHBsYW5uZWQ6IFwiP1wiLFxyXG5cdFx0XHRcdG5vdFN0YXJ0ZWQ6IFwiIFwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCB0ciA9IGNyZWF0ZU1vY2tUcmFuc2FjdGlvbih7XHJcblx0XHRcdHN0YXJ0U3RhdGVEb2NDb250ZW50OiBcIi0gWyBdIFBhcmVudFxcblwiICsgYCR7aW5kZW50fS0gWyBdIENoaWxkYCxcclxuXHRcdFx0bmV3RG9jQ29udGVudDogXCItIFsgXSBQYXJlbnRcXG5cIiArIGAke2luZGVudH0tIFsvXSBDaGlsZGAsIC8vIERvYyBjb250ZW50ICpiZWZvcmUqIHBvdGVudGlhbCBwYXJlbnQgdXBkYXRlXHJcblx0XHRcdGNoYW5nZXM6IFtcclxuXHRcdFx0XHR7IGZyb21BOiAyMSwgdG9BOiAyMiwgZnJvbUI6IDIxLCB0b0I6IDIyLCBpbnNlcnRlZFRleHQ6IFwiL1wiIH0sXHJcblx0XHRcdF0sIC8vIENoaWxkIG1hcmtlZCBpbiBwcm9ncmVzc1xyXG5cdFx0XHRhbm5vdGF0aW9uczogW1xyXG5cdFx0XHRcdG1vY2tQYXJlbnRUYXNrU3RhdHVzQ2hhbmdlQW5ub3RhdGlvbi5vZihcclxuXHRcdFx0XHRcdFwiYXV0b0NvbXBsZXRlUGFyZW50LlNPTUVfT1RIRVJfQUNUSU9OXCJcclxuXHRcdFx0XHQpLFxyXG5cdFx0XHRdLCAvLyBTaW11bGF0ZSBhbm5vdGF0aW9uIHByZXNlbnRcclxuXHRcdH0pO1xyXG5cdFx0Ly8gQHRzLWlnbm9yZVxyXG5cdFx0dHIuYW5ub3RhdGlvbiA9IGplc3QuZm4oKHR5cGUpID0+IHtcclxuXHRcdFx0aWYgKHR5cGUgPT09IG1vY2tQYXJlbnRUYXNrU3RhdHVzQ2hhbmdlQW5ub3RhdGlvbikge1xyXG5cdFx0XHRcdHJldHVybiBcImF1dG9Db21wbGV0ZVBhcmVudC5JTl9QUk9HUkVTU1wiOyAvLyBTaW11bGF0ZSB0aGlzIHRyYW5zYWN0aW9uIHdhcyBjYXVzZWQgYnkgYXV0by1jb21wbGV0ZVxyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCByZXN1bHQgPSBoYW5kbGVQYXJlbnRUYXNrVXBkYXRlVHJhbnNhY3Rpb24oXHJcblx0XHRcdHRyLFxyXG5cdFx0XHRtb2NrQXBwLFxyXG5cdFx0XHRtb2NrUGx1Z2luXHJcblx0XHQpO1xyXG5cdFx0Ly8gRXZlbiB0aG91Z2ggY2hpbGQgZ290IHN0YXR1cywgdGhlIGFubm90YXRpb24gc2hvdWxkIHByZXZlbnQgcGFyZW50IHVwZGF0ZVxyXG5cdFx0ZXhwZWN0KHJlc3VsdCkudG9CZSh0cik7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwic2hvdWxkIG1hcmsgcGFyZW50IGFzIGluIHByb2dyZXNzIHdoZW4gb25lIGNoaWxkIGlzIGNvbXBsZXRlZCBidXQgb3RoZXJzIHJlbWFpbiBpbmNvbXBsZXRlXCIsICgpID0+IHtcclxuXHRcdGNvbnN0IG1vY2tQbHVnaW4gPSBjcmVhdGVNb2NrUGx1Z2luKHtcclxuXHRcdFx0YXV0b0NvbXBsZXRlUGFyZW50OiB0cnVlLFxyXG5cdFx0XHRtYXJrUGFyZW50SW5Qcm9ncmVzc1doZW5QYXJ0aWFsbHlDb21wbGV0ZTogdHJ1ZSxcclxuXHRcdFx0dGFza1N0YXR1c2VzOiB7XHJcblx0XHRcdFx0aW5Qcm9ncmVzczogXCIvXCIsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBcInhcIixcclxuXHRcdFx0XHRhYmFuZG9uZWQ6IFwiLVwiLFxyXG5cdFx0XHRcdHBsYW5uZWQ6IFwiP1wiLFxyXG5cdFx0XHRcdG5vdFN0YXJ0ZWQ6IFwiIFwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBpbmRlbnQgPSBidWlsZEluZGVudFN0cmluZyhjcmVhdGVNb2NrQXBwKCkpO1xyXG5cdFx0Y29uc3QgdHIgPSBjcmVhdGVNb2NrVHJhbnNhY3Rpb24oe1xyXG5cdFx0XHRzdGFydFN0YXRlRG9jQ29udGVudDpcclxuXHRcdFx0XHRcIi0gWyBdIFBhcmVudFxcblwiICtcclxuXHRcdFx0XHRgJHtpbmRlbnR9LSBbIF0gQ2hpbGQgMVxcbmAgK1xyXG5cdFx0XHRcdGAke2luZGVudH0tIFsgXSBDaGlsZCAyYCxcclxuXHRcdFx0bmV3RG9jQ29udGVudDpcclxuXHRcdFx0XHRcIi0gWyBdIFBhcmVudFxcblwiICtcclxuXHRcdFx0XHRgJHtpbmRlbnR9LSBbeF0gQ2hpbGQgMVxcbmAgK1xyXG5cdFx0XHRcdGAke2luZGVudH0tIFsgXSBDaGlsZCAyYCwgLy8gRG9jIGNvbnRlbnQgKmJlZm9yZSogcGFyZW50IHVwZGF0ZVxyXG5cdFx0XHRjaGFuZ2VzOiBbXHJcblx0XHRcdFx0eyBmcm9tQTogMjEsIHRvQTogMjIsIGZyb21COiAyMSwgdG9COiAyMiwgaW5zZXJ0ZWRUZXh0OiBcInhcIiB9LFxyXG5cdFx0XHRdLCAvLyBDaGFuZ2UgaW4gQ2hpbGQgMVxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCByZXN1bHQgPSBoYW5kbGVQYXJlbnRUYXNrVXBkYXRlVHJhbnNhY3Rpb24oXHJcblx0XHRcdHRyLFxyXG5cdFx0XHRtb2NrQXBwLFxyXG5cdFx0XHRtb2NrUGx1Z2luXHJcblx0XHQpO1xyXG5cclxuXHRcdGV4cGVjdChyZXN1bHQpLm5vdC50b0JlKHRyKTtcclxuXHRcdGV4cGVjdChyZXN1bHQuY2hhbmdlcykudG9IYXZlTGVuZ3RoKDIpO1xyXG5cdFx0Ly8gQHRzLWlnbm9yZVxyXG5cdFx0Y29uc3QgcGFyZW50Q2hhbmdlID0gcmVzdWx0LmNoYW5nZXNbMV07XHJcblx0XHRleHBlY3QocGFyZW50Q2hhbmdlLmZyb20pLnRvQmUoMyk7IC8vIFBvc2l0aW9uIG9mICcgJyBpbiBwYXJlbnQ6ICctIFsgXSdcclxuXHRcdGV4cGVjdChwYXJlbnRDaGFuZ2UudG8pLnRvQmUoNCk7XHJcblx0XHRleHBlY3QocGFyZW50Q2hhbmdlLmluc2VydCkudG9CZShcIi9cIik7IC8vIFNob3VsZCBiZSBpbiBwcm9ncmVzcyBtYXJrZXJcclxuXHRcdGV4cGVjdChyZXN1bHQuYW5ub3RhdGlvbnMpLnRvRXF1YWwoW1xyXG5cdFx0XHRtb2NrUGFyZW50VGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24ub2YoXHJcblx0XHRcdFx0XCJhdXRvQ29tcGxldGVQYXJlbnQuSU5fUFJPR1JFU1NcIlxyXG5cdFx0XHQpLFxyXG5cdFx0XSk7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwic2hvdWxkIE5PVCBjaGFuZ2UgcGFyZW50IHRhc2sgc3RhdHVzIHdoZW4gZGVsZXRpbmcgYSBkYXNoIHdpdGggYmFja3NwYWNlXCIsICgpID0+IHtcclxuXHRcdGNvbnN0IG1vY2tQbHVnaW4gPSBjcmVhdGVNb2NrUGx1Z2luKHtcclxuXHRcdFx0YXV0b0NvbXBsZXRlUGFyZW50OiB0cnVlLFxyXG5cdFx0fSk7IC8vIERlZmF1bHRzOiAnICcsICcvJywgJ3gnXHJcblxyXG5cdFx0Ly8gU2V0IHVwIGEgY29tcGxldGUgdGFzayBhbmQgYW4gaW5jb21wbGV0ZSB0YXNrIGxpbmUgYmVsb3cgKGp1c3QgYSBkYXNoKVxyXG5cdFx0Y29uc3Qgc3RhcnRDb250ZW50ID0gXCItIFsgXSBUYXNrIDFcXG4tIFwiO1xyXG5cdFx0Ly8gQWZ0ZXIgcHJlc3NpbmcgQmFja3NwYWNlIHRvIGRlbGV0ZSB0aGUgZGFzaCBvbiB0aGUgc2Vjb25kIGxpbmUsIHRoZSBmaXJzdCBsaW5lIHRhc2sgc2hvdWxkIG5vdCBiZWNvbWUgWy9dXHJcblx0XHRjb25zdCBuZXdDb250ZW50ID0gXCItIFsgXSBUYXNrIDFcIjtcclxuXHJcblx0XHQvLyBTaW11bGF0ZSBwcmVzc2luZyBCYWNrc3BhY2UgdG8gZGVsZXRlIHRoZSBkYXNoIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHNlY29uZCBsaW5lXHJcblx0XHRjb25zdCB0ciA9IGNyZWF0ZU1vY2tUcmFuc2FjdGlvbih7XHJcblx0XHRcdHN0YXJ0U3RhdGVEb2NDb250ZW50OiBzdGFydENvbnRlbnQsXHJcblx0XHRcdG5ld0RvY0NvbnRlbnQ6IG5ld0NvbnRlbnQsXHJcblx0XHRcdGNoYW5nZXM6IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRmcm9tQTogMTUsIC8vIFBvc2l0aW9uIG9mIHRoZSBkYXNoIG9uIHRoZSBzZWNvbmQgbGluZVxyXG5cdFx0XHRcdFx0dG9BOiAxNSwgLy8gRW5kIHBvc2l0aW9uIG9mIHRoZSBkYXNoXHJcblx0XHRcdFx0XHRmcm9tQjogMTIsIC8vIFNhbWUgcG9zaXRpb24gaW4gdGhlIG5ldyBjb250ZW50XHJcblx0XHRcdFx0XHR0b0I6IDEyLCAvLyBQb3NpdGlvbiBhZnRlciBkZWxldGlvblxyXG5cdFx0XHRcdFx0aW5zZXJ0ZWRUZXh0OiBcIlwiLCAvLyBEZWxldGUgb3BlcmF0aW9uLCBubyBpbnNlcnRlZCB0ZXh0XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XSxcclxuXHRcdFx0ZG9jQ2hhbmdlZDogdHJ1ZSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFRoZSBmdW5jdGlvbiBzaG91bGQgZGV0ZWN0IHRoaXMgaXMgYSBkZWxldGlvbiBvcGVyYXRpb24sIG5vdCBhIHRhc2sgc3RhdHVzIGNoYW5nZVxyXG5cdFx0Y29uc3QgcmVzdWx0ID0gaGFuZGxlUGFyZW50VGFza1VwZGF0ZVRyYW5zYWN0aW9uKFxyXG5cdFx0XHR0cixcclxuXHRcdFx0bW9ja0FwcCxcclxuXHRcdFx0bW9ja1BsdWdpblxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBFeHBlY3QgdGhlIG9yaWdpbmFsIHRyYW5zYWN0aW9uIHRvIGJlIHJldHVybmVkIChubyBtb2RpZmljYXRpb24pXHJcblx0XHRleHBlY3QocmVzdWx0KS50b0JlKHRyKTtcclxuXHRcdGV4cGVjdChyZXN1bHQuY2hhbmdlcykudG9FcXVhbCh0ci5jaGFuZ2VzKTtcclxuXHRcdGV4cGVjdChyZXN1bHQuc2VsZWN0aW9uKS50b0VxdWFsKHRyLnNlbGVjdGlvbik7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwic2hvdWxkIE5PVCBjaGFuZ2UgcGFyZW50IHRhc2sgc3RhdHVzIHdoZW4gZGVsZXRpbmcgYW4gaW5kZW50ZWQgZGFzaFwiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBtb2NrUGx1Z2luID0gY3JlYXRlTW9ja1BsdWdpbih7XHJcblx0XHRcdGF1dG9Db21wbGV0ZVBhcmVudDogdHJ1ZSxcclxuXHRcdH0pOyAvLyBEZWZhdWx0czogJyAnLCAnLycsICd4J1xyXG5cdFx0Y29uc3QgaW5kZW50ID0gYnVpbGRJbmRlbnRTdHJpbmcoY3JlYXRlTW9ja0FwcCgpKTtcclxuXHJcblx0XHQvLyBUZXN0IHdpdGggaW5kZW50YXRpb25cclxuXHRcdGNvbnN0IHN0YXJ0Q29udGVudEluZGVudGVkID0gXCItIFsgXSBUYXNrIDFcXG5cIiArIGluZGVudCArIFwiLSBcIjtcclxuXHRcdGNvbnN0IG5ld0NvbnRlbnRJbmRlbnRlZCA9IFwiLSBbIF0gVGFzayAxXFxuXCIgKyBpbmRlbnQ7IC8vIERlbGV0ZSB0aGUgZGFzaCBhZnRlciBpbmRlbnRhdGlvblxyXG5cclxuXHRcdGNvbnN0IHRySW5kZW50ZWQgPSBjcmVhdGVNb2NrVHJhbnNhY3Rpb24oe1xyXG5cdFx0XHRzdGFydFN0YXRlRG9jQ29udGVudDogc3RhcnRDb250ZW50SW5kZW50ZWQsXHJcblx0XHRcdG5ld0RvY0NvbnRlbnQ6IG5ld0NvbnRlbnRJbmRlbnRlZCxcclxuXHRcdFx0Y2hhbmdlczogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGZyb21BOiAxNSwgLy8gUG9zaXRpb24gb2YgdGhlIGRhc2ggYWZ0ZXIgaW5kZW50YXRpb25cclxuXHRcdFx0XHRcdHRvQTogMTYsIC8vIEVuZCBwb3NpdGlvbiBvZiB0aGUgZGFzaFxyXG5cdFx0XHRcdFx0ZnJvbUI6IDE1LCAvLyBTYW1lIHBvc2l0aW9uIGluIHRoZSBuZXcgY29udGVudFxyXG5cdFx0XHRcdFx0dG9COiAxNCwgLy8gUG9zaXRpb24gYWZ0ZXIgZGVsZXRpb25cclxuXHRcdFx0XHRcdGluc2VydGVkVGV4dDogXCJcIiwgLy8gRGVsZXRlIG9wZXJhdGlvbiwgbm8gaW5zZXJ0ZWQgdGV4dFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdF0sXHJcblx0XHRcdGRvY0NoYW5nZWQ6IHRydWUsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCByZXN1bHRJbmRlbnRlZCA9IGhhbmRsZVBhcmVudFRhc2tVcGRhdGVUcmFuc2FjdGlvbihcclxuXHRcdFx0dHJJbmRlbnRlZCxcclxuXHRcdFx0bW9ja0FwcCxcclxuXHRcdFx0bW9ja1BsdWdpblxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBUaGUgZnVuY3Rpb24gc2hvdWxkIG5vdCBjaGFuZ2UgcGFyZW50IHRhc2sgc3RhdHVzIHdoZW4gZGVsZXRpbmcgYSBkYXNoXHJcblx0XHRleHBlY3QocmVzdWx0SW5kZW50ZWQpLnRvQmUodHJJbmRlbnRlZCk7XHJcblx0XHRleHBlY3QoKHJlc3VsdEluZGVudGVkIGFzIGFueSkuY2hhbmdlcykudG9FcXVhbChcclxuXHRcdFx0KHRySW5kZW50ZWQgYXMgYW55KS5jaGFuZ2VzXHJcblx0XHQpO1xyXG5cdFx0ZXhwZWN0KHJlc3VsdEluZGVudGVkLnNlbGVjdGlvbikudG9FcXVhbCh0ckluZGVudGVkLnNlbGVjdGlvbik7XHJcblx0XHQvLyBWZXJpZnkgbm8gcGFyZW50IHRhc2sgc3RhdHVzIGNoYW5nZSBhbm5vdGF0aW9uIHdhcyBhZGRlZFxyXG5cdFx0ZXhwZWN0KHJlc3VsdEluZGVudGVkLmFubm90YXRpb25zKS5ub3QudG9FcXVhbChcclxuXHRcdFx0bW9ja1BhcmVudFRhc2tTdGF0dXNDaGFuZ2VBbm5vdGF0aW9uLm9mKFxyXG5cdFx0XHRcdFwiYXV0b0NvbXBsZXRlUGFyZW50LkNPTVBMRVRFRFwiXHJcblx0XHRcdClcclxuXHRcdCk7XHJcblx0XHRleHBlY3QoKHJlc3VsdEluZGVudGVkIGFzIGFueSkuYW5ub3RhdGlvbnMpLm5vdC50b0VxdWFsKFxyXG5cdFx0XHRtb2NrUGFyZW50VGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24ub2YoXHJcblx0XHRcdFx0XCJhdXRvQ29tcGxldGVQYXJlbnQuSU5fUFJPR1JFU1NcIlxyXG5cdFx0XHQpXHJcblx0XHQpO1xyXG5cdH0pO1xyXG5cclxuXHRpdChcInNob3VsZCBwcmV2ZW50IGFjY2lkZW50YWwgcGFyZW50IHN0YXR1cyBjaGFuZ2VzIHdoZW4gZGVsZXRpbmcgYSBkYXNoIGFuZCBuZXdsaW5lIG1hcmtlclwiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBtb2NrUGx1Z2luID0gY3JlYXRlTW9ja1BsdWdpbih7XHJcblx0XHRcdGF1dG9Db21wbGV0ZVBhcmVudDogdHJ1ZSxcclxuXHRcdH0pOyAvLyBEZWZhdWx0czogJyAnLCAnLycsICd4J1xyXG5cclxuXHRcdC8vIFRlc3QgZXJyb25lb3VzIGJlaGF2aW9yOiBkZWxldGluZyBhIGRhc2ggaW5jb3JyZWN0bHkgY2hhbmdlcyB0aGUgc3RhdHVzIG9mIHRoZSBwcmV2aW91cyB0YXNrXHJcblx0XHRjb25zdCBzdGFydENvbnRlbnQgPSBcIi0gWyBdIFRhc2sgMVxcbi0gXCI7XHJcblx0XHRjb25zdCBuZXdDb250ZW50ID0gXCItIFsgXSBUYXNrIDFcIjsgLy8gU3RhdHVzIGluY29ycmVjdGx5IGNoYW5nZWRcclxuXHJcblx0XHRjb25zdCB0ciA9IGNyZWF0ZU1vY2tUcmFuc2FjdGlvbih7XHJcblx0XHRcdHN0YXJ0U3RhdGVEb2NDb250ZW50OiBzdGFydENvbnRlbnQsXHJcblx0XHRcdG5ld0RvY0NvbnRlbnQ6IG5ld0NvbnRlbnQsXHJcblx0XHRcdGNoYW5nZXM6IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRmcm9tQTogMTUsIC8vIFBvc2l0aW9uIG9mIHRoZSBkYXNoIG9uIHRoZSBzZWNvbmQgbGluZVxyXG5cdFx0XHRcdFx0dG9BOiAxNSwgLy8gRW5kIHBvc2l0aW9uIG9mIHRoZSBkYXNoXHJcblx0XHRcdFx0XHRmcm9tQjogMTIsIC8vIFBvc2l0aW9uIG9mIHRoZSB0YXNrIHN0YXR1c1xyXG5cdFx0XHRcdFx0dG9COiAxMiwgLy8gRW5kIHBvc2l0aW9uIG9mIHRoZSBzdGF0dXNcclxuXHRcdFx0XHRcdGluc2VydGVkVGV4dDogXCJcIiwgLy8gSW5jb3JyZWN0bHkgaW5zZXJ0ZWQgbmV3IHN0YXR1c1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdF0sXHJcblx0XHRcdGRvY0NoYW5nZWQ6IHRydWUsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBFdmVuIHdoZW4gcmVjZWl2aW5nIHN1Y2ggYSB0cmFuc2FjdGlvbiwgdGhlIGZ1bmN0aW9uIHNob3VsZCBkZXRlY3QgdGhpcyBpcyBub3QgYSB2YWxpZCBzdGF0dXMgY2hhbmdlXHJcblx0XHRjb25zdCByZXN1bHQgPSBoYW5kbGVQYXJlbnRUYXNrVXBkYXRlVHJhbnNhY3Rpb24oXHJcblx0XHRcdHRyLFxyXG5cdFx0XHRtb2NrQXBwLFxyXG5cdFx0XHRtb2NrUGx1Z2luXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFRoZSBmdW5jdGlvbiBzaG91bGQgaWRlbnRpZnkgYW5kIHByZXZlbnQgc3VjaCBhY2NpZGVudGFsIHBhcmVudCBzdGF0dXMgY2hhbmdlc1xyXG5cdFx0ZXhwZWN0KHJlc3VsdCkudG9CZSh0cik7XHJcblx0XHRleHBlY3QocmVzdWx0LmNoYW5nZXMpLnRvRXF1YWwodHIuY2hhbmdlcyk7XHJcblx0fSk7XHJcbn0pO1xyXG5cclxuLy8gQWRkIG1vcmUgdGVzdHMgZm9yIGVkZ2UgY2FzZXMsIGRpZmZlcmVudCBpbmRlbnRhdGlvbiBsZXZlbHMsIHdvcmtmbG93IGludGVyYWN0aW9ucyBldGMuXHJcbiJdfQ==