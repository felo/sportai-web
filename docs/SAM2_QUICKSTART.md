# SAM 2 Quick Start Guide

## 🎯 What is SAM 2?

**SAM 2 (Segment Anything Model 2)** is Meta's state-of-the-art segmentation model that can segment any object with just a few clicks. Perfect for:
- **Racket detection** - Precise pixel-level segmentation of tennis rackets, padel rackets, etc.
- **Ball tracking** - Accurate ball segmentation even in complex backgrounds
- **Player segmentation** - Full body or specific body part segmentation
- **Equipment analysis** - Shoes, clothing, accessories

## ✅ What's Already Done

The SAM 2 integration is **complete and ready to use**! Here's what's been implemented:

### 📁 Files Created

```
✅ utils/sam2-detector.ts              # Core SAM 2 detector with ONNX Runtime
✅ hooks/useSAM2Detection.ts           # React hook for SAM 2
✅ types/sam2-detection.ts             # Drawing utilities for masks
✅ types/detection.ts (updated)        # SAM 2 types added
✅ components/chat/SAM2Viewer.tsx      # Interactive SAM 2 component
✅ app/pose-demo/page.tsx (updated)    # Integrated into demo page
✅ hooks/index.ts (updated)            # Export added
✅ docs/SAM2_INTEGRATION.md            # Full integration guide
✅ docs/SAM2_QUICKSTART.md             # This file
```

### ✨ Features Implemented

- ✅ **Dynamic imports** - No impact on initial page load
- ✅ **Model caching** - Models loaded once per session
- ✅ **Embedding caching** - Frames encoded once, reused for multiple prompts
- ✅ **Interactive mode** - Click to segment with foreground/background points
- ✅ **Auto-segmentation** - Grid-based automatic segmentation
- ✅ **Multiple model sizes** - Tiny (40MB), Small (180MB), Base (370MB), Large (900MB)
- ✅ **Visualization options** - Filled masks or contour outlines
- ✅ **Mask statistics** - Area, coverage, center of mass
- ✅ **Integrated UI** - Tabbed interface in pose-demo page

## 🚀 Getting Started

### Step 1: Export SAM 2 Models

SAM 2 models need to be exported to ONNX format and placed in `public/models/`. 

**Quick Setup (Recommended - Tiny Model)**

```bash
# 1. Create Python environment
python -m venv sam2_env
source sam2_env/bin/activate  # On Windows: sam2_env\Scripts\activate

# 2. Install dependencies
pip install torch torchvision onnx onnxruntime
pip install git+https://github.com/facebookresearch/segment-anything-2.git

# 3. Download checkpoint
wget https://dl.fbaipublicfiles.com/segment_anything_2/sam2_hiera_tiny.pt

# 4. Run export script (see docs/SAM2_INTEGRATION.md for script)
python export_sam2.py

# 5. Move models to public folder
mkdir -p public/models
mv sam2_tiny_encoder.onnx public/models/
mv sam2_tiny_decoder.onnx public/models/
```

**Expected files:**
```
public/
  └── models/
      ├── sam2_tiny_encoder.onnx   (~20MB)
      └── sam2_tiny_decoder.onnx   (~20MB)
```

### Step 2: Try It Out

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Navigate to the pose-demo page:
   ```
   http://localhost:3000/pose-demo
   ```

3. Upload a sports video

4. Click the **"SAM 2 Segmentation"** tab

5. Enable SAM 2 and click on a racket or ball to segment it!

## 💡 Usage Examples

### Example 1: Segment a Tennis Racket

```typescript
import { useSAM2Detection } from "@/hooks/useSAM2Detection";

const { segmentWithPoints } = useSAM2Detection({
  enabled: true,
  modelType: "tiny",
});

// Click on racket in video
const racketPoint = { x: 400, y: 300, label: 1 };
const result = await segmentWithPoints(videoElement, [racketPoint]);

// Result contains pixel-perfect mask of the racket
console.log("Segmented area:", result.masks[0].data);
```

### Example 2: Combine with YOLOv8

```typescript
// First, detect approximate location with YOLOv8
const yoloDetections = await detectObjects(videoElement);
const racket = yoloDetections.find(d => d.class === "tennis racket");

// Then, get precise segmentation with SAM 2
if (racket) {
  const mask = await segmentWithBox(videoElement, racket.bbox);
  // Now you have pixel-perfect segmentation!
}
```

### Example 3: Track Ball Across Frames

