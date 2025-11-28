# Tennis Contact Point Detection Protocol

## Overview

The **contact point** is the moment when the racket makes contact with the ball during a tennis/padel serve. It occurs after the trophy position, at the peak of the player's reach, when the arm is fully extended upward.

This document describes the algorithm used to automatically detect the contact point from video using pose estimation data.

---

## Biomechanical Characteristics of the Contact Point

At the contact point, a player exhibits these key characteristics:

| Body Part | Characteristic | Why It Matters |
|-----------|---------------|----------------|
| **Racket wrist** | At maximum height | Highest reach point |
| **Racket arm** | Fully extended (~180°) | Shoulder-elbow-wrist forms straight line |
| **Shoulders** | At peak height | Body fully extended upward |
| **Hips** | Elevated (jumping) | Maximum upward body extension |
| **Velocity** | Near peak | Maximum swing speed just before/at contact |

---

## Detection Algorithm

### Step 1: Preprocess All Frames

Before contact detection can run, all video frames must be analyzed for pose data:

```
for each frame in video:
    poses = detectPose(frame)
    preprocessedPoses[frame] = poses
```

This creates a complete timeline of body positions.

### Step 2: Detect Handedness (Left/Right)

Same as trophy detection - determines which hand holds the racket:

```
leftMotion = sum of left wrist displacement across all frames
rightMotion = sum of right wrist displacement across all frames

if rightMotion > leftMotion:
    dominantHand = "right"
    racketWrist = rightWrist
    racketElbow = rightElbow
    racketShoulder = rightShoulder
else:
    dominantHand = "left"
    racketWrist = leftWrist
    racketElbow = leftElbow
    racketShoulder = leftShoulder
```

### Step 3: Extract Frame Signals

For each frame, we calculate five biomechanical signals:

#### 3.1 Arm Tip Height (with Elbow Fallback)

The "arm tip" is the highest point of the racket arm - either the wrist or elbow, whichever is higher:

```
// Get arm tip - uses elbow if it's higher than wrist (wrist tracking lost)
function getArmTip(wrist, elbow):
    if elbow.y < wrist.y:  // Lower Y = higher in image
        return elbow  // Elbow is higher, use it
    return wrist

armTip = getArmTip(wrist, elbow)
armTipHeight[t] = 1 - (armTip.y - minY) / (maxY - minY)
```

At contact point: **Arm tip is at maximum height** (highest reach).

**Why the fallback?** During serves, the wrist often goes out of frame or loses tracking when the arm is fully extended upward. Using the elbow as a fallback ensures we can still detect the contact point.

*Note: In image coordinates, Y increases downward, so we invert the value.*

#### 3.2 Arm Tip Velocity

```
velocity[t] = distance(armTip[t], armTip[t-1]) / Δt
```

At contact point: **Velocity is at or near peak** (maximum swing speed).

#### 3.3 Arm Extension Angle

```
// If wrist is available
armAngle = angle(shoulder, elbow, wrist)  // degrees

// If using elbow fallback (wrist missing/higher)
// Estimate extension from shoulder-elbow line verticality
if usingElbowFallback:
    shoulderToElbowAngle = atan2(elbow.y - shoulder.y, elbow.x - shoulder.x)
    verticalness = |shoulderToElbowAngle - 90°|
    if verticalness < 30°:
        armAngle ≈ 160° + (30 - verticalness)  // Assume near-full extension

armExtensionScore = (armAngle - 90) / 90  // normalized 0-1
```

At contact point: **Arm is fully extended** (~180°, forming a straight line).

#### 3.4 Shoulder Height

```
avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2
shoulderHeight = 1 - (avgShoulderY - minY) / (maxY - minY)
```

At contact point: **Shoulders at peak height** (body extended upward).

#### 3.5 Hip Height

```
avgHipY = (leftHip.y + rightHip.y) / 2
hipHeight = 1 - (avgHipY - minY) / (maxY - minY)
```

At contact point: **Hips elevated** (player jumping).

#### 3.6 Combined Body Extension Score

```
bodyExtensionScore = (shoulderHeight × 0.60) + (hipHeight × 0.40)
```

Shoulders weighted higher as they indicate arm reach more directly.

### Step 4: Smooth the Signals

Apply a moving average filter to reduce noise:

