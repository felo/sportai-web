import { useState, useCallback, useRef } from "react";
import {
  validateVideoFile,
  createVideoPreview,
  revokeVideoPreview,
  checkVideoCodecCompatibility,
  isImageFile,
  isWebCodecsSupported,
} from "@/utils/video-utils";
import { transcodeToH264, type TranscodeProgress } from "@/utils/video-transcoder";

export function useVideoUpload() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Transcoding state
  const [isTranscoding, setIsTranscoding] = useState(false);
  const [transcodeProgress, setTranscodeProgress] = useState<TranscodeProgress | null>(null);
  
  // Server-side conversion flag (for Apple QuickTime when client-side fails)
  const [needsServerConversion, setNeedsServerConversion] = useState(false);
  
  // Track the previous preview URL for cleanup
  const previousPreviewRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Internal function to actually set the video file
  const setVideoInternal = useCallback((file: File, serverConversionNeeded = false) => {
    // Clean up previous preview if exists
    if (previousPreviewRef.current) {
      revokeVideoPreview(previousPreviewRef.current);
    }

    setVideoFile(file);
    setError(null);
    setIsTranscoding(false);
    setTranscodeProgress(null);
    setNeedsServerConversion(serverConversionNeeded);
    const previewUrl = createVideoPreview(file);
    setVideoPreview(previewUrl);
    previousPreviewRef.current = previewUrl;
  }, []);

  const processVideoFile = useCallback(async (file: File) => {
    console.log('[useVideoUpload] Processing video file:', file.name, file.type);
    
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      console.log('[useVideoUpload] Validation failed:', validation.error);
      setError(validation.error || "Invalid video file");
      return;
    }

    // Skip compatibility check for images
    if (isImageFile(file)) {
      console.log('[useVideoUpload] File is image, skipping compatibility check');
      setVideoInternal(file, false);
      return;
    }

    // Check video codec compatibility
    try {
      console.log('[useVideoUpload] Starting codec compatibility check...');
      const result = await checkVideoCodecCompatibility(file);
      console.log('[useVideoUpload] Compatibility check result:', result);
      
      // Transcode HEVC videos (can't play at all) AND Apple QuickTime MOV files (for Gemini API compatibility)
      const needsTranscode = result.isHEVC || result.isAppleQuickTime;
      
      // If transcoding needed and we can transcode, start automatic conversion
      if (needsTranscode && isWebCodecsSupported()) {
        const reason = result.isHEVC ? 'HEVC' : 'Apple QuickTime MOV';
        console.log(`[useVideoUpload] ${reason} detected, starting automatic conversion...`);
        setIsTranscoding(true);
        setTranscodeProgress({ stage: 'initializing', percent: 0, message: 'Preparing to convert video...' });
        
        // Create abort controller for cancellation
        const controller = new AbortController();
        abortControllerRef.current = controller;
        
        try {
          const transcodeResult = await transcodeToH264(
            file,
            (progress) => {
              console.log('[useVideoUpload] Transcode progress:', progress);
              setTranscodeProgress(progress);
            },
            controller.signal
          );
          
          if (transcodeResult.success && transcodeResult.file) {
            console.log('[useVideoUpload] Transcoding complete, using converted file');
            setVideoInternal(transcodeResult.file, false); // Already converted, no server conversion needed
          } else {
            console.error('[useVideoUpload] Transcoding failed:', transcodeResult.error);
            // Client-side conversion failed - mark for server-side conversion
            console.log('[useVideoUpload] Client-side conversion failed, marking for server-side conversion');
            setIsTranscoding(false);
            setTranscodeProgress(null);
            setVideoInternal(file, true); // Mark for server-side conversion
          }
        } catch (transcodeErr) {
          if ((transcodeErr as Error).message === 'Transcoding cancelled') {
            console.log('[useVideoUpload] Transcoding was cancelled');
          } else {
            console.error('[useVideoUpload] Transcoding error:', transcodeErr);
            // Client-side conversion failed - mark for server-side conversion
            console.log('[useVideoUpload] Client-side conversion failed, marking for server-side conversion');
            setVideoInternal(file, true); // Mark for server-side conversion
          }
          setIsTranscoding(false);
          setTranscodeProgress(null);
        }
      } else if (needsTranscode && !isWebCodecsSupported()) {
        // Transcoding needed but can't transcode client-side - use server-side conversion
        const reason = result.isHEVC ? 'HEVC' : 'Apple QuickTime';
        console.log(`[useVideoUpload] ${reason} detected, WebCodecs not supported, marking for server-side conversion`);
        setVideoInternal(file, true); // Mark for server-side conversion
      } else {
        // Standard MP4/video - proceed normally
        console.log('[useVideoUpload] Proceeding with file');
        setVideoInternal(file, false);
      }
    } catch (err) {
      // If compatibility check fails, proceed anyway
      console.warn("[useVideoUpload] Compatibility check failed, proceeding with file:", err);
      setVideoInternal(file, false);
    }
  }, [setVideoInternal]);

  const clearVideo = useCallback((keepBlobUrl = false) => {
    // Cancel any ongoing transcoding
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // If keepBlobUrl is true, don't revoke the blob URL (it's still referenced in a message)
    if (previousPreviewRef.current && !keepBlobUrl) {
      revokeVideoPreview(previousPreviewRef.current);
      previousPreviewRef.current = null;
    }
    setVideoFile(null);
    setVideoPreview(null);
    setIsTranscoding(false);
    setTranscodeProgress(null);
    setNeedsServerConversion(false);
  }, []);

  const handleVideoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processVideoFile(file);
      }
      // Reset the input value so the same file can be selected again
      e.target.value = '';
    },
    [processVideoFile]
  );

  // Cancel ongoing transcoding
  const cancelTranscoding = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTranscoding(false);
    setTranscodeProgress(null);
  }, []);

  return {
    videoFile,
    videoPreview,
    error,
    setError,
    processVideoFile,
    clearVideo,
    handleVideoChange,
    // Transcoding state
    isTranscoding,
    transcodeProgress,
    cancelTranscoding,
    // Server-side conversion flag (for Apple QuickTime when client-side fails)
    needsServerConversion,
  };
}

