import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";

let tfInitialized = false;
let tfInitPromise: Promise<void> | null = null;

/**
 * Initialize TensorFlow.js backend once and reuse across all detection hooks
 * This prevents multiple backend initializations which can slow down mobile
 */
export async function initializeTensorFlow(): Promise<void> {
  if (tfInitialized) {
    console.log("✅ TensorFlow.js already initialized");
    return;
  }
  
  if (tfInitPromise) {
    console.log("⏳ TensorFlow.js initialization in progress...");
    return tfInitPromise;
  }
  
  console.log("🔧 Initializing TensorFlow.js backend...");
  tfInitPromise = (async () => {
    await tf.setBackend("webgl");
    await tf.ready();
    tfInitialized = true;
    console.log("✅ TensorFlow.js WebGL backend initialized");
    console.log("🔧 Platform:", tf.env().platformName);
    console.log("🔧 Backend:", tf.getBackend());
  })();
  
  return tfInitPromise;
}

/**
 * Reset initialization state (useful for testing or manual reinitialization)
 */
export function resetTensorFlowInitialization(): void {
  tfInitialized = false;
  tfInitPromise = null;
}

