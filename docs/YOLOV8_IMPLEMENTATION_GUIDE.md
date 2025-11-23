# YOLOv8n Implementation Guide

## Overview

This guide covers upgrading from COCO-SSD to actual YOLOv8n for better object detection quality, particularly for sports applications.

## Why Upgrade to YOLOv8n?

### COCO-SSD (Current) vs YOLOv8n
| Feature | COCO-SSD | YOLOv8n |
|---------|----------|---------|
| Accuracy | Good | Excellent |
| Speed | Fast | Faster |
| Model Size | ~25MB | ~6MB |
| Customization | Limited | Full control |
| Sports Specific | No | Can be trained |
| Latest Tech | 2019 | 2023 |

## 🎯 Two Implementation Approaches

### **Option 1: ONNX Runtime Web** (Recommended ⭐)

**Pros:**
- ✅ Easier to implement
- ✅ Official YOLOv8 export support
- ✅ Smaller model size (~6MB)
- ✅ Better performance
- ✅ Direct from Ultralytics

**Cons:**
- ⚠️ Additional library (~8MB ONNX Runtime)
- ⚠️ Requires post-processing (NMS)

**Implementation Steps:**

#### Step 1: Export YOLOv8n to ONNX

```bash
# Install Ultralytics
pip install ultralytics

# Export YOLOv8n to ONNX format
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt').export(format='onnx')"
```

This creates `yolov8n.onnx` (~6MB)

#### Step 2: Install ONNX Runtime Web

```bash
npm install onnxruntime-web
```

#### Step 3: Host the Model

Upload `yolov8n.onnx` to:
- Your S3 bucket (alongside videos)
- CDN (for faster loading)
- Public folder `/public/models/yolov8n.onnx`

#### Step 4: Implement in Code

See `YOLOV8_ONNX_IMPLEMENTATION.md` for full code.

---

### **Option 2: TensorFlow.js Conversion**

**Pros:**
- ✅ Already using TensorFlow.js (no new deps)
- ✅ Works with existing infrastructure

**Cons:**
- ⚠️ More complex conversion process
- ⚠️ Larger model size (~25MB)
- ⚠️ May have compatibility issues

**Implementation Steps:**

#### Step 1: Convert YOLOv8 to TensorFlow

```bash
# Export to TensorFlow SavedModel
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt').export(format='saved_model')"

# Convert to TensorFlow.js
pip install tensorflowjs
tensorflowjs_converter \
  --input_format=tf_saved_model \
  --output_format=tfjs_graph_model \
  yolov8n_saved_model \
  yolov8n_tfjs
```

#### Step 2: Load in Application

```typescript
const model = await tf.loadGraphModel('/models/yolov8n_tfjs/model.json');
```

---

## 📦 Recommended: ONNX Runtime Web Implementation

Let's implement Option 1 as it's simpler and more efficient.

### Full Implementation

#### 1. Install Package

```bash
npm install onnxruntime-web
```

#### 2. Create YOLOv8 Detection Class

```typescript
// utils/yolov8.ts
import * as ort from 'onnxruntime-web';

export class YOLOv8Detector {
  private session: ort.InferenceSession | null = null;
  private inputShape = [1, 3, 640, 640]; // [batch, channels, height, width]
  
  async load(modelPath: string) {
    this.session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['webgl'], // Use WebGL for GPU acceleration
    });
  }
  
  async detect(imageData: ImageData): Promise<Detection[]> {
    if (!this.session) throw new Error('Model not loaded');
    
    // Preprocess image
    const input = this.preprocessImage(imageData);
    
    // Run inference
    const feeds = { images: input };
    const results = await this.session.run(feeds);
    
    // Post-process results
    const detections = this.postprocess(results);
    
    return detections;
  }
  
  private preprocessImage(imageData: ImageData): ort.Tensor {
    // Resize and normalize image to [1, 3, 640, 640]
    const { width, height, data } = imageData;
    const targetSize = 640;
    
    // Create float32 array for model input
    const input = new Float32Array(1 * 3 * targetSize * targetSize);
    
    // Resize and convert RGBA to RGB, normalize to [0, 1]
    // ... implementation details
    
    return new ort.Tensor('float32', input, [1, 3, targetSize, targetSize]);
  }
  
  private postprocess(results: ort.InferenceSession.OrtValueMapType): Detection[] {
    // YOLOv8 output: [1, 84, 8400]
    // 84 = 4 (bbox) + 80 (classes)
    // 8400 = number of predictions
    
    const output = results.output0.data as Float32Array;
    const detections: Detection[] = [];
    
    // Apply NMS and threshold
    // ... implementation details
    
    return detections;
  }
}
```

#### 3. Update useObjectDetection Hook

```typescript
// hooks/useObjectDetection.ts
import { YOLOv8Detector } from '@/utils/yolov8';

// Replace COCO-SSD loading with:
const detector = new YOLOv8Detector();
await detector.load('/models/yolov8n.onnx');
```

---

## 🎨 Adding Class Filtering

### 1. Define Sports Classes

