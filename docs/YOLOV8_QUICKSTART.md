# 🚀 YOLOv8 Quick Start Guide

## ✅ What's Been Implemented

I've just upgraded your object detection system to support **YOLOv8n**! Here's what's new:

### 1. **YOLOv8 ONNX Integration** ✨
- Automatic YOLOv8 loading with COCO-SSD fallback
- Better accuracy than COCO-SSD
- Smaller model size (6MB vs 25MB)
- Faster inference

### 2. **Sport-Specific Filters** 🎾
- Tennis (person, ball, racket)
- Pickleball (person, ball)
- Basketball (person, ball)
- Baseball (person, ball, bat, glove)
- Skating (person, skateboard)

### 3. **Advanced Controls** 🎛️
- Confidence threshold slider (10-90%)
- NMS IoU threshold slider
- Real-time adjustment

## 🎯 How to Use YOLOv8 (3 Steps)

### Step 1: Export YOLOv8n Model

On your machine (requires Python):

```bash
# Install Ultralytics
pip install ultralytics

# Export YOLOv8n to ONNX
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt').export(format='onnx')"
```

This creates `yolov8n.onnx` (~6MB file)

### Step 2: Place Model File

```bash
# Create models directory
mkdir -p public/models

# Move the exported model
mv yolov8n.onnx public/models/
```

Your structure should be:
```
sportai-web/
├── public/
│   └── models/
│       └── yolov8n.onnx  # ~6MB
```

### Step 3: Test It!

**Refresh your browser** - that's it! The app will:
1. Try to load YOLOv8 from `/models/yolov8n.onnx`
2. If not found, fallback to COCO-SSD automatically
3. Show you which model is loaded in the console

## 🎨 New UI Features

### Sport Filter Dropdown
Filter detections to show only relevant objects for your sport:
- **All Objects** - Detect everything (80 COCO classes)
- **Tennis** - Only person, ball, and racket
- **Pickleball** - Only person and ball
- **Basketball** - Only person and ball
- **Baseball** - Person, ball, bat, and glove
- **Skating** - Person and skateboard

### Confidence Threshold Slider
Adjust detection sensitivity:
- **Low (10-30%)** - More detections, more false positives
- **Medium (40-60%)** - Balanced (recommended)
- **High (70-90%)** - Fewer false positives, may miss objects

### NMS Threshold Slider
Controls duplicate detection removal:
- **Low (10-30%)** - Aggressive duplicate removal
- **Medium (40-60%)** - Balanced (recommended)
- **High (70-90%)** - Keep more overlapping detections

## 📊 What You'll See

### With YOLOv8 (if model is present):
```
✅ YOLOv8n (YOLOv8 ONNX) loaded in 2.34s
📊 Model inputs: ['images']
📊 Model outputs: ['output0']
```

### Without YOLOv8 (fallback to COCO-SSD):
```
⚠️ YOLOv8 model not found, falling back to COCO-SSD
📝 To use YOLOv8, export the model and place it in public/models/yolov8n.onnx
   See docs/EXPORT_YOLOV8.md for instructions
✅ YOLOv8n (COCO-SSD fallback) loaded in 3.12s
```

## 🎯 Testing Checklist

### Immediate Testing (No YOLOv8 Model Yet)
1. ✅ Refresh browser - should work with COCO-SSD
2. ✅ Try sport filters - should filter detections
3. ✅ Adjust confidence slider - should affect detections
4. ✅ Check console for fallback message

### With YOLOv8 Model
1. ✅ Export model (Step 1 above)
2. ✅ Place in `public/models/yolov8n.onnx`
3. ✅ Refresh browser
4. ✅ Check console for YOLOv8 success message
5. ✅ Compare accuracy with COCO-SSD
6. ✅ Test sport filters
7. ✅ Adjust confidence threshold
8. ✅ Adjust NMS threshold

## 🔍 How It Works

### Automatic Model Selection
```typescript
// Try YOLOv8 first
try {
  YOLOv8Detector.load('/models/yolov8n.onnx')
  ✅ Success: Use YOLOv8
} catch {
  ⚠️ Fallback to COCO-SSD
}
```

### Sport Filtering
```typescript
// Example: Tennis filter
classFilter = [0, 32, 38]  // person, sports ball, tennis racket

// YOLOv8 only returns these classes
// COCO-SSD results are filtered after detection
```

### Confidence & NMS
- **Confidence**: Minimum score to consider a detection (0.1-0.9)
- **NMS (IoU)**: Overlap threshold for duplicate removal (0.1-0.9)

## ⚡ Performance Comparison

| Model | Load Time | Inference | Size | Accuracy |
|-------|-----------|-----------|------|----------|
| COCO-SSD | ~3s | ~100ms | 25MB | Good |
| YOLOv8n | ~2s | ~50ms | 6MB | Excellent |

## 🎉 Benefits Summary

### With COCO-SSD (No Setup Required)
- ✅ Works immediately
- ✅ No model export needed
- ✅ Good accuracy
- ⚠️ Larger and slower

### With YOLOv8 (3-Step Setup)
- ✅ Better accuracy
- ✅ Faster inference
- ✅ Smaller model
- ✅ Latest technology
- ⚠️ Requires model export

## 🚀 Next Steps

### Right Now
1. Test current implementation (uses COCO-SSD fallback)
2. Try sport filters and confidence sliders
3. Verify everything works

### When Ready for YOLOv8
1. Export model (Step 1)
2. Place in public/models
3. Refresh and enjoy better detection!

### Future Enhancements
- Custom trained YOLOv8 (sports-specific)
- Model caching improvements
- More sport filters
- Detection statistics

## 📝 Files Changed

- ✅ `utils/yolov8-detector.ts` - YOLOv8 ONNX detector class
- ✅ `hooks/useObjectDetection.ts` - Updated to support both models
- ✅ `types/detection.ts` - Added sport filters and class IDs
- ✅ `components/chat/VideoPoseViewerCore.tsx` - Added UI controls
- ✅ `docs/EXPORT_YOLOV8.md` - Detailed export instructions
- ✅ `docs/YOLOV8_IMPLEMENTATION_GUIDE.md` - Full implementation guide

## 💡 Tips

1. **Start Without YOLOv8**: Test with COCO-SSD first to verify everything works
2. **Export When Ready**: YOLOv8 export takes ~30 seconds
3. **Use Sport Filters**: They dramatically improve relevance
4. **Tune Thresholds**: Start at 50% confidence, adjust as needed
5. **Check Console**: Lots of helpful debug info

## ❓ Need Help?

See detailed guides:
- `docs/EXPORT_YOLOV8.md` - How to export the model
- `docs/YOLOV8_IMPLEMENTATION_GUIDE.md` - Technical details
- Browser console - Real-time debug info

---

**Ready to test? Just refresh your browser!** 🎉

The app will work with COCO-SSD immediately. When you're ready for YOLOv8, just export and place the model file!

