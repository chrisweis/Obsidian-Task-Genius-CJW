---
projectName: myproject-2
tags:
  - important
  - new
---

# Test Project Tree View

This file is used to test the fix for duplicate task display in Project view tree mode.

## Test Case 1: Basic Parent-Child Tasks

- [ ] Test🔽 📅 2025-06-17
    - [ ] Subtask 1
    - [ ] Subtask 2
    - [ ] Subtask 3
    - [ ] Subtask 4

## Test Case 2: Multiple Parent Tasks

- [ ] Parent Task A 🔽
    - [ ] Subtask 1 of A
    - [ ] Subtask 2 of A

- [ ] Parent Task B 🔽
    - [ ] Subtask 1 of B
    - [ ] Subtask 2 of B

## Test Case 3: Nested Tasks (Grandchildren)

- [ ] Top-level Task 🔽
    - [ ] Second-level Task 1
        - [ ] Third-level Task 1
        - [ ] Third-level Task 2
    - [ ] Second-level Task 2
        - [ ] Third-level Task 3

## Test Case 4: Mixed Independent and Hierarchical Tasks

- [ ] Independent Task 1
- [ ] Independent Task 2

- [ ] Parent Task with Subtasks 🔽
    - [ ] Subtask A
    - [ ] Subtask B

- [ ] Another Independent Task

## Expected Behavior

In Project view tree mode, each task should appear only once:
- Parent tasks should be displayed as expandable items
- Child tasks should only appear under their parent tasks
- No task should be duplicated as both a child and an independent item

## Test Instructions

1. Open Task Genius plugin
2. Navigate to Project view
3. Select "myproject-2" project
4. Switch to tree view mode
5. Verify that:
   - "Test🔽" appears only once as a parent task
   - "Subtasks 1-4" appear only as children of "Test🔽"
   - No child tasks appear as independent root tasks
   - All parent-child relationships are preserved
