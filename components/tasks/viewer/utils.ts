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

export function getFilteredPlayers(players: { player_id: number; swing_count: number }[]) {
  return players
    .filter(p => p.swing_count >= 10)
    .sort((a, b) => b.swing_count - a.swing_count);
}

export function getPlayerIndex(
  players: { player_id: number; swing_count: number }[],
  playerId: number
): number {
  return getFilteredPlayers(players).findIndex(p => p.player_id === playerId) + 1;
}

