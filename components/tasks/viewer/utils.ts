export function formatSwingType(swingType: string): string {
  return swingType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function getSportColor(sport: string): "cyan" | "orange" | "green" {
  const colors: Record<string, "cyan" | "orange" | "green"> = {
    padel: "cyan",
    tennis: "orange",
    pickleball: "green",
  };
  return colors[sport] || "cyan";
}

import { PLAYER_CONFIG } from "./constants";

export function getFilteredPlayers(players: { player_id: number; swing_count: number }[]) {
  return players
    .filter(p => p.swing_count >= PLAYER_CONFIG.MIN_SWINGS_THRESHOLD)
    .sort((a, b) => b.swing_count - a.swing_count);
}

export function getPlayerIndex(
  players: { player_id: number; swing_count: number }[],
  playerId: number
): number {
  return getFilteredPlayers(players).findIndex(p => p.player_id === playerId) + 1;
}

// Get display name for a player (supports custom names)
export function getPlayerDisplayName(
  playerId: number,
  players: { player_id: number; swing_count: number }[],
  customNames?: Record<number, string>
): string {
  // Check for custom name first
  if (customNames?.[playerId]) {
    return customNames[playerId];
  }
  
  // Fall back to "Player N" based on filtered index
  const playerIndex = getPlayerIndex(players, playerId);
  return playerIndex > 0 ? `Player ${playerIndex}` : `P${playerId}`;
}

// Get player color by their display index (1-based)
export function getPlayerColor(displayIndex: number) {
  const colors = PLAYER_CONFIG.colors;
  return colors[(displayIndex - 1) % colors.length];
}

// Check if a player is valid (enough swings)
export function isValidPlayer(player: { swing_count: number }): boolean {
  return player.swing_count >= PLAYER_CONFIG.MIN_SWINGS_THRESHOLD;
}

