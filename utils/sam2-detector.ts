/**
 * SAM 2 (Segment Anything Model 2) for interactive segmentation
 * Uses ONNX Runtime Web for efficient inference
 * Optimized for racket and ball detection in sports videos
 */

import * as ort from 'onnxruntime-web';
import { detectionLogger } from "@/lib/logger";

export interface SAM2Point {
  x: number;
  y: number;
  label: 1 | 0; // 1 = foreground, 0 = background
}

export interface SAM2Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SAM2Mask {
  data: Uint8Array; // Binary mask (0 or 255)
  width: number;
  height: number;
  score: number;
}

export interface SAM2Detection {
  masks: SAM2Mask[];
  bbox?: SAM2Box;
  confidence: number;
}

export interface SAM2Config {
  modelType?: 'tiny' | 'small' | 'base' | 'large';
  imageSize?: number; // Default: 1024
  maskThreshold?: number; // Default: 0.0
  returnMultipleMasks?: boolean; // Default: false
}

/**
 * SAM2Detector - Wrapper for SAM 2 model inference
 * 
 * SAM 2 requires two-stage inference:
 * 1. Image encoder: Processes the image to generate embeddings
 * 2. Mask decoder: Generates masks based on prompts (points/boxes)
 * 
 * For performance, we cache image embeddings and only re-run decoder for new prompts
 */
export class SAM2Detector {
  private encoderSession: ort.InferenceSession | null = null;
  private decoderSession: ort.InferenceSession | null = null;
  private config: Required<SAM2Config>;
  private modelLoaded = false;
  
  // Cache image embeddings to avoid re-encoding the same frame
  private imageEmbeddingsCache = new Map<string, {
    embeddings: ort.Tensor;
    timestamp: number;
  }>();
  private readonly CACHE_MAX_SIZE = 10; // Max cached embeddings
  private readonly CACHE_TTL = 30000; // 30 seconds TTL

  constructor(config: SAM2Config = {}) {
    this.config = {
      modelType: config.modelType || 'tiny',
      imageSize: config.imageSize || 1024,
      maskThreshold: config.maskThreshold || 0.0,
      returnMultipleMasks: config.returnMultipleMasks || false,
    };
  }

  /**
   * Load SAM 2 ONNX models (encoder + decoder)
   */
  async load(encoderPath: string, decoderPath: string): Promise<void> {
    try {
      detectionLogger.debug('🔧 Loading SAM 2 models...');
      detectionLogger.debug('  - Encoder:', encoderPath);
      detectionLogger.debug('  - Decoder:', decoderPath);
      const startTime = performance.now();

      // Configure ONNX Runtime for optimal performance
      // Try WASM first (more reliable), WebGL is often problematic in browser
      const sessionOptions: ort.InferenceSession.SessionOptions = {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      };

      detectionLogger.debug('🔧 Using WASM execution provider for better compatibility');

      // Verify files are accessible and check their sizes
      detectionLogger.debug('🔍 Verifying model files...');
      try {
        const encoderResponse = await fetch(encoderPath);
        const decoderResponse = await fetch(decoderPath);
        
        if (!encoderResponse.ok) {
          throw new Error(`Encoder not found: ${encoderResponse.status} ${encoderResponse.statusText}`);
        }
        if (!decoderResponse.ok) {
          throw new Error(`Decoder not found: ${decoderResponse.status} ${decoderResponse.statusText}`);
        }
        
        const encoderSize = encoderResponse.headers.get('content-length');
        const decoderSize = decoderResponse.headers.get('content-length');
        
        detectionLogger.debug(`✅ Encoder found: ${encoderSize ? (parseInt(encoderSize) / 1024 / 1024).toFixed(1) + 'MB' : 'unknown size'}`);
        detectionLogger.debug(`✅ Decoder found: ${decoderSize ? (parseInt(decoderSize) / 1024 / 1024).toFixed(1) + 'MB' : 'unknown size'}`);
        
        // Check if files are suspiciously small (likely incomplete)
        if (encoderSize && parseInt(encoderSize) < 1000000) {
          detectionLogger.warn('⚠️ Encoder file seems too small - may be incomplete');
        }
        if (decoderSize && parseInt(decoderSize) < 1000000) {
          detectionLogger.warn('⚠️ Decoder file seems too small - may be incomplete');
        }
      } catch (fetchErr) {
        detectionLogger.error('❌ File verification failed:', fetchErr);
        throw fetchErr;
      }

      detectionLogger.debug('📥 Loading ONNX sessions...');
      
      // Load both models in parallel
      const [encoder, decoder] = await Promise.all([
        ort.InferenceSession.create(encoderPath, sessionOptions).catch(err => {
          detectionLogger.error('❌ Encoder session creation failed:', err);
          detectionLogger.error('   This usually means the model file is corrupted or incompatible');
          throw err;
        }),
        ort.InferenceSession.create(decoderPath, sessionOptions).catch(err => {
          detectionLogger.error('❌ Decoder session creation failed:', err);
          detectionLogger.error('   This usually means the model file is corrupted or incompatible');
          throw err;
        }),
      ]);

      this.encoderSession = encoder;
      this.decoderSession = decoder;

      const loadTime = performance.now() - startTime;
      detectionLogger.debug(`✅ SAM 2 models loaded in ${(loadTime / 1000).toFixed(2)}s`);
      detectionLogger.debug('📊 Encoder inputs:', this.encoderSession.inputNames);
      detectionLogger.debug('📊 Encoder outputs:', this.encoderSession.outputNames);
      detectionLogger.debug('📊 Decoder inputs:', this.decoderSession.inputNames);
      detectionLogger.debug('📊 Decoder outputs:', this.decoderSession.outputNames);
      
      this.modelLoaded = true;
    } catch (error) {
      detectionLogger.error('❌ Failed to load SAM 2 models:', error);
      throw new Error(`Failed to load SAM 2 models: ${error}`);
    }
  }

