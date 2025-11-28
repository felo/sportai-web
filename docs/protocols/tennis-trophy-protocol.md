# Tennis Trophy Position Detection Protocol

## Overview

The **trophy position** (also called the "loading position" or "power position") is a critical checkpoint in the tennis/padel serve. It's the brief pause at the top of the backswing where the player's body is fully loaded before the explosive forward swing.

This document describes the algorithm used to automatically detect the trophy position from video using pose estimation data.

---

## Biomechanical Characteristics of the Trophy Position

At the trophy position, a player exhibits these key characteristics:

| Body Part | Characteristic | Why It Matters |
|-----------|---------------|----------------|
| **Both arms** | Pointing upward | Both wrists above shoulders - iconic trophy pose |
| **Racket arm** | Paused at highest point | Minimum acceleration before explosive swing |
| **Toss arm** | At maximum height | Ball has just been released |
| **Knees** | Maximum bend, close together | Legs loaded for upward push |
| **Ankles/Feet** | Together and stable | Planted stance, minimal motion (pinpoint stance) |

---

## Detection Algorithm

### Step 1: Preprocess All Frames

Before trophy detection can run, all video frames must be analyzed for pose data:

```
for each frame in video:
    poses = detectPose(frame)
    preprocessedPoses[frame] = poses
```

This creates a complete timeline of body positions.

### Step 2: Detect Handedness (Left/Right)

The algorithm automatically determines which hand holds the racket by comparing total wrist motion:

```
leftMotion = sum of left wrist displacement across all frames
rightMotion = sum of right wrist displacement across all frames

if rightMotion > leftMotion:
    dominantHand = "right"  // Right-handed player
    racketWrist = rightWrist
    tossWrist = leftWrist
else:
    dominantHand = "left"   // Left-handed player
    racketWrist = leftWrist
    tossWrist = rightWrist
```

**Rationale**: The racket hand moves significantly more during the serve swing than the toss hand.

### Step 3: Extract Frame Signals

For each frame, we calculate five biomechanical signals:

#### 3.1 Racket Wrist Acceleration

```
velocity[t] = distance(wrist[t], wrist[t-1]) / Δt
acceleration[t] = (velocity[t] - velocity[t-1]) / Δt
```

At trophy position: **Acceleration is at a local minimum** (the "pause" before the swing).

#### 3.2 Toss Wrist Height

```
tossHeight[t] = 1 - (tossWrist.y - minY) / (maxY - minY)
```

At trophy position: **Toss hand is at maximum height** (highest point of ball release).

*Note: In image coordinates, Y increases downward, so we invert the value.*

#### 3.3 Knee Bend

```
kneeAngle = angle(hip, knee, ankle)  // degrees
kneeBend = 180 - kneeAngle           // higher = more bent
avgKneeBend = (leftKneeBend + rightKneeBend) / 2
```

At trophy position: **Knees are maximally bent** (legs loaded for the jump).

#### 3.4 Ankle Distance (Feet Together)

```
ankleDistance = distance(leftAnkle, rightAnkle)
distanceScore = 1 - (ankleDistance - minDist) / (maxDist - minDist)
```

At trophy position: **Feet are close together** (pinpoint stance) or at least stationary.

#### 3.5 Ankle Stability (Feet Stable)

```
leftMotion = distance(leftAnkle[t], leftAnkle[t-1]) / Δt
rightMotion = distance(rightAnkle[t], rightAnkle[t-1]) / Δt
avgMotion = (leftMotion + rightMotion) / 2

ankleStability = 1 - (avgMotion / maxMotion)
```

At trophy position: **Minimal foot movement** (planted stance).

#### 3.6 Knee Distance

```
kneeDistance = distance(leftKnee, rightKnee)
kneeProximityScore = 1 - normalize(kneeDistance)  // closer = higher score
```

At trophy position: **Knees are close together** (pinpoint stance).

#### 3.7 Combined Legs Together Score

```
ankleProximityScore = 1 - normalize(ankleDistance)   // closer ankles = higher
kneeProximityScore = 1 - normalize(kneeDistance)     // closer knees = higher

legsTogetherScore = (ankleStability × 0.40) + 
                    (ankleProximityScore × 0.35) + 
                    (kneeProximityScore × 0.25)
```

This combines:
- **Ankle stability (40%)** - feet planted and not moving
- **Ankle proximity (35%)** - feet close together (pinpoint stance)
- **Knee proximity (25%)** - knees close together

