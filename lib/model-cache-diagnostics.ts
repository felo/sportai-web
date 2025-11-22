/**
 * Diagnostic utilities for TensorFlow.js model caching
 */

import * as tf from "@tensorflow/tfjs";

export interface CacheDiagnostics {
  indexedDBAvailable: boolean;
  cachedModels: string[];
  cacheSize: number;
  browserCacheEnabled: boolean;
  cacheAPIAvailable: boolean;
  cacheAPIEntries?: number;
  storageQuota?: {
    usage: number;
    quota: number;
    percentUsed: number;
  };
}

/**
 * Check if IndexedDB is available and working
 */
export async function checkIndexedDBAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  
  try {
    // Try to open a test database
    return await new Promise((resolve) => {
      const request = indexedDB.open("test-db", 1);
      request.onsuccess = () => {
        indexedDB.deleteDatabase("test-db");
        resolve(true);
      };
      request.onerror = () => resolve(false);
      request.onblocked = () => resolve(false);
    });
  } catch (err) {
    console.error("IndexedDB check failed:", err);
    return false;
  }
}

/**
 * Get storage quota information
 */
export async function getStorageQuota() {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentUsed: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
    };
  } catch (err) {
    console.error("Failed to get storage quota:", err);
    return null;
  }
}

/**
 * List all cached TensorFlow.js models
 */
export async function listCachedModels(): Promise<string[]> {
  try {
    const models = await tf.io.listModels();
    return Object.keys(models);
  } catch (err) {
    console.error("Failed to list models:", err);
    return [];
  }
}

/**
 * Check if Cache API is available and count entries
 */
export async function checkCacheAPI(): Promise<{ available: boolean; entries?: number }> {
  if (typeof caches === "undefined") {
    return { available: false };
  }

  try {
    // List all cache names
    const cacheNames = await caches.keys();
    console.log("🗄️ Browser Cache API names:", cacheNames);
    
    let totalEntries = 0;
    
    // Check each cache for TensorFlow.js related entries
    for (const cacheName of cacheNames) {
      try {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        // Filter for TensorFlow.js related URLs
        const tfRequests = requests.filter(req => 
          req.url.includes('tfhub.dev') || 
          req.url.includes('tensorflow') ||
          req.url.includes('tfjs') ||
          req.url.includes('storage.googleapis.com')
        );
        
        if (tfRequests.length > 0) {
          console.log(`📦 Cache "${cacheName}": ${tfRequests.length} TensorFlow.js entries`);
          totalEntries += tfRequests.length;
        }
      } catch (err) {
        console.warn(`Failed to check cache "${cacheName}":`, err);
      }
    }
    
    return { available: true, entries: totalEntries };
  } catch (err) {
    console.error("Failed to check Cache API:", err);
    return { available: true, entries: 0 };
  }
}

/**
 * Get comprehensive cache diagnostics
 */
export async function getCacheDiagnostics(): Promise<CacheDiagnostics> {
  const indexedDBAvailable = await checkIndexedDBAvailable();
  const cachedModels = await listCachedModels();
  const storageQuota = await getStorageQuota();
  const cacheAPICheck = await checkCacheAPI();

  return {
    indexedDBAvailable,
    cachedModels,
    cacheSize: cachedModels.length,
    browserCacheEnabled: true, // Assume true if we're in a browser
    cacheAPIAvailable: cacheAPICheck.available,
    cacheAPIEntries: cacheAPICheck.entries,
    storageQuota: storageQuota || undefined,
  };
}

/**
 * Clear all cached TensorFlow.js models
 */
export async function clearAllModelCache(): Promise<number> {
  try {
    const models = await tf.io.listModels();
    const modelKeys = Object.keys(models);
    
    for (const key of modelKeys) {
      await tf.io.removeModel(key);
      console.log(`🗑️ Cleared cached model: ${key}`);
    }
    
    return modelKeys.length;
  } catch (err) {
    console.error("Failed to clear model cache:", err);
    return 0;
  }
}

/**
 * Monitor model loading and cache status
 */
export function monitorModelLoading() {
  if (typeof window === "undefined") return;

  // Log when models are accessed
  console.log("🔍 Model cache monitor initialized");
  
  // Check cache periodically
  const checkInterval = setInterval(async () => {
    const models = await listCachedModels();
    console.log(`📊 Cache check: ${models.length} models cached`);
  }, 10000); // Check every 10 seconds

  // Cleanup function
  return () => clearInterval(checkInterval);
}

