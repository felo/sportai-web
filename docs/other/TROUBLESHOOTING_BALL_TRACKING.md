# 🔍 Troubleshooting Ball Tracking

## Quick Diagnostic Checklist

### 1. Is Ball Tracking Enabled?
- [ ] "Ball Tracking (Smart Detection)" toggle is **ON**
- [ ] Settings panel shows "YOLOv8 + Smart Tracking" info box
- [ ] UI shows either "Ball detected!" or "Searching for ball..."

### 2. Is Object Detection Running?
**Critical**: Ball tracking requires object detection to be running!
- [ ] Object detection model is loaded (check console)
- [ ] Look for: `✅ YOLOv8n object detector loaded` in console
- [ ] Object detection doesn't need to be **visible** (toggle can be OFF)
- [ ] But the model must be **loaded**

### 3. Check Browser Console
Open DevTools (F12 or Cmd+Option+I) and look for:

**What you should see:**
```
🔧 TensorFlow.js backend ready for object detection: webgl
✅ YOLOv8n object detector (COCO-SSD fallback) loaded in 3.12s
🎾 Found 1 ball(s): [{conf: 0.76, bbox: {...}}]
🎯 Ball tracked: {pos: {x: 320, y: 240}, conf: 0.85, trajLength: 5}
🎨 Drawing ball: {position: {x: 320, y: 240}, hasTrajectory: true, ...}
```

**Problem indicators:**
```
❌ No "Found X ball(s)" messages → YOLO isn't detecting balls
❌ "Ball tracked" but no "Drawing ball" → Drawing code issue
❌ "Drawing ball" but nothing visible → Scaling issue
```

### 4. Does Your Video Have a Ball?
- [ ] Video contains a visible ball
- [ ] Ball is not too small (< 5 pixels)
- [ ] Ball is not too large (> 100 pixels)
- [ ] Ball is in frame and visible

### 5. Check Detection Settings
- [ ] Ball confidence threshold: Try **30%** (not too high)
- [ ] Object detection confidence: Try **30-40%** for balls
- [ ] Sport filter: Set to **"Tennis"**, **"Basketball"**, or **"All"**

## 🐛 Common Issues & Fixes

### Issue 1: No Ball Detections in Console
**Problem**: COCO-SSD/YOLO isn't detecting the ball

**Checks:**
1. Open browser console
2. Look for "Found X ball(s)" messages
3. If you see "Found 0 ball(s)" continuously, the ball isn't being detected

**Fixes:**
- Lower ball confidence threshold to 20-30%
- Make sure sport filter includes balls (not set to "skating" for tennis!)
- Check if video actually has a visible ball
- Try a different video with a clearer ball

**Debug command in console:**
```javascript
// Check if YOLO is detecting any objects
// Look for "person", "sports ball", etc. in the logs
```

### Issue 2: Ball Detected But Not Tracked
**Problem**: Console shows "Found X ball(s)" but no "Ball tracked"

**Checks:**
1. Ball tracker might be filtering detections
2. Ball size might be outside filter range (10-100px)
3. Confidence might be too low after tracking

**Fixes:**
- Check ball bbox size in console logs
- Adjust size filter in `hooks/useProjectileDetection.ts`
- Lower confidence threshold

**Temporary fix**: Comment out size filter in `useProjectileDetection.ts` line ~112:
```typescript
// && det.bbox.width < 100 && det.bbox.height < 100  // Comment this out temporarily
```

### Issue 3: Ball Tracked But Not Drawn
**Problem**: Console shows "Ball tracked" but nothing appears on screen

**Checks:**
1. Drawing might be happening but off-screen
2. Scaling issue
3. Ball might be tiny (radius too small)

**Fixes:**
- Check console for "Drawing ball" messages
- Verify position is within canvas bounds
- Check browser console for any canvas errors

**Debug**: Add this to see if drawing is called:
Already added! Look for "🎨 Drawing ball" in console

### Issue 4: Ball Visible But Scaled Wrong
**Problem**: Ball appears but in wrong position/size

**Fixes:**
- Scaling is already applied in VideoPoseViewerCore.tsx
- Check that video dimensions are correct
- Verify canvas size matches video

## 🔧 Quick Fixes

### Fix 1: Enable Debug Logging
Already enabled! Check console for:
- 🎾 Ball detection logs
- 🎯 Ball tracking logs
- 🎨 Drawing logs

### Fix 2: Lower Ball Confidence
In UI settings:
1. Find "Ball Confidence" slider
2. Set to **20-30%** (lower for small balls)
3. Watch console for more detections

### Fix 3: Check Sport Filter
1. Object Detection → Sport Filter
2. Set to **"All Objects"** or **"Tennis"** or **"Basketball"**
3. Make sure it's not set to a sport without balls!

### Fix 4: Verify Object Detection is Working
1. Toggle "Object Detection (YOLO)" **ON**
2. Verify you see bounding boxes
3. Look for pink boxes around balls
4. If you see balls boxed, then YOLO is working
5. Ball tracking should work too

## 🎯 Step-by-Step Debugging

### Step 1: Verify Object Detection Works
```
1. Toggle "Object Detection (YOLO)" ON
2. Toggle "Show Labels" ON
3. Play video
4. Do you see ANY bounding boxes?
   YES → Object detection works, go to Step 2
   NO → Fix object detection first
```