  /**
   * Segment objects using point prompts
   */
  async segmentWithPoints(
    element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    points: SAM2Point[]
  ): Promise<SAM2Detection> {
    if (!this.encoderSession || !this.decoderSession || !this.modelLoaded) {
      throw new Error('Models not loaded. Call load() first.');
    }

    if (points.length === 0) {
      throw new Error('At least one point prompt is required');
    }

    try {
      // Step 1: Get or compute image embeddings
      const embeddings = await this.getImageEmbeddings(element);

      // Step 2: Prepare point prompts
      const pointCoords = new Float32Array(points.length * 2);
      const pointLabels = new Float32Array(points.length);
      
      points.forEach((point, i) => {
        pointCoords[i * 2] = point.x;
        pointCoords[i * 2 + 1] = point.y;
        pointLabels[i] = point.label;
      });

      // Step 3: Run mask decoder
      const masks = await this.runDecoder(embeddings, pointCoords, pointLabels);

      return masks;
    } catch (error) {
      detectionLogger.error('Error during SAM 2 point segmentation:', error);
      throw error;
    }
  }

  /**
   * Segment objects using box prompts
   */
  async segmentWithBox(
    element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    box: SAM2Box
  ): Promise<SAM2Detection> {
    if (!this.encoderSession || !this.decoderSession || !this.modelLoaded) {
      throw new Error('Models not loaded. Call load() first.');
    }

    try {
      // Convert box to point prompts (top-left and bottom-right corners)
      const points: SAM2Point[] = [
        { x: box.x, y: box.y, label: 1 },
        { x: box.x + box.width, y: box.y + box.height, label: 1 },
      ];

      const result = await this.segmentWithPoints(element, points);
      result.bbox = box;
      
      return result;
    } catch (error) {
      detectionLogger.error('Error during SAM 2 box segmentation:', error);
      throw error;
    }
  }

