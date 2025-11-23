# Export YOLOv8n to ONNX

## Quick Start

### Option 1: Using Python (Recommended)

```bash
# Install Ultralytics
pip install ultralytics

# Export YOLOv8n to ONNX format
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt').export(format='onnx')"
```

This will:
1. Download YOLOv8n weights (~6MB)
2. Export to `yolov8n.onnx`
3. Take about 30 seconds

### Option 2: Using Python Script

Create `export_yolo.py`:

```python
from ultralytics import YOLO

# Load YOLOv8n model
model = YOLO('yolov8n.pt')

# Export to ONNX
model.export(
    format='onnx',
    imgsz=640,  # Input size
    simplify=True,  # Simplify model
    opset=12,  # ONNX opset version
)

print("✅ Model exported to yolov8n.onnx")
```

Run it:
```bash
python export_yolo.py
```

### Option 3: Download Pre-exported Model

If you can't run Python, download a pre-exported version:

```bash
# From Ultralytics GitHub releases or community exports
wget https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx
```

## Place the Model

After exporting, move the model file:

```bash
# Create models directory in public folder
mkdir -p public/models

# Move the model
mv yolov8n.onnx public/models/
```

Your file structure should be:
```
sportai-web/
├── public/
│   └── models/
│       └── yolov8n.onnx  # ~6MB file
```

## Verify the Export

Check the model file:

```bash
ls -lh public/models/yolov8n.onnx
# Should show: ~6.0MB
```

## Alternative: Use CDN

For production, you might want to host the model on a CDN:

1. Upload `yolov8n.onnx` to your S3 bucket
2. Make it publicly accessible
3. Get the CDN URL
4. Update model path in code

Example:
```typescript
const modelPath = 'https://cdn.your-domain.com/models/yolov8n.onnx';
```

## Troubleshooting

### "No module named 'ultralytics'"
```bash
pip install --upgrade ultralytics
```

### "Model export failed"
Try with specific ONNX version:
```bash
pip install onnx==1.15.0
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt').export(format='onnx', opset=12)"
```

### Model is too large
YOLOv8n should be ~6MB. If larger, you might have exported a different model:
- `yolov8n.pt` = Nano (smallest, 6MB)
- `yolov8s.pt` = Small (22MB)
- `yolov8m.pt` = Medium (52MB)

Make sure you're using `yolov8n` for best web performance!

## Next Steps

Once the model is in `public/models/yolov8n.onnx`, the application will automatically use it instead of COCO-SSD. No code changes needed!

The model will be loaded on first use and cached by the browser for subsequent loads.


