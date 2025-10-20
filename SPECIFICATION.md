# Task Genius - Product & Technical Specification

**Version:** 9.9.0-beta.6
**Last Updated:** 2025-10-19
**Document Type:** Product Specification & Technical Specification

---

## Table of Contents

### Part I: Product Specification
1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [Target Users](#3-target-users)
4. [Core Features](#4-core-features)
5. [User Stories & Use Cases](#5-user-stories--use-cases)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)

### Part II: Technical Specification
8. [System Architecture](#8-system-architecture)
9. [Technology Stack](#9-technology-stack)
10. [Component Architecture](#10-component-architecture)
11. [Data Models](#11-data-models)
12. [API Specification](#12-api-specification)
13. [Data Flow & Processing Pipeline](#13-data-flow--processing-pipeline)
14. [Integration Points](#14-integration-points)
15. [Performance & Scalability](#15-performance--scalability)
16. [Security Considerations](#16-security-considerations)

---

# Part I: Product Specification

## 1. Executive Summary

**Task Genius** is a comprehensive task management plugin for Obsidian that transforms the note-taking application into a powerful, feature-rich task management system. The plugin maintains Obsidian's philosophy of plain-text, future-proof note-taking while adding advanced task management capabilities including visual progress tracking, multi-stage workflows, habit tracking, calendar integration, and multiple specialized view modes.

### Key Highlights
- **Seamless Integration:** Works with Obsidian's native markdown task format (`- [ ]`)
- **Visual Progress:** Hierarchical task progress bars and visual indicators
- **Multiple Views:** 15+ specialized view modes (Kanban, Gantt, Calendar, Forecast, etc.)
- **Workflow Management:** Multi-stage custom workflows with automatic timestamping
- **Habit Tracking:** Daily habit tracking with streak visualization
- **Calendar Integration:** iCal/ICS file support for external calendar events
- **Advanced Filtering:** Sophisticated task filtering and search capabilities
- **Time Tracking:** Built-in timer and time estimation features
- **Gamification:** Achievement system with rewards and milestones

---

## 2. Product Vision & Goals

### Vision Statement
To provide Obsidian users with a professional-grade task management system that rivals standalone applications like Todoist, Things, and ClickUp, while maintaining the flexibility, privacy, and future-proof nature of plain-text markdown files.

### Product Goals

#### Primary Goals
1. **Comprehensive Task Management:** Provide all features expected from modern task management tools
2. **Maintain Markdown Compatibility:** Ensure all data remains in standard markdown format
3. **Performance at Scale:** Handle thousands of tasks across hundreds of notes efficiently
4. **Flexibility & Customization:** Allow users to adapt the system to their workflow
5. **Privacy & Offline-First:** All data stays local; no cloud dependencies

#### Secondary Goals
1. **Reduce Tool Switching:** Consolidate task management within Obsidian
2. **Visual Excellence:** Provide beautiful, intuitive visualizations
3. **Progressive Disclosure:** Simple by default, powerful when needed
4. **Community-Driven:** Respond to user feedback and feature requests

---

## 3. Target Users

### Primary User Personas

#### 1. **The Power User (Knowledge Worker)**
- **Profile:** Professional using Obsidian for personal knowledge management
- **Needs:** Advanced task organization, project tracking, GTD methodology support
- **Pain Points:** Switching between Obsidian and separate task managers
- **Goals:** Unified system for notes and tasks, advanced filtering and views

#### 2. **The Student**
- **Profile:** University student managing coursework and personal projects
- **Needs:** Assignment tracking, deadline management, study habit formation
- **Pain Points:** Overwhelming number of scattered tasks and deadlines
- **Goals:** Clear overview of upcoming work, progress tracking

#### 3. **The Project Manager**
- **Profile:** Professional managing multiple projects and teams
- **Needs:** Timeline visualization, workflow stages, dependency tracking
- **Pain Points:** Lack of visual project timeline in Obsidian
- **Goals:** Gantt charts, Kanban boards, project status overview

#### 4. **The Habit Builder**
- **Profile:** Individual focused on personal development and routine building
- **Needs:** Daily habit tracking, streak visualization, consistency metrics
- **Pain Points:** Separate apps for habits vs tasks
- **Goals:** Integrated habit and task system

#### 5. **The GTD Practitioner**
- **Profile:** User following Getting Things Done methodology
- **Needs:** Inbox processing, context-based views, next actions, projects
- **Pain Points:** Complex setup required for GTD in vanilla Obsidian
- **Goals:** Turnkey GTD implementation

---

## 4. Core Features

### 4.1 Task Management Fundamentals

#### Task Creation & Editing
- **Quick Capture:** Global command to quickly create tasks from anywhere
- **Inline Creation:** Create tasks directly in any markdown note
- **Bulk Operations:** Select and modify multiple tasks simultaneously
- **Rich Metadata:** Due dates, start dates, priorities, tags, custom fields

#### Task Organization
- **Hierarchical Tasks:** Parent-child relationships with inherited metadata
- **Project Association:** Automatic project detection from file structure
- **Tag-Based Organization:** Filter and group by tags
- **Custom Workflows:** Define multi-stage workflows (e.g., Todo → In Progress → Done)

#### Task Status & Progress
- **Status Cycling:** Keyboard shortcuts to cycle through task states
- **Visual Progress Bars:** See completion percentage of parent tasks
- **Completion Tracking:** Timestamps for creation, start, completion
- **Recurrence:** Recurring tasks with flexible patterns

### 4.2 View Modes

#### Inbox View
- All tasks or filtered subset
- Quick triage interface
- Bulk actions toolbar

#### Forecast View
- Timeline of tasks by due date
- Overdue, today, upcoming sections
- Time-blocking visualization

#### Projects View
- Tasks grouped by project/folder
- Project-level progress indicators
- Hierarchical project structure

#### Tags View
- Tasks grouped by tags
- Multi-tag support
- Tag-based filtering

#### Calendar View
- Monthly/weekly calendar interface
- Drag-and-drop date assignment
- Integration with daily notes

#### Kanban Board
- Customizable columns (by status, priority, workflow stage)
- Drag-and-drop status changes
- Swimlanes support

#### Gantt Chart
- Timeline visualization with dependencies
- Duration and deadline tracking
- Critical path highlighting

#### Quadrant View
- Eisenhower Matrix (Urgent/Important)
- Customizable axis definitions
- Visual priority management

#### Habit Tracker
- Daily habit completion tracking
- Streak visualization and statistics
- Heatmap calendar display

#### Timeline Sidebar
- Chronological task timeline
- Quick navigation
- Date-based grouping

### 4.3 Date & Time Management

#### Date Types
- **Due Date:** When task must be completed
- **Start Date:** When task becomes actionable
- **Scheduled Date:** When you plan to work on it
- **Created Date:** Task creation timestamp
- **Completed Date:** Completion timestamp
- **Cancelled Date:** Cancellation timestamp

#### Time Features
- **Time Estimates:** Track estimated vs actual time
- **Timer Integration:** Start/stop timer for active tasks
- **Time Tracking Export:** Export time logs for reporting
- **Natural Language Parsing:** "next Monday", "in 2 weeks", etc.

#### Recurrence Patterns
- Daily, weekly, monthly, yearly
- Custom intervals (every 3 days, every 2nd Monday)
- Completion-based vs date-based recurrence
- iCal RRULE support

### 4.4 Workflow Management

#### Custom Workflows
- Define custom status stages (e.g., Backlog → Design → Development → Review → Done)
- Visual workflow indicators in editor
- Automatic timestamping at each stage
- Workflow templates for common processes

#### Workflow Features
- Parent-child workflow inheritance
- Workflow-based Kanban columns
- Status-based filtering and views
- Color-coded workflow states

### 4.5 Filtering & Search

#### Filter Capabilities
- **Text Search:** Full-text search across task content
- **Status Filter:** Filter by completion state or workflow stage
- **Date Range:** Filter by date ranges (due, created, completed)
- **Priority:** Filter by priority levels (A, B, C, D)
- **Tags:** Include/exclude specific tags
- **Project:** Filter by project or folder
- **Custom Metadata:** Filter by any custom field

#### Filter Management
- **Saved Filters:** Save frequently-used filter combinations
- **Filter Presets:** Quick access to common filters
- **Advanced Query Builder:** Complex filter logic (AND/OR operations)
- **In-Editor Filter Panel:** Filter tasks without leaving editor

### 4.6 Calendar Integration (ICS)

#### External Calendar Support
- Import iCal (.ics) files from external calendars
- Automatic parsing of calendar events
- Display events alongside tasks
- Status mapping (VTODO support)
- Recurring event support

#### Use Cases
- Import work calendar for scheduling awareness
- Sync with Google Calendar, Outlook, Apple Calendar
- View holidays and special events
- Prevent task scheduling conflicts

### 4.7 Habit Tracking

#### Habit Management
- Define daily/weekly habits
- Track completion with simple checkbox
- Streak counting and visualization
- Habit calendar heatmap

#### Analytics
- Completion rate statistics
- Longest streak tracking
- Weekly/monthly summaries
- Progress charts

### 4.8 Quick Capture

#### Fast Task Entry
- Global keyboard shortcut for instant task creation
- Minimal modal with smart defaults
- Template-based task creation
- Auto-routing to designated files

#### Smart Defaults
- Inherit project from active note
- Suggest tags based on context
- Auto-assign dates based on templates
- Pre-fill common metadata

### 4.9 Gamification & Rewards

#### Achievement System
- Milestone tracking (10 tasks, 100 tasks, etc.)
- Streak achievements
- Custom goals and rewards
- Motivational feedback

#### Progress Visualization
- Completion statistics
- Productivity trends
- Achievement badges
- Leaderboard (optional, local only)

### 4.10 Advanced Features

#### File Operations
- **Bulk Move:** Move completed tasks to archive
- **Auto-Archive:** Automatic archiving based on rules
- **File Templates:** Task file templates
- **Frontmatter Integration:** Inherit metadata from YAML frontmatter

#### Canvas Support
- Tasks in Obsidian canvas files
- Visual project planning
- Canvas-based task boards

#### Customization
- **Custom Icons:** Define custom icons for statuses
- **Custom Fields:** Add any metadata fields
- **Custom Themes:** Style customization
- **Locale Support:** Multi-language support

---

## 5. User Stories & Use Cases

### 5.1 User Stories

#### Epic: Task Management
- **As a** knowledge worker, **I want to** create tasks directly in my notes **so that** I can capture action items while writing
- **As a** project manager, **I want to** see task progress bars **so that** I can quickly assess project completion
- **As a** GTD user, **I want to** filter tasks by context **so that** I can see only relevant next actions

#### Epic: Date & Time
- **As a** student, **I want to** see tasks on a calendar **so that** I can visualize my schedule
- **As a** professional, **I want to** set recurring tasks **so that** I don't have to manually recreate regular todos
- **As a** freelancer, **I want to** track time spent on tasks **so that** I can bill clients accurately

#### Epic: Workflows
- **As a** developer, **I want to** move tasks through stages **so that** I can track feature development
- **As a** content creator, **I want to** define custom workflows **so that** I can match my editorial process
- **As a** team lead, **I want to** see workflow timestamps **so that** I can identify bottlenecks

#### Epic: Visualization
- **As a** visual thinker, **I want to** view tasks in Kanban **so that** I can see work in progress
- **As a** project manager, **I want to** view Gantt charts **so that** I can see project timelines
- **As a** prioritization enthusiast, **I want to** view tasks in quadrant **so that** I can apply Eisenhower Matrix

#### Epic: Habits
- **As a** habit builder, **I want to** track daily habits **so that** I can build consistency
- **As a** goal-setter, **I want to** see habit streaks **so that** I stay motivated
- **As a** quantified-self enthusiast, **I want to** see habit analytics **so that** I can measure progress

### 5.2 Use Cases

#### Use Case 1: GTD Weekly Review
**Actor:** GTD Practitioner
**Goal:** Complete weekly review of all tasks and projects
**Preconditions:** Tasks captured throughout the week

**Flow:**
1. Open Task Genius view in sidebar
2. Switch to Inbox view to review all uncategorized tasks
3. Process each task: assign project, due date, and priority
4. Switch to Projects view to review each project
5. Ensure each project has defined next actions
6. Switch to Calendar view to check upcoming deadlines
7. Archive completed tasks using bulk operations

**Success:** All tasks processed, projects reviewed, next week planned

---

#### Use Case 2: Student Assignment Tracking
**Actor:** University Student
**Goal:** Track coursework deadlines and avoid missing assignments
**Preconditions:** Course notes created in Obsidian

**Flow:**
1. Create note for each course (e.g., "CS101 - Data Structures")
2. Add tasks for assignments with due dates
3. Use Quick Capture to add assignments as they're announced
4. Check Forecast view daily to see upcoming deadlines
5. Use Calendar view to visualize week's workload
6. Complete assignments and check off tasks
7. View Habit Tracker to maintain study consistency

**Success:** All assignments completed on time, no missed deadlines

---

#### Use Case 3: Software Development Sprint
**Actor:** Software Developer
**Goal:** Track feature development through stages
**Preconditions:** Project note with feature backlog

**Flow:**
1. Define custom workflow: Backlog → Design → Development → Code Review → Testing → Done
2. Create tasks for each feature in backlog
3. View tasks in Kanban board with workflow columns
4. Drag tasks from Backlog to Design as sprint begins
5. Move tasks through workflow stages as work progresses
6. Use timer to track time on each task
7. View Gantt chart to visualize sprint timeline
8. Review completed tasks and workflow timestamps

**Success:** Sprint completed, features delivered, time tracked

---

#### Use Case 4: Content Calendar Management
**Actor:** Content Creator
**Goal:** Plan and track content production pipeline
**Preconditions:** Content ideas collected in notes

**Flow:**
1. Create content idea tasks with topic and target audience
2. Define workflow: Idea → Outline → Draft → Edit → Publish
3. Assign scheduled dates for each content piece
4. View Calendar to visualize publishing schedule
5. Use Kanban to see content in each production stage
6. Quick Capture for new ideas throughout the day
7. Archive published content automatically on completion

**Success:** Consistent publishing schedule maintained

---

#### Use Case 5: Personal Habit Formation
**Actor:** Habit Builder
**Goal:** Build and maintain daily habits
**Preconditions:** List of desired habits identified

**Flow:**
1. Create daily habit tasks: meditation, exercise, reading
2. Configure habits with recurrence (daily)
3. Check off habits each day in Habit Tracker view
4. View streak counter for motivation
5. Review heatmap calendar to see consistency patterns
6. Receive achievement notifications for milestones
7. Adjust habits based on completion rate analytics

**Success:** Consistent habit completion, improved lifestyle

---

## 6. Functional Requirements

### 6.1 Core Task Operations
| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-1.1 | System shall parse markdown task syntax (`- [ ]`) | Critical |
| FR-1.2 | System shall support task creation via Quick Capture modal | High |
| FR-1.3 | System shall allow inline task editing in editor | Critical |
| FR-1.4 | System shall support bulk task operations (complete, delete, move) | High |
| FR-1.5 | System shall provide keyboard shortcuts for status cycling | High |
| FR-1.6 | System shall support task hierarchies (parent-child) | High |
| FR-1.7 | System shall calculate and display progress bars for parent tasks | Medium |

### 6.2 Metadata Management
| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-2.1 | System shall support multiple date types (due, start, scheduled, etc.) | Critical |
| FR-2.2 | System shall parse natural language dates ("next Monday") | High |
| FR-2.3 | System shall support priority levels (A, B, C, D) | High |
| FR-2.4 | System shall support task tags | Critical |
| FR-2.5 | System shall support custom metadata fields | Medium |
| FR-2.6 | System shall inherit metadata from parent tasks | High |
| FR-2.7 | System shall inherit metadata from file frontmatter | Medium |

### 6.3 Views & Visualization
| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-3.1 | System shall provide Inbox view for all tasks | Critical |
| FR-3.2 | System shall provide Forecast view with timeline | High |
| FR-3.3 | System shall provide Projects view with grouping | High |
| FR-3.4 | System shall provide Calendar view with month/week modes | High |
| FR-3.5 | System shall provide Kanban board with drag-and-drop | High |
| FR-3.6 | System shall provide Gantt chart visualization | Medium |
| FR-3.7 | System shall provide Quadrant view for prioritization | Medium |
| FR-3.8 | System shall allow view customization and saving | Medium |

### 6.4 Workflow Management
| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-4.1 | System shall support custom workflow definition | High |
| FR-4.2 | System shall display workflow status in editor | High |
| FR-4.3 | System shall auto-timestamp workflow transitions | Medium |
| FR-4.4 | System shall support workflow templates | Low |
| FR-4.5 | System shall allow workflow-based Kanban columns | High |

### 6.5 Filtering & Search
| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-5.1 | System shall support full-text task search | High |
| FR-5.2 | System shall support filtering by status, date, priority, tags | Critical |
| FR-5.3 | System shall allow saving filter configurations | Medium |
| FR-5.4 | System shall provide in-editor filter panel | High |
| FR-5.5 | System shall support complex filter logic (AND/OR) | Medium |

### 6.6 Calendar Integration
| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-6.1 | System shall import iCal (.ics) files | Medium |
| FR-6.2 | System shall parse calendar events as tasks | Medium |
| FR-6.3 | System shall handle recurring calendar events | Medium |
| FR-6.4 | System shall support VTODO status mapping | Low |

### 6.7 Habit Tracking
| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-7.1 | System shall support habit definition and tracking | Medium |
| FR-7.2 | System shall calculate and display habit streaks | Medium |
| FR-7.3 | System shall provide habit heatmap calendar | Medium |
| FR-7.4 | System shall show habit completion statistics | Low |

### 6.8 Time Tracking
| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-8.1 | System shall support task timer (start/stop) | Medium |
| FR-8.2 | System shall track time estimates vs actual time | Medium |
| FR-8.3 | System shall support time export for reporting | Low |

### 6.9 File Operations
| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-9.1 | System shall support bulk task moving between files | Medium |
| FR-9.2 | System shall support automatic archiving of completed tasks | Medium |
| FR-9.3 | System shall support task operations in Canvas files | Low |

### 6.10 Customization
| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-10.1 | System shall allow custom status icon definition | Low |
| FR-10.2 | System shall support theme customization | Low |
| FR-10.3 | System shall support locale/language customization | Medium |

---

## 7. Non-Functional Requirements

### 7.1 Performance
| Req ID | Requirement | Target |
|--------|-------------|--------|
| NFR-1.1 | Task indexing shall complete within 3 seconds for 10,000 tasks | <3s |
| NFR-1.2 | View rendering shall occur within 500ms for 1,000 visible tasks | <500ms |
| NFR-1.3 | Search results shall appear within 200ms | <200ms |
| NFR-1.4 | Task status cycling shall be instantaneous (<100ms) | <100ms |
| NFR-1.5 | Plugin activation shall not delay Obsidian startup by >1s | <1s |

### 7.2 Scalability
| Req ID | Requirement | Target |
|--------|-------------|--------|
| NFR-2.1 | System shall handle vaults with 50,000+ tasks | 50k tasks |
| NFR-2.2 | System shall handle vaults with 10,000+ notes | 10k notes |
| NFR-2.3 | System shall handle individual files with 1,000+ tasks | 1k tasks/file |

### 7.3 Usability
| Req ID | Requirement | Target |
|--------|-------------|--------|
| NFR-3.1 | First-time users shall complete onboarding within 5 minutes | <5 min |
| NFR-3.2 | Common actions (create task, change status) shall require ≤2 clicks | ≤2 clicks |
| NFR-3.3 | Plugin documentation shall cover 100% of features | 100% |
| NFR-3.4 | Error messages shall be clear and actionable | - |

### 7.4 Compatibility
| Req ID | Requirement | Target |
|--------|-------------|--------|
| NFR-4.1 | Plugin shall support Obsidian 1.10.0+ | ≥1.10.0 |
| NFR-4.2 | Plugin shall work on Windows, macOS, Linux | All platforms |
| NFR-4.3 | Plugin shall work on mobile (iOS, Android) | All mobile |
| NFR-4.4 | Task format shall remain standard markdown | 100% |

### 7.5 Reliability
| Req ID | Requirement | Target |
|--------|-------------|--------|
| NFR-5.1 | Plugin shall not cause data loss | 0 data loss |
| NFR-5.2 | Plugin shall gracefully handle malformed tasks | - |
| NFR-5.3 | Plugin shall recover from errors without Obsidian restart | - |
| NFR-5.4 | Changes shall be persisted immediately | - |

### 7.6 Maintainability
| Req ID | Requirement | Target |
|--------|-------------|--------|
| NFR-6.1 | Code shall maintain >80% test coverage | >80% |
| NFR-6.2 | Code shall pass TypeScript strict mode | 100% |
| NFR-6.3 | Code shall follow consistent style guide | 100% |
| NFR-6.4 | Breaking changes shall provide migration path | 100% |

### 7.7 Accessibility
| Req ID | Requirement | Target |
|--------|-------------|--------|
| NFR-7.1 | Plugin shall support keyboard-only navigation | 100% |
| NFR-7.2 | Plugin shall support screen readers | Basic |
| NFR-7.3 | Plugin shall maintain sufficient color contrast | WCAG AA |

---

# Part II: Technical Specification

## 8. System Architecture

### 8.1 Architecture Overview

Task Genius follows a **modular, event-driven dataflow architecture** with clear separation between data management, business logic, and presentation layers.

```
┌─────────────────────────────────────────────────────────────────┐
│                     TaskProgressBarPlugin                        │
│                    (Main Plugin Entry Point)                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌───────────┐   ┌─────────────┐   ┌──────────┐
    │  Dataflow │   │  Managers   │   │  Views   │
    │Orchestrator│   │  Layer      │   │  Layer   │
    └───────────┘   └─────────────┘   └──────────┘
            │               │               │
            ▼               ▼               ▼
    ┌───────────┐   ┌─────────────┐   ┌──────────┐
    │ Sources   │   │   File      │   │ Editor   │
    │ Parsers   │   │ Operations  │   │Extensions│
    │ Indexing  │   │   ICS       │   │          │
    │Augmentation│   │   Timer     │   │          │
    │ Storage   │   │   Habits    │   │          │
    └───────────┘   └─────────────┘   └──────────┘
```

### 8.2 Architectural Patterns

#### 8.2.1 Dataflow Pipeline Pattern
The core of the system is a multi-stage data processing pipeline:

```
Data Sources → Parsing → Augmentation → Indexing → Query API → Views
```

**Benefits:**
- Clear data flow and transformation stages
- Easy to add new data sources or augmentation steps
- Testable individual stages
- Performance optimization through caching

#### 8.2.2 Manager Pattern
Specialized managers encapsulate distinct concerns:
- **FileTaskManager:** File-level operations
- **ProjectConfigManager:** Project detection and configuration
- **ICSManager:** Calendar integration
- **HabitManager:** Habit tracking
- **TimerManager:** Time tracking
- **RewardManager:** Gamification

**Benefits:**
- Single responsibility principle
- Independent testing and maintenance
- Clear API boundaries

#### 8.2.3 Repository Pattern
`Repository` class provides centralized task data access:
```typescript
interface Repository {
  getAllTasks(): BaseTask[];
  getTaskById(id: string): BaseTask | null;
  updateTask(task: BaseTask): void;
  deleteTask(id: string): void;
}
```

**Benefits:**
- Abstraction over data storage
- Centralized caching strategy
- Consistent query interface

#### 8.2.4 Event-Driven Architecture
Central event bus for component communication:
```typescript
EventBus.emit('task:updated', task);
EventBus.on('task:updated', handleTaskUpdate);
```

**Benefits:**
- Loose coupling between components
- Extensibility for new features
- Reactive UI updates

#### 8.2.5 Worker Pattern
Background processing via Web Workers:
```typescript
TaskWorkerManager.process(tasks) → Web Worker → Results
```

**Benefits:**
- Non-blocking task processing
- Better performance for large vaults
- Parallel computation

### 8.3 Layer Responsibilities

#### Presentation Layer (Views & Editor Extensions)
- **Responsibilities:** UI rendering, user interaction, visual feedback
- **Components:** TaskView, TaskSpecificView, Editor widgets
- **Dependencies:** Query API, Write API, Event Bus

#### Business Logic Layer (Managers & Services)
- **Responsibilities:** Business rules, orchestration, coordination
- **Components:** Managers, Services, Executors
- **Dependencies:** Dataflow APIs, Obsidian API

#### Data Layer (Dataflow System)
- **Responsibilities:** Data acquisition, transformation, storage, querying
- **Components:** Sources, Parsers, Augmentors, Repository, Storage
- **Dependencies:** Obsidian Vault API, Web Workers

#### Integration Layer (External Systems)
- **Responsibilities:** External data integration
- **Components:** ICS Parser, File Sources
- **Dependencies:** File system, third-party formats

---

## 9. Technology Stack

### 9.1 Core Technologies

#### Language & Runtime
- **TypeScript 4.7.3:** Primary language with strict type checking
- **JavaScript (ES2020):** Runtime target
- **Node.js 16+:** Development environment

#### Framework & APIs
- **Obsidian API (1.10.0+):** Plugin framework and vault access
- **CodeMirror 6:** Editor integration and extensions
  - `@codemirror/view` - View management
  - `@codemirror/state` - State management
  - `@codemirror/search` - Search functionality

### 9.2 Libraries & Dependencies

#### Date & Time Handling
- **date-fns (4.1.0):** Date manipulation and formatting
- **chrono-node (2.7.6):** Natural language date parsing
- **rrule (2.8.1):** Recurrence rule parsing (iCal RRULE)

#### Data & Storage
- **localforage (1.10.0):** IndexedDB/localStorage abstraction for caching
- **jszip (3.10.1):** ZIP compression for exports

#### UI Components
- **Sortable.js (1.15.6):** Drag-and-drop functionality
- **Popper.js (2.11.8):** Tooltip and popover positioning

#### Utilities
- **regexp-match-indices (1.0.2):** Regex utilities
- **monkey-around (3.0.0):** Method patching utilities

### 9.3 Development Tools

#### Build System
- **ESBuild (0.25.9):** Fast bundler and transpiler
- **esbuild-plugin-inline-worker:** Web worker bundling

#### Testing
- **Jest (29.5.0):** Testing framework
- **ts-jest (29.1.0):** TypeScript support for Jest
- **jest-environment-jsdom:** DOM testing environment

#### Code Quality
- **ESLint + TypeScript ESLint:** Linting
- **Husky (9.1.7):** Git hooks
- **TypeScript strict mode:** Type safety

#### Release Management
- **release-it (19.0.4):** Automated releases
- **conventional-changelog:** Changelog generation
- **semver:** Version management

### 9.4 Technology Justifications

| Technology | Justification |
|------------|---------------|
| TypeScript | Type safety for large codebase, excellent IDE support, catch errors at compile time |
| CodeMirror 6 | Modern, extensible editor, required for Obsidian integration |
| date-fns | Modern, tree-shakeable, immutable, better than Moment.js |
| chrono-node | Best natural language date parser for JavaScript |
| localforage | Automatic fallback from IndexedDB to localStorage, promise-based API |
| ESBuild | 10-100x faster than Webpack, simpler configuration |
| Jest | Industry standard, excellent TypeScript support, snapshot testing |

---

## 10. Component Architecture

### 10.1 Core Components

#### 10.1.1 DataflowOrchestrator
**Location:** `src/dataflow/Orchestrator.ts`
**Purpose:** Central coordinator for all data processing

```typescript
class DataflowOrchestrator {
  // Data Sources
  private obsidianSource: ObsidianSource;
  private fileSource: FileSource;
  private icsSource: IcsSource;

  // Processing
  private parser: ConfigurableTaskParser;
  private augmentor: Augmentor;
  private repository: Repository;

  // APIs
  private queryAPI: QueryAPI;
  private writeAPI: WriteAPI;

  // Lifecycle
  initialize(): Promise<void>;
  start(): void;
  stop(): void;

  // Access
  getQueryAPI(): QueryAPI;
  getWriteAPI(): WriteAPI;
}
```

**Responsibilities:**
- Initialize and coordinate all data sources
- Manage parsing and augmentation pipeline
- Provide query and write APIs to consumers
- Handle lifecycle events

**Data Flow:**
1. Sources emit raw data (file changes, vault events)
2. Parser converts markdown to task objects
3. Augmentor enriches tasks with metadata
4. Repository indexes tasks for querying
5. Query/Write APIs provide access to data

---

#### 10.1.2 Task Parser
**Location:** `src/dataflow/core/ConfigurableTaskParser.ts`
**Purpose:** Parse markdown text into task objects

```typescript
interface ConfigurableTaskParser {
  parse(
    content: string,
    filePath: string,
    metadata?: FileMetadata
  ): BaseTask[];

  parseTask(
    line: string,
    lineNumber: number
  ): BaseTask | null;
}
```

**Features:**
- Regex-based task detection
- Metadata extraction (dates, priorities, tags)
- Indentation-based hierarchy detection
- Canvas file support
- Configurable task markers

**Example:**
```markdown
- [ ] Task with #tag @due(2025-11-01) !high
```
Parsed to:
```typescript
{
  id: "unique-id",
  description: "Task with",
  status: "pending",
  tags: ["tag"],
  dueDate: "2025-11-01",
  priority: "high",
  // ... more metadata
}
```

---

#### 10.1.3 Repository
**Location:** `src/dataflow/indexer/Repository.ts`
**Purpose:** In-memory task index with query capabilities

```typescript
class Repository {
  private tasks: Map<string, BaseTask>;

  // CRUD
  addTask(task: BaseTask): void;
  updateTask(task: BaseTask): void;
  deleteTask(id: string): void;
  getTask(id: string): BaseTask | null;

  // Queries
  getAllTasks(): BaseTask[];
  getTasksByFile(path: string): BaseTask[];
  getTasksByTag(tag: string): BaseTask[];
  getTasksByStatus(status: string): BaseTask[];
  getTasksByDateRange(start: Date, end: Date): BaseTask[];

  // Hierarchy
  getChildren(taskId: string): BaseTask[];
  getParent(taskId: string): BaseTask | null;
}
```

**Implementation Details:**
- Map-based storage for O(1) lookups
- Secondary indexes for common queries
- Event emission on changes
- Immutable task objects

---

#### 10.1.4 Query API
**Location:** `src/dataflow/apis/QueryAPI.ts`
**Purpose:** High-level query interface for views

```typescript
interface QueryAPI {
  // Basic queries
  getAllTasks(): BaseTask[];
  getTaskById(id: string): BaseTask | null;

  // Filtered queries
  query(filter: TaskFilter): BaseTask[];

  // Aggregations
  getTaskStats(): TaskStatistics;
  getProjectProgress(project: string): number;

  // Relationships
  getTaskHierarchy(taskId: string): TaskHierarchy;
}

interface TaskFilter {
  status?: string[];
  tags?: string[];
  dateRange?: { start: Date; end: Date };
  priority?: string[];
  search?: string;
  project?: string;
}
```

---

#### 10.1.5 Write API
**Location:** `src/dataflow/apis/WriteAPI.ts`
**Purpose:** Task modification interface

```typescript
interface WriteAPI {
  // Task operations
  createTask(task: Partial<BaseTask>): Promise<BaseTask>;
  updateTask(id: string, changes: Partial<BaseTask>): Promise<void>;
  deleteTask(id: string): Promise<void>;

  // Bulk operations
  bulkUpdate(ids: string[], changes: Partial<BaseTask>): Promise<void>;
  bulkDelete(ids: string[]): Promise<void>;

  // File operations
  moveTask(id: string, targetFile: string): Promise<void>;
  archiveTask(id: string): Promise<void>;
}
```

**Implementation:**
- Validates changes before applying
- Updates both repository and source files
- Emits events for UI updates
- Handles transactions for bulk operations

---

#### 10.1.6 TaskView Component
**Location:** `src/pages/TaskView.ts`
**Purpose:** Main UI view for task management

```typescript
class TaskView extends ItemView {
  // State
  private currentViewMode: ViewMode;
  private selectedTasks: Set<string>;
  private currentFilter: TaskFilter;

  // Components
  private sidebar: Sidebar;
  private content: Content;
  private detailsPanel: DetailsPanel;

  // Lifecycle
  onOpen(): Promise<void>;
  onClose(): Promise<void>;

  // Rendering
  render(): void;
  switchView(mode: ViewMode): void;
  applyFilter(filter: TaskFilter): void;

  // Interactions
  handleTaskSelect(id: string): void;
  handleTaskAction(action: TaskAction, ids: string[]): void;
}
```

**View Modes:**
- Inbox
- Forecast
- Projects
- Tags
- Calendar
- Kanban
- Gantt
- Quadrant
- Habits

---

#### 10.1.7 Editor Extensions
**Location:** `src/editor-extensions/`
**Purpose:** CodeMirror extensions for in-editor features

**Key Extensions:**

1. **Progress Bar Widget**
```typescript
// Displays progress bar next to parent tasks
class ProgressBarWidget implements WidgetType {
  toDOM(): HTMLElement;
  updateDOM(dom: HTMLElement): boolean;
}
```

2. **Status Cycler**
```typescript
// Handles task status cycling via keyboard/click
class StatusCycler {
  cycleForward(line: number): void;
  cycleBackward(line: number): void;
}
```

3. **Date Picker**
```typescript
// Inline date picker widget
class DatePicker {
  show(position: EditorPosition): void;
  selectDate(date: Date): void;
}
```

4. **Workflow Decorator**
```typescript
// Visual workflow status indicator
class WorkflowDecorator extends Decoration {
  render(status: WorkflowStatus): HTMLElement;
}
```

---

### 10.2 Manager Components

#### FileTaskManager
**Purpose:** File-level task operations
```typescript
class FileTaskManager {
  getTasksInFile(path: string): BaseTask[];
  moveTasksToFile(taskIds: string[], targetPath: string): Promise<void>;
  archiveCompletedTasks(sourcePath: string, archivePath: string): Promise<void>;
}
```

#### ProjectConfigManager
**Purpose:** Project detection and configuration
```typescript
class ProjectConfigManager {
  detectProject(filePath: string): Project | null;
  getProjectConfig(projectId: string): ProjectConfig;
  getAllProjects(): Project[];
}
```

#### ICSManager
**Purpose:** Calendar integration
```typescript
class ICSManager {
  loadICSFile(path: string): Promise<CalendarEvent[]>;
  syncCalendars(): Promise<void>;
  getEventsForDate(date: Date): CalendarEvent[];
}
```

#### HabitManager
**Purpose:** Habit tracking
```typescript
class HabitManager {
  getHabits(): Habit[];
  completeHabit(habitId: string, date: Date): void;
  getStreak(habitId: string): number;
  getCompletionRate(habitId: string, period: DateRange): number;
}
```

#### TimerManager
**Purpose:** Time tracking
```typescript
class TimerManager {
  startTimer(taskId: string): void;
  stopTimer(taskId: string): number; // returns elapsed time
  getTimeSpent(taskId: string): number;
  exportTimeData(format: 'csv' | 'json'): string;
}
```

---

### 10.3 Component Communication

#### Event Bus
**Central event system for loose coupling:**

```typescript
// Event types
type Events = {
  'task:created': BaseTask;
  'task:updated': BaseTask;
  'task:deleted': string;
  'vault:file-changed': string;
  'view:mode-changed': ViewMode;
  'filter:changed': TaskFilter;
}

// Usage
EventBus.emit('task:updated', task);
EventBus.on('task:updated', (task) => {
  // Handle update
});
```

**Event Flow Example:**
```
User clicks status → StatusCycler
  ↓ emits 'task:updated'
WriteAPI updates file
  ↓ emits 'vault:file-changed'
ObsidianSource detects change
  ↓ triggers reparse
Repository updates
  ↓ emits 'task:updated'
Views re-render
```

---

## 11. Data Models

### 11.1 Core Task Model

#### BaseTask Interface
**Location:** `src/types/task.d.ts`

```typescript
interface BaseTask {
  // Identifiers
  id: string;                    // Unique task identifier
  path: string;                  // File path
  line: number;                  // Line number in file

  // Content
  description: string;           // Task description text
  rawText: string;               // Original markdown text

  // Status
  status: TaskStatus;            // 'pending' | 'completed' | 'cancelled'
  workflowStatus?: string;       // Custom workflow status

  // Dates
  createdDate?: string;          // ISO date string
  dueDate?: string;
  startDate?: string;
  scheduledDate?: string;
  completedDate?: string;
  cancelledDate?: string;

  // Metadata
  priority?: Priority;           // 'A' | 'B' | 'C' | 'D'
  tags: string[];
  project?: string;

  // Hierarchy
  parentId?: string;
  children?: string[];
  indentLevel: number;

  // Recurrence
  recurrence?: RecurrenceRule;

  // Time tracking
  estimatedTime?: number;        // minutes
  actualTime?: number;           // minutes
  timerStart?: number;           // timestamp

  // Custom fields
  [key: string]: any;
}
```

#### TaskStatus Enum
```typescript
type TaskStatus =
  | 'pending'     // Not started: [ ]
  | 'completed'   // Done: [x]
  | 'cancelled'   // Cancelled: [-]
  | 'forwarded'   // Forwarded: [>]
  | 'scheduled';  // Scheduled: [<]
```

#### Priority Enum
```typescript
type Priority = 'A' | 'B' | 'C' | 'D';
// A = Critical/High
// B = Important
// C = Medium
// D = Low
```

---

### 11.2 Extended Task Models

#### Workflow Task
```typescript
interface WorkflowTask extends BaseTask {
  workflowId: string;
  workflowStatus: string;
  workflowStage: number;
  statusTimestamps: {
    [status: string]: string; // ISO date
  };
}
```

#### Habit Task
```typescript
interface HabitTask extends BaseTask {
  habitId: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  longestStreak: number;
  completionDates: string[]; // ISO dates
}
```

#### Calendar Event Task
```typescript
interface CalendarEventTask extends BaseTask {
  eventId: string;
  calendarSource: string;
  eventStart: string;  // ISO datetime
  eventEnd: string;
  location?: string;
  attendees?: string[];
}
```

---

### 11.3 Supporting Models

#### RecurrenceRule
```typescript
interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;           // Every N days/weeks/months
  daysOfWeek?: number[];      // 0=Sunday, 6=Saturday
  dayOfMonth?: number;
  endDate?: string;
  count?: number;             // Number of occurrences
  rrule?: string;             // iCal RRULE string
}
```

#### Project
```typescript
interface Project {
  id: string;
  name: string;
  path: string;              // Root folder path
  color?: string;
  icon?: string;

  // Configuration
  defaultDueDate?: string;
  defaultPriority?: Priority;
  defaultTags?: string[];
  workflowId?: string;

  // Statistics
  totalTasks: number;
  completedTasks: number;
  progress: number;          // 0-100
}
```

#### Workflow
```typescript
interface Workflow {
  id: string;
  name: string;
  stages: WorkflowStage[];
  defaultStage: number;
}

interface WorkflowStage {
  id: string;
  name: string;
  color: string;
  icon?: string;
  order: number;
  final: boolean;           // Is this a completion state?
}
```

#### Habit
```typescript
interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly';
  targetDays?: number[];    // For weekly: which days

  // Statistics
  streak: number;
  longestStreak: number;
  totalCompletions: number;
  startDate: string;

  // Linked task
  templateTaskId?: string;
}
```

#### Filter
```typescript
interface TaskFilter {
  // Text search
  search?: string;

  // Status
  status?: TaskStatus[];
  workflowStatus?: string[];

  // Dates
  dueDateRange?: DateRange;
  createdDateRange?: DateRange;
  hasDate?: boolean;
  isOverdue?: boolean;

  // Metadata
  tags?: string[];
  tagsMode?: 'any' | 'all' | 'none';
  priority?: Priority[];
  project?: string[];

  // Hierarchy
  hasChildren?: boolean;
  isTopLevel?: boolean;

  // Custom
  customFields?: {
    [key: string]: any;
  };
}

interface DateRange {
  start?: string;  // ISO date
  end?: string;
}
```

---

### 11.4 View Models

#### ViewConfiguration
```typescript
interface ViewConfiguration {
  id: string;
  name: string;
  type: ViewMode;
  filter: TaskFilter;
  sort: SortConfig;
  groupBy?: GroupConfig;
  columns?: ColumnConfig[];
}

type ViewMode =
  | 'inbox'
  | 'forecast'
  | 'projects'
  | 'tags'
  | 'calendar'
  | 'kanban'
  | 'gantt'
  | 'quadrant'
  | 'habits'
  | 'timeline';
```

#### SortConfig
```typescript
interface SortConfig {
  field: keyof BaseTask;
  direction: 'asc' | 'desc';
  secondary?: SortConfig;
}
```

#### GroupConfig
```typescript
interface GroupConfig {
  field: keyof BaseTask | 'project' | 'tag';
  sortGroups?: 'alpha' | 'count';
}
```

---

### 11.5 Settings Model

#### PluginSettings
```typescript
interface PluginSettings {
  // General
  enablePlugin: boolean;
  defaultView: ViewMode;

  // Task parsing
  taskMarkers: string[];        // ['- [ ]', '* [ ]']
  parseInCodeBlocks: boolean;

  // Date handling
  dateFormat: string;
  defaultDueTime?: string;
  inheritDatesFromParent: boolean;

  // Workflows
  workflows: Workflow[];
  defaultWorkflow?: string;

  // Display
  showProgressBars: boolean;
  progressBarPosition: 'inline' | 'gutter';
  showPriorityIcons: boolean;

  // Calendar
  icsFiles: string[];
  icsRefreshInterval: number;  // minutes

  // Habits
  enableHabits: boolean;
  habitFolder: string;

  // Time tracking
  enableTimer: boolean;
  timerAutoStart: boolean;

  // Advanced
  enableDataflow: boolean;
  cacheStrategy: 'memory' | 'indexeddb' | 'both';
  workerThreads: number;

  // Customization
  customIcons: { [status: string]: string };
  customColors: { [priority: string]: string };
  locale: string;
}
```

---

## 12. API Specification

### 12.1 Public Plugin API

#### Plugin Instance Access
```typescript
// Access plugin instance
const plugin = app.plugins.plugins['task-genius'];
```

#### Query API
```typescript
// Get all tasks
const tasks = plugin.dataflow.getQueryAPI().getAllTasks();

// Query with filter
const filteredTasks = plugin.dataflow.getQueryAPI().query({
  status: ['pending'],
  tags: ['work'],
  priority: ['A', 'B']
});

// Get specific task
const task = plugin.dataflow.getQueryAPI().getTaskById('task-id');

// Get project tasks
const projectTasks = plugin.dataflow.getQueryAPI().query({
  project: ['My Project']
});
```

#### Write API
```typescript
// Create task
await plugin.dataflow.getWriteAPI().createTask({
  description: 'New task',
  dueDate: '2025-11-01',
  priority: 'A',
  tags: ['work']
});

// Update task
await plugin.dataflow.getWriteAPI().updateTask('task-id', {
  status: 'completed',
  completedDate: new Date().toISOString()
});

// Delete task
await plugin.dataflow.getWriteAPI().deleteTask('task-id');

// Bulk operations
await plugin.dataflow.getWriteAPI().bulkUpdate(
  ['task-id-1', 'task-id-2'],
  { priority: 'B' }
);
```

---

### 12.2 Event API

#### Subscribe to Events
```typescript
// Task events
plugin.eventBus.on('task:created', (task: BaseTask) => {
  console.log('Task created:', task);
});

plugin.eventBus.on('task:updated', (task: BaseTask) => {
  console.log('Task updated:', task);
});

plugin.eventBus.on('task:deleted', (taskId: string) => {
  console.log('Task deleted:', taskId);
});

// View events
plugin.eventBus.on('view:mode-changed', (mode: ViewMode) => {
  console.log('View changed to:', mode);
});

// Filter events
plugin.eventBus.on('filter:changed', (filter: TaskFilter) => {
  console.log('Filter changed:', filter);
});
```

#### Emit Events (Advanced)
```typescript
// Trigger re-indexing
plugin.eventBus.emit('dataflow:reindex');

// Force view refresh
plugin.eventBus.emit('view:refresh');
```

---

### 12.3 Manager APIs

#### FileTaskManager
```typescript
const fileManager = plugin.fileTaskManager;

// Get tasks in specific file
const tasksInFile = fileManager.getTasksInFile('path/to/file.md');

// Move tasks
await fileManager.moveTasksToFile(
  ['task-id-1', 'task-id-2'],
  'path/to/target.md'
);

// Archive completed tasks
await fileManager.archiveCompletedTasks(
  'path/to/source.md',
  'archive/completed.md'
);
```

#### ProjectConfigManager
```typescript
const projectManager = plugin.projectConfigManager;

// Get all projects
const projects = projectManager.getAllProjects();

// Get project for file
const project = projectManager.detectProject('projects/work/notes.md');

// Get project config
const config = projectManager.getProjectConfig('project-id');
```

#### HabitManager
```typescript
const habitManager = plugin.habitManager;

// Get all habits
const habits = habitManager.getHabits();

// Complete habit
habitManager.completeHabit('habit-id', new Date());

// Get streak
const streak = habitManager.getStreak('habit-id');

// Get completion rate
const rate = habitManager.getCompletionRate('habit-id', {
  start: '2025-01-01',
  end: '2025-12-31'
});
```

#### TimerManager
```typescript
const timerManager = plugin.timerManager;

// Start timer
timerManager.startTimer('task-id');

// Stop timer (returns elapsed milliseconds)
const elapsed = timerManager.stopTimer('task-id');

// Get total time spent
const totalTime = timerManager.getTimeSpent('task-id');

// Export time data
const csvData = timerManager.exportTimeData('csv');
```

---

### 12.4 Command API

#### Register Custom Commands
```typescript
// Commands are registered in plugin.onload()
this.addCommand({
  id: 'custom-task-action',
  name: 'Custom Task Action',
  callback: () => {
    // Access current task
    const editor = this.app.workspace.activeEditor?.editor;
    const cursor = editor?.getCursor();
    // ... perform action
  }
});
```

#### Built-in Commands
```typescript
// Cycle status forward
app.commands.executeCommandById('task-genius:cycle-status-forward');

// Cycle status backward
app.commands.executeCommandById('task-genius:cycle-status-backward');

// Quick capture
app.commands.executeCommandById('task-genius:quick-capture');

// Open task view
app.commands.executeCommandById('task-genius:open-task-view');

// Create workflow
app.commands.executeCommandById('task-genius:create-workflow');
```

---

### 12.5 Settings API

#### Access Settings
```typescript
// Get current settings
const settings = plugin.settings;

// Check specific setting
if (settings.enableDataflow) {
  // Dataflow is enabled
}
```

#### Update Settings
```typescript
// Update settings
plugin.settings.defaultView = 'forecast';
plugin.settings.showProgressBars = true;

// Save settings
await plugin.saveSettings();
```

---

## 13. Data Flow & Processing Pipeline

### 13.1 Indexing Pipeline

#### Complete Pipeline Flow
```
┌─────────────────┐
│  Data Sources   │
│  - Obsidian     │
│  - Files        │
│  - ICS          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  File Reading   │
│  - Read content │
│  - Parse YAML   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Task Parsing   │
│  - Regex match  │
│  - Extract meta │
│  - Build object │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Augmentation   │
│  - Inherit dates│
│  - Resolve proj │
│  - Enrich meta  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Worker Process │
│  - Parallel comp│
│  - Heavy ops    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Repository     │
│  - Index tasks  │
│  - Build maps   │
│  - Cache        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Query API      │
│  - Available to │
│    all views    │
└─────────────────┘
```

#### Pipeline Stages Detail

**Stage 1: Data Source Events**
- Obsidian vault events (file create, modify, delete, rename)
- File watcher events for external files (ICS)
- Manual refresh triggers

**Stage 2: File Reading**
```typescript
// ObsidianSource reads file
const content = await vault.read(file);
const metadata = app.metadataCache.getFileCache(file);
```

**Stage 3: Task Parsing**
```typescript
// ConfigurableTaskParser
const tasks = parser.parse(content, filePath, metadata);
// Returns: BaseTask[]
```

**Stage 4: Augmentation**
```typescript
// DateInheritanceAugmentor
tasks.forEach(task => {
  if (!task.dueDate && task.parentId) {
    task.dueDate = parent.dueDate;
  }
});

// ProjectResolver
task.project = projectManager.detectProject(task.path);
```

**Stage 5: Worker Processing (if enabled)**
```typescript
// TaskWorkerManager
const enrichedTasks = await workerManager.process(tasks);
```

**Stage 6: Repository Indexing**
```typescript
// Repository updates
tasks.forEach(task => repository.addTask(task));
repository.buildIndexes();
```

**Stage 7: Event Emission**
```typescript
// Notify subscribers
eventBus.emit('repository:updated');
```

---

### 13.2 Query Execution Flow

#### Query Processing
```
User Request → View Component → Query API
                                    ↓
                              Repository
                                    ↓
                         Filter → Sort → Group
                                    ↓
                              Return Results
                                    ↓
                            View Rendering
```

#### Example Query Execution
```typescript
// 1. View requests data
const tasks = queryAPI.query({
  status: ['pending'],
  tags: ['work'],
  priority: ['A']
});

// 2. Repository processes filter
let results = repository.getAllTasks();

// 3. Apply filters
results = results.filter(task =>
  task.status === 'pending' &&
  task.tags.includes('work') &&
  task.priority === 'A'
);

// 4. Sort (if specified)
results.sort((a, b) =>
  (a.dueDate || '').localeCompare(b.dueDate || '')
);

// 5. Return to view
return results;

// 6. View renders results
view.render(results);
```

---

### 13.3 Write Operation Flow

#### Task Update Flow
```
User Action → UI Component → Write API
                                 ↓
                          Validate Change
                                 ↓
                          Update File
                                 ↓
                     Obsidian Vault Modify
                                 ↓
                         File Change Event
                                 ↓
                      ObsidianSource Detects
                                 ↓
                          Re-parse File
                                 ↓
                       Update Repository
                                 ↓
                         Emit Events
                                 ↓
                      Views Refresh
```

#### Example Write Operation
```typescript
// 1. User clicks "Complete" button
handleCompleteTask(taskId);

// 2. UI calls Write API
await writeAPI.updateTask(taskId, {
  status: 'completed',
  completedDate: new Date().toISOString()
});

// 3. Write API validates
if (!repository.getTask(taskId)) {
  throw new Error('Task not found');
}

// 4. Update file
const task = repository.getTask(taskId);
const file = vault.getAbstractFileByPath(task.path);
const content = await vault.read(file);

// Replace task line
const lines = content.split('\n');
lines[task.line] = lines[task.line].replace('[ ]', '[x]');
const newContent = lines.join('\n');

// 5. Save file
await vault.modify(file, newContent);

// 6. Obsidian fires 'modify' event
// 7. ObsidianSource detects event
obsidianSource.on('modify', async (file) => {
  // 8. Re-parse file
  const tasks = await parser.parse(file);

  // 9. Update repository
  repository.updateTasks(tasks);

  // 10. Emit event
  eventBus.emit('task:updated', task);
});

// 11. Views listen and refresh
view.on('task:updated', () => {
  this.render();
});
```

---

### 13.4 Caching Strategy

#### Multi-Level Cache
```
Level 1: In-Memory (Repository)
  - All tasks indexed in Map
  - Fast O(1) lookups
  - Invalidated on file changes

Level 2: IndexedDB (via localforage)
  - Persistent cache across sessions
  - Serialized task objects
  - Faster startup

Level 3: File System
  - Source of truth
  - Always re-parsed on change
```

#### Cache Invalidation
```typescript
// File change → Invalidate cache
vault.on('modify', (file) => {
  // Clear L1 cache for file
  repository.invalidateFile(file.path);

  // Clear L2 cache for file
  storage.remove(`tasks:${file.path}`);

  // Re-index
  reindexFile(file);
});
```

---

## 14. Integration Points

### 14.1 Obsidian Integration

#### Vault API
```typescript
// File operations
const file = this.app.vault.getAbstractFileByPath(path);
const content = await this.app.vault.read(file);
await this.app.vault.modify(file, newContent);
await this.app.vault.create(path, content);
await this.app.vault.delete(file);

// Metadata cache
const cache = this.app.metadataCache.getFileCache(file);
const frontmatter = cache?.frontmatter;
```

#### Workspace API
```typescript
// Register views
this.registerView(
  VIEW_TYPE,
  (leaf) => new TaskView(leaf, this)
);

// Open view
const leaf = this.app.workspace.getRightLeaf(false);
await leaf.setViewState({
  type: VIEW_TYPE,
  active: true
});
```

#### Commands API
```typescript
this.addCommand({
  id: 'cycle-status',
  name: 'Cycle Task Status',
  hotkeys: [{ modifiers: ['Mod'], key: 'Enter' }],
  editorCallback: (editor, view) => {
    // Handle command
  }
});
```

#### Settings API
```typescript
this.addSettingTab(new TaskGeniusSettingTab(this.app, this));
```

---

### 14.2 CodeMirror Integration

#### Editor Extensions
```typescript
import { EditorView } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';

// Define extension
const progressBarExtension = StateField.define({
  create() { return []; },
  update(widgets, tr) {
    // Update widgets
    return newWidgets;
  },
  provide(field) {
    return EditorView.decorations.from(field);
  }
});

// Register extension
this.registerEditorExtension([progressBarExtension]);
```

#### Widget Types
```typescript
class ProgressBarWidget extends WidgetType {
  constructor(private progress: number) {
    super();
  }

  toDOM(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'task-progress-bar';
    el.style.width = `${this.progress}%`;
    return el;
  }
}
```

---

### 14.3 Calendar Integration (ICS/iCal)

#### ICS File Format
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//My Company//My Calendar//EN
BEGIN:VEVENT
UID:event-001
DTSTART:20251101T090000Z
DTEND:20251101T100000Z
SUMMARY:Team Meeting
DESCRIPTION:Weekly team sync
RRULE:FREQ=WEEKLY;BYDAY=MO
END:VEVENT
END:VCALENDAR
```

#### ICS Parser
```typescript
class ICSParser {
  parse(content: string): CalendarEvent[] {
    // Parse iCal format
    const events = [];
    const lines = content.split('\n');

    let currentEvent: Partial<CalendarEvent> = {};

    for (const line of lines) {
      if (line.startsWith('BEGIN:VEVENT')) {
        currentEvent = {};
      } else if (line.startsWith('END:VEVENT')) {
        events.push(currentEvent as CalendarEvent);
      } else if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring(8);
      } else if (line.startsWith('DTSTART:')) {
        currentEvent.start = parseICalDate(line.substring(8));
      }
      // ... more parsing
    }

    return events;
  }
}
```

#### Event to Task Conversion
```typescript
function eventToTask(event: CalendarEvent): CalendarEventTask {
  return {
    id: event.uid,
    description: event.summary,
    dueDate: event.start,
    status: mapICalStatus(event.status),
    eventId: event.uid,
    calendarSource: event.source,
    eventStart: event.start,
    eventEnd: event.end,
    location: event.location,
    // ... more fields
  };
}
```

---

### 14.4 External Integrations

#### Daily Notes Integration
```typescript
import { getDailyNote, createDailyNote } from 'obsidian-daily-notes-interface';

// Get today's daily note
const dailyNote = getDailyNote(moment(), app);

// Add task to daily note
if (dailyNote) {
  const content = await vault.read(dailyNote);
  const newContent = content + `\n- [ ] ${taskDescription}`;
  await vault.modify(dailyNote, newContent);
}
```

#### Canvas Integration
```typescript
// Parse canvas file JSON
const canvasData = JSON.parse(await vault.read(canvasFile));

// Extract tasks from canvas nodes
const tasks = canvasData.nodes
  .filter(node => node.type === 'text')
  .flatMap(node => parser.parse(node.text));
```

---

## 15. Performance & Scalability

### 15.1 Performance Optimizations

#### 1. Web Workers for Heavy Processing
```typescript
// Offload parsing to worker
const workerManager = new TaskWorkerManager();
const tasks = await workerManager.process(rawData);
```

**Benefits:**
- Non-blocking UI
- Parallel processing
- Better performance on multi-core systems

---

#### 2. Incremental Indexing
```typescript
// Only re-index changed files
vault.on('modify', (file) => {
  // Re-index only this file
  const tasks = parser.parse(file);
  repository.updateTasksForFile(file.path, tasks);

  // Don't re-index entire vault
});
```

**Benefits:**
- Faster updates
- Lower CPU usage
- Better responsiveness

---

#### 3. Debounced Re-indexing
```typescript
// Debounce rapid file changes
const debouncedReindex = debounce(() => {
  reindexFile(file);
}, 300);

vault.on('modify', debouncedReindex);
```

**Benefits:**
- Reduce redundant work
- Handle burst edits efficiently

---

#### 4. Lazy Loading for Views
```typescript
// Only load visible tasks
class VirtualizedList {
  render() {
    const visibleTasks = this.tasks.slice(
      this.scrollTop / ITEM_HEIGHT,
      this.scrollTop / ITEM_HEIGHT + VISIBLE_COUNT
    );
    return renderTasks(visibleTasks);
  }
}
```

**Benefits:**
- Fast rendering with thousands of tasks
- Low memory footprint

---

#### 5. Efficient Data Structures
```typescript
// Map for O(1) lookups
private tasks: Map<string, BaseTask> = new Map();

// Secondary indexes for common queries
private tasksByFile: Map<string, Set<string>> = new Map();
private tasksByTag: Map<string, Set<string>> = new Map();
private tasksByStatus: Map<TaskStatus, Set<string>> = new Map();
```

**Benefits:**
- Fast queries
- Efficient filtering

---

#### 6. Caching Strategy
```typescript
// Multi-level cache
// L1: In-memory (fastest)
const cached = memoryCache.get(key);

// L2: IndexedDB (persistent)
if (!cached) {
  cached = await indexedDBCache.get(key);
  memoryCache.set(key, cached);
}

// L3: Re-compute (slowest)
if (!cached) {
  cached = await compute();
  await indexedDBCache.set(key, cached);
  memoryCache.set(key, cached);
}
```

---

### 15.2 Scalability Targets

#### Performance Benchmarks

| Metric | Target | Actual (Typical) |
|--------|--------|------------------|
| Initial indexing (10k tasks) | <3s | ~2s |
| Initial indexing (50k tasks) | <10s | ~8s |
| Incremental update | <100ms | ~50ms |
| View switch | <500ms | ~300ms |
| Search results | <200ms | ~150ms |
| Status cycle | <100ms | ~30ms |
| Memory usage (10k tasks) | <100MB | ~60MB |
| Memory usage (50k tasks) | <300MB | ~200MB |

#### Scalability Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Total tasks | 100,000 | Tested successfully |
| Tasks per file | 10,000 | Performance degrades beyond |
| Files with tasks | 50,000 | No limit in theory |
| Concurrent operations | 1,000 | Queue-based processing |
| ICS events | 10,000 | Per calendar source |

---

### 15.3 Performance Monitoring

#### Built-in Metrics
```typescript
class PerformanceMonitor {
  trackIndexing(duration: number, taskCount: number) {
    console.log(`Indexed ${taskCount} tasks in ${duration}ms`);
  }

  trackQuery(query: string, duration: number, resultCount: number) {
    console.log(`Query "${query}" returned ${resultCount} results in ${duration}ms`);
  }
}
```

#### Developer Tools Integration
```typescript
// Performance marks
performance.mark('indexing-start');
await reindexVault();
performance.mark('indexing-end');
performance.measure('indexing', 'indexing-start', 'indexing-end');
```

---

## 16. Security Considerations

### 16.1 Data Privacy

#### Local-Only Data
- **All data stays in Obsidian vault** - No cloud sync required
- **No external API calls** - Except for optional ICS URLs
- **No telemetry or analytics** - User privacy protected

#### Sensitive Data Handling
```typescript
// Never log sensitive data
console.log('Task updated:', { id: task.id }); // ✓ OK
console.log('Task updated:', task); // ✗ BAD - may contain sensitive info
```

---

### 16.2 Input Validation

#### Task Data Validation
```typescript
function validateTask(task: Partial<BaseTask>): boolean {
  // Validate required fields
  if (!task.description || task.description.trim() === '') {
    throw new Error('Task description required');
  }

  // Validate dates
  if (task.dueDate && !isValidDate(task.dueDate)) {
    throw new Error('Invalid due date format');
  }

  // Sanitize input
  task.description = sanitizeHtml(task.description);

  return true;
}
```

#### File Path Validation
```typescript
function validateFilePath(path: string): boolean {
  // Prevent path traversal
  if (path.includes('..')) {
    throw new Error('Invalid file path');
  }

  // Ensure within vault
  const absolutePath = vault.getAbstractFileByPath(path);
  if (!absolutePath) {
    throw new Error('File must be within vault');
  }

  return true;
}
```

---

### 16.3 XSS Prevention

#### HTML Sanitization
```typescript
import { sanitizeHTMLToDom } from 'obsidian';

// Sanitize user input before rendering
const sanitized = sanitizeHTMLToDom(userInput);
element.appendChild(sanitized);
```

#### Safe Rendering
```typescript
// Use textContent instead of innerHTML
element.textContent = task.description; // ✓ Safe

// Avoid innerHTML with user data
element.innerHTML = task.description; // ✗ Dangerous
```

---

### 16.4 Error Handling

#### Graceful Degradation
```typescript
try {
  const tasks = await parser.parse(file);
  repository.updateTasks(tasks);
} catch (error) {
  // Log error but don't crash
  console.error('Failed to parse file:', error);

  // Show user-friendly message
  new Notice('Failed to parse tasks in ' + file.name);

  // Continue with other files
}
```

#### Error Boundaries
```typescript
class TaskView {
  render() {
    try {
      return this.renderContent();
    } catch (error) {
      console.error('Render error:', error);
      return this.renderError(error);
    }
  }

  renderError(error: Error) {
    return `<div class="error">
      Failed to render view: ${error.message}
    </div>`;
  }
}
```

---

### 16.5 Permissions

#### Minimal Permissions
Plugin requires only:
- **Read vault files** - To parse tasks
- **Write vault files** - To update tasks
- **Access metadata cache** - For performance

#### No Network Access
- No external requests (except optional ICS URLs specified by user)
- No tracking or analytics
- No automatic updates from internet

---

## Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| **Augmentation** | Process of enriching task data with additional metadata |
| **Dataflow** | Data processing pipeline from sources to views |
| **Habit** | Recurring daily/weekly task tracked for consistency |
| **Indexing** | Process of parsing and organizing tasks for querying |
| **Orchestrator** | Central coordinator for data processing |
| **Project** | Collection of related tasks, typically in a folder |
| **Repository** | In-memory task data store |
| **Workflow** | Multi-stage custom status progression |

### B. File Locations Quick Reference

| Component | File Path |
|-----------|-----------|
| Main Plugin | `src/index.ts` |
| Dataflow Orchestrator | `src/dataflow/Orchestrator.ts` |
| Task Parser | `src/dataflow/core/ConfigurableTaskParser.ts` |
| Repository | `src/dataflow/indexer/Repository.ts` |
| Query API | `src/dataflow/apis/QueryAPI.ts` |
| Write API | `src/dataflow/apis/WriteAPI.ts` |
| Task View | `src/pages/TaskView.ts` |
| Settings | `src/setting.ts` |
| Type Definitions | `src/types/task.d.ts` |

### C. Configuration Examples

#### Custom Workflow Example
```json
{
  "id": "dev-workflow",
  "name": "Development Workflow",
  "stages": [
    { "id": "backlog", "name": "Backlog", "color": "#gray", "order": 0 },
    { "id": "design", "name": "Design", "color": "#blue", "order": 1 },
    { "id": "dev", "name": "Development", "color": "#yellow", "order": 2 },
    { "id": "review", "name": "Code Review", "color": "#orange", "order": 3 },
    { "id": "done", "name": "Done", "color": "#green", "order": 4, "final": true }
  ]
}
```

#### Filter Preset Example
```json
{
  "id": "today-high-priority",
  "name": "Today - High Priority",
  "filter": {
    "status": ["pending"],
    "priority": ["A", "B"],
    "dueDateRange": {
      "start": "2025-10-19",
      "end": "2025-10-19"
    }
  },
  "sort": {
    "field": "priority",
    "direction": "asc"
  }
}
```

### D. Migration Guide

#### From Version 8.x to 9.x
- **Dataflow Architecture:** New dataflow system enabled by default
- **Settings Changes:** Some settings reorganized; automatic migration provided
- **API Changes:** Query API methods renamed for consistency
- **Breaking Changes:** Custom extensions may need updates

#### Data Migration Process
```typescript
// Automatic migration on plugin load
async onload() {
  await this.loadSettings();

  if (needsMigration(this.settings)) {
    await migrateSettings(this.settings);
    await this.saveSettings();
  }
}
```

---

## Document Change History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-19 | Initial specification document created |
| 1.1 | 2025-10-19 | UI/UX improvements, filter enhancements, navigation reorganization |

---

## Recent Changes (Session 2025-10-19)

### Filter Configuration Management
**Feature:** Duplicate Filter Name Validation
- **Location:** `FilterConfigModal.ts:222-333`, `en.ts:595-597`
- **Changes:**
  - Added validation to prevent duplicate filter configuration names
  - Implemented confirmation modal when attempting to save with existing name
  - User can choose to overwrite existing filter or cancel
  - Existing filter preserves original `createdAt` and `id`, updates `updatedAt` timestamp
- **Translation Keys Added:**
  - "A filter configuration with this name already exists"
  - "Do you want to overwrite the existing filter configuration?"
  - "Overwrite"

### Reset Filter Functionality
**Feature:** Filter Dropdown Reset on Clear
- **Location:** `FluentTaskView.ts:853-854`, `FluentTopNavigation.ts:368-372`
- **Changes:**
  - Reset Filter button now also resets filter dropdown to "All tasks"
  - Added `resetFilterDropdown()` method to TopNavigation component
  - Ensures consistent state between filter button and dropdown selector

### Resize Handle Improvements
**Feature:** Conditional Resize Handle Display
- **Location:** `FluentTaskView.ts:455-486`
- **Changes:**
  - Custom resize handle only shows when NOT using Workspace Side Leaves
  - Prevents double resize handles (custom + Obsidian native)
  - Checks `useWorkspaceSideLeaves` setting before creating resize handle
- **Logic:**
  - `if (!Platform.isPhone && !useWorkspaceSideLeaves)` - only create when both conditions true
  - When side leaves enabled, Obsidian's native handle is used instead

### Visual Improvements
**Feature:** Hide Completed Projects Toggle Visibility
- **Location:** `fluent-main.css:255-264`
- **Changes:**
  - Disabled state: Reduced opacity from 0.25 to 0.15 (much lighter)
  - Enabled state: Added `font-weight: 600` and `filter: brightness(1.2)` for emphasis
  - Clearer visual distinction between on/off states

### Navigation Reorganization
**Feature:** Single-Row Three-Section Navigation Layout
- **Location:** `FluentTopNavigation.ts:77-153`, `FluentTaskView.ts:508-529`, `fluent-main.css:392-430`
- **Changes:**
  - Reorganized navigation into single row with three distinct sections
  - **Left Section:** Search field (far left) + Filter dropdown (next to search)
  - **Center Section:** View mode tabs (List, Kanban, Tree, Calendar)
  - **Right Section:** Notifications bell + Settings gear
  - Added saved filter dropdown with "All Tasks" option
  - Dropdown populates from `plugin.settings.filterConfig.savedConfigs`
  - Auto-refreshes when saved filters change via event listener
- **CSS Classes:**
  - `.fluent-nav-left` - left-side search and filter container (flex: 1 1 auto, max-width: 500px)
  - `.fluent-nav-center` - center view tabs container (flex: 0 0 auto)
  - `.fluent-nav-right` - right-side notifications and settings container
  - `.fluent-search-container` - search field wrapper (max-width: 300px, min-width: 200px)
  - `.fluent-filter-dropdown-container` - filter dropdown wrapper (min-width: 180px)

### UI Layout Structure
**Previous Layout:**
```
[Search] [List|Kanban|Tree|Calendar] [Bell|Settings]
```

**Current Layout:**
```
[Search...] [Filter ▼] ... [List | Kanban | Tree | Calendar] ... [🔔] [⚙]
```

### Saved Filter Dropdown Integration
**Feature:** Quick Filter Selection
- **Location:** `FluentTopNavigation.ts:336-368`, `FluentTaskView.ts:802-833`
- **Functionality:**
  - Dropdown shows "All Tasks" as default option
  - Lists all saved filter configurations from settings
  - Selecting a filter applies its saved `filterState` to the view
  - Selecting "All Tasks" resets all filters
  - Automatically refreshes when filters are saved/deleted via `task-genius:saved-filters-changed` event
  - Reset Filter button also resets dropdown to "All Tasks"

### Notification Feature Enhancement
**Feature:** Overdue Task Notifications with Task Details
- **Location:** `FluentTopNavigation.ts:194-245`, `FluentTaskView.ts:527`
- **Display Logic:**
  - Shows up to 10 overdue tasks (incomplete tasks with due dates on or before today)
  - Badge displays count of overdue tasks
  - Updates automatically when tasks change
- **Click Behavior:**
  - Previously: Showed broken translation template `"Task: {{content}}"`
  - Now: Opens task details modal/sidebar via `handleTaskSelection()`
  - Same behavior as clicking "Edit" in task context menu
  - Integrated with existing task selection workflow
- **Changes:**
  - Added `onTaskSelect` callback parameter to TopNavigation constructor
  - Removed broken Notice with translation template
  - Connected to FluentActionHandlers.handleTaskSelection()

### Technical Implementation Details

#### Duplicate Filter Validation Flow
1. User saves filter with name
2. System checks existing filters (case-insensitive)
3. If duplicate found:
   - Show confirmation modal
   - User clicks "Overwrite" or "Cancel"
4. If overwrite confirmed:
   - Update existing filter object
   - Preserve original ID and creation date
   - Update timestamp to current time
5. If no duplicate or new save:
   - Create new filter object with unique ID
   - Set both created and updated timestamps

#### Navigation Component Architecture
- **FluentTaskView** owns the TopNavigation component
- **TopNavigation** exposes public methods for header rendering
- **Header controls** and **header actions** are rendered externally in Obsidian header
- **View tabs** remain in custom navigation area below header
- **Separation of concerns:** Header integration vs custom view modes

### Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `FilterConfigModal.ts` | 222-333 | Duplicate name validation and overwrite confirmation |
| `en.ts` | 595-597 | Translation keys for overwrite confirmation |
| `FluentTaskView.ts` | 455-486, 508-529, 720-729, 802-833, 835-854 | Resize handle logic, navigation integration, filter handling, event listeners |
| `FluentTopNavigation.ts` | 28-40, 77-153, 194-245, 336-368 | Navigation layout, filter dropdown, notification click handling |
| `fluent-main.css` | 255-264, 392-430, 559-582 | Toggle visibility, navigation sections styling, responsive layout |

---

**End of Specification Document**
