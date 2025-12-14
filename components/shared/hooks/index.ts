// Frame-based thumbnail capture (for video player)
export {
  useThumbnail,
  useThumbnailByFrame,
  requestThumbnailCapture,
  requestThumbnailCaptureByFrame,
  getCachedThumbnail,
  getCachedThumbnailByFrame,
  hasCachedThumbnail,
  clearThumbnailCache,
  getThumbnailCacheSize,
  getCacheKey,
  getCacheKeyByFrame,
  type ThumbnailOptions,
} from "./useThumbnailCache";

// URL-based thumbnail loading (for task grid)
export { useUrlThumbnail } from "./useUrlThumbnail";
export type { UseUrlThumbnailOptions, UseUrlThumbnailReturn } from "./useUrlThumbnail";
