"use client";

import { useState, useRef, useEffect, RefObject } from "react";
import { Box, Flex, Text, Button, Select } from "@radix-ui/themes";
import { Cross2Icon, CheckIcon, ResetIcon } from "@radix-ui/react-icons";

// Known court reference points (in meters)
// Padel court: 10m wide x 20m long, net at center (y=10)
const COURT_REFERENCE_POINTS: Record<string, { x: number; y: number; label: string }> = {
  // Back wall corners (y=0)
  "back-left": { x: 0, y: 0, label: "Back wall - Left corner" },
  "back-right": { x: 10, y: 0, label: "Back wall - Right corner" },
  // Service line near back (y=3)
  "service-back-left": { x: 0, y: 3, label: "Service line (back) - Left" },
  "service-back-right": { x: 10, y: 3, label: "Service line (back) - Right" },
  "service-back-center": { x: 5, y: 3, label: "Service line (back) - Center" },
  // Net (y=10)
  "net-left": { x: 0, y: 10, label: "Net - Left post" },
  "net-right": { x: 10, y: 10, label: "Net - Right post" },
  "net-center": { x: 5, y: 10, label: "Net - Center" },
  // Service line near front (y=17)
  "service-front-left": { x: 0, y: 17, label: "Service line (front) - Left" },
  "service-front-right": { x: 10, y: 17, label: "Service line (front) - Right" },
  "service-front-center": { x: 5, y: 17, label: "Service line (front) - Center" },
  // Front wall corners (y=20)
  "front-left": { x: 0, y: 20, label: "Front wall - Left corner" },
  "front-right": { x: 10, y: 20, label: "Front wall - Right corner" },
};

interface CalibrationPoint {
  videoX: number; // Normalized 0-1
  videoY: number; // Normalized 0-1
  courtX: number; // Meters
  courtY: number; // Meters
  label: string;
}

interface CourtCalibrationProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onCalibrationComplete: (matrix: number[][]) => void;
  onClose: () => void;
}

// Calculate homography matrix using 4+ point pairs
// Uses Direct Linear Transform (DLT) algorithm
function calculateHomography(points: CalibrationPoint[]): number[][] | null {
  if (points.length < 4) return null;

  // Build the matrix equation Ah = 0
  // For each point pair, we get 2 equations
  const A: number[][] = [];

  for (const p of points) {
    const { videoX: u, videoY: v, courtX: x, courtY: y } = p;
    // Scale video coords to match court scale for numerical stability
    const su = u * 10;
    const sv = v * 20;

    A.push([-x, -y, -1, 0, 0, 0, su * x, su * y, su]);
    A.push([0, 0, 0, -x, -y, -1, sv * x, sv * y, sv]);
  }

  // Solve using SVD (simplified: use least squares for 4 points)
  // For exactly 4 points, we can solve directly
  if (points.length === 4) {
    // Simplified 4-point solution using perspective transform formulas
    const src = points.map(p => [p.videoX * 10, p.videoY * 20]);
    const dst = points.map(p => [p.courtX, p.courtY]);

    // Calculate perspective transform matrix
    const matrix = computePerspectiveTransform(src, dst);
    return matrix;
  }

  // For more points, use least squares (simplified version)
  return computePerspectiveTransform(
    points.map(p => [p.videoX * 10, p.videoY * 20]),
    points.map(p => [p.courtX, p.courtY])
  );
}

// Compute perspective transform from 4 point pairs
function computePerspectiveTransform(src: number[][], dst: number[][]): number[][] {
  // Using the standard 8-parameter perspective transform
  // Maps (x,y) -> (x',y') where:
  // x' = (a*x + b*y + c) / (g*x + h*y + 1)
  // y' = (d*x + e*y + f) / (g*x + h*y + 1)

  const n = src.length;
  if (n < 4) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; // Identity

  // Build system of equations
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < n; i++) {
    const [x, y] = src[i];
    const [xp, yp] = dst[i];

    A.push([x, y, 1, 0, 0, 0, -xp * x, -xp * y]);
    A.push([0, 0, 0, x, y, 1, -yp * x, -yp * y]);
    b.push(xp);
    b.push(yp);
  }

  // Solve using normal equations (A^T * A * h = A^T * b)
  const h = solveLinearSystem(A, b);
  if (!h) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

  // Construct 3x3 matrix
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1],
  ];
}

