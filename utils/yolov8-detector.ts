/**
 * YOLOv8 Object Detection using ONNX Runtime Web
 * Replaces COCO-SSD with actual YOLOv8n model for better accuracy
 */

import * as ort from 'onnxruntime-web';

export interface YOLOv8Detection {
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  class: string;
  classId: number;
  confidence: number;
}

// COCO class names (80 classes)
const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
  'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
  'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
  'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
  'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard',
  'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase',
  'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

export class YOLOv8Detector {
  private session: ort.InferenceSession | null = null;
  private modelInputShape = [1, 3, 640, 640]; // [batch, channels, height, width]
  private modelLoaded = false;

  /**
   * Load YOLOv8 ONNX model
   */
  async load(modelPath: string): Promise<void> {
    try {
      console.log('🔧 Loading YOLOv8 ONNX model from:', modelPath);
      const startTime = performance.now();

      // Configure ONNX Runtime to use WebGL for GPU acceleration
      this.session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['webgl', 'wasm'], // Fallback to WASM if WebGL unavailable
        graphOptimizationLevel: 'all',
      });

      const loadTime = performance.now() - startTime;
      console.log(`✅ YOLOv8 model loaded in ${(loadTime / 1000).toFixed(2)}s`);
      console.log('📊 Model inputs:', this.session.inputNames);
      console.log('📊 Model outputs:', this.session.outputNames);
      
