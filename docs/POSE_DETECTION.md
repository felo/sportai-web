# Pose Detection Implementation

This document explains the client-side pose detection implementation for SportAI Web.

## Overview

The pose detection system uses TensorFlow.js with the MoveNet model to perform real-time skeleton tracking on videos entirely in the browser. No server-side processing is required.

## Architecture

### Components

1. **`hooks/usePoseDetection.ts`**
   - Custom React hook for managing pose detection
   - Initializes TensorFlow.js and MoveNet model
   - Provides methods for single-frame and continuous detection
   - Handles model loading states and errors

2. **`components/chat/VideoPoseViewer.tsx`**
   - React component for displaying video with skeleton overlay
   - Manages video playback controls
   - Renders detected poses on canvas overlay
   - Configurable display options

3. **`types/pose.ts`**
   - Type definitions and utilities for pose detection
   - Defines skeleton connections and keypoints
   - Drawing utilities for rendering skeletons
   - Customizable appearance options

### Dependencies

```json
{
  "@tensorflow/tfjs": "^4.x",
  "@tensorflow-models/pose-detection": "^2.x",
  "@tensorflow/tfjs-backend-webgl": "^4.x"
}
```

## Usage

### Basic Example

```tsx
import { VideoPoseViewer } from "@/components/chat/viewers/VideoPoseViewer";

function MyComponent() {
  return (
    <VideoPoseViewer
      videoUrl="/path/to/video.mp4"
      width={640}
      height={480}
      autoPlay={false}
      showControls={true}
    />
  );
}
```

### Advanced: Custom Hook Usage

```tsx
import { usePoseDetection } from "@/hooks/usePoseDetection";
import { useEffect, useRef } from "react";

function CustomPoseComponent() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isLoading, detectPose, startDetection, stopDetection } = usePoseDetection({
    modelType: "SinglePose.Lightning", // Or "SinglePose.Thunder" for higher accuracy
    enableSmoothing: true,
    minPoseScore: 0.25,
    minPartScore: 0.3,
  });

  useEffect(() => {
    if (videoRef.current && !isLoading) {
      startDetection(videoRef.current, (poses) => {
        console.log("Detected poses:", poses);
        // Handle pose data
      });
    }
    
    return () => stopDetection();
  }, [isLoading, startDetection, stopDetection]);

  return <video ref={videoRef} src="/video.mp4" />;
}
```

## Configuration Options

### usePoseDetection Hook

```typescript
type MoveNetModelType = "SinglePose.Lightning" | "SinglePose.Thunder" | "MultiPose.Lightning";

interface PoseDetectionConfig {
  modelType?: MoveNetModelType; // Model variant to use
  enableSmoothing?: boolean; // Temporal smoothing of keypoints (default: true)
  minPoseScore?: number; // Minimum confidence for pose detection 0-1 (default: 0.25)
  minPartScore?: number; // Minimum confidence for individual keypoints 0-1 (default: 0.3)
}
```

**Model Types:**
- `"SinglePose.Lightning"` - Faster, ~6MB, ideal for real-time (~30 FPS) - **Default**
- `"SinglePose.Thunder"` - More accurate, ~13MB, better for detailed analysis
- `"MultiPose.Lightning"` - Detects multiple people, ~6MB

### Drawing Options

```typescript
interface DrawOptions {
  keypointColor?: string;      // Color of joint dots (default: #7ADB8F)
  keypointRadius?: number;     // Size of joint dots (default: 5)
  connectionColor?: string;    // Color of skeleton lines (default: #7ADB8F)
  connectionWidth?: number;    // Width of skeleton lines (default: 2)
  minConfidence?: number;      // Min score to draw point (default: 0.3)
  showConfidence?: boolean;    // Display confidence scores (default: false)
}
```

## Detected Keypoints

The MoveNet model detects 17 keypoints:

1. Nose
2. Left Eye
3. Right Eye
4. Left Ear
5. Right Ear
6. Left Shoulder
7. Right Shoulder
8. Left Elbow
9. Right Elbow
10. Left Wrist
11. Right Wrist
12. Left Hip
13. Right Hip
14. Left Knee
15. Right Knee
16. Left Ankle
17. Right Ankle