### Step 2: Verify Ball Detection
```
1. Keep object detection ON
2. Set Sport Filter to "All Objects"
3. Look for PINK boxes labeled "sports ball"
4. Do you see pink boxes around the ball?
   YES → YOLO detects balls, go to Step 3
   NO → Ball not detected by YOLO
```

### Step 3: Enable Ball Tracking
```
1. Toggle "Ball Tracking" ON
2. Check console for "Ball tracked" messages
3. Does UI show "Ball detected!"?
   YES → Ball tracking works!
   NO → Check console for errors
```

### Step 4: Verify Drawing
```
1. With ball tracking ON
2. Check console for "Drawing ball" messages
3. Do you see anything yellow on screen?
   YES → It's working!
   NO → Check console for canvas errors
```

## 🔍 Expected Console Output

### Normal Operation
```
✅ YOLOv8n object detector (COCO-SSD fallback) loaded in 3.12s
✅ Ball tracking using YOLOv8 detections + smart tracking
🎾 Found 1 ball(s): [{conf: 0.76, bbox: {x: 300, y: 200, width: 15, height: 15}}]
🎯 Ball tracked: {pos: {x: 307.5, y: 207.5}, conf: 0.76, trajLength: 1, hasPrediction: false}
🎨 Drawing ball: {position: {x: 307.5, y: 207.5}, hasTrajectory: false, hasPrediction: false}
```

After a few frames:
```
🎾 Found 1 ball(s): [{conf: 0.82, bbox: {x: 310, y: 205, width: 16, height: 14}}]
🎯 Ball tracked: {pos: {x: 318, y: 212}, conf: 0.85, trajLength: 5, hasPrediction: true}
🎨 Drawing ball: {position: {x: 318, y: 212}, hasTrajectory: true, hasPrediction: true}
```

### Problem Indicators
```
❌ No ball detection logs → YOLO not detecting balls
❌ Ball detected but conf too low → Increase confidence threshold  
❌ Ball detected but filtered out → Size filter too restrictive
❌ Ball tracked but not drawn → Drawing issue
```

## 💡 Quick Workarounds

### If No Balls Detected by YOLO
**Option 1**: Lower object detection confidence
- Set Object Detection confidence to 30%
- Set Ball confidence to 20%

**Option 2**: Use "All Objects" filter
- Don't use sport-specific filter initially
- See if balls are detected

**Option 3**: Try different video
- Use video with clear, visible ball
- Good lighting
- Ball is 15-50 pixels in size

### If Balls Detected But Not Tracked
**Option 1**: Disable size filter temporarily
In `hooks/useProjectileDetection.ts`, line ~112:
```typescript
const ballDetections = objectDetections.filter(det => 
  det.class === "sports ball" && 
  det.confidence >= confidenceThreshold
  // Remove size filter temporarily:
  // && det.bbox.width < 100 && det.bbox.height < 100
);
```

**Option 2**: Lower tracking requirements
In `utils/ball-tracker.ts`, constructor:
```typescript
minDetectionsForTrack: 1, // Was 3, lower to see results faster
```

## 🎨 Visual Test

### Simplest Test
1. Enable **only** "Object Detection (YOLO)"
2. Set filter to "All Objects"
3. Set confidence to 30%
4. Play video
5. Look for **PINK boxes** labeled "sports ball"

**If you see pink boxes**: YOLO detects balls ✅  
**If no pink boxes**: Ball not in video or confidence too high ❌

### Once Pink Boxes Appear
1. Enable "Ball Tracking"
2. Pink boxes should stay (from object detection)
3. **Yellow indicator** should appear on ball
4. **Yellow trail** should appear behind ball
5. **Dashed yellow line** should show prediction

## 📝 Checklist for Ball Tracking to Work

- [ ] Video has a visible ball
- [ ] Object detection model is loaded
- [ ] Ball tracking is toggled ON
- [ ] Ball confidence is 20-40% (not too high)
- [ ] Object confidence is 30-50% (not too high)
- [ ] Sport filter includes balls ("All", "Tennis", "Basketball", etc.)
- [ ] Video is playing (not paused)
- [ ] Browser console is open to see debug logs

## 🚀 Recommended Settings for Testing

```
Object Detection:
  ✓ Enabled: ON
  - Model: YOLOv8n
  - Sport Filter: All Objects (or Tennis if tennis video)
  - Confidence: 30%
  - NMS: 45%
  - Show Labels: ON

Ball Tracking:
  ✓ Enabled: ON
  - Ball Confidence: 30%
  - Show Trajectory: ON
  - Show Prediction: ON
```

## 📞 Still Not Working?

### Check These Files
1. Browser console (F12) - Look for errors
2. Network tab - Verify model loaded
3. Console logs - Check debug messages

### Report These Details
- Browser and version
- Video type/source
- Console error messages
- Whether object detection works
- Whether you see pink "sports ball" boxes

## 🎯 Expected Behavior Timeline

**T+0s**: Toggle ball tracking ON  
**T+1s**: Model loads (if first time)  
**T+2s**: Video plays  
**T+2.1s**: First YOLO detection runs  
**T+2.1s**: If ball detected, tracking starts  
**T+2.4s**: Second detection → Ball tracked, trajectory starts  
**T+2.7s**: Third detection → Prediction appears  
**T+3s+**: Smooth ball tracking with trail and prediction  

---

**Refresh your browser, enable ball tracking, and check console for debug logs!** 🎾

