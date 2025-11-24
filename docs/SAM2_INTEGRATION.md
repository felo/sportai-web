# SAM 2 Integration Guide

## Overview

This guide explains how to integrate Meta's **SAM 2 (Segment Anything Model 2)** for interactive segmentation of rackets, balls, and other sports equipment.

SAM 2 is a powerful segmentation model that can:
- Segment any object with minimal prompts (points or boxes)
- Track objects across video frames
- Handle occlusions and complex scenes
- Run efficiently in the browser using ONNX Runtime

## Architecture

### Model Structure

SAM 2 uses a two-stage architecture:

1. **Image Encoder** (heavy, cached): Processes the image once to generate embeddings
2. **Mask Decoder** (lightweight): Generates masks based on prompts (points/boxes)

This architecture allows efficient real-time interaction:
- Encode the frame once
- Generate multiple masks with different prompts without re-encoding

### File Structure

```
hooks/
  └── useSAM2Detection.ts       # React hook for SAM 2
utils/
  └── sam2-detector.ts          # Core SAM 2 detector
types/
  ├── detection.ts              # SAM 2 types (updated)
  └── sam2-detection.ts         # SAM 2 drawing utilities
docs/
  └── SAM2_INTEGRATION.md       # This file
public/
  └── models/
      ├── sam2_tiny_encoder.onnx     # Encoder model
      ├── sam2_tiny_decoder.onnx     # Decoder model
      ├── sam2_small_encoder.onnx    # (optional)
      ├── sam2_small_decoder.onnx    # (optional)
      └── ...
```

## Exporting SAM 2 Models

### Prerequisites

```bash
# Install required packages
pip install torch torchvision
pip install onnx onnxruntime
pip install segment-anything-2  # Or clone from Meta's repo
```

### Export Script

Save this as `export_sam2.py`:

```python
import torch
from segment_anything import sam_model_registry, SamPredictor
import onnx
from onnxruntime.quantization import quantize_dynamic

def export_sam2_onnx(
    checkpoint_path: str,
    model_type: str = "vit_b",
    output_dir: str = "./public/models",
    quantize: bool = True
):
    """
    Export SAM 2 to ONNX format
    
    Args:
        checkpoint_path: Path to SAM 2 checkpoint (.pth file)
        model_type: Model size (vit_t, vit_b, vit_l, vit_h)
        output_dir: Directory to save ONNX models
        quantize: Whether to quantize models for smaller size
    """
    print(f"Loading SAM 2 model: {model_type}")
    
    # Load SAM 2 model
    sam = sam_model_registry[model_type](checkpoint=checkpoint_path)
    sam.eval()
    
    # Export encoder
    print("Exporting image encoder...")
    encoder_path = f"{output_dir}/sam2_{model_type}_encoder.onnx"
    
    dummy_image = torch.randn(1, 3, 1024, 1024)
    torch.onnx.export(
        sam.image_encoder,
        dummy_image,
        encoder_path,
        input_names=["image"],
        output_names=["image_embeddings"],
        opset_version=17,
        do_constant_folding=True,
    )
    print(f"✅ Encoder exported to {encoder_path}")
    
    # Export decoder
    print("Exporting mask decoder...")
    decoder_path = f"{output_dir}/sam2_{model_type}_decoder.onnx"
    
    # Dummy inputs for decoder
    image_embeddings = torch.randn(1, 256, 64, 64)
    point_coords = torch.randn(1, 2, 2)  # 2 points
    point_labels = torch.ones(1, 2)
    
    torch.onnx.export(
        sam.mask_decoder,
        (image_embeddings, point_coords, point_labels),
        decoder_path,
        input_names=["image_embeddings", "point_coords", "point_labels"],
        output_names=["masks", "iou_predictions"],
        opset_version=17,
        do_constant_folding=True,
    )
    print(f"✅ Decoder exported to {decoder_path}")
    
    # Quantize models (optional, reduces size significantly)
    if quantize:
        print("Quantizing models...")
        quantize_dynamic(encoder_path, encoder_path.replace(".onnx", "_quant.onnx"))
        quantize_dynamic(decoder_path, decoder_path.replace(".onnx", "_quant.onnx"))
        print("✅ Quantized models created")
    
    print("✅ SAM 2 export complete!")

# Usage examples
if __name__ == "__main__":
    # Option 1: Export tiny model (fastest, good for real-time)
    export_sam2_onnx(
        checkpoint_path="path/to/sam2_vit_t.pth",
        model_type="vit_t",
        output_dir="./public/models",
        quantize=True
    )
    
    # Option 2: Export base model (balanced)
    # export_sam2_onnx(
    #     checkpoint_path="path/to/sam2_vit_b.pth",
    #     model_type="vit_b",
    #     output_dir="./public/models",
    #     quantize=True
    # )
```

