# Multi-Detection Implementation Guide

## Overview

This document describes the implementation of a clean, modular system for supporting multiple detection types (pose, object, projectile) in the SportAI Web application. The implementation follows established patterns and avoids creating spaghetti code.

## Architecture

### 1. Type System (`types/detection.ts`)

The foundation of the system uses TypeScript discriminated unions to ensure type safety:

```typescript
export type DetectionType = "pose" | "object" | "projectile";

export type DetectionConfig =
  | PoseDetectionConfig
  | ObjectDetectionConfig
  | ProjectileDetectionConfig;
```

**Key Features:**
- **Separation of Concerns**: Each detection type has its own config interface
- **Type Safety**: Full TypeScript support with discriminated unions
- **Extensibility**: Easy to add new detection types

### 2. Detection Hooks

Three separate hooks follow the same pattern as `usePoseDetection`:

#### `useObjectDetection.ts` (YOLOv8n)
- Detects and tracks objects (people, sports balls, equipment)
- Built-in object tracking across frames using IoU matching
- Supports model selection: YOLOv8n (fast), YOLOv8s (balanced), YOLOv8m (accurate)
- Currently uses placeholder detector (ready for YOLO implementation)

#### `useProjectileDetection.ts` (TrackNet)
- Specialized for ball/projectile tracking
- Maintains trajectory history with configurable length
- Calculates velocity and predicts future path
- Uses temporal context (3 consecutive frames) like TrackNet
- Currently uses placeholder detector (ready for TrackNet implementation)

**Common Pattern:**
```typescript
export function useDetection(config: DetectionConfig) {
  const [detector, setDetector] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Model caching
  // TensorFlow.js initialization
  // Detection methods
  
  return { detector, isLoading, error, detect... };
}
```

### 3. Drawing Utilities

Separate drawing utilities for each detection type:

#### `types/object-detection.ts`
- `drawBoundingBox()` - Individual object bounding boxes
- `drawDetectedObjects()` - Batch drawing with class-specific colors
- `getClassColor()` - Consistent color mapping

#### `types/projectile-detection.ts`
- `drawProjectile()` - Ball with glow effect
- Trajectory path rendering
- Predicted path (dashed lines)
- Velocity indicators

### 4. Component Integration (`VideoPoseViewerCore.tsx`)

The main video viewer component now supports all three detection types without breaking existing functionality:

#### State Management
```typescript
// Object Detection State
const [isObjectDetectionEnabled, setIsObjectDetectionEnabled] = useState(false);
const [selectedObjectModel, setSelectedObjectModel] = useState("YOLOv8n");
const [currentObjects, setCurrentObjects] = useState([]);

// Projectile Detection State
const [isProjectileDetectionEnabled, setIsProjectileDetectionEnabled] = useState(false);
const [selectedProjectileModel, setSelectedProjectileModel] = useState("TrackNet");
const [currentProjectile, setCurrentProjectile] = useState(null);
```

#### Hook Initialization
All three detection hooks run in parallel, each with independent state:
```typescript
const { isLoading, detectPose } = usePoseDetection({ ... });
const { detectObjects } = useObjectDetection({ ... });
const { detectProjectile } = useProjectileDetection({ ... });
```

#### Continuous Detection
Each detection type has its own requestAnimationFrame loop:
- **Pose**: Runs at video FPS when enabled
- **Object**: Runs at 10 FPS (configurable) for performance
- **Projectile**: Runs at 30 FPS for smooth ball tracking

#### Rendering
Drawing happens in layers (back to front):
1. Video frame
2. Trajectories (pose joints, ball path)
3. Pose skeleton
4. Object bounding boxes
5. Projectile (ball with glow effect)
6. Angle measurements
7. Labels and metadata

### 5. UI Controls

Clean, collapsible sections for each detection type:

```
┌─────────────────────────────────┐
│ Pose Detection                  │ [Toggle]
│  ├─ Model: MoveNet/BlazePose   │
│  └─ Options...                  │
├─────────────────────────────────┤
│ Object Detection (YOLO)         │ [Toggle]
│  ├─ Model: YOLOv8n/s/m         │
│  ├─ Show Labels                 │
│  └─ Enable Tracking             │
├─────────────────────────────────┤
│ Ball Tracking (TrackNet)        │ [Toggle]
│  ├─ Model: TrackNet/V2         │
│  ├─ Show Trajectory             │
│  └─ Show Prediction             │
└─────────────────────────────────┘
```

## Implementation Status

### ✅ Completed
- [x] Type system for multi-detection
- [x] Object detection hook (YOLOv8n)
- [x] Projectile detection hook (TrackNet)
- [x] Drawing utilities for all types
- [x] Component integration
- [x] UI controls
- [x] Independent state management
- [x] Continuous detection loops
- [x] Model caching support

