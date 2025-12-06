import type { BallSequenceType } from "@/types/tactical-analysis";
import { convertToTacticalData } from "@/types/tactical-analysis";
import type { PlayerShotData } from "../../../ShotHeatmap";

interface PlayerAnalysisData {
  playerName: string;
  playerId: number;
  ballTypes: Array<{
    ballType: BallSequenceType;
    ballLabel: string;
    playerData: ReturnType<typeof convertToTacticalData>;
  }>;
}

/**
 * Build player analysis data from all shots data
 */
export function buildPlayerAnalysisData(
  allShotsData: PlayerShotData[],
  label: string = "All Shots"
): PlayerAnalysisData[] {
  return allShotsData
    .filter(d => d.totalShots > 0)
    .map(playerData => ({
      playerName: playerData.displayName,
      playerId: playerData.playerId,
      ballTypes: [{
        ballType: "all-shots" as BallSequenceType,
        ballLabel: label,
        playerData: convertToTacticalData(playerData),
      }],
    }));
}

/**
 * Build ball sequence analysis data from all ball types
 */
export function buildBallSequenceData(
  serveData: PlayerShotData[],
  returnData: PlayerShotData[],
  thirdBallData: PlayerShotData[],
  fourthBallData: PlayerShotData[],
  fifthBallData: PlayerShotData[]
): PlayerAnalysisData[] {
  const allPlayerIds = new Set<number>();
  
  [...serveData, ...returnData, ...thirdBallData, ...fourthBallData, ...fifthBallData].forEach(d => {
    if (d.totalShots > 0) allPlayerIds.add(d.playerId);
  });
  
  return Array.from(allPlayerIds).sort((a, b) => a - b).map(playerId => {
    const servePlayer = serveData.find(d => d.playerId === playerId);
    const returnPlayer = returnData.find(d => d.playerId === playerId);
    const thirdPlayer = thirdBallData.find(d => d.playerId === playerId);
    const fourthPlayer = fourthBallData.find(d => d.playerId === playerId);
    const fifthPlayer = fifthBallData.find(d => d.playerId === playerId);
    
    const playerName = servePlayer?.displayName || returnPlayer?.displayName || `Player ${playerId}`;
    
    const ballTypes = [
      servePlayer && servePlayer.totalShots > 0 
        ? { ballType: "serve" as BallSequenceType, ballLabel: "Serve", playerData: convertToTacticalData(servePlayer) } 
        : null,
      returnPlayer && returnPlayer.totalShots > 0 
        ? { ballType: "return" as BallSequenceType, ballLabel: "Return", playerData: convertToTacticalData(returnPlayer) } 
        : null,
      thirdPlayer && thirdPlayer.totalShots > 0 
        ? { ballType: "third-ball" as BallSequenceType, ballLabel: "Third Ball", playerData: convertToTacticalData(thirdPlayer) } 
        : null,
      fourthPlayer && fourthPlayer.totalShots > 0 
        ? { ballType: "fourth-ball" as BallSequenceType, ballLabel: "Fourth Ball", playerData: convertToTacticalData(fourthPlayer) } 
        : null,
      fifthPlayer && fifthPlayer.totalShots > 0 
        ? { ballType: "fifth-ball" as BallSequenceType, ballLabel: "Fifth Ball", playerData: convertToTacticalData(fifthPlayer) } 
        : null,
    ].filter(Boolean) as Array<{ ballType: BallSequenceType; ballLabel: string; playerData: ReturnType<typeof convertToTacticalData> }>;
    
    return {
      playerName,
      playerId,
      ballTypes,
    };
  }).filter(p => p.ballTypes.length > 0);
}

