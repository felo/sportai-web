# Response Highlighting Settings Implementation

## Overview
Added user-configurable settings to control response highlighting in the chat interface. Users can now toggle highlighting for different types of content through the Settings menu in the sidebar.

## Features Added

### 1. Highlighting Categories
Users can independently control highlighting for:
- **Terminology** - Sport-specific terms and court terminology (e.g., "baseline", "cross-court", "service box")
- **Technique Terms** - Technical analysis terms (e.g., "trophy position", "contact point", "follow through")
- **Timestamps** - Clickable video timestamps (e.g., "1:23", "0:45")
- **Swings** - Shot types and techniques (e.g., "forehand", "serve", "volley")

### 2. User Interface
- Added "Response highlighting" submenu to Settings dropdown
- Located in the bottom left sidebar settings
- Each option has a checkmark when enabled
- Settings persist across sessions via localStorage
- Available on both mobile and desktop layouts

### 3. Storage System
New functions in `utils/storage.ts`:
- `getHighlightingPreferences()` - Load current preferences
- `setHighlightingPreferences(preferences)` - Save all preferences
- `updateHighlightingPreference(key, value)` - Update single preference
- Event system: `highlighting-preferences-change` event for real-time updates

## Implementation Details

### Files Modified

#### 1. `/utils/storage.ts`
- Added `HighlightingPreferences` interface
- Implemented storage functions with localStorage
- Dispatches custom events for preference changes
- Defaults: All highlighting enabled by default

#### 2. `/components/Sidebar.tsx`
- Added state management for highlighting preferences
- Added UI section in both mobile and desktop settings
- Implemented event listeners for preference updates
- Added toggle handlers for each highlighting type

#### 3. `/components/markdown/markdown-components.tsx`
- Categorized database terms into three types (swings, terminology, technique)
- Added `getTermCategory()` function to identify term types
- Updated `processTextWithTimestampsAndMetrics()` to accept highlighting preferences
- Conditionally applies highlighting based on user preferences
- Only processes enabled pattern types for better performance

#### 4. `/components/markdown/MarkdownWithSwings.tsx`
- Added state for highlighting preferences
- Loads preferences from storage on mount
- Listens for preference changes
- Passes preferences to markdown components

## Technical Details

### Term Categorization
```typescript
const swingsByType = {
  swings: { ...sharedSwings, ...tennisSwings, ...pickleballSwings, ...padelSwings },
  terminology: { 
    ...sharedTerminology, 
    ...tennisTerminology, 
    ...pickleballTerminology, 
    ...padelTerminology,
    ...tennisCourts,
    ...pickleballCourts,
    ...padelCourts,
  },
  technique: { ...sharedTechnique },
};
```

### Default Settings
All highlighting types are enabled by default:
```typescript
{
  terminology: true,
  technique: true,
  timestamps: true,
  swings: true,
}
```

### Performance Optimization
- Only builds regex patterns for enabled highlighting types
- Skips processing disabled patterns entirely
- Reduces computational overhead when highlights are disabled

## User Experience

### How to Use
1. Click the Settings gear icon in the bottom left sidebar
2. Hover over "Response highlighting"
3. Click any highlighting type to toggle it on/off
4. Changes apply immediately to all messages
5. Preferences persist across browser sessions

### Visual Feedback
- Enabled options show a checkmark (✓)
- Disabled options have no checkmark
- Highlighting updates instantly in all messages

## Testing
To test the implementation:
1. Start the dev server: `npm run dev`
2. Navigate to the app
3. Open Settings → Response highlighting
4. Toggle different highlighting options
5. Send a message or view existing messages with various terms
6. Verify highlighting appears/disappears based on settings

## Backward Compatibility
- All existing functionality preserved
- Default behavior unchanged (all highlighting enabled)
- No breaking changes to existing code
- Event system allows future extensions

## Notes
- Courts are treated as terminology (as requested by user)
- Settings are stored in localStorage
- Custom events enable reactive updates across components
- TypeScript ensures type safety throughout

