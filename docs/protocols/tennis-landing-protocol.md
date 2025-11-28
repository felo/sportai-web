# Tennis Jump Analysis Protocol

## Overview

This protocol detects three key phases of a jump during a tennis/padel serve:

1. **Takeoff** - When feet leave the ground
2. **Peak Jump** - Highest point of the jump
3. **Landing** - When feet return to the ground

---

## Simplified Algorithm

The algorithm uses a simple Y-position extrema approach:

```
Y Position Over Time:

    Ground ────────╮                    ╭────────── Ground
                   │                    │
                   │        Peak        │
                   ╰───────╮   ╭───────╯
                           │   │
                           ╰───╯
                             ▲
                         (min Y = highest jump)
                   
    ◀── Takeoff      Landing ──▶
    (last ground     (first ground
     before dip)      after dip)
```

### Step 1: Extract Y Positions

For each frame, extract the Y position of the player's body:

```
if ankle data available (confidence > 0.2):
    primaryY = max(leftAnkle.y, rightAnkle.y)  // Lowest ankle = closest to ground
    ySource = "ankle"
else if hip data available:
    primaryY = max(leftHip.y, rightHip.y)      // Fall back to hip
    ySource = "hip"
else:
    skip frame
```

**Key improvement**: Uses hip as fallback when ankles aren't visible, making detection more robust.

### Step 2: Find Peak Jump

```
peakIdx = argmin(primaryY)  // Lowest Y = highest position in frame
```

### Step 3: Determine Ground Level

```
groundLevel = max(startY, endY)  // Highest Y at start or end of video
```

### Step 4: Find Takeoff

Walk backward from peak, find last frame at ground level:

```
groundThreshold = groundLevel * 0.95  // Within 5% of ground

for i = peak down to 0:
    if primaryY[i] >= groundThreshold:
        takeoffIdx = i
        break
```

### Step 5: Find Landing

Walk forward from peak, find first frame returning to ground level:

```
for i = peak up to end:
    if primaryY[i] >= groundThreshold:
        landingIdx = i
        break
```

---

## Key Metrics

| Metric | Calculation |
|--------|-------------|
| **Jump Height** | `(groundLevel - minY) / groundLevel` (normalized 0-1) |
| **Air Time** | `landingTimestamp - takeoffTimestamp` (seconds) |
| **Landing Foot** | Compare left vs right ankle Y at landing frame |

---

## Data Sources

The algorithm uses two data sources in priority order:

1. **Ankles (preferred)** - More accurate for ground contact detection
2. **Hips (fallback)** - Used when ankles aren't visible (e.g., cut off at frame edge)

This hybrid approach ensures detection works even when lower body is partially occluded.

---

## Confidence Score

```
confidence = 0.3 +                           // Base
             (ankleRatio × 0.4) +            // More ankle data = more confident
             (min(1, jumpHeight × 5) × 0.3)  // Bigger jump = more confident
```

---

## Console Output Example

```
🦶 Extracted 120 frames: 85 with ankles, 35 with hip fallback
🦘 Peak at frame 55, Y=180
   Ground level: 450px
   Jump height: 270px (60.0%)
🚀 Takeoff at frame 42 (Y=445)
🦶 Landing at frame 68 (Y=448)

🎾 Jump Analysis Complete:
   🚀 Takeoff: frame 42 (1.40s)
   🦘 Peak jump: frame 55 (1.83s)
   🦶 Landing: frame 68 (2.27s) - right foot
   📏 Jump height: 60.0%
   ⏱️ Air time: 867ms
   📊 Confidence: 78.5%
   📡 Data source: 85 ankle frames, 35 hip fallback frames
```

---

## UI Features

The detection result shows three navigation buttons:

| Button | Action |
|--------|--------|
| 🚀 | Jump to takeoff frame |
| 🦘 | Jump to peak jump frame |
| 🦶 | Jump to landing frame |

---

## Advantages Over Previous Algorithm

| Aspect | Previous | New |
|--------|----------|-----|
| **Complexity** | 4 weighted signals | 1 signal (Y position) |
| **Fallback** | None (required ankles) | Hip fallback |
| **Confidence threshold** | 0.3 | 0.2 (more lenient) |
| **Minimum frames** | 10+ ankle frames | 5 total frames |
| **Detects** | Landing only | Takeoff + Peak + Landing |
| **Metrics** | Jump height, confidence | + Air time |

---

## Implementation Files

| File | Purpose |
|------|---------|
| `hooks/useLandingDetection.ts` | Main detection hook |
| `VideoPoseViewerCore.tsx` | UI integration & buttons |

---

## Future Improvements

1. **Landing quality score** - Assess balance and control on landing
2. **Heel vs toe landing** - Use BlazePose feet landmarks (indices 29-32)
3. **Injury risk assessment** - Identify hard or unbalanced landings
4. **Split-step detection** - Detect ready position after landing
5. **Recovery time analysis** - Measure time from landing to next movement
