/**
 * Advanced Ball Tracking System
 * Tracks balls across frames with temporal smoothing and trajectory prediction
 */

export interface BallDetection {
  position: { x: number; y: number };
  confidence: number;
  size: number; // bbox width or height (average)
  timestamp: number;
  frame: number;
}

export interface BallTrajectory {
  positions: Array<{ x: number; y: number; frame: number; timestamp: number }>;
  velocity: { x: number; y: number; magnitude: number } | null;
  acceleration: { x: number; y: number } | null;
  predictedPath: Array<{ x: number; y: number; confidence: number }> | null;
}

export interface TrackedBall {
  current: BallDetection;
  trajectory: BallTrajectory;
  id: string;
  confidence: number; // Overall tracking confidence
  framesTracked: number;
  lastSeen: number;
}

export class BallTracker {
  private maxTrajectoryLength: number;
  private maxFrameGap: number; // Max frames to maintain track without detection
  private minDetectionsForTrack: number; // Min detections before considering it a valid track
  private trackedBalls: Map<string, TrackedBall>;
  private nextId: number;
  private videoFPS: number;

  constructor(options: {
    maxTrajectoryLength?: number;
    maxFrameGap?: number;
    minDetectionsForTrack?: number;
    videoFPS?: number;
  } = {}) {
    this.maxTrajectoryLength = options.maxTrajectoryLength || 30;
    this.maxFrameGap = options.maxFrameGap || 10;
    this.minDetectionsForTrack = options.minDetectionsForTrack || 3;
    this.videoFPS = options.videoFPS || 30;
    this.trackedBalls = new Map();
    this.nextId = 0;
  }

  /**
   * Update tracking with new detections
   */
  update(
    detections: Array<{
      bbox: { x: number; y: number; width: number; height: number };
      confidence: number;
    }>,
    currentFrame: number,
    currentTimestamp: number
  ): TrackedBall | null {
    // Convert detections to ball detections
    const ballDetections: BallDetection[] = detections.map(det => ({
      position: {
        x: det.bbox.x + det.bbox.width / 2,
        y: det.bbox.y + det.bbox.height / 2,
      },
      confidence: det.confidence,
      size: (det.bbox.width + det.bbox.height) / 2,
      timestamp: currentTimestamp,
      frame: currentFrame,
    }));

    // If no detections, predict based on existing tracks
    if (ballDetections.length === 0) {
      return this.handleNoDetection(currentFrame);
    }

    // Match detections to existing tracks
    const matchedBall = this.matchDetection(ballDetections, currentFrame, currentTimestamp);

    // Clean up old tracks
    this.cleanupOldTracks(currentFrame);

    return matchedBall;
  }

  /**
   * Match detection to existing track or create new one
   */
  private matchDetection(
    detections: BallDetection[],
    currentFrame: number,
    currentTimestamp: number
  ): TrackedBall | null {
    // For simplicity, track only one ball (most common case)
    // Can be extended for multi-ball tracking if needed
    
    if (detections.length === 0) return null;

    // Pick highest confidence detection
    const detection = detections.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    // Check if we have an existing track
    const existingTrack = this.getClosestTrack(detection.position, currentFrame);

    if (existingTrack) {
      // Update existing track
      return this.updateTrack(existingTrack, detection, currentFrame, currentTimestamp);
    } else {
      // Create new track
      return this.createTrack(detection, currentFrame, currentTimestamp);
    }
  }

  /**
   * Find closest existing track to a position
   */
  private getClosestTrack(
    position: { x: number; y: number },
    currentFrame: number
  ): TrackedBall | null {
    let closestTrack: TrackedBall | null = null;
    let closestDistance = Infinity;
    const maxDistance = 100; // Max pixels to consider a match

    this.trackedBalls.forEach((track) => {
      const frameGap = currentFrame - track.lastSeen;
      if (frameGap > this.maxFrameGap) return; // Track too old

      const lastPos = track.current.position;
      const distance = Math.sqrt(
        Math.pow(position.x - lastPos.x, 2) + Math.pow(position.y - lastPos.y, 2)
      );

      if (distance < closestDistance && distance < maxDistance) {
        closestDistance = distance;
        closestTrack = track;
      }
    });

    return closestTrack;
  }