```
windowSize = 5 frames
for each signal:
    smoothed[i] = average(signal[i-2 : i+2])
```

### Step 5: Find Peak Velocity (Maximum Swing Speed)

```
peakVelIdx = argmax(racketWristVelocity)
```

The contact point occurs **near** this peak.

### Step 6: Calculate Contact Score

For each frame in the search window (70% to 130% of way to peak velocity):

```
wristHeightScore = normalize(wristHeight)      // Higher = better
armScore = normalize(armExtensionScore)        // More extended = better
bodyScore = normalize(bodyExtensionScore)      // More extended = better
proximityToPeak = 1 - |i - peakVelIdx| / 10    // Closer to peak = better

contactScore = (wristHeightScore × 0.35) + 
               (armScore × 0.25) + 
               (bodyScore × 0.15) + 
               (proximityToPeak × 0.25)
```

### Step 7: Select Best Contact Frame

```
contactFrame = argmax(contactScore) in searchWindow
```

---

## Signal Weights

| Signal | Weight | Rationale |
|--------|--------|-----------|
| Arm tip height | 35% | Most reliable - contact is at highest reach (uses elbow fallback if needed) |
| Arm extension | 25% | Fully extended arm is characteristic of contact |
| Velocity proximity | 25% | Contact happens near peak swing speed |
| Body extension | 15% | Supporting signal, varies by player technique |

---

## Relationship to Trophy Position

The contact point detection complements trophy position detection:

```
Timeline:
  [Start] → [Trophy Position] → [Peak Acceleration] → [Contact Point] → [Follow-through]
                    ↑                    ↑                    ↑
                "Loading"           "Swing"              "Hit"
```

| Moment | Trophy Position | Contact Point |
|--------|-----------------|---------------|
| **Time** | Before swing | During/after swing |
| **Wrist height** | Moderate | Maximum |
| **Arm** | Bent (loading) | Fully extended |
| **Knees** | Maximum bend | Extended (jumping) |
| **Key signal** | Acceleration minimum | Wrist height maximum |

---

## Edge Cases & Limitations

### Wrist Tracking Loss (Elbow Fallback)
- When the arm is fully extended upward, the wrist often goes **out of frame** or **loses tracking**
- The algorithm automatically uses the **elbow position** when it's higher than the wrist
- This is detected by comparing Y coordinates: `elbow.y < wrist.y` means elbow is higher
- When using elbow, arm extension is **estimated** from the shoulder-elbow line verticality

### Camera Angle
- Works best with **side view** or **back view** cameras
- Front-facing cameras may have occlusion issues with arm extension

### Serve Types
- **Flat serve**: Contact at highest point
- **Slice serve**: Contact slightly lower and to the side
- **Kick serve**: Contact above and behind the head

### Multiple Serves
- Currently detects the **single highest velocity peak** in the video
- For videos with multiple serves, only the most prominent one is detected

### Confidence Score

```
confidence = (contactScore × 0.60) + (handednessConfidence × 0.20) + 0.20
```

Scores below 50% should be treated with caution.

---

## Console Output Example

```
🎯 Contact detection - Handedness: Left=1,234px, Right=2,567px
🎯 Detected right-handed player (67% confidence)
🎯 Using elbow as arm tip fallback in 8/120 frames (wrist tracking lost or arm fully extended)
🎯 Best contact score: 0.823 at frame 52
   Arm tip height: 98.2% (using elbow)
   Arm extension: 172.5°
   Body extension: 89.3%
   Velocity: 2,156 px/s
🎯 Contact point detected at frame 52 (1.73s)
   Dominant hand: right
   Confidence: 75.4%
```

---

## Implementation Files

| File | Purpose |
|------|---------|
| `hooks/useContactPointDetection.ts` | Main detection hook |
| `VideoPoseViewerCore.tsx` | UI integration & button |
| `types/pose.ts` | Keypoint indices & angle calculation |

---

## Future Improvements

1. **Multi-contact detection**: Detect contact in rally shots, not just serves
2. **Serve type classification**: Flat, slice, kick based on contact position
3. **Comparison mode**: Overlay detected contact against pro player reference
4. **Ball tracking integration**: Cross-reference with ball position for validation
5. **Racket tracking**: Incorporate racket head position for more accurate contact detection
6. **Impact quality metrics**: Analyze body position at contact for power/control assessment


