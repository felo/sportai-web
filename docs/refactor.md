Goal: Refactor into a modular, maintainable component architecture following React best practices.

## Principles
- Single Responsibility: Each component should have one clear purpose
- Separation of Concerns: Types, hooks, utilities, and UI components in separate files
- Reusability: Extract shared patterns into reusable components
- Colocation: Keep related files together in the same directory
- **Max 400 lines per file!** (run `./scripts/top-files-by-loc.sh` to check)
- Many UI components already exist, reuse them!
- Risky changes must be informed to the user to avoid introducing bugs

---

## ✅ Refactoring Checklist

Before starting:
1. [ ] Read the entire file, understand what it does
2. [ ] Identify extractable parts: types, constants, utils, sub-components, hooks
3. [ ] Plan the folder structure

Extraction order (safest first):
4. [ ] Create folder with `index.ts` re-export
5. [ ] Extract `types.ts` (no logic changes, safest)
6. [ ] Extract `constants.ts` 
7. [ ] Extract `utils.ts` (pure functions only)
8. [ ] Extract hooks to `hooks/` folder
9. [ ] Extract sub-components to `components/` (smallest first)
10. [ ] Main component should now be <300 lines

After each extraction:
- [ ] Verify imports work
- [ ] Run the app, test the feature
- [ ] Check for regressions

---

## 📁 Folder Structure Convention

**When refactoring a large component:**
```
ComponentName/
├── index.ts                    # Re-exports: export { ComponentName } from './ComponentName'
├── ComponentName.tsx           # Main component (<300 lines ideal)
├── types.ts                    # All types & interfaces
├── constants.ts                # Constants, config, default values
├── utils.ts                    # Pure helper functions
├── components/                 # Sub-components (if needed)
│   ├── index.ts
│   ├── Header.tsx
│   └── ContentSection.tsx
└── hooks/                      # Component-specific hooks (if needed)
    ├── index.ts
    └── useComponentState.ts
```

**Naming conventions:**
- Components: `PascalCase.tsx` → `TasksPage.tsx`
- Hooks: `camelCase.ts` with `use` prefix → `useTaskProgress.ts`
- Utils: `camelCase.ts` → `formatUtils.ts`
- Types: `types.ts` or `ComponentName.types.ts`
- Constants: `constants.ts`

---

## 📝 Example: Well-Structured Component

See `components/tasks/TaskTile/` for a good example:
```
TaskTile/
├── index.ts                    # export { TaskTile } from './TaskTile'
├── TaskTile.tsx                # Main component (~200 lines)
├── types.ts                    # TaskTileProps, TaskStatus, etc.
├── constants.ts                # Default values, config
├── utils.ts                    # Helper functions
├── components/
│   ├── index.ts
│   ├── DeleteConfirmDialog.tsx
│   ├── TaskTileThumbnail.tsx
│   └── VideoInfoDialog.tsx
└── hooks/
    ├── index.ts
    ├── useTaskProgress.ts
    ├── useThumbnail.ts
    └── useVideoMetadata.ts
```

---

## 🧩 Reusable UI Components (`@/components/ui`)

**Import from:** `import { ComponentName } from "@/components/ui";`

### Buttons
| Component | Description |
|-----------|-------------|
| `IconButton` | Square icon-only button with tooltip |
| `CircularIconButton` | Circular button with hover effects (audio controls) |
| `PresetButtonGroup` | Group of small preset buttons with labels |

### Inputs
| Component | Description |
|-----------|-------------|
| `ToggleSwitch` | Toggle switch with label and description |
| `RangeSlider` | Range slider with label and formatted value |

### Layout
| Component | Description |
|-----------|-------------|
| `SettingsSectionHeader` | Header with enable/disable toggle |
| `SettingsSection` | Wrapper with consistent styling |
| `CollapsibleSection` | Expandable/collapsible content section |
| `PageHeader` | Page header with title and actions |

### Feedback
| Component | Description |
|-----------|-------------|
| `LoadingState` | Loading spinner with message |
| `ErrorDisplay` | Error message with icon |
| `EmptyState` | Empty state message |
| `ErrorToast` | Toast notification for errors |
| `FeedbackToast` | General feedback toast |

### Navigation & Badges
| Component | Description |
|-----------|-------------|
| `NavigationLink` | Link button with icon |
| `BadgeWithTooltip` | Badge with hover tooltip |
| `LogoNewChatButton` | Branded new chat button |

📖 **Full documentation:** `components/ui/README.md`