### Download Checkpoints

Download SAM 2 checkpoints from Meta:

```bash
# Visit: https://github.com/facebookresearch/segment-anything-2
# Or use direct links:

# Tiny model (~40MB) - Recommended for real-time
wget https://dl.fbaipublicfiles.com/segment_anything_2/sam2_hiera_tiny.pt

# Small model (~180MB)
wget https://dl.fbaipublicfiles.com/segment_anything_2/sam2_hiera_small.pt

# Base model (~370MB)
wget https://dl.fbaipublicfiles.com/segment_anything_2/sam2_hiera_base.pt

# Large model (~900MB)
wget https://dl.fbaipublicfiles.com/segment_anything_2/sam2_hiera_large.pt
```

### Run Export

```bash
# Export models
python export_sam2.py

# Move to public/models/
mv sam2_*.onnx ../public/models/
```

## Usage

### Basic Usage

```typescript
import { useSAM2Detection } from "@/hooks/useSAM2Detection";

function MyComponent() {
  const {
    detector,
    isLoading,
    error,
    segmentWithPoints,
    segmentWithBox,
  } = useSAM2Detection({
    enabled: true,
    modelType: "tiny", // or "small", "base", "large"
    maskThreshold: 0.0,
  });

  // Segment with point prompts
  const handlePointSegment = async (videoElement: HTMLVideoElement) => {
    const points = [
      { x: 320, y: 240, label: 1 }, // Foreground point
    ];
    
    const result = await segmentWithPoints(videoElement, points);
    if (result) {
      console.log("Masks:", result.masks);
      console.log("Confidence:", result.confidence);
    }
  };

  // Segment with box prompt
  const handleBoxSegment = async (videoElement: HTMLVideoElement) => {
    const box = { x: 100, y: 100, width: 200, height: 200 };
    
    const result = await segmentWithBox(videoElement, box);
    if (result) {
      console.log("Masks:", result.masks);
    }
  };

  return (
    <div>
      {isLoading && <p>Loading SAM 2...</p>}
      {error && <p>Error: {error}</p>}
      {/* Your UI here */}
    </div>
  );
}
```

### Interactive Mode (Click to Segment)

```typescript
import { useSAM2Detection } from "@/hooks/useSAM2Detection";
import { drawSAM2Masks } from "@/types/sam2-detection";

function InteractiveSAM2() {
  const [points, setPoints] = useState<Array<{x: number, y: number}>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { segmentWithPoints, isLoading } = useSAM2Detection({
    enabled: true,
    modelType: "tiny",
  });

  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Add point
    const newPoints = [...points, { x, y, label: 1 as const }];
    setPoints(newPoints);

    // Segment with new points
    const videoElement = document.querySelector("video");
    if (videoElement) {
      const result = await segmentWithPoints(videoElement, newPoints);
      
      if (result && canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Draw segmentation
          drawSAM2Masks(ctx, [result], {
            maskOpacity: 0.5,
            showPromptPoints: true,
          });
        }
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      style={{ cursor: "crosshair" }}
    />
  );
}
```

