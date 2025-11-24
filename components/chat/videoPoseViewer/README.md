# VideoPoseViewer Module

This directory contains the refactored VideoPoseViewer component, split into smaller, maintainable modules.

## 📁 Directory Structure

```
videoPoseViewer/
├── README.md                      # This file
├── index.ts                       # Main exports
├── VideoPoseViewerCore.tsx        # Main component (orchestrator)
├── constants.ts                   # Shared constants
├── types/                         # TypeScript types
│   ├── index.ts
│   ├── props.ts                   # Component props
│   └── state.ts                   # State types
├── hooks/                         # Custom hooks
│   ├── index.ts
│   ├── useVideoDimensions.ts      # Video sizing logic
│   ├── useVideoFPS.ts             # FPS detection
│   └── useVelocityTracking.ts     # Velocity calculations
├── components/                    # UI components
│   ├── index.ts
│   └── VelocityDisplay.tsx        # Velocity overlay display
└── utils/                         # Utility functions
    └── index.ts
```

## 🎯 Design Principles

### 1. **Separation of Concerns**
- **VideoPoseViewerCore.tsx**: Main orchestrator component (state management, event handlers)
- **hooks/**: Business logic (calculations, side effects)
- **components/**: Presentational components (UI only)
- **types/**: Type definitions
- **constants.ts**: Shared constants
- **utils/**: Pure utility functions

### 2. **Single Responsibility**
Each module has a single, well-defined purpose:
- `useVideoDimensions`: Handles video sizing and aspect ratio
- `useVideoFPS`: Detects and tracks video frame rate
- `useVelocityTracking`: Calculates wrist velocities
- `VelocityDisplay`: Renders velocity stats

### 3. **Testability**
Hooks and components are easily testable in isolation.

### 4. **Reusability**
Components and hooks can be reused across the application.

## 🔧 Usage

### Importing the Main Component
```typescript
import { VideoPoseViewer } from "@/components/chat/VideoPoseViewer";

// Use it
<VideoPoseViewer
  videoUrl={url}
  width={640}
  height={480}
  initialShowSkeleton={true}
/>
```

### Using Individual Hooks
```typescript
import { useVideoDimensions, useVideoFPS, useVelocityTracking } from "@/components/chat/videoPoseViewer/hooks";

// In your component
const { dimensions, isPortraitVideo } = useVideoDimensions({
  videoRef,
  containerRef,
  initialWidth: 640,
  initialHeight: 480,
  playbackSpeed: 1.0,
});

const videoFPS = useVideoFPS(videoRef);

const { velocityStatsLeft, velocityStatsRight } = useVelocityTracking({
  currentPoses,
  measuredAngles,
  selectedModel,
  currentFrame,
  currentTime: video.currentTime,
  enabled: true,
});
```

### Using Components
```typescript
import { VelocityDisplay } from "@/components/chat/videoPoseViewer/components";

<VelocityDisplay
  velocityStatsLeft={velocityStatsLeft}
  velocityStatsRight={velocityStatsRight}
  hasLeftElbow={true}
  hasRightElbow={true}
  isPortraitVideo={false}
  isMobile={false}
/>
```

## 🚀 Adding New Features

### Adding a New Hook
1. Create file in `hooks/` directory (e.g., `useJointMetrics.ts`)
2. Export it from `hooks/index.ts`
3. Use it in `VideoPoseViewerCore.tsx`

Example:
```typescript
// hooks/useJointMetrics.ts
export function useJointMetrics({ ... }) {
  // Your hook logic
  return { metrics, updateMetrics };
}

// hooks/index.ts
export * from "./useJointMetrics";

// VideoPoseViewerCore.tsx
import { useJointMetrics } from "./hooks";
const { metrics } = useJointMetrics({ ... });
```

### Adding a New Component
1. Create file in `components/` directory (e.g., `MetricsChart.tsx`)
2. Export it from `components/index.ts`
3. Use it in `VideoPoseViewerCore.tsx`

Example:
```typescript
// components/MetricsChart.tsx
export function MetricsChart({ data }) {
  return <div>...</div>;
}

// components/index.ts
export * from "./MetricsChart";

// VideoPoseViewerCore.tsx
import { MetricsChart } from "./components";
<MetricsChart data={metrics} />
```

## 📊 Component Size Comparison

**Before Refactoring:**
- `VideoPoseViewerCore.tsx`: ~3400 lines

**After Refactoring:**
- `VideoPoseViewerCore.tsx`: ~3200 lines (with cleaner, more maintainable code)
- `hooks/useVideoDimensions.ts`: ~58 lines
- `hooks/useVideoFPS.ts`: ~69 lines
- `hooks/useVelocityTracking.ts`: ~163 lines
- `components/VelocityDisplay.tsx`: ~103 lines
- `types/` + `constants.ts`: ~90 lines

**Total reduction in main file complexity**: Logic extracted to focused, testable modules

## 🎨 Future Improvements

### High Priority
1. **Create more UI components**:
   - `VideoControls.tsx` - Playback controls
   - `PoseControls.tsx` - Pose detection settings
   - `AngleControls.tsx` - Angle measurement UI
   - `MetricsChart.tsx` - Joint metrics visualization

2. **Add more hooks**:
   - `useAngleMeasurement.ts` - Angle tracking logic
   - `useJointTrajectories.ts` - Joint trajectory tracking
   - `useCanvasRendering.ts` - Canvas draw loop
   - `usePreprocessing.ts` - Frame preprocessing

3. **Extract canvas rendering**:
   - `VideoCanvas.tsx` - Wrapper for video + canvas elements
   - `utils/rendering.ts` - Canvas rendering helpers

### Medium Priority
4. **Add comprehensive tests**:
   - Unit tests for hooks
   - Component tests for UI components
   - Integration tests for VideoPoseViewerCore

5. **Documentation**:
   - JSDoc comments for all exports
   - Usage examples for each hook
   - Storybook for components

### Low Priority
6. **Performance optimizations**:
   - Memoization of expensive calculations
   - Virtualization for long lists
   - Web Workers for heavy processing

## 🔍 Best Practices

1. **Keep hooks focused**: Each hook should have a single responsibility
2. **Pure components**: UI components should be pure and receive data via props
3. **Type everything**: Use TypeScript for all exports
4. **Constants over magic numbers**: Use named constants from `constants.ts`
5. **Export types**: Make types available for consumers
6. **Document public APIs**: Add JSDoc for exported functions/components

## 🐛 Debugging

### Common Issues

**Hook not updating?**
- Check dependencies array in useEffect
- Verify state is being updated correctly

**Component not rendering?**
- Check props are passed correctly
- Verify conditional rendering logic

**Import errors?**
- Check `index.ts` exports
- Verify relative paths are correct

## 📚 Related Documentation

- [Main Project README](../../../README.md)
- [Pose Detection Docs](../../../docs/POSE_DETECTION.md)
- [Object Detection Docs](../../../docs/YOLOV8_IMPLEMENTATION_GUIDE.md)




