# Swing Detection Protocol

## Overview

The **Swing Detection Protocol** automatically detects multiple swings in a video by analyzing wrist velocity peaks relative to the body center. Unlike serve protocols that detect a single key moment, this protocol finds **all significant swings** in a rally or practice session.

---

## Key Concepts

### Relative Velocity

Wrist velocity is calculated **relative to the body center**, not absolute pixel position. This eliminates false positives from:
- Camera movement
- Player walking/running
- Full-body translation

```
bodyCenter = average(leftShoulder, rightShoulder, leftHip, rightHip)
relativeWristPos = wristPos - bodyCenter
velocity = relativeWristPos[t] - relativeWristPos[t-1]
```

### Combined Wrist Tracking

Both wrists are tracked and their velocities are **accumulated** (summed):

```
combinedVelocity = |leftWristVelocity| + |rightWristVelocity|
```

This ensures:
- Two-handed backhands are detected
- Forehand and backhand swings are captured regardless of dominant hand
- Non-dominant hand movement contributes to swing detection

### Gap Handling

When a joint measurement is lost (low confidence or out of frame), velocity is **not interpolated**:

```
if joint[t-1] is missing OR joint[t] is missing:
    velocity[t] = null  // No velocity calculated
    
// When plotting, connect only consecutive valid points
```

This prevents false spikes from joints reappearing in different positions.

---

## Detection Algorithm

### Step 1: Preprocess All Frames

```
for each frame in video:
    poses = detectPose(frame)
    preprocessedPoses[frame] = poses
```

### Step 2: Calculate Body Center

For each frame with valid core keypoints:

```
function getBodyCenter(pose, minConfidence = 0.3):
    validPoints = []
    
    for joint in [leftShoulder, rightShoulder, leftHip, rightHip]:
        if joint.confidence >= minConfidence:
            validPoints.push(joint)
    
    if validPoints.length < 2:
        return null  // Can't compute center
    
    return average(validPoints)
```

### Step 3: Calculate Relative Wrist Velocity

```
velocityData = []

for frame in 1 to totalFrames:
    bodyCenter = getBodyCenter(pose[frame])
    prevBodyCenter = getBodyCenter(pose[frame - 1])
    
    if bodyCenter is null OR prevBodyCenter is null:
        velocityData[frame] = null
        continue
    
    leftWrist = pose[frame].keypoints[LEFT_WRIST]
    prevLeftWrist = pose[frame - 1].keypoints[LEFT_WRIST]
    rightWrist = pose[frame].keypoints[RIGHT_WRIST]
    prevRightWrist = pose[frame - 1].keypoints[RIGHT_WRIST]
    
    // Left wrist velocity (relative)
    leftVel = 0
    if leftWrist.valid AND prevLeftWrist.valid:
        leftRelPos = leftWrist - bodyCenter
        prevLeftRelPos = prevLeftWrist - prevBodyCenter
        leftVel = magnitude(leftRelPos - prevLeftRelPos)
    
    // Right wrist velocity (relative)
    rightVel = 0
    if rightWrist.valid AND prevRightWrist.valid:
        rightRelPos = rightWrist - bodyCenter
        prevRightRelPos = prevRightWrist - prevBodyCenter
        rightVel = magnitude(rightRelPos - prevRightRelPos)
    
    // Combined velocity
    velocityData[frame] = leftVel + rightVel
```

### Step 4: Apply Smoothing

```
windowSize = 3  // frames
smoothedVelocity = movingAverage(velocityData, windowSize)
```

### Step 5: Detect Peaks with Non-Maximum Suppression

```
minPeakHeight = percentile(smoothedVelocity, 75)  // Top 25% of motion
nmsWindow = videoFPS * 1.25  // ±1.25 seconds window for NMS

// Step 1: Find all local maxima above threshold
candidates = findLocalMaxima(smoothedVelocity, minPeakHeight)

// Step 2: Sort by velocity (highest first)
candidates.sortBy(velocity, descending)

// Step 3: Non-maximum suppression
// For each candidate (starting with highest):
//   - If no higher peak within ±nmsWindow frames: KEEP
//   - Otherwise: SUPPRESS
nmsKept = []
for candidate in candidates:
    if no peak in `nmsKept` within ±nmsWindow of candidate:
        nmsKept.add(candidate)
    // else: suppressed (a higher peak already exists nearby)
```

**Why NMS?** If multiple velocity peaks occur within 1.25s of each other (e.g., wrist oscillation during a swing), only the highest is kept as the actual swing moment.

