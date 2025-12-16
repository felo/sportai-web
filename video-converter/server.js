/**
 * SportAI Video Converter Service
 * 
 * FFmpeg-based video conversion server for converting Apple QuickTime MOV
 * files to H.264 MP4 for Gemini API compatibility.
 */

const express = require('express');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 3001;
const API_SECRET = process.env.API_SECRET;
const AWS_REGION = process.env.AWS_REGION || 'eu-north-1';
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'sportai-llm-uploads';
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB limit

// Initialize S3 client
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!API_SECRET) {
    console.warn('[Auth] API_SECRET not configured, skipping authentication');
    return next();
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  
  const token = authHeader.substring(7);
  if (token !== API_SECRET) {
    return res.status(403).json({ error: 'Invalid API secret' });
  }
  
  next();
};

/**
 * Download file from S3 to local temp directory
 */
async function downloadFromS3(key) {
  console.log(`[S3] Downloading: ${key}`);
  
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  const response = await s3Client.send(command);
  
  // Check file size from content length
  const contentLength = response.ContentLength;
  if (contentLength > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(contentLength / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }
  
  // Create temp file path
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `input_${uuidv4()}${path.extname(key) || '.mov'}`);
  
  // Stream to file
  const writeStream = fs.createWriteStream(tempFile);
  
  await new Promise((resolve, reject) => {
    response.Body.pipe(writeStream)
      .on('finish', resolve)
      .on('error', reject);
  });
  
  console.log(`[S3] Downloaded to: ${tempFile} (${(contentLength / 1024 / 1024).toFixed(2)}MB)`);
  return { tempFile, contentType: response.ContentType };
}

/**
 * Convert video to H.264 MP4 using FFmpeg
 */
async function convertVideo(inputPath, onProgress) {
  const outputPath = inputPath.replace(/\.[^.]+$/, '_converted.mp4');
  
  console.log(`[FFmpeg] Converting: ${inputPath} -> ${outputPath}`);
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-vf', 'scale=1920:-2',  // Downscale to 1080p width (height auto, even number)
        '-c:v libx264',      // H.264 video codec
        '-preset fast',       // Encoding speed/quality tradeoff
        '-crf 23',            // Quality (18-28 is good range)
        '-c:a aac',           // AAC audio codec
        '-b:a 128k',          // Audio bitrate
        '-movflags +faststart', // Optimize for web streaming
        '-y',                 // Overwrite output
      ])
      .output(outputPath)
      .on('start', (cmd) => {
        console.log(`[FFmpeg] Command: ${cmd}`);
      })
      .on('progress', (progress) => {
        const percent = progress.percent || 0;
        console.log(`[FFmpeg] Progress: ${percent.toFixed(1)}%`);
        if (onProgress) onProgress(percent);
      })
      .on('end', () => {
        console.log(`[FFmpeg] Conversion complete: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`[FFmpeg] Error: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

/**
 * Upload converted file to S3
 */
async function uploadToS3(localPath, originalKey) {
  // Generate new key with _converted suffix
  const keyParts = originalKey.split('/');
  const fileName = keyParts.pop();
  const newFileName = fileName.replace(/\.[^.]+$/, '_converted.mp4');
  const newKey = [...keyParts, newFileName].join('/');
  
  console.log(`[S3] Uploading converted file: ${newKey}`);
  
  const fileBuffer = fs.readFileSync(localPath);
  const fileSize = fileBuffer.length;
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: newKey,
    Body: fileBuffer,
    ContentType: 'video/mp4',
  });
  
  await s3Client.send(command);
  
  // Generate presigned download URL (valid for 7 days)
  const downloadCommand = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: newKey,
  });
  const downloadUrl = await getSignedUrl(s3Client, downloadCommand, { expiresIn: 7 * 24 * 3600 });
  
  const publicUrl = `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${newKey}`;
  
  console.log(`[S3] Uploaded: ${newKey} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
  
  return { key: newKey, publicUrl, downloadUrl, size: fileSize };
}

/**
 * Clean up temporary files
 */
function cleanup(...files) {
  for (const file of files) {
    try {
      if (file && fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`[Cleanup] Deleted: ${file}`);
      }
    } catch (err) {
      console.warn(`[Cleanup] Failed to delete ${file}: ${err.message}`);
    }
  }
}

/**
 * POST /convert
 * 
 * Convert a video from S3 to H.264 MP4
 * 
 * Body: { key: string } - S3 object key
 * Returns: { success: boolean, key: string, publicUrl: string, downloadUrl: string }
 */
app.post('/convert', authenticate, async (req, res) => {
  const { key } = req.body;
  const requestId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  console.log(`[${requestId}] Conversion request for: ${key}`);
  
  if (!key) {
    return res.status(400).json({ error: 'Missing required field: key' });
  }
  
  let inputPath = null;
  let outputPath = null;
  
  try {
    // Step 1: Download from S3
    console.log(`[${requestId}] Step 1: Downloading from S3...`);
    const { tempFile } = await downloadFromS3(key);
    inputPath = tempFile;
    
    // Step 2: Convert with FFmpeg
    console.log(`[${requestId}] Step 2: Converting video...`);
    outputPath = await convertVideo(inputPath, (progress) => {
      // Progress callback - could be used for SSE/WebSocket updates
    });
    
    // Step 3: Upload to S3
    console.log(`[${requestId}] Step 3: Uploading converted video...`);
    const result = await uploadToS3(outputPath, key);
    
    // Step 4: Cleanup
    console.log(`[${requestId}] Step 4: Cleaning up temp files...`);
    cleanup(inputPath, outputPath);
    
    console.log(`[${requestId}] Conversion complete!`);
    
    res.json({
      success: true,
      originalKey: key,
      convertedKey: result.key,
      publicUrl: result.publicUrl,
      downloadUrl: result.downloadUrl,
      size: result.size,
    });
    
  } catch (err) {
    console.error(`[${requestId}] Conversion failed: ${err.message}`);
    
    // Cleanup on error
    cleanup(inputPath, outputPath);
    
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[Server] SportAI Video Converter running on port ${PORT}`);
  console.log(`[Server] AWS Region: ${AWS_REGION}`);
  console.log(`[Server] S3 Bucket: ${BUCKET_NAME}`);
  console.log(`[Server] API Auth: ${API_SECRET ? 'enabled' : 'disabled'}`);
});