      this.modelLoaded = true;
    } catch (error) {
      console.error('❌ Failed to load YOLOv8 model:', error);
      throw new Error(`Failed to load YOLOv8 model: ${error}`);
    }
  }

  /**
   * Detect objects in an image/video frame
   */
  async detect(
    element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    options: {
      confidenceThreshold?: number;
      iouThreshold?: number;
      classFilter?: number[];
    } = {}
  ): Promise<YOLOv8Detection[]> {
    if (!this.session || !this.modelLoaded) {
      throw new Error('Model not loaded. Call load() first.');
    }

    const {
      confidenceThreshold = 0.5,
      iouThreshold = 0.45,
      classFilter,
    } = options;

    try {
      // Get image dimensions
      const imgWidth = element instanceof HTMLVideoElement ? element.videoWidth : element.width;
      const imgHeight = element instanceof HTMLVideoElement ? element.videoHeight : element.height;

      // Preprocess image to tensor
      const inputTensor = await this.preprocessImage(element);

      // Run inference
      const feeds = { images: inputTensor };
      const results = await this.session.run(feeds);

      // Post-process results
      const detections = this.postprocess(
        results.output0,
        imgWidth,
        imgHeight,
        confidenceThreshold,
        iouThreshold,
        classFilter
      );

      return detections;
    } catch (error) {
      console.error('Error during YOLOv8 detection:', error);
      return [];
    }
  }

  /**
   * Preprocess image to model input format
   */
  private async preprocessImage(
    element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<ort.Tensor> {
    // Create a canvas to extract and resize image data
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // YOLOv8 expects 640x640 input
    const modelWidth = 640;
    const modelHeight = 640;
    canvas.width = modelWidth;
    canvas.height = modelHeight;

    // Draw and resize image
    ctx.drawImage(element, 0, 0, modelWidth, modelHeight);
    const imageData = ctx.getImageData(0, 0, modelWidth, modelHeight);

    // Convert to float32 array and normalize
    // YOLOv8 expects RGB format, normalized to [0, 1]
    const pixels = imageData.data;
    const red: number[] = [];
    const green: number[] = [];
    const blue: number[] = [];

    // Separate RGB channels and normalize
    for (let i = 0; i < pixels.length; i += 4) {
      red.push(pixels[i] / 255.0);
      green.push(pixels[i + 1] / 255.0);
      blue.push(pixels[i + 2] / 255.0);
    }

    // Concatenate channels in CHW format (channels, height, width)
    const inputArray = Float32Array.from([...red, ...green, ...blue]);

    // Create tensor
    return new ort.Tensor('float32', inputArray, [1, 3, modelHeight, modelWidth]);
  }

  /**
   * Post-process model output to detections
   */
  private postprocess(
    output: ort.Tensor,
    imgWidth: number,
    imgHeight: number,
    confidenceThreshold: number,
    iouThreshold: number,
    classFilter?: number[]
  ): YOLOv8Detection[] {
    const outputData = output.data as Float32Array;
    const [batchSize, channels, numDetections] = output.dims as number[];

    // YOLOv8 output format: [1, 84, 8400]
    // 84 = 4 (bbox: x, y, w, h) + 80 (class scores)
    const numClasses = channels - 4;

    const detections: Array<{
      bbox: { x: number; y: number; width: number; height: number };
      classId: number;
      confidence: number;
    }> = [];

    // Parse detections
    for (let i = 0; i < numDetections; i++) {
      // Get bbox coordinates (center format)
      const x = outputData[i];
      const y = outputData[numDetections + i];
      const w = outputData[2 * numDetections + i];
      const h = outputData[3 * numDetections + i];

      // Get class scores
      let maxScore = 0;
      let maxClassId = 0;
      
      for (let c = 0; c < numClasses; c++) {
        const score = outputData[(4 + c) * numDetections + i];
        if (score > maxScore) {
          maxScore = score;
          maxClassId = c;
        }
      }

      // Filter by confidence threshold
      if (maxScore < confidenceThreshold) continue;

      // Filter by class if specified
      if (classFilter && !classFilter.includes(maxClassId)) continue;

      // Convert from center format to corner format and scale to image size
      const scaleX = imgWidth / 640;
      const scaleY = imgHeight / 640;

      detections.push({
        bbox: {
          x: (x - w / 2) * scaleX,
          y: (y - h / 2) * scaleY,
          width: w * scaleX,
          height: h * scaleY,
        },
        classId: maxClassId,
        confidence: maxScore,
      });
    }

    // Apply Non-Maximum Suppression (NMS)
    const nmsDetections = this.applyNMS(detections, iouThreshold);

    // Convert to final format with class names
    return nmsDetections.map(det => ({
      ...det,
      class: COCO_CLASSES[det.classId] || `class_${det.classId}`,
    }));
  }

  /**
   * Apply Non-Maximum Suppression to remove duplicate detections
   */
  private applyNMS(
    detections: Array<{
      bbox: { x: number; y: number; width: number; height: number };
      classId: number;
      confidence: number;
    }>,
    iouThreshold: number
  ): Array<{
    bbox: { x: number; y: number; width: number; height: number };
    classId: number;
    confidence: number;
  }> {
    // Sort by confidence (descending)
    detections.sort((a, b) => b.confidence - a.confidence);

    const keep: typeof detections = [];

    while (detections.length > 0) {
      const current = detections[0];
      keep.push(current);
      detections = detections.slice(1);

      // Remove detections with high IoU with current detection
      detections = detections.filter(det => {
        // Only apply NMS within the same class
        if (det.classId !== current.classId) return true;

        const iou = this.calculateIoU(current.bbox, det.bbox);
        return iou < iouThreshold;
      });
    }

    return keep;
  }

  /**
   * Calculate Intersection over Union (IoU) between two bounding boxes
   */
  private calculateIoU(
    box1: { x: number; y: number; width: number; height: number },
    box2: { x: number; y: number; width: number; height: number }
  ): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const union = area1 + area2 - intersection;

    return intersection / union;
  }

  /**
   * Check if model is loaded
   */
  isLoaded(): boolean {
    return this.modelLoaded;
  }

  /**
   * Get available class names
   */
  getClassNames(): string[] {
    return COCO_CLASSES;
  }

  /**
   * Dispose of the model and free resources
   */
  dispose(): void {
    if (this.session) {
      // ONNX Runtime doesn't have explicit dispose in web version
      this.session = null;
      this.modelLoaded = false;
      console.log('🗑️ YOLOv8 model disposed');
    }
  }
}