// Simple linear system solver using Gaussian elimination
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const m = A[0].length;

  // Augmented matrix
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  // Forward elimination
  for (let col = 0; col < m; col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    if (Math.abs(aug[col][col]) < 1e-10) continue;

    // Eliminate
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= m; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Back substitution
  const x = new Array(m).fill(0);
  for (let i = m - 1; i >= 0; i--) {
    if (Math.abs(aug[i][i]) < 1e-10) continue;
    x[i] = aug[i][m];
    for (let j = i + 1; j < m; j++) {
      x[i] -= aug[i][j] * x[j];
    }
    x[i] /= aug[i][i];
  }

  return x;
}

export function CourtCalibration({ videoRef, onCalibrationComplete, onClose }: CourtCalibrationProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<CalibrationPoint[]>([]);
  const [pendingClick, setPendingClick] = useState<{ x: number; y: number } | null>(null);
  const [selectedPointType, setSelectedPointType] = useState<string>("service-back-left");
  const [error, setError] = useState<string | null>(null);

  // Handle click on video overlay
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setPendingClick({ x, y });
  };

  // Confirm the pending point with selected type
  const confirmPoint = () => {
    if (!pendingClick) return;

    const refPoint = COURT_REFERENCE_POINTS[selectedPointType];
    if (!refPoint) return;

    // Check if this point type is already used
    if (points.some(p => p.label === refPoint.label)) {
      setError("This point is already marked. Choose a different one.");
      return;
    }

    const newPoint: CalibrationPoint = {
      videoX: pendingClick.x,
      videoY: pendingClick.y,
      courtX: refPoint.x,
      courtY: refPoint.y,
      label: refPoint.label,
    };

    setPoints([...points, newPoint]);
    setPendingClick(null);
    setError(null);
  };

  // Remove a point
  const removePoint = (index: number) => {
    setPoints(points.filter((_, i) => i !== index));
  };

  // Reset all points
  const resetPoints = () => {
    setPoints([]);
    setPendingClick(null);
    setError(null);
  };

  // Complete calibration
  const completeCalibration = () => {
    if (points.length < 4) {
      setError("Need at least 4 points for calibration");
      return;
    }

    const matrix = calculateHomography(points);
    if (!matrix) {
      setError("Failed to calculate calibration. Try different points.");
      return;
    }

    onCalibrationComplete(matrix);
  };

  // Pause video when calibration opens
  useEffect(() => {
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [videoRef]);

  return (
    <Box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 200,
      }}
    >
      {/* Semi-transparent overlay for clicking */}
      <Box
        ref={overlayRef}
        onClick={handleOverlayClick}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          cursor: "crosshair",
          backgroundColor: "rgba(0, 0, 0, 0.15)",
        }}
      >
        {/* Draw marked points */}
        {points.map((point, idx) => (
          <Box
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              removePoint(idx);
            }}
            style={{
              position: "absolute",
              left: `${point.videoX * 100}%`,
              top: `${point.videoY * 100}%`,
              transform: "translate(-50%, -50%)",
              cursor: "pointer",
            }}
          >
            {/* Crosshair */}
            <Box
              style={{
                position: "absolute",
                width: "20px",
                height: "2px",
                backgroundColor: "#7ADB8F",
                left: "-10px",
                top: "-1px",
              }}
            />
            <Box
              style={{
                position: "absolute",
                width: "2px",
                height: "20px",
                backgroundColor: "#7ADB8F",
                left: "-1px",
                top: "-10px",
              }}
            />
            {/* Circle */}
            <Box
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#7ADB8F",
                border: "2px solid white",
                transform: "translate(-50%, -50%)",
                position: "absolute",
                left: 0,
                top: 0,
              }}
            />
            {/* Label */}
            <Text
              size="1"
              style={{
                position: "absolute",
                left: "10px",
                top: "-8px",
                backgroundColor: "rgba(0,0,0,0.8)",
                color: "#7ADB8F",
                padding: "2px 6px",
                borderRadius: "4px",
                whiteSpace: "nowrap",
                fontSize: "10px",
              }}
            >
              {idx + 1}. {point.label}
            </Text>
          </Box>
        ))}

        {/* Pending click marker */}
        {pendingClick && (
          <Box
            style={{
              position: "absolute",
              left: `${pendingClick.x * 100}%`,
              top: `${pendingClick.y * 100}%`,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}
          >
            <Box
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                border: "3px solid #FFD700",
                backgroundColor: "rgba(255, 215, 0, 0.3)",
              }}
            />
          </Box>
        )}
      </Box>

      {/* Control Panel - Compact */}
      <Box
        style={{
          position: "absolute",
          top: "4px",
          left: "4px",
          right: "4px",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          borderRadius: "var(--radius-2)",
          padding: "6px 10px",
          zIndex: 201,
        }}
      >
        <Flex align="center" justify="between" gap="2">
          <Flex align="center" gap="2" style={{ flex: 1 }}>
            <Text size="1" style={{ color: "#7ADB8F" }}>
              Click on the video and mark at least 4 court reference points.
            </Text>
            {points.length > 0 && (
              <Text size="1" style={{ color: "white" }}>({points.length} marked)</Text>
            )}
          </Flex>
          
          <Flex align="center" gap="1">
            <Button 
              size="1" 
              variant="ghost" 
              onClick={resetPoints} 
              disabled={points.length === 0}
              style={{ color: "#7ADB8F", padding: "2px 8px", fontSize: "11px" }}
            >
              Reset
            </Button>
            <Button
              size="1"
              onClick={completeCalibration}
              disabled={points.length < 4}
              style={{
                backgroundColor: points.length >= 4 ? "#7ADB8F" : "transparent",
                color: points.length >= 4 ? "black" : "#7ADB8F",
                border: points.length < 4 ? "1px solid #7ADB8F" : "none",
                padding: "2px 8px",
                fontSize: "11px",
              }}
            >
              Apply
            </Button>
            <Button 
              size="1" 
              variant="ghost" 
              onClick={onClose}
              style={{ padding: "2px 4px" }}
            >
              <Cross2Icon width={12} height={12} />
            </Button>
          </Flex>
        </Flex>

        {/* Point type selector - inline when pending */}
        {pendingClick && (
          <Flex gap="2" align="center" style={{ marginTop: "6px" }}>
            <Text size="1" style={{ color: "white" }}>This point is:</Text>
            <Select.Root value={selectedPointType} onValueChange={setSelectedPointType}>
              <Select.Trigger style={{ minWidth: "180px", height: "24px", fontSize: "11px" }} />
              <Select.Content>
                {Object.entries(COURT_REFERENCE_POINTS).map(([key, point]) => (
                  <Select.Item key={key} value={key} disabled={points.some(p => p.label === point.label)}>
                    {point.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <Button size="1" onClick={confirmPoint} style={{ backgroundColor: "#7ADB8F", color: "black", padding: "2px 8px", fontSize: "11px" }}>
              Confirm
            </Button>
          </Flex>
        )}

        {error && (
          <Text size="1" style={{ color: "var(--red-9)", marginTop: "4px" }}>{error}</Text>
        )}
      </Box>
    </Box>
  );
}

// Transform a point using the homography matrix
export function transformPoint(matrix: number[][], videoX: number, videoY: number): { x: number; y: number } {
  // Scale video coords to match what we used in calibration
  const u = videoX * 10;
  const v = videoY * 20;

  const w = matrix[2][0] * u + matrix[2][1] * v + matrix[2][2];
  const x = (matrix[0][0] * u + matrix[0][1] * v + matrix[0][2]) / w;
  const y = (matrix[1][0] * u + matrix[1][1] * v + matrix[1][2]) / w;

  return { x, y };
}