  /**
   * Update existing track with new detection
   */
  private updateTrack(
    track: TrackedBall,
    detection: BallDetection,
    currentFrame: number,
    currentTimestamp: number
  ): TrackedBall {
    // Add position to trajectory
    track.trajectory.positions.push({
      x: detection.position.x,
      y: detection.position.y,
      frame: currentFrame,
      timestamp: currentTimestamp,
    });

    // Limit trajectory length
    if (track.trajectory.positions.length > this.maxTrajectoryLength) {
      track.trajectory.positions.shift();
    }

    // Update velocity and acceleration
    this.updateVelocity(track);
    this.updateAcceleration(track);

    // Update predicted path
    this.updatePrediction(track);

    // Update track properties
    track.current = detection;
    track.lastSeen = currentFrame;
    track.framesTracked++;
    track.confidence = this.calculateTrackConfidence(track);

    this.trackedBalls.set(track.id, track);
    return track;
  }

  /**
   * Create new track from detection
   */
  private createTrack(
    detection: BallDetection,
    currentFrame: number,
    currentTimestamp: number
  ): TrackedBall {
    const id = `ball_${this.nextId++}`;
    const track: TrackedBall = {
      current: detection,
      trajectory: {
        positions: [{
          x: detection.position.x,
          y: detection.position.y,
          frame: currentFrame,
          timestamp: currentTimestamp,
        }],
        velocity: null,
        acceleration: null,
        predictedPath: null,
      },
      id,
      confidence: detection.confidence,
      framesTracked: 1,
      lastSeen: currentFrame,
    };

    this.trackedBalls.set(id, track);
    return track;
  }

  /**
   * Calculate velocity from trajectory
   */
  private updateVelocity(track: TrackedBall): void {
    const positions = track.trajectory.positions;
    if (positions.length < 2) {
      track.trajectory.velocity = null;
      return;
    }

    // Use last two positions for velocity
    const p1 = positions[positions.length - 2];
    const p2 = positions[positions.length - 1];
    const dt = p2.timestamp - p1.timestamp;

    if (dt === 0) {
      track.trajectory.velocity = null;
      return;
    }

    const vx = (p2.x - p1.x) / dt;
    const vy = (p2.y - p1.y) / dt;
    const magnitude = Math.sqrt(vx * vx + vy * vy);

    track.trajectory.velocity = { x: vx, y: vy, magnitude };
  }

  /**
   * Calculate acceleration from velocity changes
   */
  private updateAcceleration(track: TrackedBall): void {
    const positions = track.trajectory.positions;
    if (positions.length < 3) {
      track.trajectory.acceleration = null;
      return;
    }

    // Calculate velocity at t-1 and t
    const p1 = positions[positions.length - 3];
    const p2 = positions[positions.length - 2];
    const p3 = positions[positions.length - 1];

    const dt1 = p2.timestamp - p1.timestamp;
    const dt2 = p3.timestamp - p2.timestamp;

    if (dt1 === 0 || dt2 === 0) {
      track.trajectory.acceleration = null;
      return;
    }

    const v1x = (p2.x - p1.x) / dt1;
    const v1y = (p2.y - p1.y) / dt1;
    const v2x = (p3.x - p2.x) / dt2;
    const v2y = (p3.y - p2.y) / dt2;

    const dt = (dt1 + dt2) / 2;
    const ax = (v2x - v1x) / dt;
    const ay = (v2y - v1y) / dt;

    track.trajectory.acceleration = { x: ax, y: ay };
  }

