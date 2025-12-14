import { useCallback } from "react";
import type { ViewerConfig } from "@/components/videoPoseViewerV2";
import { ANGLE_PRESETS } from "@/components/videoPoseViewerV2";

/**
 * Hook for managing angle measurement configuration.
 * Provides helpers to check if an angle is active and toggle angles on/off.
 */
export function useAngleConfig(
  config: ViewerConfig,
  setConfig: React.Dispatch<React.SetStateAction<ViewerConfig>>
) {
  /**
   * Check if a specific angle preset is currently active (being measured).
   */
  const isAngleActive = useCallback(
    (angle: [number, number, number]) => {
      return config.angles.measuredAngles.some(
        (a) => a[0] === angle[0] && a[1] === angle[1] && a[2] === angle[2]
      );
    },
    [config.angles.measuredAngles]
  );

  /**
   * Toggle a specific angle preset on/off.
   */
  const toggleAngle = useCallback(
    (angle: [number, number, number]) => {
      const existing = config.angles.measuredAngles.findIndex(
        (a) => a[0] === angle[0] && a[1] === angle[1] && a[2] === angle[2]
      );

      if (existing !== -1) {
        // Remove angle
        setConfig((prev) => ({
          ...prev,
          angles: {
            ...prev.angles,
            measuredAngles: prev.angles.measuredAngles.filter(
              (_, i) => i !== existing
            ),
          },
        }));
      } else {
        // Add angle
        setConfig((prev) => ({
          ...prev,
          angles: {
            ...prev.angles,
            measuredAngles: [...prev.angles.measuredAngles, angle],
          },
        }));
      }
    },
    [config.angles.measuredAngles, setConfig]
  );

  /**
   * Set all angles to a specific list (e.g., for "enable all" or "reset").
   */
  const setMeasuredAngles = useCallback(
    (angles: Array<[number, number, number]>) => {
      setConfig((prev) => ({
        ...prev,
        angles: {
          ...prev.angles,
          measuredAngles: angles,
        },
      }));
    },
    [setConfig]
  );

  /**
   * Toggle angle visibility on the overlay.
   */
  const setShowAngles = useCallback(
    (show: boolean) => {
      setConfig((prev) => ({
        ...prev,
        angles: { ...prev.angles, showAngles: show },
      }));
    },
    [setConfig]
  );

  /**
   * Toggle complementary (outer) angle display mode.
   */
  const setUseComplementaryAngles = useCallback(
    (use: boolean) => {
      setConfig((prev) => ({
        ...prev,
        angles: { ...prev.angles, useComplementaryAngles: use },
      }));
    },
    [setConfig]
  );

  /**
   * Toggle decimal precision in angle display.
   */
  const setAnglePrecision = useCallback(
    (precision: number) => {
      setConfig((prev) => ({
        ...prev,
        angles: { ...prev.angles, anglePrecision: precision },
      }));
    },
    [setConfig]
  );

  // Check if any angles are currently active
  const hasActiveAngles = config.angles.measuredAngles.length > 0;

  return {
    // State
    hasActiveAngles,
    showAngles: config.angles.showAngles,
    useComplementaryAngles: config.angles.useComplementaryAngles,
    anglePrecision: config.angles.anglePrecision,
    measuredAngles: config.angles.measuredAngles,

    // Actions
    isAngleActive,
    toggleAngle,
    setMeasuredAngles,
    setShowAngles,
    setUseComplementaryAngles,
    setAnglePrecision,

    // Re-export presets for convenience
    ANGLE_PRESETS,
  };
}
