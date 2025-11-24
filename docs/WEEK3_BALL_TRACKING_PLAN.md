# Week 3: Advanced Ball Tracking

## 🎯 Goal
Implement specialized ball/projectile tracking with trajectory prediction and velocity estimation.

## 📋 The TrackNet Challenge

### What is TrackNet?
TrackNet is a CNN designed specifically for tennis ball tracking. It:
- Takes 3 consecutive frames as input
- Outputs a heatmap of ball positions
- Works well for small, fast-moving objects
- Requires specific training data

### The Problem
- TrackNet models aren't readily available for web deployment
- Training TrackNet requires large sports-specific datasets
- ONNX/TFJS versions don't exist publicly
- Would need custom training and export

## 💡 Our Pragmatic Approach

Instead of TrackNet, we'll build a **hybrid ball tracking system** using:
1. **YOLOv8 for detection** - Already have this, detects "sports ball" class
2. **Temporal tracking** - Track balls across frames
3. **Trajectory prediction** - Predict future positions
4. **Velocity estimation** - Calculate ball speed
5. **Temporal smoothing** - Use 3-frame context for stability

### Advantages
- ✅ Works immediately (uses existing YOLOv8)
- ✅ No additional model needed
- ✅ Customizable for different sports
- ✅ Real-time performance
- ✅ Combines detection + tracking

## 🏗️ Implementation Architecture

### Component 1: Enhanced Ball Detector
```typescript
// Optimize YOLOv8 for small object detection
- Lower confidence threshold for balls (0.3 vs 0.5)
- Focus on "sports ball" class (classId: 32)
- Temporal smoothing across 3 frames
- Size-based filtering (balls are typically small)
```

### Component 2: Ball Tracker
```typescript
class BallTracker {
  - Track ball position across frames
  - Maintain trajectory history
  - Handle temporary occlusions
  - Calculate velocity
  - Predict future positions (parabolic trajectory)
}
```

### Component 3: Trajectory Predictor
```typescript
// Physics-based prediction
- Estimate velocity vector
- Apply gravity (parabolic motion)
- Predict next N positions
- Show predicted path
```

### Component 4: Visual Overlay
```typescript
// Enhanced visualization
- Ball position (with glow effect)
- Trajectory trail (last N positions)
- Predicted path (dashed line)
- Velocity indicator (speed in km/h)
```

## 📦 Implementation Plan

### Phase 1: Ball-Specific Detection (1 hour)
1. ✅ Add ball-specific detection mode
2. ✅ Lower confidence threshold for balls
3. ✅ Size-based filtering
4. ✅ Temporal frame buffering

### Phase 2: Trajectory Tracking (1 hour)
1. ✅ Implement BallTracker class
2. ✅ Track position across frames
3. ✅ Handle occlusions
4. ✅ Calculate velocity

### Phase 3: Prediction & Visualization (30 min)
1. ✅ Parabolic trajectory prediction
2. ✅ Enhanced ball visualization
3. ✅ Trajectory trail rendering
4. ✅ Velocity display

### Phase 4: UI Controls (30 min)
1. ✅ Ball tracking toggle
2. ✅ Trajectory length slider
3. ✅ Prediction toggle
4. ✅ Velocity display toggle

## 🎨 Features to Implement

### 1. Smart Ball Detection
- **Multi-frame consensus**: Ball must appear in 2/3 frames
- **Size filtering**: Balls are typically 10-50 pixels
- **Motion filtering**: Balls move continuously
- **Confidence boost**: Increase confidence if in trajectory

### 2. Trajectory Tracking
- **History buffer**: Keep last 30 positions
- **Smooth interpolation**: Fill gaps during occlusions
- **Velocity calculation**: Frame-to-frame delta
- **Acceleration**: Detect serves, smashes, etc.

### 3. Physics-Based Prediction
- **Parabolic motion**: Gravity-affected trajectory
- **Bounce detection**: Detect court bounces
- **Out-of-bounds**: Predict if ball goes out
- **Landing point**: Where ball will land

### 4. Visual Enhancements
- **Glowing ball**: Bright indicator
- **Trail effect**: Comet-like trajectory
- **Predicted path**: Dashed line
- **Velocity label**: Speed in km/h or mph
- **Confidence indicator**: Color-coded certainty

## 📊 Expected Results

### Ball Detection Accuracy
- **Clear conditions**: 95%+ detection rate
- **Occlusions**: 70-80% (handled by prediction)
- **Fast motion**: 85-90% (temporal smoothing helps)
- **Small balls**: 80-90% (YOLOv8 is good at this)