Some players use a platform stance (feet apart but stable), so stability is weighted highest.

#### 3.7 Both Arms Up Score

```
leftArmUp = (leftShoulder.y - leftWrist.y) > 0   // Lower Y = higher in image
rightArmUp = (rightShoulder.y - rightWrist.y) > 0

if bothArmsUp:
    // Calculate how far above shoulder each arm is
    leftScore = min(1, leftArmUpAmount / torsoLength)
    rightScore = min(1, rightArmUpAmount / torsoLength)
    bothArmsUpScore = (leftScore + rightScore) / 2
elif oneArmUp:
    bothArmsUpScore = 0.3  // Partial credit
else:
    bothArmsUpScore = 0
```

At trophy position: **Both wrists above shoulders** (the classic "trophy" silhouette with both arms elevated).

### Step 4: Smooth the Signals

Apply a moving average filter to reduce noise:

```
windowSize = 5 frames
for each signal:
    smoothed[i] = average(signal[i-2 : i+2])
```

### Step 5: Find Peak Acceleration (Swing Moment)

```
peakIdx = argmax(racketWristAcceleration)
```

The trophy position must occur **before** this peak.

### Step 6: Calculate Trophy Score

For each frame in the search window (20% to 85% of way to peak):

```
accScore = 1 - normalize(acceleration)     // Lower acceleration = higher score
heightScore = normalize(tossWristHeight)   // Higher toss = higher score
kneeBendScore = normalize(avgKneeBend)     // More bend = higher score
armsUpScore = normalize(bothArmsUpScore)   // Both arms up = higher score
feetScore = feetTogetherScore              // Already normalized 0-1

trophyScore = (accScore × 0.25) + 
              (heightScore × 0.20) + 
              (kneeBendScore × 0.20) + 
              (armsUpScore × 0.20) + 
              (feetScore × 0.15)
```

### Step 7: Select Best Trophy Frame

```
trophyFrame = argmax(trophyScore) in searchWindow
```

---

## Signal Weights

| Signal | Weight | Rationale |
|--------|--------|-----------|
| Racket acceleration | 25% | Most reliable indicator - the "pause" is distinctive |
| Both arms up | 20% | Classic trophy silhouette with both arms elevated |
| Toss wrist height | 20% | Ball toss timing is highly consistent |
| Knee bend | 20% | Loading phase is visually clear |
| Legs together | 15% | Ankles + knees close (pinpoint stance), varies by player style |

---

## Edge Cases & Limitations

### Camera Angle
- Works best with **side view** or **back view** cameras
- Front-facing cameras may have occlusion issues

### Stance Styles
- **Pinpoint stance**: Feet come together (high distance score)
- **Platform stance**: Feet stay apart but stable (relies more on stability score)

### Multiple Serves
- Currently detects the **single highest peak** in the video
- For videos with multiple serves, only the most prominent one is detected

### Confidence Score

```
confidence = (trophyScore × 0.60) + (handednessConfidence × 0.20) + 0.20
```

Scores below 50% should be treated with caution.

---

## Console Output Example

```
🎾 Handedness analysis: Left=1,234px, Right=2,567px
🎾 Detected right-handed player (67% confidence)
🏆 Best trophy score: 0.847 at frame 45
   Both arms up: 92.1% (L:↑ R:↑)
   Knee bend: 42.3°
   Toss height: 94.2%
   Legs together: 87.5% (ankles: 45px, knees: 38px)
   Acceleration: 156 px/s²
🏆 Trophy position detected at frame 45 (1.50s)
   Dominant hand: right
   Confidence: 78.2%
```

---

## Implementation Files

| File | Purpose |
|------|---------|
| `hooks/useTrophyDetection.ts` | Main detection hook |
| `VideoPoseViewerCore.tsx` | UI integration & button |
| `types/pose.ts` | Keypoint indices & angle calculation |

---

## Future Improvements

1. **Multi-serve detection**: Detect multiple trophy positions in longer videos
2. **Serve type classification**: Flat, slice, kick based on trophy position variations
3. **Comparison mode**: Overlay detected trophy against pro player reference
4. **3D analysis**: Use BlazePose 3D keypoints for more accurate depth estimation
5. **Contact point detection**: Find the ball contact moment using similar acceleration analysis

