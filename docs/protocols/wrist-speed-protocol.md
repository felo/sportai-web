# Wrist Speed Analysis Protocol

## Overview

The **Wrist Speed Protocol** calculates and tracks wrist velocity throughout a video, automatically following the dominant (more active) hand. This is essential for analyzing swing mechanics in sports like tennis, padel, pickleball, golf, and baseball.

---

## Key Metrics

| Metric | Description | Unit |
|--------|-------------|------|
| **Peak Velocity** | Maximum wrist speed during the video | km/h, m/s |
| **Peak Frame** | Exact frame where peak velocity occurs | frame number |
| **Peak Timestamp** | Time of peak velocity | seconds |
| **Average Velocity** | Mean speed during active motion (>5 km/h) | km/h, m/s |
| **Dominant Hand** | Automatically detected more active hand | left/right |

---

## Algorithm

### Step 1: Preprocess All Frames

Before analysis can run, all video frames must have pose data:

```
for each frame in video:
    poses = detectPose(frame)
    preprocessedPoses[frame] = poses
```

### Step 2: Detect Dominant Hand

The algorithm determines which hand is more active by comparing total wrist displacement:

```
leftMotion = sum of left wrist displacement across all frames
rightMotion = sum of right wrist displacement across all frames

if rightMotion > leftMotion:
    dominantHand = "right"
else:
    dominantHand = "left"

confidence = |rightRatio - 0.5| × 2  // How different the two sides are
```

**Rationale**: The active/dominant hand (holding racket, club, bat) moves significantly more than the non-dominant hand.

### Step 3: Calculate Frame-by-Frame Velocity

For each consecutive frame pair:

```
// Get wrist positions
prev = wristPosition[frame - 1]
curr = wristPosition[frame]

// Calculate pixel displacement
dx = curr.x - prev.x
dy = curr.y - prev.y
distPx = sqrt(dx² + dy²)

// Convert to real-world units
pixelsPerMeter = personHeight / estimatedHeightMeters  // ~1.8m default
distMeters = distPx / pixelsPerMeter

// Calculate velocity
dt = (frame - prevFrame) / videoFPS
velocityMs = distMeters / dt
velocityKmh = velocityMs × 3.6
```

### Step 4: Apply Smoothing

A 3-frame moving average reduces noise from pose detection jitter:

```
for i in range(len(speedData)):
    start = max(0, i - 1)
    end = min(len(speedData) - 1, i + 1)
    smoothedSpeed[i] = average(speedData[start:end+1])
```

### Step 5: Find Peak Velocity

```
peakIdx = argmax(speedData)
peakVelocity = speedData[peakIdx]
peakFrame = frames[peakIdx]
peakTimestamp = peakFrame / videoFPS
```

### Step 6: Calculate Average Velocity

Only includes frames with significant motion (>5 km/h threshold):

```
movingFrames = filter(speedData, speed > 5)
averageVelocity = mean(movingFrames)
```

---

## Scaling & Real-World Conversion

### Person Height Estimation

The protocol uses the detected person's bounding box height to estimate scale:

```
personHeightPx = boundingBox.height  // or keypoint span
pixelsPerMeter = personHeightPx / 1.8  // Assumes 1.8m average height
```

**Note**: For more accurate measurements, future versions could:
- Accept user-specified height
- Use known court/field dimensions for calibration
- Leverage depth sensing cameras

---

## Output Data Structure

```typescript
interface WristSpeedAnalysisResult {
  // Dominant hand info
  dominantHand: "left" | "right";
  handednessConfidence: number;  // 0-1
  
  // Time-series data (for graphing)
  speedData: Array<{
    frame: number;
    timestamp: number;     // seconds
    speedKmh: number;
    speedMs: number;
    position: { x: number; y: number };
    confidence: number;    // keypoint confidence
  }>;
  
  // Peak velocity metrics
  peakVelocity: {
    speedKmh: number;
    speedMs: number;
    frame: number;
    timestamp: number;
  };
  
  // Average velocity (active motion only)
  averageVelocity: {
    speedKmh: number;
    speedMs: number;
  };
  
  // Metadata
  totalFramesAnalyzed: number;
  videoDuration: number;
  analysisTimestamp: string;
}
```

---

## Console Output Example

```
🖐️ Wrist Speed Analysis - Handedness Detection:
   Left wrist total motion: 1,234px
   Right wrist total motion: 2,567px
   Dominant hand: right (67% confidence)

📊 Wrist Speed Analysis Results:
   Dominant hand: right
   Frames analyzed: 145
   Video duration: 4.83s

⚡ Peak Velocity:
   Speed: 98.3 km/h (27.3 m/s)
   Frame: 89
   Timestamp: 2.967s

📈 Average Velocity (active motion):
   Speed: 42.1 km/h (11.7 m/s)
```

---

## Usage

### Hook API

```typescript
const {
  isAnalyzing,
  result,
  error,
  analyzeWristSpeed,
  clearResult,
  hasPreprocessedData,
} = useWristSpeedProtocol({
  preprocessedPoses,
  selectedModel,
  videoFPS,
  selectedPoseIndex,
});

// Run analysis (auto-detect dominant hand)
const result = await analyzeWristSpeed("auto");

// Or specify hand
const result = await analyzeWristSpeed("right");
```

### Accessing Time-Series Data

```typescript
if (result) {
  // Get speed at each frame for graphing
  const chartData = result.speedData.map(d => ({
    x: d.timestamp,
    y: d.speedKmh,
  }));
  
  // Get peak info
  console.log(`Peak: ${result.peakVelocity.speedKmh} km/h at ${result.peakVelocity.timestamp}s`);
}
```

---

## Use Cases

### Tennis/Padel/Pickleball
- Measure racket head speed at contact
- Compare forehand vs backhand swing speeds
- Track serve velocity progression

### Golf
- Analyze clubhead speed through the swing
- Identify peak velocity timing relative to ball contact

### Baseball/Softball
- Measure bat speed during swing
- Analyze throwing arm velocity

---

## Limitations

### Camera Angle
- Side views provide most accurate tracking
- Front/back views may have depth occlusion issues

### Keypoint Confidence
- Low-confidence detections are filtered (< 0.2 threshold)
- Gaps > 0.5s between frames are ignored

### Scale Estimation
- Assumes 1.8m person height
- Accuracy depends on full-body visibility in frame

### Frame Rate
- Higher FPS = more accurate velocity measurements
- 60+ FPS recommended for fast movements

---

## Implementation Files

| File | Purpose |
|------|---------|
| `hooks/useWristSpeedProtocol.ts` | Main analysis hook |
| `docs/protocols/wrist-speed-protocol.md` | This documentation |

---

## Future Improvements

1. **User-specified height**: Accept player height for better scale calibration
2. **Multi-swing detection**: Identify and analyze multiple swings in one video
3. **Velocity graph overlay**: Real-time speed graph on video
4. **Comparison mode**: Side-by-side velocity comparison between sessions
5. **Export functionality**: CSV/JSON export of time-series data
6. **3D velocity**: Use BlazePose 3D for true spatial velocity