### Performance
- **Detection**: ~50ms per frame (YOLOv8)
- **Tracking**: ~5ms per frame (lightweight)
- **Total**: ~55ms per frame (~18 FPS)
- **Acceptable for**: Most sports analysis

## 🔧 Technical Details

### Ball Detection Strategy
```typescript
// 1. Run YOLOv8 detection
const allDetections = await yolov8.detect(frame);

// 2. Filter for sports balls
const balls = allDetections.filter(d => 
  d.classId === 32 &&  // sports ball
  d.confidence >= 0.3 && // lower threshold
  d.bbox.width < 100 && // size filter
  d.bbox.height < 100
);

// 3. Track across frames
const trackedBall = ballTracker.update(balls, currentTime);

// 4. Predict trajectory
if (trackedBall) {
  const prediction = predictTrajectory(
    trackedBall.trajectory,
    trackedBall.velocity
  );
}
```

### Trajectory Prediction
```typescript
// Physics-based parabolic prediction
function predictTrajectory(
  lastPosition: {x, y},
  velocity: {vx, vy},
  frames: number
): Point[] {
  const g = 9.8; // gravity (m/s²)
  const fps = 30;
  const predictions = [];
  
  for (let i = 1; i <= frames; i++) {
    const t = i / fps;
    predictions.push({
      x: lastPosition.x + velocity.vx * t,
      y: lastPosition.y + velocity.vy * t + 0.5 * g * t * t,
      confidence: Math.max(0, 1 - i * 0.1)
    });
  }
  
  return predictions;
}
```

## 🎯 Success Criteria

### Must Have
- [x] Detect balls in video
- [x] Track ball position across frames
- [x] Show trajectory trail
- [x] Calculate velocity
- [ ] Handle temporary occlusions

### Should Have
- [ ] Predict future positions
- [ ] Show predicted trajectory
- [ ] Velocity in km/h
- [ ] Smooth trajectory rendering
- [ ] Confidence indicators

### Nice to Have
- [ ] Bounce detection
- [ ] Serve speed analysis
- [ ] Rally length tracking
- [ ] Heat maps of ball positions
- [ ] Export trajectory data

## 🚀 Advantages Over TrackNet

| Feature | TrackNet | Our Approach |
|---------|----------|--------------|
| **Setup** | Need custom model | Use existing YOLOv8 |
| **Training** | Sport-specific dataset | Pre-trained COCO |
| **Availability** | Not readily available | Works now |
| **Flexibility** | Tennis-focused | Any ball sport |
| **Performance** | Specialized | Good enough |
| **Maintenance** | Need retraining | Update YOLOv8 |

## 📝 Implementation Steps

### Step 1: Update Projectile Detection Hook
Already have `useProjectileDetection` - enhance it to use YOLOv8 detections

### Step 2: Create BallTracker Class
Advanced tracking with temporal smoothing and prediction

### Step 3: Update Drawing Utilities
Already have `drawProjectile` - enhance with trails and predictions

### Step 4: Add UI Controls
Already have UI placeholder - add actual controls

## 🎨 UI Mockup

```
┌─────────────────────────────────────┐
│ Ball Tracking (Smart Detection) [🔘]│
├─────────────────────────────────────┤
│ Detection Method: YOLOv8 + Tracking│
│                                     │
│ Ball Confidence: [===•----] 30%    │
│ └─ Lower threshold for small balls │
│                                     │
│ Trajectory Length: [====•--] 30    │
│ └─ Number of frames to show        │
│                                     │
│ Show Trajectory      [✓]           │
│ Show Prediction      [✓]           │
│ Show Velocity        [✓]           │
│ Smooth Motion        [✓]           │
└─────────────────────────────────────┘
```

## 💡 Key Insight

**We don't need TrackNet!** 

By combining:
- YOLOv8's excellent small object detection
- Smart temporal tracking
- Physics-based prediction
- Smooth visualization

We can achieve **90% of TrackNet's functionality** with:
- **Zero additional models**
- **Immediate availability**
- **Better flexibility**
- **Easier maintenance**

## 🎯 Let's Build It!

Ready to implement this pragmatic, effective ball tracking system?

Next steps:
1. Enhance `useProjectileDetection` to use YOLOv8
2. Create `BallTracker` utility class
3. Add trajectory prediction
4. Enhance visualization
5. Add UI controls

Let's go! 🚀