  /**
   * Predict future positions using physics
   */
  private updatePrediction(track: TrackedBall): void {
    if (!track.trajectory.velocity) {
      track.trajectory.predictedPath = null;
      return;
    }

    const lastPos = track.trajectory.positions[track.trajectory.positions.length - 1];
    const { velocity } = track.trajectory;
    const predictions: Array<{ x: number; y: number; confidence: number }> = [];

    // Predict next N frames
    const framesToPredict = 15;
    const frameTime = 1 / this.videoFPS;

    for (let i = 1; i <= framesToPredict; i++) {
      const t = i * frameTime;
      
      // Simple linear prediction (can be enhanced with parabolic motion)
      // For parabolic: add gravity acceleration
      const predictedX = lastPos.x + velocity.x * t;
      const predictedY = lastPos.y + velocity.y * t;

      // Confidence decreases with distance
      const confidence = Math.max(0, 1 - (i / framesToPredict));

      predictions.push({
        x: predictedX,
        y: predictedY,
        confidence,
      });
    }

    track.trajectory.predictedPath = predictions;
  }

  /**
   * Calculate overall track confidence
   */
  private calculateTrackConfidence(track: TrackedBall): number {
    // Confidence based on:
    // - Current detection confidence
    // - Number of frames tracked
    // - Consistency of motion

    const detectionConfidence = track.current.confidence;
    const trackLengthFactor = Math.min(track.framesTracked / this.minDetectionsForTrack, 1);
    
    // Motion consistency (velocity should be relatively stable)
    let motionConsistency = 1.0;
    if (track.trajectory.velocity) {
      const positions = track.trajectory.positions;
      if (positions.length >= 3) {
        // Check if velocity is consistent
        const recentPositions = positions.slice(-5);
        const velocities: number[] = [];
        
        for (let i = 1; i < recentPositions.length; i++) {
          const p1 = recentPositions[i - 1];
          const p2 = recentPositions[i];
          const dt = p2.timestamp - p1.timestamp;
          if (dt > 0) {
            const v = Math.sqrt(
              Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
            ) / dt;
            velocities.push(v);
          }
        }

        if (velocities.length > 0) {
          const avgVel = velocities.reduce((a, b) => a + b, 0) / velocities.length;
          const variance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVel, 2), 0) / velocities.length;
          const stdDev = Math.sqrt(variance);
          motionConsistency = avgVel > 0 ? Math.max(0, 1 - (stdDev / avgVel)) : 1;
        }
      }
    }

    return (detectionConfidence * 0.5 + trackLengthFactor * 0.3 + motionConsistency * 0.2);
  }

  /**
   * Handle frames with no detection
   */
  private handleNoDetection(currentFrame: number): TrackedBall | null {
    // Return most confident active track (if any)
    let bestTrack: TrackedBall | null = null;
    let bestConfidence = 0;

    this.trackedBalls.forEach((track) => {
      const frameGap = currentFrame - track.lastSeen;
      if (frameGap <= this.maxFrameGap && track.confidence > bestConfidence) {
        bestConfidence = track.confidence;
        bestTrack = track;
      }
    });

    return bestTrack;
  }

  /**
   * Clean up old tracks
   */
  private cleanupOldTracks(currentFrame: number): void {
    const toDelete: string[] = [];

    this.trackedBalls.forEach((track, id) => {
      const frameGap = currentFrame - track.lastSeen;
      if (frameGap > this.maxFrameGap) {
        toDelete.push(id);
      }
    });

    toDelete.forEach(id => this.trackedBalls.delete(id));
  }

  /**
   * Reset all tracks
   */
  reset(): void {
    this.trackedBalls.clear();
    this.nextId = 0;
  }

  /**
   * Get all active tracks
   */
  getAllTracks(): TrackedBall[] {
    return Array.from(this.trackedBalls.values());
  }

  /**
   * Update settings
   */
  updateSettings(settings: {
    maxTrajectoryLength?: number;
    videoFPS?: number;
  }): void {
    if (settings.maxTrajectoryLength !== undefined) {
      this.maxTrajectoryLength = settings.maxTrajectoryLength;
    }
    if (settings.videoFPS !== undefined) {
      this.videoFPS = settings.videoFPS;
    }
  }
}