  /**
   * Auto-segment entire image (uses grid of points)
   * Useful for initial detection without prompts
   */
  async autoSegment(
    element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    gridSize: number = 32
  ): Promise<SAM2Detection[]> {
    if (!this.encoderSession || !this.decoderSession || !this.modelLoaded) {
      throw new Error('Models not loaded. Call load() first.');
    }

    try {
      const width = element instanceof HTMLVideoElement ? element.videoWidth : element.width;
      const height = element instanceof HTMLVideoElement ? element.videoHeight : element.height;

      // Generate grid of points
      const points: SAM2Point[] = [];
      const stepX = width / gridSize;
      const stepY = height / gridSize;

      for (let y = stepY / 2; y < height; y += stepY) {
        for (let x = stepX / 2; x < width; x += stepX) {
          points.push({ x, y, label: 1 });
        }
      }

      // Get embeddings once
      const embeddings = await this.getImageEmbeddings(element);

      // Run decoder with all points (batched for efficiency)
      const detections: SAM2Detection[] = [];
      
      // Process points in batches to avoid memory issues
      const batchSize = 16;
      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        const pointCoords = new Float32Array(batch.length * 2);
        const pointLabels = new Float32Array(batch.length);
        
        batch.forEach((point, idx) => {
          pointCoords[idx * 2] = point.x;
          pointCoords[idx * 2 + 1] = point.y;
          pointLabels[idx] = point.label;
        });

        const result = await this.runDecoder(embeddings, pointCoords, pointLabels);
        detections.push(result);
      }

      return detections;
    } catch (error) {
      detectionLogger.error('Error during SAM 2 auto-segmentation:', error);
      throw error;
    }
  }

  /**
   * Get or compute image embeddings (with caching)
   */
  private async getImageEmbeddings(
    element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<ort.Tensor> {
    // Generate cache key based on element properties
    const cacheKey = this.generateCacheKey(element);
    
    // Check cache
    const cached = this.imageEmbeddingsCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      detectionLogger.debug('🎯 Using cached image embeddings');
      return cached.embeddings;
    }

    // Compute new embeddings
    detectionLogger.debug('🔄 Computing image embeddings...');
    const inputTensor = await this.preprocessImage(element);
    
    const feeds = { image: inputTensor };
    const results = await this.encoderSession!.run(feeds);
    
    // Get embeddings from output (name may vary by model version)
    const embeddings = results.image_embeddings || results.embeddings || results[Object.keys(results)[0]];
    
    // Cache embeddings
    this.imageEmbeddingsCache.set(cacheKey, {
      embeddings: embeddings as ort.Tensor,
      timestamp: now,
    });

    // Cleanup old cache entries
    if (this.imageEmbeddingsCache.size > this.CACHE_MAX_SIZE) {
      const entries = Array.from(this.imageEmbeddingsCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      this.imageEmbeddingsCache.delete(entries[0][0]);
    }

    return embeddings as ort.Tensor;
  }

  /**
   * Run mask decoder with prompts
   */
  private async runDecoder(
    embeddings: ort.Tensor,
    pointCoords: Float32Array,
    pointLabels: Float32Array
  ): Promise<SAM2Detection> {
    // Prepare decoder inputs
    const feeds: Record<string, ort.Tensor> = {
      image_embeddings: embeddings,
      point_coords: new ort.Tensor('float32', pointCoords, [1, pointCoords.length / 2, 2]),
      point_labels: new ort.Tensor('float32', pointLabels, [1, pointLabels.length]),
    };

    // Run decoder
    const results = await this.decoderSession!.run(feeds);
    
    // Post-process masks
    const masks = this.postprocessMasks(results);
    
    return masks;
  }

  /**
   * Preprocess image to model input format
   */
  private async preprocessImage(
    element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<ort.Tensor> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // SAM expects specific input size (usually 1024x1024)
    const modelSize = this.config.imageSize;
    canvas.width = modelSize;
    canvas.height = modelSize;

    // Draw and resize image
    ctx.drawImage(element, 0, 0, modelSize, modelSize);
    const imageData = ctx.getImageData(0, 0, modelSize, modelSize);

    // Convert to float32 and normalize
    // SAM expects RGB format, normalized to [0, 1]
    const pixels = imageData.data;
    const red: number[] = [];
    const green: number[] = [];
    const blue: number[] = [];

    for (let i = 0; i < pixels.length; i += 4) {
      red.push(pixels[i] / 255.0);
      green.push(pixels[i + 1] / 255.0);
      blue.push(pixels[i + 2] / 255.0);
    }

    // Concatenate in CHW format
    const inputArray = Float32Array.from([...red, ...green, ...blue]);

    return new ort.Tensor('float32', inputArray, [1, 3, modelSize, modelSize]);
  }

  /**
   * Post-process decoder output to masks
   */
  private postprocessMasks(results: Record<string, ort.Tensor>): SAM2Detection {
    // Get masks and scores from output
    const masksOutput = results.masks || results.low_res_masks || results[Object.keys(results)[0]];
    const scoresOutput = results.iou_predictions || results.scores;

    const masksData = masksOutput.data as Float32Array;
    const dims = masksOutput.dims as number[];
    
    // Typically: [batch, num_masks, height, width]
    const [batch, numMasks, height, width] = dims;

    const masks: SAM2Mask[] = [];
    const scores: number[] = scoresOutput ? Array.from(scoresOutput.data as Float32Array) : [1.0];

    // Process each mask
    for (let i = 0; i < numMasks; i++) {
      const maskStart = i * height * width;
      const maskData = new Uint8Array(height * width);
      
      // Threshold mask values
      for (let j = 0; j < height * width; j++) {
        const value = masksData[maskStart + j];
        maskData[j] = value > this.config.maskThreshold ? 255 : 0;
      }

      masks.push({
        data: maskData,
        width,
        height,
        score: scores[i] || 1.0,
      });

      // If not returning multiple masks, just use the first one
      if (!this.config.returnMultipleMasks) break;
    }

    return {
      masks,
      confidence: scores[0] || 1.0,
    };
  }

  /**
   * Generate cache key for an element
   */
  private generateCacheKey(
    element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): string {
    if (element instanceof HTMLVideoElement) {
      return `video-${element.currentTime.toFixed(3)}`;
    } else if (element instanceof HTMLImageElement) {
      return `image-${element.src}`;
    } else {
      return `canvas-${Date.now()}`;
    }
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.imageEmbeddingsCache.clear();
    detectionLogger.debug('🗑️ SAM 2 embedding cache cleared');
  }

  /**
   * Check if models are loaded
   */
  isLoaded(): boolean {
    return this.modelLoaded;
  }

  /**
   * Dispose of the models and free resources
   */
  dispose(): void {
    this.clearCache();
    this.encoderSession = null;
    this.decoderSession = null;
    this.modelLoaded = false;
    detectionLogger.debug('🗑️ SAM 2 models disposed');
  }
}


