import { useState, useCallback } from "react";

interface UseAngleMeasurementProps {
  initialShowAngles?: boolean;
  initialMeasuredAngles?: number[][];
}

/**
 * useAngleMeasurement - Manages angle measurement state and logic
 * 
 * Handles:
 * - Angle display toggles
 * - Measured angles array
 * - Angle clicking mode
 * - Toggle preset function (add/remove angles)
 * - Angle menu state
 */
export function useAngleMeasurement({
  initialShowAngles = true,
  initialMeasuredAngles = [[6, 8, 10], [12, 14, 16]], // Right elbow and right knee angles by default
}: UseAngleMeasurementProps = {}) {
  // Display State
  const [showAngles, setShowAngles] = useState(initialShowAngles);
  const [enableAngleClicking, setEnableAngleClicking] = useState(false);
  const [angleMenuOpen, setAngleMenuOpen] = useState(false);

  // Measurement State
  const [measuredAngles, setMeasuredAngles] = useState<Array<[number, number, number]>>(
    initialMeasuredAngles as [number, number, number][]
  );
  const [selectedAngleJoints, setSelectedAngleJoints] = useState<number[]>([]);

  /**
   * Toggle an angle preset - adds if not present, removes if already exists
   * Handles both forward and reverse angle orders
   */
  const toggleAnglePreset = useCallback(
    (angle: [number, number, number]) => {
      const [idxA, idxB, idxC] = angle;

      // Check if angle exists in either order
      const existingIndex = measuredAngles.findIndex(
        ([a, b, c]) =>
          (a === idxA && b === idxB && c === idxC) ||
          (a === idxC && b === idxB && c === idxA)
      );

      if (existingIndex !== -1) {
        // Remove existing angle
        setMeasuredAngles(measuredAngles.filter((_, i) => i !== existingIndex));
      } else {
        // Add new angle
        setMeasuredAngles([...measuredAngles, angle]);
      }
    },
    [measuredAngles]
  );

  /**
   * Clear all measured angles
   */
  const clearAllAngles = useCallback(() => {
    setMeasuredAngles([]);
    setSelectedAngleJoints([]);
  }, []);

  /**
   * Check if a specific angle is currently measured
   */
  const isAngleMeasured = useCallback(
    (angle: [number, number, number]): boolean => {
      const [idxA, idxB, idxC] = angle;
      return measuredAngles.some(
        ([a, b, c]) =>
          (a === idxA && b === idxB && c === idxC) ||
          (a === idxC && b === idxB && c === idxA)
      );
    },
    [measuredAngles]
  );

  return {
    // Display state
    showAngles,
    setShowAngles,
    enableAngleClicking,
    setEnableAngleClicking,
    angleMenuOpen,
    setAngleMenuOpen,

    // Measurement state
    measuredAngles,
    setMeasuredAngles,
    selectedAngleJoints,
    setSelectedAngleJoints,

    // Actions
    toggleAnglePreset,
    clearAllAngles,
    isAngleMeasured,
  };
}