Each keypoint includes:
- `x`, `y` - Position in pixels
- `score` - Confidence score (0-1)
- `name` - Keypoint name (optional)

## Performance Considerations

### Optimization Tips

1. **Model Selection**
   - Use Lightning model for real-time playback
   - Use Thunder model for analysis/slow-motion

2. **Video Resolution**
   - Lower resolution videos process faster
   - Model works best with clear, well-lit subjects

3. **Frame Rate**
   - Can skip frames for better performance
   - Smoothing helps reduce jitter from skipped frames

4. **Backend**
   - WebGL backend is automatically selected for GPU acceleration
   - Ensure browser supports WebGL 2.0 for best performance

### Browser Compatibility

- ✅ Chrome/Edge 90+ (best performance)
- ✅ Firefox 88+ (good performance)
- ✅ Safari 15+ (moderate performance)
- ❌ IE11 (not supported)

## Integration with SportAI

### Chat Integration

The pose detection can be integrated into the chat interface to analyze uploaded videos:

```tsx
import { MessageBubble } from "@/components/chat/messages/MessageBubble";
import { VideoPoseViewer } from "@/components/chat/viewers/VideoPoseViewer";

// In message rendering logic
if (message.video && showPoseAnalysis) {
  return <VideoPoseViewer videoUrl={message.video} />;
}
```

### Analysis Workflow

1. User uploads sports video
2. Video is displayed with VideoPoseViewer
3. User toggles skeleton overlay on/off
4. Pose data can be extracted for analysis
5. AI can analyze pose data for feedback

## Demo Page

A demo page is available at `/pose-demo` that allows you to:
- Upload any video file
- See real-time pose detection
- Toggle skeleton overlay
- Test performance with different videos

To access:
```
npm run dev
# Navigate to http://localhost:3000/pose-demo
```

## Extending the System

### Custom Analysis

You can extract pose data for custom analysis:

```tsx
const { detectPose } = usePoseDetection();

// Detect pose from single frame
const poses = await detectPose(videoElement);

// Calculate joint angles
function calculateAngle(p1, p2, p3) {
  const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - 
                  Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angle = Math.abs(radians * 180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

// Example: Calculate knee angle
const leftKneeAngle = calculateAngle(
  poses[0].keypoints[11], // Left Hip
  poses[0].keypoints[13], // Left Knee
  poses[0].keypoints[15]  // Left Ankle
);
```

### Video Export

To export video with pose overlay:

1. Capture canvas frames during playback
2. Use MediaRecorder API to record canvas
3. Download as new video file

See [MediaRecorder API docs](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) for implementation details.

## Troubleshooting

### Model Loading Issues

**Problem:** "Failed to initialize pose detector"

**Solutions:**
- Check internet connection (model downloads on first use)
- Clear browser cache
- Try a different browser
- Check browser console for detailed errors

### Performance Issues

**Problem:** Laggy detection or dropped frames

**Solutions:**
- Switch to Lightning model
- Reduce video resolution
- Close other browser tabs
- Enable hardware acceleration in browser settings

### No Poses Detected

**Problem:** Skeleton not appearing on video

**Solutions:**
- Ensure person is fully visible in frame
- Check lighting (model works better with good lighting)
- Verify minimum confidence scores aren't too high
- Try Thunder model for better accuracy

## Future Enhancements

Possible improvements:
- [ ] Multi-person pose detection
- [ ] Pose comparison overlays (ideal vs actual)
- [ ] Export pose data as JSON/CSV
- [ ] 3D pose estimation
- [ ] Real-time angle and distance measurements
- [ ] Movement trajectory visualization
- [ ] Integration with Gemini AI for automatic analysis

## Resources

- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [MoveNet Model Card](https://tfhub.dev/google/movenet/singlepose/lightning/4)
- [Pose Detection Guide](https://github.com/tensorflow/tfjs-models/tree/master/pose-detection)
- [WebGL Browser Support](https://caniuse.com/webgl2)

---

**Last Updated:** November 21, 2025

