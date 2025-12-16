import { useState, useCallback, useRef } from "react";
import { videoLogger } from "@/lib/logger";
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
  
  // File size limit modal state
  const [showFileSizeLimitModal, setShowFileSizeLimitModal] = useState(false);
  
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
    videoLogger.debug('[useVideoUpload] Processing video file:', file.name, file.type);
    
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      videoLogger.debug('[useVideoUpload] Validation failed:', validation.errorType, validation.error);
      
      // Show modal for file size limit, callout for other errors
      if (validation.errorType === 'file_size_limit') {
        setShowFileSizeLimitModal(true);
        return;
      }
      
      setError(validation.error || "Invalid video file");
      return;
    }

    // Skip compatibility check for images
    if (isImageFile(file)) {
      videoLogger.debug('[useVideoUpload] File is image, skipping compatibility check');
      setVideoInternal(file, false);
      return;
    }

    // Check if this is an Apple/iPhone video that needs conversion
    // Convert ALL .mov files and video/quicktime MIME types since they often cause
    // compatibility issues with Gemini API, regardless of codec detection
    const isMOVFile = file.name.toLowerCase().endsWith('.mov');
    const isQuickTime = file.type === 'video/quicktime';
    
    if (isMOVFile || isQuickTime) {
      videoLogger.debug('[useVideoUpload] MOV/QuickTime file detected, marking for server-side conversion');
      setVideoInternal(file, true);
      return;
    }
    
    // Check video codec compatibility for other formats (MP4, etc.)
    try {
      videoLogger.debug('[useVideoUpload] Starting codec compatibility check...');
      const result = await checkVideoCodecCompatibility(file);
      videoLogger.debug('[useVideoUpload] Compatibility check result:', result);
      
      // HEVC videos need server-side conversion for Gemini API compatibility
      if (result.isHEVC) {
        videoLogger.debug('[useVideoUpload] HEVC detected, marking for server-side conversion');
        setVideoInternal(file, true);
      } else {
        // Standard MP4/video - proceed normally
        videoLogger.debug('[useVideoUpload] Proceeding with file');
        setVideoInternal(file, false);
      }
    } catch (err) {
      // If compatibility check fails, proceed anyway
      videoLogger.warn("[useVideoUpload] Compatibility check failed, proceeding with file:", err);
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
    // File size limit modal state
    showFileSizeLimitModal,
    setShowFileSizeLimitModal,
  };
}

