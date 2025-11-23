# Model Caching Investigation & Fixes

## Problem Statement

User reported that pose detection models appear to be downloading every time the page is refreshed, suggesting that caching is not working properly.

## Investigation

### How TensorFlow.js Caching Works

1. **IndexedDB Storage**: TensorFlow.js can save models to IndexedDB using `model.save('indexeddb://...')`
2. **HTTP Cache (Browser Cache API)**: Models loaded from HTTP URLs are cached by the browser's Cache API
3. **In-Memory Cache**: Our implementation uses a JavaScript Map for detector instances (only persists during page session)

### The Issue

The `detectorCache` in `hooks/usePoseDetection.ts` is an in-memory Map that gets cleared on every page refresh. While this cache prevents re-initialization within a single session, it doesn't persist across page reloads.

**However**, the actual TensorFlow.js models should still be cached by the browser's HTTP Cache API, so model files shouldn't need to be re-downloaded even if the detector is recreated.

## What I've Implemented

### 1. Enhanced Logging (`hooks/usePoseDetection.ts`)

Added comprehensive logging to track:
- Which models are cached in IndexedDB
- Whether models are found in cache or need to be downloaded
- Network traffic during model loading (bytes transferred)
- Load times and cache hit/miss indicators

**Key logs to watch for:**
```
📦 TensorFlow.js cached models: [array of cached models]
✅ Model movenet-... found in cache
OR
❌ Model movenet-... NOT found in cache, will download
🌐 Network: X requests, Y MB loaded
✅ Minimal network traffic - model likely loaded from cache
OR
⚠️ Large download detected! Model was likely NOT loaded from cache.
```

### 2. Network Monitoring

Implemented a fetch interceptor that monitors TensorFlow.js model downloads in real-time:
- Tracks number of network requests
- Measures bytes downloaded
- Distinguishes between cache hits (minimal traffic) and full downloads (6-13MB)

### 3. Cache Diagnostics Tool (`lib/model-cache-diagnostics.ts`)

Created a comprehensive diagnostics module that checks:
- **IndexedDB Availability**: Whether IndexedDB is accessible
- **Cache API Availability**: Whether browser Cache API is available
- **Cached Models**: List of models stored in IndexedDB
- **Cache API Entries**: Number of TensorFlow.js files in HTTP cache
- **Storage Quota**: Used vs available storage space

### 4. Demo Page Diagnostics (`app/pose-demo/page.tsx`)

Enhanced the pose demo page with a live diagnostics panel showing:
- IndexedDB status
- Cache API status
- Number of cached models
- HTTP cache entries count
- Storage usage
- Detailed test instructions

## How to Test

### Step 1: Initial Load
1. Open the page at `/pose-demo`
2. Open browser DevTools (F12) and go to Console tab
3. Check the diagnostics panel - it should show 0 cached models initially
4. Load a video file
5. Watch the console logs:
   - You should see `⏳ Creating new detector...`
   - Then `🌐 Network: X requests, Y MB loaded` (6-13MB on first load)
   - Finally `✅ Model loaded in X.XXs`

### Step 2: Page Refresh (Critical Test)
1. Refresh the page (Cmd+R / Ctrl+R)
2. Check diagnostics panel:
   - Does it show cached models?
   - Does it show HTTP cache entries?
3. Load a video again
4. Watch console logs:
   - Network traffic should be minimal (< 1MB)
   - You should see "model likely loaded from cache"

### Step 3: Hard Refresh
1. Do a hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
2. This clears browser caches
3. Load a video
4. Should see full download again (6-13MB)

## Expected Behavior

### ✅ Caching Working Properly
- **First load**: 6-13MB download, 3-5 seconds load time
- **Subsequent loads**: <1MB traffic, 1-2 seconds load time
- Diagnostics shows cached models or HTTP cache entries after first load
- Console logs "loaded from cache" or "minimal network traffic"

### ❌ Caching NOT Working
- **Every load**: 6-13MB download, 3-5 seconds load time
- No cached models shown in diagnostics after first load
- Console always shows "Large download detected"

## Possible Issues & Solutions

### Issue 1: Browser in Incognito/Private Mode
**Symptom**: Nothing gets cached, diagnostics always show 0
**Solution**: Use normal browsing mode

### Issue 2: Browser Cache Disabled
**Symptom**: Models download fully every time
**Solution**: Check browser settings, enable cache

### Issue 3: IndexedDB Quota Exceeded
**Symptom**: Diagnostics shows high storage usage (>90%)
**Solution**: Clear browser data or increase quota

### Issue 4: Service Worker Interference
**Symptom**: Inconsistent caching behavior
**Solution**: Check for service workers in DevTools > Application tab

### Issue 5: CORS or Network Issues
**Symptom**: Models fail to load or cache
**Solution**: Check network tab for failed requests

## Browser Compatibility

### Caching Support by Browser
- ✅ **Chrome/Edge**: Full support for IndexedDB and Cache API
- ✅ **Firefox**: Full support for IndexedDB and Cache API
- ✅ **Safari**: Full support, but may have stricter quota limits
- ⚠️ **Mobile Browsers**: May have aggressive cache clearing

## Technical Details

### Model Sizes (Approximate)
- **MoveNet Lightning**: ~6MB
- **MoveNet Thunder**: ~13MB
- **BlazePose Lite**: ~4MB
- **BlazePose Full**: ~7MB
- **BlazePose Heavy**: ~12MB

### Cache Locations
1. **Browser Cache API**: `caches.open('tensorflow-models')` or similar
2. **IndexedDB**: `indexeddb://model-name` (if explicitly saved)
3. **HTTP Cache**: Browser's native HTTP caching

### Why Models Might Not Cache
1. **HTTP Headers**: If TensorFlow Hub serves models with `Cache-Control: no-cache`
2. **CORS**: Cross-origin restrictions might prevent caching
3. **Browser Settings**: User's cache settings or extensions
4. **Storage Quota**: Not enough space to save models

## Next Steps

After testing with the diagnostics tool, we can:
1. Confirm if caching is actually broken or just appears to be
2. Implement explicit model saving to IndexedDB if needed
3. Add a "Download All Models" button for pre-loading
4. Implement model versioning to handle updates

## Conclusion

The diagnostics tools now provide complete visibility into the caching system. Please test using the steps above and report what you observe in the console logs and diagnostics panel.

---

**Created**: November 22, 2025  
**Last Updated**: November 22, 2025