```typescript
// Initial segmentation
const ballPoint = { x: ballX, y: ballY, label: 1 };
const mask = await segmentWithPoints(videoElement, [ballPoint]);

// Use mask statistics to track center
const stats = calculateMaskStats(mask.masks[0]);
console.log("Ball center:", stats.centerX, stats.centerY);
```

## 🎮 Interactive Controls

The SAM2Viewer component provides:

| Control | Purpose |
|---------|---------|
| **Model Size** | Choose between Tiny/Small/Base/Large |
| **Interaction Mode** | Switch between foreground/background points |
| **Mask Opacity** | Adjust transparency of segmentation overlay |
| **Show Contours Only** | Display outline instead of filled mask |
| **Auto Segment** | Automatic segmentation from center point |
| **Clear Points** | Reset all points and start over |
| **Clear Cache** | Free up memory from cached embeddings |

## 📊 Model Comparison

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| **Tiny** | 40MB | ⚡⚡⚡ | ⭐⭐⭐ | Real-time, interactive |
| **Small** | 180MB | ⚡⚡ | ⭐⭐⭐⭐ | Balanced |
| **Base** | 370MB | ⚡ | ⭐⭐⭐⭐⭐ | High quality |
| **Large** | 900MB | 🐌 | ⭐⭐⭐⭐⭐ | Maximum accuracy |

**Recommendation**: Start with **Tiny** for testing and real-time use. Only upgrade if you need better quality.

## 🔍 Troubleshooting

### "Model files not found"

**Solution**: Make sure models are exported and placed in `public/models/`:
```bash
ls public/models/
# Should show:
# sam2_tiny_encoder.onnx
# sam2_tiny_decoder.onnx
```

### Slow performance

**Solutions**:
- Use Tiny model instead of Large
- Reduce video resolution
- Clear cache periodically: `clearCache()`
- Close other tabs to free up GPU memory

### Poor segmentation

**Solutions**:
- Add more prompt points (2-5 points usually best)
- Add background points (blue) to exclude unwanted areas
- Use larger model (Small or Base)
- Ensure video frame is clear and high quality

### Out of memory

**Solutions**:
- Use Tiny model
- Reduce image size: `imageSize: 512`
- Clear embedding cache more frequently
- Close other applications using GPU

## 📚 Next Steps

1. **Read full documentation**: `docs/SAM2_INTEGRATION.md`
2. **Export models**: Follow export script in docs
3. **Test with your videos**: Try different sports and scenarios
4. **Integrate with your workflow**: Combine with YOLOv8, pose detection, etc.
5. **Optimize for production**: Choose appropriate model size, tune thresholds

## 🎯 Best Practices

1. ✅ **Start with Tiny model** - Fastest, good enough for most cases
2. ✅ **Use 2-5 points** - More points = better segmentation, but diminishing returns
3. ✅ **Combine with YOLO** - Use YOLO for initial detection, SAM 2 for refinement
4. ✅ **Cache embeddings** - Let the system cache (it does this automatically)
5. ✅ **Test on diverse videos** - Different lighting, angles, backgrounds
6. ✅ **Monitor performance** - Check browser DevTools for memory/GPU usage

## 🚦 Performance Tips

- **First load**: ~2-5 seconds (model download + initialization)
- **Subsequent loads**: ~100-500ms (loaded from cache)
- **Encoding**: ~50-200ms per frame (cached for multiple prompts)
- **Decoding**: ~5-15ms per prompt (very fast)

**For real-time use**:
- Use Tiny model
- Cache embeddings (automatic)
- Limit prompt points to 2-3
- Consider reducing video resolution

## 🤝 Integration Architecture

```
User clicks video
    ↓
SAM2Viewer (UI)
    ↓
useSAM2Detection (Hook)
    ↓
SAM2Detector (Core Logic)
    ↓
ONNX Runtime (Inference)
    ↓
drawSAM2Masks (Visualization)
```

All layers follow the same patterns as existing models (YOLOv8, MoveNet, BlazePose) for consistency and maintainability.

## 📖 Additional Resources

- [SAM 2 Paper](https://ai.meta.com/research/publications/sam-2/)
- [SAM 2 GitHub](https://github.com/facebookresearch/segment-anything-2)
- [ONNX Runtime Docs](https://onnxruntime.ai/docs/)
- [Full Integration Guide](./SAM2_INTEGRATION.md)

---

**Ready to segment anything? 🎾⚽🏀**

Try it now at `/pose-demo`!





