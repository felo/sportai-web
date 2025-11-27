import { useState, useCallback, useRef } from "react";
import {
  validateVideoFile,
  createVideoPreview,
  revokeVideoPreview,
  checkVideoCodecCompatibility,
  isImageFile,
} from "@/utils/video-utils";

export function useVideoUpload() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Server-side conversion flag (for HEVC/Apple QuickTime that need conversion)
  const [needsServerConversion, setNeedsServerConversion] = useState(false);
  
  // Track the previous preview URL for cleanup
  const previousPreviewRef = useRef<string | null>(null);

  // Internal function to actually set the video file
  const setVideoInternal = useCallback((file: File, serverConversionNeeded = false) => {
    // Clean up previous preview if exists
    if (previousPreviewRef.current) {
      revokeVideoPreview(previousPreviewRef.current);
    }

    setVideoFile(file);
    setError(null);
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
      
      // HEVC or Apple QuickTime MOV files need server-side conversion for Gemini API compatibility
      const needsConversion = result.isHEVC || result.isAppleQuickTime;
      
      if (needsConversion) {
        const reason = result.isHEVC ? 'HEVC' : 'Apple QuickTime MOV';
        console.log(`[useVideoUpload] ${reason} detected, marking for server-side conversion`);
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
    // If keepBlobUrl is true, don't revoke the blob URL (it's still referenced in a message)
    if (previousPreviewRef.current && !keepBlobUrl) {
      revokeVideoPreview(previousPreviewRef.current);
      previousPreviewRef.current = null;
    }
    setVideoFile(null);
    setVideoPreview(null);
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

  return {
    videoFile,
    videoPreview,
    error,
    setError,
    processVideoFile,
    clearVideo,
    handleVideoChange,
    // Server-side conversion flag (for HEVC/Apple QuickTime that need conversion)
    needsServerConversion,
  };
}