### Drawing Utilities

```typescript
import { drawSAM2Masks, drawSAM2Contours } from "@/types/sam2-detection";

// Draw filled masks
drawSAM2Masks(ctx, detections, {
  maskOpacity: 0.5,
  maskColor: "#FF0000",
  showPromptPoints: true,
});

// Draw only contours (outlines)
drawSAM2Contours(ctx, detections, {
  maskColor: "#00FF00",
  lineWidth: 2,
});
```

## Integration with pose-demo

The SAM 2 detector is already integrated into the pose-demo page with the same architecture as other models:

### Features

- ✅ Dynamic imports (no performance impact on page load)
- ✅ Model caching (models loaded once per session)
- ✅ Embedding caching (frames encoded once, reused for multiple prompts)
- ✅ Interactive mode (click to segment)
- ✅ Auto-segmentation (grid-based)
- ✅ Multiple model sizes (tiny, small, base, large)

### Performance Characteristics

| Model | Size | Encoder Speed | Decoder Speed | Use Case |
|-------|------|---------------|---------------|----------|
| Tiny | ~40MB | ~50ms | ~5ms | Real-time interactive |
| Small | ~180MB | ~100ms | ~8ms | Balanced |
| Base | ~370MB | ~200ms | ~10ms | High quality |
| Large | ~900MB | ~400ms | ~15ms | Maximum accuracy |

*Speeds are approximate on a modern GPU (M1/M2 Mac or modern Nvidia GPU)*

## Sports-Specific Usage

### Racket Detection

```typescript
// Use box prompt around detected player's hand
const racketBox = {
  x: wristX - 50,
  y: wristY - 100,
  width: 150,
  height: 200,
};

const result = await segmentWithBox(videoElement, racketBox);
```

### Ball Detection

```typescript
// Use point prompt on ball location
const ballPoint = [
  { x: ballX, y: ballY, label: 1 },
];

const result = await segmentWithPoints(videoElement, ballPoint);
```

### Combined with Other Models

```typescript
// 1. Use YOLOv8 to detect approximate location
const yoloDetections = await detectObjects(videoElement);
const sportsObjects = yoloDetections.filter(d => 
  d.class === "tennis racket" || d.class === "sports ball"
);

// 2. Use SAM 2 for precise segmentation
for (const obj of sportsObjects) {
  const mask = await segmentWithBox(videoElement, obj.bbox);
  // Now you have precise pixel-level segmentation
}
```

## Troubleshooting

### Model Not Found

```
Error: Failed to fetch model
```

**Solution**: Ensure models are in `public/models/`:
- `sam2_tiny_encoder.onnx`
- `sam2_tiny_decoder.onnx`

### Out of Memory

```
Error: WebGL out of memory
```

**Solutions**:
1. Use smaller model (`tiny` instead of `large`)
2. Reduce image size: `imageSize: 512`
3. Clear cache periodically: `clearCache()`

### Slow Performance

**Solutions**:
1. Use `tiny` model for real-time applications
2. Enable embedding caching (enabled by default)
3. Use quantized models
4. Reduce video resolution

### Poor Segmentation Quality

**Solutions**:
1. Add more point prompts (2-3 foreground + 1-2 background)
2. Use larger model (`base` or `large`)
3. Adjust mask threshold: `maskThreshold: 0.5`
4. Use box prompts for better initial localization

## Best Practices

1. **Cache embeddings**: Let frames be encoded once, reuse for multiple prompts
2. **Start with tiny model**: Upgrade to larger models only if needed
3. **Use box prompts from YOLO**: Combine object detection for initialization
4. **Limit prompt points**: 2-5 points is usually sufficient
5. **Clear cache periodically**: Prevent memory buildup in long sessions

## References

- [SAM 2 Paper](https://ai.meta.com/research/publications/sam-2/)
- [SAM 2 GitHub](https://github.com/facebookresearch/segment-anything-2)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)





