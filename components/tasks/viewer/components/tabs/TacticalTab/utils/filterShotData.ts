import type { PlayerShotData, ShotPair, CellShotInfo } from "../../../ShotHeatmap";

/**
 * Extract unique swing types from player shot data
 */
export function extractSwingTypes(data: PlayerShotData[]): string[] {
  const swingTypes = new Set<string>();
  data.forEach((player: PlayerShotData) => {
    player.pairs.forEach((pair: ShotPair) => {
      if (pair.swingType) {
        swingTypes.add(pair.swingType);
      }
    });
  });
  return Array.from(swingTypes).sort();
}

/**
 * Filter player shot data by swing type
 */
export function filterBySwingType(
  data: PlayerShotData[],
  swingType: string | null
): PlayerShotData[] {
  if (!swingType) return data;
  
  return data.map((player: PlayerShotData) => {
    const filteredPairs = player.pairs.filter((p: ShotPair) => p.swingType === swingType);
    
    if (filteredPairs.length === 0) {
      return {
        ...player,
        origins: player.origins.map((row: number[]) => row.map(() => 0)),
        landings: player.landings.map((row: number[]) => row.map(() => 0)),
        pairs: [],
        originDetails: player.originDetails?.map((row: CellShotInfo[][]) => row.map(() => [])) || [],
        landingDetails: player.landingDetails?.map((row: CellShotInfo[][]) => row.map(() => [])) || [],
        avgSpeed: 0,
        topSpeed: 0,
        totalShots: 0,
      };
    }
    
    // Rebuild grids from filtered pairs
    const origins = player.origins.map((row: number[]) => row.map(() => 0));
    const landings = player.landings.map((row: number[]) => row.map(() => 0));
    const originDetails = player.origins.map((row: number[]) => row.map(() => [] as CellShotInfo[]));
    const landingDetails = player.landings.map((row: number[]) => row.map(() => [] as CellShotInfo[]));
    
    let totalSpeed = 0;
    let topSpeed = 0;
    
    filteredPairs.forEach((pair: ShotPair) => {
      origins[pair.originRow][pair.originCol]++;
      landings[pair.landingRow][pair.landingCol]++;
      
      originDetails[pair.originRow][pair.originCol].push({
        swingType: pair.swingType,
        speed: pair.speed,
        isOrigin: true,
      });
      landingDetails[pair.landingRow][pair.landingCol].push({
        swingType: pair.swingType,
        speed: pair.speed,
        isOrigin: false,
      });
      
      if (pair.speed > 0) {
        totalSpeed += pair.speed;
        topSpeed = Math.max(topSpeed, pair.speed);
      }
    });
    
    const avgSpeed = filteredPairs.length > 0 ? totalSpeed / filteredPairs.length : 0;
    
    return {
      ...player,
      origins,
      landings,
      pairs: filteredPairs,
      originDetails,
      landingDetails,
      avgSpeed,
      topSpeed,
      totalShots: filteredPairs.length,
    };
  });
}