### Step 5.5: Enforce Minimum Peak Distance (Velocity-Greedy)

```
minDistanceFrames = videoFPS * 1.5  // At least 1.5 seconds between swings

// NMS-kept peaks are already sorted by velocity (highest first)
// Use velocity-greedy selection: process by velocity, keep if far from ALL kept peaks

peaks = []
for peak in nmsKept:  // Ordered by velocity, highest first
    isFarEnough = true
    for keptPeak in peaks:
        if abs(peak.frame - keptPeak.frame) < minDistanceFrames:
            isFarEnough = false
            break
    
    if isFarEnough:
        peaks.add(peak)
    // else: discard (too close to a higher-velocity peak)

// Sort chronologically for output
peaks.sortBy(frameIndex, ascending)
```

**Why Velocity-Greedy?** This ensures high-velocity swings are never discarded in favor of lower-velocity ones that happened first. A powerful swing at 1.5s won't be thrown away just because a weaker motion at 0.0s was detected first.

### Step 5.6: Filter by Velocity Ratio

```
minVelocityRatio = 0.33  // 1/3 of best swing

bestVelocity = peaks[0].velocity  // Highest velocity (already sorted)
velocityThreshold = bestVelocity * minVelocityRatio

finalPeaks = []
for peak in peaks:
    if peak.velocity >= velocityThreshold:
        finalPeaks.add(peak)
    // else: discard (too weak compared to best swing)
```

**Why Velocity Ratio Filter?** If the best swing has velocity 100, a "swing" at velocity 30 is likely noise (recovery movement, small adjustment). By requiring at least 1/3 of the best velocity, we keep only significant swings.

### Step 5.7: Filter by Radial Direction

```
minRadialVelocity = 1.0  // px/frame minimum outward motion

// For each peak, calculate radial velocity (outward vs inward motion)
// radialVelocity = dot(velocityVector, directionFromBodyToWrist)
// Positive = extending outward (swing), Negative = retracting (recovery)

for peak in peaks:
    radialVel = velocityData[peak.index].radialVelocity
    
    if radialVel < minRadialVelocity:  // Not enough outward motion
        → Discard (recovery, tangential, or noise)
```

**Why Minimum Radial Velocity?** 
1. **Negative values**: Wrist moving towards body = recovery movement
2. **Near-zero values**: Tangential motion or pose noise, not a real swing
3. **Small positive values**: Might be measurement error, not meaningful extension

By requiring at least 1.0 px/frame of outward motion, we filter out noise and keep only clear extension movements.

### Step 6: Classify Swings

For each detected peak:

```
for peak in peaks:
    // Determine dominant side for this swing
    leftContribution = leftWristVelocity[peak.frame]
    rightContribution = rightWristVelocity[peak.frame]
    
    peak.dominantSide = leftContribution > rightContribution ? "left" : "right"
    peak.symmetry = min(leftContribution, rightContribution) / max(...)
    // High symmetry (>0.7) suggests two-handed shot
```

---

## Output Data Structure

```typescript
interface SwingDetectionResult {
  // All detected swings
  swings: Array<{
    frame: number;
    timestamp: number;         // seconds
    velocity: number;          // combined wrist velocity (px/frame)
    velocityKmh: number;       // estimated real-world speed
    dominantSide: "left" | "right";
    symmetry: number;          // 0-1, high = two-handed
    confidence: number;        // peak prominence
  }>;
  
  // Velocity time-series for graphing
  velocityData: Array<{
    frame: number;
    timestamp: number;
    velocity: number | null;   // null when joint missing
    leftVelocity: number | null;
    rightVelocity: number | null;
  }>;
  
  // Summary stats
  totalSwings: number;
  averageVelocity: number;
  maxVelocity: number;
  
  // Metadata
  framesAnalyzed: number;
  framesWithGaps: number;      // frames where velocity couldn't be calculated
  videoDuration: number;
}
```

---

## Timeline Integration

Detected swings are placed as keyframes in the video timeline:

```typescript
const keyframes = swings.map(swing => ({
  frame: swing.frame,
  timestamp: swing.timestamp,
  type: "swing",
  label: `Swing ${index + 1}`,
  color: swing.dominantSide === "left" ? "#4ECDC4" : "#FF6B6B",
  metadata: {
    velocity: swing.velocityKmh,
    side: swing.dominantSide,
    symmetry: swing.symmetry,
  }
}));
```

---

