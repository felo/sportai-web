import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { logger } from './logger';

// Check if we're on the server-side
const isServer = typeof window === 'undefined';

// Only initialize on server-side
let ttsClient: TextToSpeechClient | null = null;

if (isServer) {
  try {
    // Priority order for authentication:
    // 1. Service account credentials as JSON string (GOOGLE_CLOUD_CREDENTIALS)
    // 2. Service account credentials file path (GOOGLE_APPLICATION_CREDENTIALS)
    // 3. API key (GOOGLE_CLOUD_TTS_API_KEY or GEMINI_API_KEY)
    
    const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY || process.env.GEMINI_API_KEY;
    
    if (credentialsJson) {
      // Option 1: Service account credentials as JSON string (best for hosting platforms)
      try {
        const parsedCredentials = JSON.parse(credentialsJson);
        ttsClient = new TextToSpeechClient({
          credentials: parsedCredentials,
        });
        logger.info("TTS Client initialized with service account credentials (JSON)");
      } catch (parseError) {
        logger.error("Failed to parse GOOGLE_CLOUD_CREDENTIALS:", parseError);
      }
    } else if (credentialsPath) {
      // Option 2: Service account credentials from file path (good for local dev)
      ttsClient = new TextToSpeechClient();
      logger.info("TTS Client initialized with service account credentials (file path)");
    } else if (apiKey) {
      // Option 3: API key (simpler but less secure)
      ttsClient = new TextToSpeechClient({
        apiKey: apiKey,
      });
      logger.info("TTS Client initialized with API key");
    } else {
      logger.warn("No TTS credentials configured. Set GOOGLE_CLOUD_CREDENTIALS, GOOGLE_APPLICATION_CREDENTIALS, or GOOGLE_CLOUD_TTS_API_KEY.");
    }
  } catch (error) {
    logger.error("Failed to initialize TTS client:", error);
  }
}

/**
 * Synthesize speech from text using Google Cloud Text-to-Speech
 * @param text - Text to convert to speech
 * @param settings - Optional TTS settings (quality, gender, language, rate, pitch)
 * @returns Audio buffer in MP3 format
 */
export async function synthesizeSpeech(text: string, settings?: {
  quality?: string;
  gender?: string;
  language?: string;
  speakingRate?: number;
  pitch?: number;
}): Promise<Buffer> {
  const requestId = `tts_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  if (!isServer) {
    throw new Error('synthesizeSpeech can only be called server-side');
  }
  
  if (!ttsClient) {
    throw new Error('TTS client not initialized. Please configure GOOGLE_CLOUD_TTS_API_KEY or GEMINI_API_KEY.');
  }
  
  logger.info(`[${requestId}] Synthesizing speech for text: ${text.length} characters`);
  
  try {
    // Strip markdown formatting for better speech synthesis
    const cleanedText = stripMarkdown(text);
    
    logger.debug(`[${requestId}] Cleaned text: ${cleanedText.length} characters`);
    
    // Default settings
    const quality = settings?.quality || 'neural2';
    const gender = settings?.gender || 'female';
    const language = settings?.language || 'en-US';
    const speakingRate = settings?.speakingRate ?? 1.0;
    const pitch = settings?.pitch ?? 0.0;
    
    // Studio voices have specific names and limited availability
    // Map Studio voices to available voice codes
    const studioVoiceMap: Record<string, Record<string, string>> = {
      'en-US': {
        'male': 'en-US-Studio-M',
        'female': 'en-US-Studio-O',
        'neutral': 'en-US-Studio-Q',
      },
      'en-GB': {
        'male': 'en-GB-Studio-B',
        'female': 'en-GB-Studio-C',
        'neutral': 'en-GB-Studio-B',
      },
      'fr-FR': {
        'male': 'fr-FR-Studio-D',
        'female': 'fr-FR-Studio-A',
        'neutral': 'fr-FR-Studio-A',
      },
    };
    
    let voiceName: string;
    let ssmlGender: string;
    
    if (quality === 'studio') {
      // Use specific Studio voice names
      const languageVoices = studioVoiceMap[language];
      if (languageVoices && languageVoices[gender]) {
        voiceName = languageVoices[gender];
        ssmlGender = gender === 'male' ? 'MALE' :
                     gender === 'female' ? 'FEMALE' :
                     'NEUTRAL';
      } else {
        // Fallback to Neural2 if Studio voice not available for this language/gender
        logger.warn(`[${requestId}] Studio voice not available for ${language}/${gender}, falling back to Neural2`);
        const genderSuffix = gender === 'male' ? 'B' :
                             gender === 'female' ? 'F' :
                             'D';
        voiceName = `${language}-Neural2-${genderSuffix}`;
        ssmlGender = gender === 'male' ? 'MALE' :
                     gender === 'female' ? 'FEMALE' :
                     'NEUTRAL';
      }
    } else {
      // Standard, WaveNet, and Neural2 voices follow consistent naming
      const qualityPrefix = quality === 'standard' ? 'Standard' : 
                            quality === 'wavenet' ? 'Wavenet' :
                            'Neural2';
      
      const genderSuffix = gender === 'male' ? 'B' :
                           gender === 'female' ? 'F' :
                           'D'; // Neutral
      
      voiceName = `${language}-${qualityPrefix}-${genderSuffix}`;
      ssmlGender = gender === 'male' ? 'MALE' :
                   gender === 'female' ? 'FEMALE' :
                   'NEUTRAL';
    }
    
    logger.debug(`[${requestId}] Using voice: ${voiceName} (${ssmlGender}), rate: ${speakingRate}, pitch: ${pitch}`);
    
    // Request speech synthesis
    const [response] = await ttsClient.synthesizeSpeech({
      input: { text: cleanedText },
      voice: {
        languageCode: language,
        name: voiceName,
        ssmlGender: ssmlGender as 'MALE' | 'FEMALE' | 'NEUTRAL',
      },
      audioConfig: {
        audioEncoding: 'MP3' as const,
        speakingRate,
        pitch,
      },
    });
    
    if (!response.audioContent) {
      throw new Error('No audio content in response');
    }
    
    // Convert Uint8Array to Buffer
    const audioBuffer = Buffer.from(response.audioContent as Uint8Array);
    
    logger.info(`[${requestId}] Speech synthesized successfully: ${(audioBuffer.length / 1024).toFixed(2)} KB`);
    
    return audioBuffer;
  } catch (error) {
    logger.error(`[${requestId}] Failed to synthesize speech:`, error);
    
    throw new Error(
      error instanceof Error
        ? `Failed to synthesize speech: ${error.message}`
        : 'Failed to synthesize speech'
    );
  }
}

/**
 * Strip markdown formatting from text for better TTS
 * @param text - Markdown text
 * @returns Plain text
 */
function stripMarkdown(text: string): string {
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove headers (keep text)
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove links (keep text)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    // Remove blockquotes
    .replace(/^>\s+(.+)$/gm, '$1')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