### 🔄 Ready for Implementation
- [ ] Actual YOLOv8 model loading
- [ ] Actual TrackNet model loading
- [ ] Model selection and configuration
- [ ] Performance optimization
- [ ] Class filtering for YOLO
- [ ] Ball type selection for TrackNet

## Adding Actual Models

### YOLOv8n Implementation

In `hooks/useObjectDetection.ts`, replace the mock detector:

```typescript
// Option 1: Use @tensorflow-models/coco-ssd (easiest)
import * as cocoSsd from '@tensorflow-models/coco-ssd';
const detector = await cocoSsd.load();

// Option 2: Load custom YOLOv8 TFJS model
const detector = await tf.loadGraphModel('path/to/yolov8n/model.json');

// Option 3: Use ONNX Runtime
import * as ort from 'onnxruntime-web';
const session = await ort.InferenceSession.create('path/to/yolov8n.onnx');
```

### TrackNet Implementation

In `hooks/useProjectileDetection.ts`, replace the mock detector:

```typescript
// Load TrackNet TensorFlow.js model
const detector = await tf.loadLayersModel('path/to/tracknet/model.json');

// TrackNet typically needs 3 consecutive frames
const detect = async (frames) => {
  // Stack 3 frames: [t-2, t-1, t]
  const input = tf.stack(frames).expandDims(0);
  
  // Run inference
  const heatmap = await detector.predict(input);
  
  // Find ball position (max in heatmap)
  const [y, x] = tf.argMax2d(heatmap);
  
  return { position: { x, y }, confidence: heatmap.max() };
};
```

## Performance Considerations

### Model Loading
- Models are cached globally (same as pose detection)
- First load downloads model, subsequent loads use cache
- Cache check uses TensorFlow.js `tf.io.listModels()`

### Detection Rates
- **Pose**: Full FPS (30-60 fps typical)
- **Object**: 10 FPS (balance between accuracy and performance)
- **Projectile**: 30 FPS (smooth ball tracking)

Adjust detection intervals in the respective useEffect hooks:
```typescript
const detectionInterval = 100; // ms (10 FPS)
```

### Rendering Performance
- All drawing happens in a single canvas pass
- Uses requestAnimationFrame for smooth rendering
- Batched updates reduce re-renders

## Benefits of This Architecture

1. **No Spaghetti Code**
   - Clear separation between detection types
   - Each type has its own hook, types, and drawing utilities
   - Independent state management

2. **No Breaking Changes**
   - Existing pose detection code unchanged
   - New features are opt-in (disabled by default)
   - Backward compatible

3. **Extensibility**
   - Easy to add new detection types
   - Follow the established pattern
   - Type-safe additions

4. **Performance**
   - Independent detection loops
   - Configurable detection rates
   - Model caching prevents re-downloads

5. **User Experience**
   - Clean, organized UI
   - Independent toggles for each detection type
   - Multiple detections can run simultaneously
   - Model selection per detection type

## Testing

To test the implementation:

1. **Enable Object Detection**
   - Toggle "Object Detection (YOLO)" in settings
   - Select a model (YOLOv8n/s/m)
   - Play the video

2. **Enable Ball Tracking**
   - Toggle "Ball Tracking (TrackNet)" in settings
   - Select a model (TrackNet/V2)
   - Play the video

3. **Multiple Detections**
   - Enable both pose and object detection simultaneously
   - Verify they work independently without conflicts

## Next Steps

1. **Implement YOLO Model Loading**
   - Choose YOLO implementation (TFJS, ONNX, or COCO-SSD)
   - Load and configure model
   - Test detection accuracy

2. **Implement TrackNet Model Loading**
   - Obtain TrackNet TFJS model
   - Implement 3-frame temporal stacking
   - Test ball tracking accuracy

3. **Optimize Performance**
   - Profile detection loops
   - Adjust detection rates if needed
   - Add worker thread support if needed

4. **Add Advanced Features**
   - Class filtering for YOLO (e.g., only detect "sports ball")
   - Ball type selection for TrackNet (tennis, pickleball, etc.)
   - Confidence threshold sliders
   - Detection statistics/metrics

## File Structure

```
sportai-web/
├── types/
│   ├── detection.ts              # Core detection types
│   ├── object-detection.ts       # YOLO drawing utilities
│   └── projectile-detection.ts   # TrackNet drawing utilities
├── hooks/
│   ├── useObjectDetection.ts     # YOLOv8 hook
│   ├── useProjectileDetection.ts # TrackNet hook
│   └── index.ts                  # Export all hooks
└── components/
    └── chat/
        └── VideoPoseViewerCore.tsx # Main component
```

## Conclusion

This implementation provides a clean, modular architecture for multi-detection support. It follows established patterns, maintains type safety, avoids breaking changes, and is ready for actual model integration. The system is extensible and can easily accommodate additional detection types in the future.







