import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/text-to-speech';
import { logger } from '@/lib/logger';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Ensure this route uses Node.js runtime
export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute for TTS generation

// Initialize S3 client
const isServer = typeof window === 'undefined';
const hasCredentials = isServer && !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

let s3Client: S3Client | null = null;
const BUCKET_NAME = (isServer && process.env.AWS_S3_BUCKET_NAME) || 'sportai-llm-uploads';
const BUCKET_REGION = (isServer && process.env.AWS_REGION) || 'eu-north-1';

if (isServer && hasCredentials) {
  s3Client = new S3Client({
    region: BUCKET_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Check if audio file exists in S3
 */
async function checkAudioExists(key: string): Promise<boolean> {
  if (!s3Client || !hasCredentials) {
    return false;
  }
  
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    // Object doesn't exist
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    // Other errors - log but assume doesn't exist
    logger.error('Error checking S3 object existence:', error);
    return false;
  }
}

/**
 * Upload audio to S3
 */
async function uploadAudioToS3(audioBuffer: Buffer, key: string): Promise<void> {
  if (!s3Client || !hasCredentials) {
    throw new Error('S3 not configured');
  }
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: audioBuffer,
    ContentType: 'audio/mpeg',
    // Set cache control for 7 days
    CacheControl: 'max-age=604800',
  });
  
  await s3Client.send(command);
  logger.info(`[TTS] Uploaded audio to S3: ${key}`);
}

/**
 * Generate presigned download URL for audio
 */
async function getPresignedAudioUrl(key: string): Promise<string> {
  if (!s3Client || !hasCredentials) {
    throw new Error('S3 not configured');
  }
  
  const command = new HeadObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  // Generate presigned URL valid for 7 days
  const url = await getSignedUrl(s3Client, command, { expiresIn: 7 * 24 * 3600 });
  
  // Convert HEAD to GET URL (AWS SDK creates HEAD URLs for HeadObjectCommand)
  // We need to use a custom approach to get the actual download URL
  const getUrl = `https://${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/${key}`;
  
  // Generate GET presigned URL using GetObjectCommand
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const getCommand = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  return await getSignedUrl(s3Client, getCommand, { expiresIn: 7 * 24 * 3600 });
}

export async function POST(request: NextRequest) {
  const requestId = `tts_api_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const startTime = Date.now();
  
  logger.info(`[${requestId}] Received POST request to /api/tts`);
  
  try {
    const body = await request.json();
    const { text, messageId, settings } = body;
    
    logger.debug(`[${requestId}] Request: messageId=${messageId}, text length=${text?.length || 0}, settings=${JSON.stringify(settings || {})}`);
    
    if (!text || typeof text !== 'string') {
      logger.error(`[${requestId}] Validation failed: text is required`);
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }
    
    if (!messageId || typeof messageId !== 'string') {
      logger.error(`[${requestId}] Validation failed: messageId is required`);
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }
    
    // Check if text is too long (Google TTS limit is 5000 characters)
    if (text.length > 5000) {
      logger.warn(`[${requestId}] Text too long: ${text.length} characters`);
      return NextResponse.json(
        { error: 'Text too long. Maximum 5000 characters allowed.' },
        { status: 400 }
      );
    }
    
    // S3 key for cached audio
    const audioKey = `audio/${messageId}.mp3`;
    
    // Check if audio already exists in S3 cache
    if (s3Client && hasCredentials) {
      const exists = await checkAudioExists(audioKey);
      
      if (exists) {
        logger.info(`[${requestId}] Audio found in cache: ${audioKey}`);
        console.log(`[TTS API] 💾 Cache hit for message ${messageId}`);
        
        // Return presigned URL for cached audio
        const audioUrl = await getPresignedAudioUrl(audioKey);
        
        const duration = Date.now() - startTime;
        logger.info(`[${requestId}] Returned cached audio in ${duration}ms`);
        
        return NextResponse.json({ 
          audioUrl,
          cached: true,
        });
      }
    }
    
    // Generate new audio
    logger.info(`[${requestId}] Generating new audio for message ${messageId}`);
    console.log(`[TTS API] 🎤 Generating speech for message ${messageId}`);
    
    const audioBuffer = await synthesizeSpeech(text, settings);
    
    // Try to upload to S3 (non-blocking - if it fails, we still return audio)
    let audioUrl: string | undefined;
    
    if (s3Client && hasCredentials) {
      try {
        await uploadAudioToS3(audioBuffer, audioKey);
        audioUrl = await getPresignedAudioUrl(audioKey);
        logger.info(`[${requestId}] Audio uploaded to S3 successfully`);
      } catch (uploadError) {
        logger.error(`[${requestId}] Failed to upload to S3:`, uploadError);
        console.error('[TTS API] ⚠️ Failed to upload to S3, falling back to inline audio');
        // Fall back to returning base64 audio inline
      }
    }
    
    // If S3 upload failed or S3 not configured, return base64 audio
    if (!audioUrl) {
      const base64Audio = audioBuffer.toString('base64');
      audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
      logger.info(`[${requestId}] Returning inline base64 audio`);
    }
    
    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Request completed in ${duration}ms`);
    console.log(`[TTS API] ✅ Audio generated in ${duration}ms`);
    
    return NextResponse.json({ 
      audioUrl,
      cached: false,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Request failed after ${duration}ms:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate audio';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

