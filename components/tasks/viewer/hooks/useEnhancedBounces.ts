import { useMemo } from "react";
import { StatisticsResult, BallBounce, SwingWithPlayer } from "../types";

interface UseEnhancedBouncesOptions {
  inferSwingBounces: boolean;
  inferTrajectoryBounces: boolean;
}

// Helper to calculate angle between two vectors (in degrees)
function angleBetweenVectors(v1x: number, v1y: number, v2x: number, v2y: number): number {
  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

export function useEnhancedBounces(
  result: StatisticsResult | null,
  allSwings: SwingWithPlayer[],
  options: UseEnhancedBouncesOptions
): BallBounce[] {
  const { inferSwingBounces, inferTrajectoryBounces } = options;

  return useMemo(() => {
    const originalBounces = result?.ball_bounces || [];
    const syntheticBounces: BallBounce[] = [];
    
    if (!result?.ball_positions) {
      return originalBounces;
    }
    
    // 1. Infer swing bounces (at hit time)
    if (inferSwingBounces) {
      for (const swing of allSwings) {
        // Only for swings with velocity data
        if (!swing.ball_speed || swing.ball_speed <= 0) continue;
        
        const hitTime = swing.ball_hit.timestamp;
        
        // Check if bounce already exists at this time
        const existingBounce = originalBounces.find(
          b => Math.abs(b.timestamp - hitTime) < 0.15 && b.type === "swing"
        );
        if (existingBounce) continue;
        
        // Find ball position at hit time
        let closestPos = result.ball_positions[0];
        let closestDiff = Math.abs(result.ball_positions[0]?.timestamp - hitTime);
        
        for (const pos of result.ball_positions) {
          const diff = Math.abs(pos.timestamp - hitTime);
          if (diff < closestDiff) {
            closestDiff = diff;
            closestPos = pos;
          }
          if (pos.timestamp > hitTime + 0.2) break;
        }
        
        if (closestPos && closestDiff < 0.15) {
          syntheticBounces.push({
            timestamp: hitTime,
            court_pos: [closestPos.X, closestPos.Y],
            player_id: swing.player_id,
            type: "swing",
          });
        }
      }
    }
    
    // 2. Infer bounces from ball trajectory (velocity change + angle detection)
    if (inferTrajectoryBounces) {
      const positions = result.ball_positions;
      const allBounceTimestamps = [...originalBounces, ...syntheticBounces].map(b => b.timestamp);
      
      const yVelocityThreshold = 0.5;
      const xVelocityThreshold = 0.3;
      const SHARP_ANGLE_THRESHOLD = 55; // degrees
      
      for (let i = 2; i < positions.length - 2; i++) {
        const prev1 = positions[i - 1];
        const curr = positions[i];
        const next1 = positions[i + 1];
        
        // Check if a bounce already exists near this time
        const nearExisting = allBounceTimestamps.some(
          t => Math.abs(t - curr.timestamp) < 0.2
        );
        if (nearExisting) continue;
        
        // Calculate direction vectors
        const incomingX = curr.X - prev1.X;
        const incomingY = curr.Y - prev1.Y;
        const outgoingX = next1.X - curr.X;
        const outgoingY = next1.Y - curr.Y;
        
        // Calculate angle change
        const angleChange = angleBetweenVectors(incomingX, incomingY, outgoingX, outgoingY);
        
        // Calculate Y velocities
        const velYBefore = incomingY / (curr.timestamp - prev1.timestamp);
        const velYAfter = outgoingY / (next1.timestamp - curr.timestamp);
        
        // Calculate X velocities
        const velXBefore = incomingX / (curr.timestamp - prev1.timestamp);
        const velXAfter = outgoingX / (next1.timestamp - curr.timestamp);
        
        let bounceType: string | null = null;
        
        // Method 1: Velocity-based detection
        if (velYBefore > yVelocityThreshold && velYAfter < -yVelocityThreshold * 0.3) {
          if (curr.Y > 0.1 && curr.Y < 0.95) {
            bounceType = "inferred"; // Floor bounce
          }
        } else if (
          (velXBefore > xVelocityThreshold && velXAfter < -xVelocityThreshold * 0.5) ||
          (velXBefore < -xVelocityThreshold && velXAfter > xVelocityThreshold * 0.5)
        ) {
          if (curr.X < 0.15 || curr.X > 0.85) {
            bounceType = "inferred_wall";
          }
        }
        
        // Method 2: Sharp angle detection
        if (!bounceType && angleChange > SHARP_ANGLE_THRESHOLD) {
          if (curr.X < 0.15 || curr.X > 0.85) {
            bounceType = "inferred_wall";
          } else if (curr.Y > 0.5) {
            bounceType = "inferred";
          } else {
            bounceType = "inferred";
          }
        }
        
        if (bounceType) {
          syntheticBounces.push({
            timestamp: curr.timestamp,
            court_pos: [curr.X, curr.Y],
            player_id: -1,
            type: bounceType,
          });
          
          allBounceTimestamps.push(curr.timestamp);
          i += 3; // Skip ahead to avoid duplicates
        }
      }
    }
    
    // 3. Post-process: Reclassify bounces that lead to court-crossing as swings
    const allBounces = [...originalBounces, ...syntheticBounces];
    allBounces.sort((a, b) => a.timestamp - b.timestamp);
    
    const COURT_CENTER_Y = 0.5;
    
    for (let i = 0; i < allBounces.length - 1; i++) {
      const curr = allBounces[i];
      const next = allBounces[i + 1];
      
      if (curr.type !== "inferred" && curr.type !== "inferred_wall") continue;
      
      const currY = curr.court_pos[1];
      const nextY = next.court_pos[1];
      
      const currSide = currY > COURT_CENTER_Y ? "near" : "far";
      const nextSide = nextY > COURT_CENTER_Y ? "near" : "far";
      
      if (currSide !== nextSide) {
        const hasSwingBetween = allSwings.some(
          s => s.ball_hit.timestamp > curr.timestamp && s.ball_hit.timestamp < next.timestamp
        );
        
        if (!hasSwingBetween) {
          curr.type = "inferred_swing";
        }
      }
    }
    
    return allBounces;
  }, [result, allSwings, inferSwingBounces, inferTrajectoryBounces]);
}

// Extract all swings from all players with player_id attached
// Filters out swings not in a rally
export function useAllSwings(result: StatisticsResult | null): SwingWithPlayer[] {
  return useMemo(() => {
    if (!result || !result.players) return [];
    return result.players.flatMap(player =>
      player.swings
        .filter(swing => swing.is_in_rally !== false)
        .map(swing => ({
          ...swing,
          player_id: player.player_id,
        }))
    );
  }, [result]);
}