```typescript
// types/detection.ts
export const SPORTS_CLASSES = {
  PERSON: 0,
  BICYCLE: 1,
  CAR: 2,
  MOTORCYCLE: 3,
  SPORTS_BALL: 32,
  TENNIS_RACKET: 38,
  BASEBALL_BAT: 36,
  BASEBALL_GLOVE: 37,
  SKATEBOARD: 41,
  SURFBOARD: 42,
  FRISBEE: 33,
  SKIS: 34,
  SNOWBOARD: 35,
} as const;

export const SPORTS_CLASS_FILTERS = {
  all: Object.values(SPORTS_CLASSES),
  tennis: [SPORTS_CLASSES.PERSON, SPORTS_CLASSES.SPORTS_BALL, SPORTS_CLASSES.TENNIS_RACKET],
  pickleball: [SPORTS_CLASSES.PERSON, SPORTS_CLASSES.SPORTS_BALL],
  basketball: [SPORTS_CLASSES.PERSON, SPORTS_CLASSES.SPORTS_BALL],
  skating: [SPORTS_CLASSES.PERSON, SPORTS_CLASSES.SKATEBOARD],
};
```

### 2. Add UI Controls

```tsx
// In VideoPoseViewerCore.tsx settings
<Select.Root
  value={objectClassFilter}
  onValueChange={setObjectClassFilter}
>
  <Select.Item value="all">All Sports Objects</Select.Item>
  <Select.Item value="tennis">Tennis Only</Select.Item>
  <Select.Item value="pickleball">Pickleball Only</Select.Item>
  <Select.Item value="basketball">Basketball Only</Select.Item>
</Select.Root>
```

### 3. Filter in Detection

```typescript
// Filter detections by class
const filteredResults = results.filter(result =>
  allowedClasses.includes(result.classId)
);
```

---

## 🎛️ Confidence Threshold Controls

### 1. Add State

```typescript
const [objectConfidenceThreshold, setObjectConfidenceThreshold] = useState(0.5);
const [objectIoUThreshold, setObjectIoUThreshold] = useState(0.45); // For NMS
```

### 2. Add UI Sliders

```tsx
<Flex direction="column" gap="2">
  <Text size="2">Confidence Threshold: {objectConfidenceThreshold}</Text>
  <input
    type="range"
    min="0.1"
    max="0.9"
    step="0.05"
    value={objectConfidenceThreshold}
    onChange={(e) => setObjectConfidenceThreshold(parseFloat(e.target.value))}
  />
  
  <Text size="2">NMS IoU Threshold: {objectIoUThreshold}</Text>
  <input
    type="range"
    min="0.1"
    max="0.9"
    step="0.05"
    value={objectIoUThreshold}
    onChange={(e) => setObjectIoUThreshold(parseFloat(e.target.value))}
  />
</Flex>
```

### 3. Apply in Detection

```typescript
// In YOLOv8 post-processing
detections = detections.filter(det => det.confidence >= confidenceThreshold);
detections = applyNMS(detections, iouThreshold);
```

---

## 📊 Performance Optimization

### Model Hosting Strategy

1. **For Development:**
   ```typescript
   // Serve from public folder
   const modelPath = '/models/yolov8n.onnx';
   ```

2. **For Production:**
   ```typescript
   // Serve from CDN
   const modelPath = 'https://cdn.your-domain.com/models/yolov8n.onnx';
   ```

3. **With Caching:**
   ```typescript
   // Use browser cache
   const modelPath = '/models/yolov8n.onnx';
   // Browser will cache the model automatically
   ```

### Detection Rate Tuning

```typescript
// Adjust based on video complexity
const detectionIntervals = {
  highQuality: 33,  // ~30 FPS - smooth but expensive
  balanced: 100,    // ~10 FPS - good balance
  efficient: 200,   // ~5 FPS - saves resources
};
```

---

## 🚀 Implementation Steps Summary

### Phase 1: Setup (30 min)
1. ✅ Export YOLOv8n to ONNX
2. ✅ Install onnxruntime-web
3. ✅ Host model file
4. ✅ Test model loading

### Phase 2: Integration (1-2 hours)
1. ✅ Create YOLOv8Detector class
2. ✅ Implement preprocessing
3. ✅ Implement post-processing (NMS)
4. ✅ Update useObjectDetection hook
5. ✅ Test detection

### Phase 3: Enhancement (1 hour)
1. ✅ Add class filtering
2. ✅ Add confidence threshold controls
3. ✅ Add UI for settings
4. ✅ Test and tune

### Phase 4: Optimization (30 min)
1. ✅ Profile performance
2. ✅ Tune detection rate
3. ✅ Optimize preprocessing
4. ✅ Add loading indicators

---

## 📝 Next Steps

1. **Choose Approach**: ONNX Runtime Web (recommended) or TensorFlow.js
2. **Export Model**: Get YOLOv8n in the right format
3. **Implement Loader**: Create detection class
4. **Replace COCO-SSD**: Update hook
5. **Add Controls**: Class filtering and confidence
6. **Test & Tune**: Optimize for your use case

---

## 🔗 Resources

- **Ultralytics YOLOv8**: https://github.com/ultralytics/ultralytics
- **ONNX Runtime Web**: https://onnxruntime.ai/docs/tutorials/web/
- **YOLOv8 Export**: https://docs.ultralytics.com/modes/export/
- **COCO Classes**: https://tech.amikelive.com/node-718/what-object-categories-labels-are-in-coco-dataset/

---

## ⚠️ Important Notes

1. **Model Licensing**: YOLOv8 is AGPL-3.0 (open source but restrictive for commercial use)
2. **Model Size**: YOLOv8n is ~6MB (ONNX) vs ~25MB (TFJS)
3. **Performance**: ONNX Runtime is generally faster than TensorFlow.js
4. **Browser Support**: Both work in modern browsers (Chrome, Firefox, Safari)

---

Ready to start? Let me know which approach you want to take and I'll help you implement it!

