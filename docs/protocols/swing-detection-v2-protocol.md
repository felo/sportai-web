# Swing Detection V2 Protocol (Acceleration-Based)

## Overview

V2 uses **acceleration peaks with prominence detection** instead of velocity peaks. This is a simpler, more robust approach that finds clear "spikes" in wrist acceleration.

## Why V2?

| V1 (Velocity) | V2 (Acceleration) |
|---------------|-------------------|
| Peaks can stay elevated during follow-through | Sharp, distinct peaks at swing initiation |
| Requires multiple filters (ratio, direction, NMS) | Simpler: just prominence + distance |
| Good for detailed analysis | Good for quick swing counting |

## Algorithm

### Step 1: Calculate Wrist Acceleration

```
For each frame:
  velocity[t] = |wristPosition[t] - wristPosition[t-1]| (relative to body center)
  acceleration[t] = |velocity[t] - velocity[t-1]|
```

### Step 2: Smooth Data

```
smoothedAcceleration = movingAverage(acceleration, windowSize=3)
```

### Step 3: Find Peaks with Prominence

Prominence measures how much a peak "stands out" from its surroundings:

```
For each local maximum:
  leftValley = min value between this peak and previous peak
  rightValley = min value between this peak and next peak
  baseline = max(leftValley, rightValley)
  prominence = peakValue / baseline
```

A prominence of 2.0x means the peak is twice as high as the surrounding valleys.

### Step 4: Filter by Prominence & Distance

```
minProminenceRatio = 1.3  // Peak must be 1.3x higher than local baseline
minDistance = 1.5 seconds

// Greedy selection by value (highest first)
for peak in peaks.sortBy(value, descending):
    if peak.prominence >= minProminenceRatio:
        if isFarEnoughFromKeptPeaks(peak, minDistance):
            keep(peak)
```

### Step 5: Filter by Direction (Recovery Filter)

V2 now includes direction filtering to distinguish forward swings from backward recovery movements:

```
For each peak:
  radialVelocity = frameData[peak.index].radialVelocity
  
  // Radial velocity: positive = outward (swing), negative = inward (recovery)
  if radialVelocity < minRadialVelocity (0.5 px/frame):
    → Discard (likely recovery movement)
```

**Why?** Acceleration is the same whether moving forward or backward. Without direction filtering, both:
- Forward swing: arm extends outward → HIGH acceleration ✓
- Backward recovery: arm retracts inward → HIGH acceleration ✗

The radial velocity filter keeps only peaks where the wrist is moving **away** from the body center.

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `minPeakDistanceSeconds` | 1.5s | Minimum time between swings |
| `minProminenceRatio` | 1.3x | Peak must be this many times higher than local baseline |
| `minConfidence` | 0.2 | Keypoint confidence threshold |
| `smoothingWindow` | 3 frames | Moving average window |
| `requireOutwardMotion` | true | Filter out recovery movements (inward motion) |
| `minRadialVelocity` | 0.5 px/frame | Minimum outward velocity to count as swing |

## Output

```typescript
interface DetectedSwingV2 {
  frame: number;
  timestamp: number;
  acceleration: number;     // Peak acceleration (px/frame²)
  velocity: number;         // Velocity at peak
  prominence: number;       // How much peak stands out (e.g., 2.5x)
  confidence: number;       // 0-1, derived from prominence
}
```

## When to Use V2 vs V1

**Use V2 when:**
- You want quick, reliable swing counting
- The video has clear, distinct swings
- You don't need velocity/direction analysis

**Use V1 when:**
- You need velocity estimates (km/h)
- You want to filter by swing direction (forehand vs backhand)
- You need detailed per-swing analysis

## Visual Difference

In the UI:
- **V1 swings**: Yellow markers (⚡)
- **V2 swings**: Orange markers (⚡)

## Example

Given acceleration data with peaks at frames 117, 156, 210:

```
Frame 117: accel = 38, prominence = 2.8x → KEPT
Frame 156: accel = 35, prominence = 2.1x → KEPT  
Frame 210: accel = 45, prominence = 3.2x → KEPT

Result: 3 swings detected
```