---

## 🪝 Reusable Hooks (`@/hooks`)

**Import from:** `import { hookName } from "@/hooks";`

### Core Hooks
| Hook | Description |
|------|-------------|
| `useAIApi` | AI API interactions |
| `useAIChat` | Chat state management |
| `useVideoUpload` | Video file upload handling |
| `useDragAndDrop` | Drag & drop file handling |
| `useIsMobile` | Mobile device detection |
| `useNavigationWarning` | Unsaved changes warning |

### Detection Hooks
| Hook | Description |
|------|-------------|
| `usePoseDetection` | Body pose detection |
| `useObjectDetection` | Object detection (YOLOv8) |
| `useProjectileDetection` | Ball/projectile tracking |
| `useSAM2Detection` | Segment Anything Model |
| `useFrameAnalysis` | Video frame analysis |
| `useTacticalAnalysis` | Court/tactical analysis |

### Video & Player Hooks
| Hook | Description |
|------|-------------|
| `useFloatingVideo` | Floating video player |
| `useFFmpegClip` | Video clipping with FFmpeg |
| `usePlayerNicknames` | Player nickname management |
| `usePlayerProfiles` | Player profile data |

### Sidebar Hooks
| Hook | Description |
|------|-------------|
| `useSidebarChats` | Chat list management |
| `useSidebarSettings` | Sidebar settings |
| `useSidebarDialogs` | Sidebar dialog state |

---

## 📦 Utility Libraries

### `@/lib/` - Core Services
| File | Purpose |
|------|---------|
| `logger.ts` | Logging with namespaces |
| `llm.ts` | LLM API client |
| `supabase.ts` | Supabase client |
| `s3.ts` | S3 file storage |
| `config.ts` | App configuration |
| `cache-manager.ts` | Model caching |
| `text-to-speech.ts` | TTS functionality |
| `token-utils.ts` | Token management |

### `@/utils/storage/` - Storage Utilities
| Path | Purpose |
|------|---------|
| `chats/` | Chat persistence |
| `messages/` | Message storage |
| `settings/` | User settings (TTS, theatre mode, etc.) |

---

## 🔧 Available Loggers
Add new loggers when it makes sense
```typescript
import { 
  logger,           // Default
  chatLogger,       // [Chat]
  apiLogger,        // [API]
  storageLogger,    // [Storage]
  videoLogger,      // [Video]
  analysisLogger,   // [Analysis]
  authLogger,       // [Auth]
  profileLogger,    // [Profile]
  detectionLogger,  // [Detection]
  audioLogger,      // [Audio]
  feedbackLogger,   // [Feedback]
  createLogger      // Create custom namespace
} from "@/lib/logger";
```

---

## ⚠️ Common Patterns to Follow

**DO:**
```tsx
// ✅ Import from barrel exports
import { IconButton, LoadingState } from "@/components/ui";
import { useIsMobile, useVideoUpload } from "@/hooks";

// ✅ Colocate related files
import { useTaskProgress } from "./hooks";
import { TaskTileProps } from "./types";
import { formatDuration } from "./utils";

// ✅ Keep components focused
const TaskHeader = ({ title, onClose }: TaskHeaderProps) => (
  <Flex justify="between" align="center">
    <Text weight="bold">{title}</Text>
    <IconButton icon={<X />} onClick={onClose} />
  </Flex>
);
```

**DON'T:**
```tsx
// ❌ Don't define types inline in large components
const Component = ({ data }: { data: { id: string; name: string; items: Array<{...}> } }) => {}

// ❌ Don't put all logic in one file
// Split into: types.ts, utils.ts, hooks/useX.ts, components/SubComponent.tsx

// ❌ Don't duplicate existing UI components
// Check @/components/ui first!

// ❌ Don't use console.log
// Use appropriate logger: chatLogger.debug(), videoLogger.error(), etc.
```

---

## 🚀 Quick Start Refactoring Command

To refactor a file like `BigComponent.tsx`:
```bash
# 1. Create folder structure
mkdir -p components/BigComponent/{hooks,components}
touch components/BigComponent/{index.ts,types.ts,constants.ts,utils.ts}
touch components/BigComponent/hooks/index.ts
touch components/BigComponent/components/index.ts

# 2. Move original file
mv components/BigComponent.tsx components/BigComponent/BigComponent.tsx

# 3. Create index.ts re-export
echo "export { BigComponent } from './BigComponent';" > components/BigComponent/index.ts
```

