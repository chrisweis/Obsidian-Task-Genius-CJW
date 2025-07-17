# Universal Suggest System

This document describes the new Universal Suggest System that provides unified, high-priority suggest functionality for special characters in the Task Progress Bar plugin.

## Overview

The Universal Suggest System replaces the previous scattered suggest implementations with a unified architecture that:

- Provides dynamic priority management through workspace suggest array manipulation
- Supports special characters: `!` (priority), `~` (date), `*` (target), `#` (tags)
- Maintains backward compatibility with existing MinimalQuickCaptureSuggest
- Offers extensible architecture for custom suggest implementations

## Architecture

### Core Components

1. **UniversalEditorSuggest**: Base class extending EditorSuggest<T>
2. **SuggestManager**: Manages dynamic suggest registration and priority
3. **SpecialCharacterSuggests**: Provides specific suggestions for each trigger character

### Key Features

- **Dynamic Priority**: Suggests are inserted at the beginning of `app.workspace.editorSuggest.suggests` array
- **Context Filtering**: Supports context-specific suggest activation
- **Lifecycle Management**: Automatic cleanup when modals close
- **Extensible Options**: Easy to add new trigger characters and suggestions

## Usage

### Basic Setup

```typescript
import { SuggestManager, UniversalEditorSuggest } from "./components/suggest";

// Initialize in plugin onload
this.globalSuggestManager = new SuggestManager(this.app, this);

// In modal onOpen
this.suggestManager.startManaging();
const suggest = this.suggestManager.enableForMinimalModal(editor);
suggest.enable();

// In modal onClose
this.suggestManager.stopManaging();
```

### Custom Suggest Options

```typescript
// Add custom suggest option
const customOption = {
    id: "custom-action",
    label: "Custom Action",
    icon: "star",
    description: "Perform custom action",
    replacement: "% ",
    trigger: "%",
    action: (editor, cursor) => {
        // Custom action implementation
        console.log("Custom action triggered");
    }
};

suggest.addSuggestOption(customOption);
```

### Context Filtering

```typescript
// Add context-specific filter
manager.addContextFilter("my-context", (editor, file) => {
    return file.path.includes("specific-folder");
});

// Create suggest with context
const suggest = manager.createUniversalSuggest("my-context");
```

## Special Characters

### Priority (`!`)
- `! 🔺` - Highest priority
- `! ⏫` - High priority  
- `! 🔼` - Medium priority
- `! 🔽` - Low priority
- `! ⏬` - Lowest priority

### Date (`~`)
- `~ YYYY-MM-DD` - Today's date
- `~ YYYY-MM-DD` - Tomorrow's date
- `~ ` - Open date picker
- `~ ⏰ ` - Scheduled date format

### Target (`*`)
- `* Inbox` - Save to inbox
- `* Daily` - Save to daily note
- `* Current` - Save to current file
- `* ` - Open file picker
- `* filename` - Recent files

### Tags (`#`)
- `# important` - Important tag
- `# urgent` - Urgent tag
- `# work` - Work tag
- `# personal` - Personal tag
- `# ` - Open tag picker
- `# existing-tag` - Existing vault tags

## Migration Guide

### From MinimalQuickCaptureSuggest

The existing MinimalQuickCaptureSuggest continues to work with enhanced functionality:

```typescript
// Old usage (still works)
const suggest = new MinimalQuickCaptureSuggest(app, plugin);
suggest.setMinimalMode(true);

// New enhanced suggestions are automatically available
// @ is automatically mapped to * for target location
```

### From Custom Suggest Implementations

Replace custom EditorSuggest implementations:

```typescript
// Old
class CustomSuggest extends EditorSuggest<string> {
    // Custom implementation
}

// New
const suggest = manager.createUniversalSuggest("custom", {
    triggerChars: ["@"],
    contextFilter: (editor, file) => /* custom logic */
});
```

## Performance Considerations

- Suggests are created and destroyed dynamically to minimize memory usage
- Context filters are evaluated efficiently
- Workspace suggest array manipulation is optimized for frequent operations
- Cleanup is automatic when modals close

## Testing

Run the test suite to verify functionality:

```bash
npm test -- UniversalSuggest.test.ts
npm test -- SuggestPerformance.test.ts  
npm test -- SuggestBackwardCompatibility.test.ts
```

## Troubleshooting

### Common Issues

1. **Suggests not appearing**: Ensure `startManaging()` is called before creating suggests
2. **Priority not working**: Check that suggests are added with `addSuggestWithPriority()`
3. **Context filtering**: Verify context filters return boolean values
4. **Memory leaks**: Always call `stopManaging()` or `cleanup()` when done

### Debug Mode

Enable debug logging:

```typescript
const manager = new SuggestManager(app, plugin, {
    enableDynamicPriority: true,
    // Add debug logging
});

// Log current suggest order
manager.debugLogSuggestOrder();
```

## Future Enhancements

- Support for custom trigger character patterns
- Advanced context filtering with regex support
- Suggest caching for improved performance
- Integration with other plugin suggest systems
- Visual suggest priority indicators

## API Reference

See the TypeScript definitions in the source files for complete API documentation:

- `UniversalEditorSuggest.ts` - Core suggest implementation
- `SuggestManager.ts` - Suggest lifecycle management  
- `SpecialCharacterSuggests.ts` - Built-in special character handlers
