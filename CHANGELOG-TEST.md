# Test Changelog

## [9.8.0](https://github.com/Quorafind/Obsidian-Task-Genius/compare/9.7.6...9.8.0) (2025-09-04)

### Features

* **settings:** add global Ctrl+K/Cmd+K shortcut for search ([612a979](https://github.com/Quorafind/Obsidian-Task-Genius/commit/612a979))
* **views:** add region-based organization with drag-and-drop sorting ([393fb48](https://github.com/Quorafind/Obsidian-Task-Genius/commit/393fb48))
* **projects:** add completed/total task counts to project badges ([1848f3d](https://github.com/Quorafind/Obsidian-Task-Genius/commit/1848f3d))
* **projects:** add progress bar to Projects view ([cfdd402](https://github.com/Quorafind/Obsidian-Task-Genius/commit/cfdd402))
* **tasks:** add task deletion with cascade support ([1cec2cc](https://github.com/Quorafind/Obsidian-Task-Genius/commit/1cec2cc))
* **quick-capture:** add start and scheduled date fields to electron quick capture ([cbfb2fc](https://github.com/Quorafind/Obsidian-Task-Genius/commit/cbfb2fc))
* **quick-capture:** add electron-based quick capture window ([ae80f14](https://github.com/Quorafind/Obsidian-Task-Genius/commit/ae80f14))
* **parser:** add case-insensitive tag prefix matching ([6e20a7a](https://github.com/Quorafind/Obsidian-Task-Genius/commit/6e20a7a))
* **habits:** improve habit property handling and add reindex command ([40bb407](https://github.com/Quorafind/Obsidian-Task-Genius/commit/40bb407))
* **settings:** improve heading filter UI and fix matching logic ([1e20055](https://github.com/Quorafind/Obsidian-Task-Genius/commit/1e20055))
* **settings:** improve input fields with native HTML5 types ([e617890](https://github.com/Quorafind/Obsidian-Task-Genius/commit/e617890))
* **tray:** add theme-aware Task Genius icon for system tray ([6faded9](https://github.com/Quorafind/Obsidian-Task-Genius/commit/6faded9))
* **notifications:** add flexible tray modes and improve task filtering ([9d65bd5](https://github.com/Quorafind/Obsidian-Task-Genius/commit/9d65bd5))
* **notifications:** add desktop notifications and tray menu integration ([06b162a](https://github.com/Quorafind/Obsidian-Task-Genius/commit/06b162a))
* **settings:** add bases-support URL and improve modal styling ([b10a757](https://github.com/Quorafind/Obsidian-Task-Genius/commit/b10a757))
* **modal:** add external link button to IframeModal header ([5511203](https://github.com/Quorafind/Obsidian-Task-Genius/commit/5511203))
* **filesource:** add status mapping between checkboxes and file metadata ([9f671ab](https://github.com/Quorafind/Obsidian-Task-Genius/commit/9f671ab))
* **time-parsing:** add enhanced time parsing with date inheritance and timeline improvements ([dc364df](https://github.com/Quorafind/Obsidian-Task-Genius/commit/dc364df))
* **time-parsing:** add enhanced time parsing with range and component extraction ([86b64b0](https://github.com/Quorafind/Obsidian-Task-Genius/commit/86b64b0))
* **uri:** add enhanced deep-link support with path-based routing ([a175bf4](https://github.com/Quorafind/Obsidian-Task-Genius/commit/a175bf4))
* **core:** integrate FileSource and add URI handler support ([a7e4daf](https://github.com/Quorafind/Obsidian-Task-Genius/commit/a7e4daf))
* **manager:** enhance FileTaskManager with expanded functionality ([8e292cb](https://github.com/Quorafind/Obsidian-Task-Genius/commit/8e292cb))
* **filesource:** enhance FileSource task handling and WriteAPI support ([4c5f560](https://github.com/Quorafind/Obsidian-Task-Genius/commit/4c5f560))
* **filter:** enhance file filter manager and settings UI ([c7db2b5](https://github.com/Quorafind/Obsidian-Task-Genius/commit/c7db2b5))
* **file-source:** add path-based task recognition strategy ([5fc1ad0](https://github.com/Quorafind/Obsidian-Task-Genius/commit/5fc1ad0))
* **settings:** add automatic settings migration system ([1b2e26d](https://github.com/Quorafind/Obsidian-Task-Genius/commit/1b2e26d))
* **filesource:** implement file-based task recognition system ([691952a](https://github.com/Quorafind/Obsidian-Task-Genius/commit/691952a))
* **dataflow:** implement WriteAPI with event-based skip mechanism for views ([1dcedc0](https://github.com/Quorafind/Obsidian-Task-Genius/commit/1dcedc0))
* **dataflow:** add WriteAPI for task write operations ([d989762](https://github.com/Quorafind/Obsidian-Task-Genius/commit/d989762))
* **mcp:** add batch task creation and fix subtask insertion ([559008c](https://github.com/Quorafind/Obsidian-Task-Genius/commit/559008c))

### Bug Fixes

* **settings:** correct event reason from 'view-deleted' to 'view-updated' ([9e595e7](https://github.com/Quorafind/Obsidian-Task-Genius/commit/9e595e7))
* **habits:** prevent all habits being checked when selecting one ([28a061e](https://github.com/Quorafind/Obsidian-Task-Genius/commit/28a061e))
* **task-view:** resolve text display sync issues in markdown rendering ([99861bd](https://github.com/Quorafind/Obsidian-Task-Genius/commit/99861bd))
* **filter:** improve filter input performance with increased debounce delays ([8dd02bf](https://github.com/Quorafind/Obsidian-Task-Genius/commit/8dd02bf))
* **quick-capture:** resolve tag duplication in autocomplete suggestions ([05d9022](https://github.com/Quorafind/Obsidian-Task-Genius/commit/05d9022))
* **parser:** respect custom project/context/area prefixes in task parsing ([527cb36](https://github.com/Quorafind/Obsidian-Task-Genius/commit/527cb36))
* **dates:** apply timezone handling to InlineEditor and TaskPropertyTwoColumnView ([77d21e4](https://github.com/Quorafind/Obsidian-Task-Genius/commit/77d21e4))
* **dates:** correct timezone handling for date display in task views ([f1a3c10](https://github.com/Quorafind/Obsidian-Task-Genius/commit/f1a3c10))
* improve task regex to prevent matching nested brackets in status ([26cd602](https://github.com/Quorafind/Obsidian-Task-Genius/commit/26cd602))
* **habits:** improve habit sync and progress visualization ([d18267c](https://github.com/Quorafind/Obsidian-Task-Genius/commit/d18267c))
* **tray:** improve icon visibility and window focus behavior ([a5aedad](https://github.com/Quorafind/Obsidian-Task-Genius/commit/a5aedad))
* resolve memory leaks by adding proper cleanup handlers ([2d85f38](https://github.com/Quorafind/Obsidian-Task-Genius/commit/2d85f38))
* **tray:** add cleanup handler for hard reloads and improve electron API access ([29e000c](https://github.com/Quorafind/Obsidian-Task-Genius/commit/29e000c))
* **dataflow:** correct event cleanup in DataflowOrchestrator ([0401a63](https://github.com/Quorafind/Obsidian-Task-Genius/commit/0401a63))
* **renderer:** remove priority emojis from markdown content regardless of position ([ba52d97](https://github.com/Quorafind/Obsidian-Task-Genius/commit/ba52d97))
* **task-view:** resolve task sorting instability and scroll jumping ([ac54fdb](https://github.com/Quorafind/Obsidian-Task-Genius/commit/ac54fdb))
* **date:** date and priority issue when using inline editor update content ([f6a82d3](https://github.com/Quorafind/Obsidian-Task-Genius/commit/f6a82d3))
* **type:** type issue with TFile ([ff488e8](https://github.com/Quorafind/Obsidian-Task-Genius/commit/ff488e8))
* **writeapi:** prevent writing empty tag arrays to frontmatter ([c1ac3e3](https://github.com/Quorafind/Obsidian-Task-Genius/commit/c1ac3e3))
* **writeapi:** correct typo in console log message ([5117c63](https://github.com/Quorafind/Obsidian-Task-Genius/commit/5117c63))
* **settings:** make performSearch method public for external access ([d4d9d02](https://github.com/Quorafind/Obsidian-Task-Genius/commit/d4d9d02))
* **views:** exclude badge tasks from forecast view ([44900dd](https://github.com/Quorafind/Obsidian-Task-Genius/commit/44900dd))
* **ics:** restore workspace event listeners for ICS updates ([316518d](https://github.com/Quorafind/Obsidian-Task-Genius/commit/316518d))
* **dataflow:** resolve initialization race condition causing empty data on first load ([771d9f7](https://github.com/Quorafind/Obsidian-Task-Genius/commit/771d9f7))
* **priority:** resolve priority parsing and caching issues ([b8f4586](https://github.com/Quorafind/Obsidian-Task-Genius/commit/b8f4586))
* **dataflow:** resolve data loss on restart and integrate FileSource ([172e5fc](https://github.com/Quorafind/Obsidian-Task-Genius/commit/172e5fc))
* **calendar:** display ICS badge events in calendar views ([8408636](https://github.com/Quorafind/Obsidian-Task-Genius/commit/8408636))
* **dataflow:** resolve blank TaskView and integrate ICS events ([deef893](https://github.com/Quorafind/Obsidian-Task-Genius/commit/deef893))
* **dataflow:** resolve data persistence and task parsing issues ([3c67a73](https://github.com/Quorafind/Obsidian-Task-Genius/commit/3c67a73))
* **dataflow:** resolve data persistence and task parsing issues ([b84389e](https://github.com/Quorafind/Obsidian-Task-Genius/commit/b84389e))
* **build:** resolve merge conflicts and compilation errors after rebase ([87bee19](https://github.com/Quorafind/Obsidian-Task-Genius/commit/87bee19))
* **mcp:** improve task retrieval after creation and updates ([e273301](https://github.com/Quorafind/Obsidian-Task-Genius/commit/e273301))

### Performance

* optimize view settings updates to avoid full refresh ([e26e6d5](https://github.com/Quorafind/Obsidian-Task-Genius/commit/e26e6d5))

### Refactors

* use Obsidian's setIcon instead of manual SVG creation ([cc9d1d5](https://github.com/Quorafind/Obsidian-Task-Genius/commit/cc9d1d5))
* remove inline styles and innerHTML from quadrant-column component ([48b3b8e](https://github.com/Quorafind/Obsidian-Task-Genius/commit/48b3b8e))
* **styles:** extract inline styles to CSS files ([e93c78b](https://github.com/Quorafind/Obsidian-Task-Genius/commit/e93c78b))
* **settings:** replace custom list UI with ListConfigModal and use native debounce ([a6d94a5](https://github.com/Quorafind/Obsidian-Task-Genius/commit/a6d94a5))
* rename DesktopIntegrationManager file to kebab-case and add multi-instance support ([bd4623f](https://github.com/Quorafind/Obsidian-Task-Genius/commit/bd4623f))
* **build:** migrate to TypeScript path aliases and update esbuild to v0.25.9 ([77dd5f5](https://github.com/Quorafind/Obsidian-Task-Genius/commit/77dd5f5))
* complete component directory migration with all direct imports fixed ([798403e](https://github.com/Quorafind/Obsidian-Task-Genius/commit/798403e))
* remove duplicate re-export files and update all imports to point directly to new locations ([a7667b1](https://github.com/Quorafind/Obsidian-Task-Genius/commit/a7667b1))
* **components:** add missing re-exports for backward compatibility (phase 5) ([a720293](https://github.com/Quorafind/Obsidian-Task-Genius/commit/a720293))
* **components:** add barrel exports for ui modules (phase 4) ([a009352](https://github.com/Quorafind/Obsidian-Task-Genius/commit/a009352))
* **settings:** standardize settings under features/settings with tabs/components/core structure (phase 3) ([28efa41](https://github.com/Quorafind/Obsidian-Task-Genius/commit/28efa41))
* **components:** consolidate feature modules under src/components/features/* with transitional re-exports (phase 2) ([b9ace94](https://github.com/Quorafind/Obsidian-Task-Genius/commit/b9ace94))
* **components:** extract shared UI into src/components/ui/* with transitional re-exports (phase 1) ([88bcca4](https://github.com/Quorafind/Obsidian-Task-Genius/commit/88bcca4))
* **settings:** restructure beta features into dedicated tabs ([b0431ce](https://github.com/Quorafind/Obsidian-Task-Genius/commit/b0431ce))
* **quadrant:** replace custom feedback elements with Obsidian Notice API ([b2b4ce9](https://github.com/Quorafind/Obsidian-Task-Genius/commit/b2b4ce9))
* **settings:** consolidate dataflowEnabled into enableIndexer ([e599302](https://github.com/Quorafind/Obsidian-Task-Genius/commit/e599302))
* **bases:** enhance Bases API compatibility and content handling ([cfaa2dd](https://github.com/Quorafind/Obsidian-Task-Genius/commit/cfaa2dd))
* **canvas:** consolidate Canvas parsing into core CanvasParser ([52573bf](https://github.com/Quorafind/Obsidian-Task-Genius/commit/52573bf))
* **worker:** remove unused imports from WorkerOrchestrator fallback ([ec032f0](https://github.com/Quorafind/Obsidian-Task-Genius/commit/ec032f0))
* **dataflow:** consolidate time parsing types and remove debug files ([13bd8f3](https://github.com/Quorafind/Obsidian-Task-Genius/commit/13bd8f3))
* **orchestrator:** clean up FileSource initialization ([8388455](https://github.com/Quorafind/Obsidian-Task-Genius/commit/8388455))
* **settings:** update settings UI for FileSource configuration ([d58f487](https://github.com/Quorafind/Obsidian-Task-Genius/commit/d58f487))
* **settings:** convert File Task configuration to dynamic add/remove components ([96162af](https://github.com/Quorafind/Obsidian-Task-Genius/commit/96162af))
* **dataflow:** complete TaskManager to Dataflow migration with enhanced APIs ([a5884b3](https://github.com/Quorafind/Obsidian-Task-Genius/commit/a5884b3))
* **dataflow:** major architecture improvements and bug fixes ([55fbc63](https://github.com/Quorafind/Obsidian-Task-Genius/commit/55fbc63))
* **components:** improve view management and ICS integration ([d3a850b](https://github.com/Quorafind/Obsidian-Task-Genius/commit/d3a850b))
* **dataflow:** optimize single task updates and cache invalidation ([0c6db25](https://github.com/Quorafind/Obsidian-Task-Genius/commit/0c6db25))
* **settings:** consolidate project configuration into unified tab ([b600490](https://github.com/Quorafind/Obsidian-Task-Genius/commit/b600490))
* **dataflow:** optimize worker parallelization and fix tgProject handling ([4e78382](https://github.com/Quorafind/Obsidian-Task-Genius/commit/4e78382))
* **editor-extensions:** restructure editor-ext and standardize kebab-case naming ([effbf91](https://github.com/Quorafind/Obsidian-Task-Genius/commit/effbf91))
* **dataflow:** reorganize workers and fix import paths ([8c256a9](https://github.com/Quorafind/Obsidian-Task-Genius/commit/8c256a9))
* **dataflow:** fix import paths and add dataflow event support ([8e68e01](https://github.com/Quorafind/Obsidian-Task-Genius/commit/8e68e01))
* **architecture:** complete dataflow migration and file reorganization ([ac682e5](https://github.com/Quorafind/Obsidian-Task-Genius/commit/ac682e5))
* **dataflow:** implement new task data architecture foundation ([062379f](https://github.com/Quorafind/Obsidian-Task-Genius/commit/062379f))

### Documentation

* add bug review and fix documentation ([88f0d16](https://github.com/Quorafind/Obsidian-Task-Genius/commit/88f0d16))
* update architecture documentation and file specifications ([449348d](https://github.com/Quorafind/Obsidian-Task-Genius/commit/449348d))
* **filesource:** add comprehensive specification and implementation docs ([738d7aa](https://github.com/Quorafind/Obsidian-Task-Genius/commit/738d7aa))
* add editor-extensions refactoring plan documentation ([9831541](https://github.com/Quorafind/Obsidian-Task-Genius/commit/9831541))

### Styles

* apply prettier formatting to task view components ([27f4457](https://github.com/Quorafind/Obsidian-Task-Genius/commit/27f4457))
* fix indentation and improve configuration passing ([fbb9417](https://github.com/Quorafind/Obsidian-Task-Genius/commit/fbb9417))
* apply code formatting and linting updates ([d43186f](https://github.com/Quorafind/Obsidian-Task-Genius/commit/d43186f))
* **task-list:** improve multi-line content layout flexibility ([bd56cd6](https://github.com/Quorafind/Obsidian-Task-Genius/commit/bd56cd6))
* **settings:** add tg- prefix to CSS classes to avoid conflicts ([449a1b7](https://github.com/Quorafind/Obsidian-Task-Genius/commit/449a1b7))

### Tests

* **priority:** add user scenario test for priority parsing ([b323886](https://github.com/Quorafind/Obsidian-Task-Genius/commit/b323886))
* **filesource:** add comprehensive test suite for FileSource feature ([4c82ab5](https://github.com/Quorafind/Obsidian-Task-Genius/commit/4c82ab5))

### Reverts

* rollback to 9.8.0-beta.15 and enhance release configuration ([dee72cd](https://github.com/Quorafind/Obsidian-Task-Genius/commit/dee72cd))