## Peak Detection Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `minPeakHeight` | 75th percentile | Minimum velocity to be considered a swing |
| `nmsWindowSeconds` | 1.25s | Non-maximum suppression window (±1.25s = 2.5s total) |
| `minPeakDistanceSeconds` | 1.5s | Minimum required gap between consecutive swings |
| `minVelocityRatio` | 0.33 (33%) | Discard swings with velocity < 1/3 of best swing |
| `requireOutwardMotion` | true | Only keep swings with outward wrist motion (extension) |
| `minRadialVelocity` | 1.0 px/frame | Minimum outward velocity to count as a swing |
| `smoothingWindow` | 3 frames | Moving average window size |
| `minConfidence` | 0.3 | Keypoint confidence threshold |

**Non-Maximum Suppression**: If multiple peaks occur within ±1.25s of each other, only the highest peak is kept. This prevents counting the same swing multiple times due to wrist oscillation during the swing motion.

**Minimum Peak Distance (Velocity-Greedy)**: After NMS, swings must be at least 1.5 seconds apart. Unlike chronological selection, we process peaks by velocity (highest first) and keep only those that are ≥1.5s from ALL already-kept peaks. This ensures high-velocity swings are prioritized—a powerful swing won't be discarded just because a weaker motion happened earlier.

---

## Default Protocol

The "Swings" protocol is the **default analysis protocol**. When preprocessing completes:
1. Swing detection runs automatically
2. Contact point detection also runs for additional context
3. Detected swings appear on the timeline with ⚡ icons (yellow markers)
4. Contact point appears with the standard crosshair icon (white marker)

Click any swing marker to seek to that moment in the video.

---

## Use Cases

### Rally Analysis
- Count total shots in a rally
- Identify shot rhythm and timing
- Compare swing speeds across shots

### Practice Sessions
- Track repetition count automatically
- Monitor fatigue (declining velocity over time)
- Identify technique variations

### Match Analysis
- Segment video by shots
- Navigate directly to swing moments
- Build shot-by-shot statistics

---

## Comparison with Serve Protocols

| Aspect | Serve Protocols | Swing Protocol |
|--------|-----------------|----------------|
| **Detects** | Single key moment (trophy, contact, landing) | All swings in video |
| **Velocity** | Single peak analysis | Multi-peak detection |
| **Body reference** | Absolute or relative | Always relative to body center |
| **Wrist tracking** | Dominant hand only | Both wrists combined |
| **Output** | Single frame/timestamp | Array of frames/timestamps |
| **Use case** | Serve technique analysis | Rally/practice analysis |

---

## Edge Cases

### Occluded Wrists
- When both wrists are missing, velocity = null
- When one wrist is missing, only the valid wrist contributes
- Prevents false velocity spikes from joint reappearance

### Walking/Running
- Body center tracking removes translation velocity
- Only rotational/swing motion is captured

### Very Fast Swings
- May span only 2-3 frames at 30fps
- Higher frame rates (60fps+) improve detection accuracy

### Double-Hits
- Two swings very close together may merge into one peak
- `minPeakDistance` can be reduced for edge cases

---

## Implementation Files

| File | Purpose |
|------|---------|
| `hooks/useSwingDetection.ts` | Main detection hook |
| `components/SwingTimeline.tsx` | Timeline visualization |
| `docs/protocols/swing-detection-protocol.md` | This documentation |

---

## Console Output Example

```
🎾 Swing Detection - Analyzing 450 frames (15.0s @ 30fps)
   Body center tracking: 98.2% frames valid
   Left wrist tracking: 94.5% frames valid
   Right wrist tracking: 96.1% frames valid

📊 Velocity Analysis:
   Max velocity: 142.3 px/frame (estimated ~85 km/h)
   Mean velocity: 23.4 px/frame
   75th percentile threshold: 67.2 px/frame

⚡ Detected 7 swings:
   1. Frame 45  (1.50s) - Right-handed, 78.3 km/h
   2. Frame 89  (2.97s) - Right-handed, 82.1 km/h
   3. Frame 134 (4.47s) - Left-handed, 71.2 km/h (backhand)
   4. Frame 178 (5.93s) - Right-handed, 85.4 km/h
   5. Frame 225 (7.50s) - Right-handed, 79.8 km/h
   6. Frame 271 (9.03s) - Both (0.82 symmetry), 68.9 km/h (two-handed)
   7. Frame 312 (10.40s) - Right-handed, 91.2 km/h (fastest)

✅ Keyframes added to timeline
```

