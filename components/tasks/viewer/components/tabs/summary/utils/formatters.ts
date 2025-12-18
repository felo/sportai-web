/**
 * Format duration in mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format distance in km with 1 decimal
 */
export function formatDistanceKm(meters: number): string {
  return meters > 0 
    ? `${(meters / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km` 
    : "-";
}

/**
 * Format distance in meters
 */
export function formatDistanceM(meters: number): string {
  return meters > 0 ? `${Math.round(meters)} m` : "-";
}

/**
 * Format rally length in seconds
 */
export function formatRallyLength(seconds: number): string {
  return seconds > 0 ? `${seconds.toFixed(1)}s` : "-";
}

/**
 * Format shots per rally
 */
export function formatShotsPerRally(value: number): string {
  return value > 0 ? value.toFixed(1) : "-";
}

/**
 * Format rally intensity (shots/s)
 */
export function formatIntensity(value: number): string {
  return value > 0 ? `${value.toFixed(2)} shots/s` : "-";
}








