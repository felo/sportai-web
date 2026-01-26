/**
 * Data Processing Utilities
 *
 * Pure functions for signal processing: filling drops, smoothing, and peak detection.
 */

/**
 * Fill in dropped measurements (pose detection artifacts) and smooth.
 *
 * Strategy:
 * 1. Fill ONLY obvious single-frame artifact drops (physically implausible sudden drops)
 * 2. Apply light Gaussian smoothing for a cleaner curve
 *
 * IMPORTANT: We do NOT interpolate between peaks or fill valleys.
 * Real motion data has legitimate peaks AND valleys - we must preserve them.
 * Only single-frame drops that are physically impossible are filled.
 */
export function fillDrops(
  data: (number | null)[],
  _dropThreshold: number = 0.6  // Unused, kept for API compatibility
): (number | null)[] {
  if (data.length < 5) return [...data];

  let result = [...data];

  // Pass 1: Fill ONLY single-frame artifact drops
  // These are sudden single-frame decreases that are physically impossible
  // (e.g., wrist velocity can't drop 80% and recover in one frame)
  for (let i = 1; i < result.length - 1; i++) {
    const prev = result[i - 1];
    const curr = result[i];
    const next = result[i + 1];

    if (prev === null || curr === null || next === null) continue;

    // Only fill if:
    // 1. Current value is very low compared to BOTH neighbors (artifact, not real valley)
    // 2. Both neighbors are similar (ruling out transitions)
    // 3. The drop is severe (< 30% of neighbor average)
    const neighborAvg = (prev + next) / 2;
    const neighborDiff = Math.abs(prev - next);
    const isSevereArtifact = curr < neighborAvg * 0.3 &&
                             neighborDiff < neighborAvg * 0.5 && // Neighbors are similar
                             neighborAvg > 5; // Only meaningful signals

    if (isSevereArtifact) {
      result[i] = neighborAvg;
    }
  }

  // Pass 2: Light Gaussian smoothing (single pass, smaller kernel)
  // This reduces noise without distorting the signal shape
  const smoothed: (number | null)[] = [];
  const weights = [0.1, 0.2, 0.4, 0.2, 0.1]; // 5-frame kernel (lighter than before)
  const halfKernel = Math.floor(weights.length / 2);

  for (let i = 0; i < result.length; i++) {
    if (result[i] === null) {
      smoothed.push(null);
      continue;
    }

    let sum = 0;
    let weightSum = 0;

    for (let k = -halfKernel; k <= halfKernel; k++) {
      const idx = i + k;
      if (idx >= 0 && idx < result.length && result[idx] !== null) {
        const weight = weights[k + halfKernel];
        sum += result[idx]! * weight;
        weightSum += weight;
      }
    }

    smoothed.push(weightSum > 0 ? sum / weightSum : result[i]);
  }

  return smoothed;
}

/**
 * Apply moving average smoothing
 */
export function smoothData(
  data: (number | null)[],
  windowSize: number
): (number | null)[] {
  const result: (number | null)[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < data.length; i++) {
    if (data[i] === null) {
      result.push(null);
      continue;
    }

    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - halfWindow); j <= Math.min(data.length - 1, i + halfWindow); j++) {
      if (data[j] !== null) {
        sum += data[j]!;
        count++;
      }
    }
    result.push(count > 0 ? sum / count : null);
  }

  return result;
}

/**
 * Find local maxima (peaks) in data
 */
export function findPeaks(
  data: (number | null)[],
  minValue: number,
  minDistance: number
): number[] {
  const peaks: number[] = [];

  for (let i = 1; i < data.length - 1; i++) {
    const curr = data[i];
    const prev = data[i - 1];
    const next = data[i + 1];

    if (curr === null || prev === null || next === null) continue;
    if (curr < minValue) continue;
    if (curr <= prev || curr <= next) continue;

    // Check distance from last peak
    if (peaks.length > 0) {
      const lastPeak = peaks[peaks.length - 1];
      if (i - lastPeak < minDistance) {
        // Keep the higher peak
        if (curr > (data[lastPeak] ?? 0)) {
          peaks.pop();
          peaks.push(i);
        }
        continue;
      }
    }

    peaks.push(i);
  }

  return peaks;
}
