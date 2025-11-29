import { useState, useEffect, useRef } from "react";
import { CONFIG } from "../constants";
import { StatisticsResult, ActiveEventTooltip } from "../types";
import { formatSwingType, getPlayerIndex } from "../utils";

export function useEventTooltip(
  result: StatisticsResult | null,
  selectedRallyIndex: number | null,
  currentTime: number
) {
  const [activeEventTooltip, setActiveEventTooltip] = useState<ActiveEventTooltip | null>(null);
  const lastTriggeredEventRef = useRef<string | null>(null);

  useEffect(() => {
    if (!result || selectedRallyIndex === null) return;
    
    const rallies = result.rallies || [];
    const players = result.players || [];
    
    if (!rallies[selectedRallyIndex]) return;

    const [rallyStart, rallyEnd] = rallies[selectedRallyIndex];
    const rallyDuration = rallyEnd - rallyStart;

    const rallySwings = players
      .filter(p => p.swing_count >= 10)
      .flatMap(player =>
        player.swings
          .filter(s => s.ball_hit.timestamp >= rallyStart && s.ball_hit.timestamp <= rallyEnd)
          .map(s => ({ ...s, player_id: player.player_id }))
      );

    for (const swing of rallySwings) {
      const eventId = `swing-${swing.ball_hit.timestamp}`;
      if (Math.abs(currentTime - swing.ball_hit.timestamp) < CONFIG.EVENT_TOOLTIP_THRESHOLD) {
        if (lastTriggeredEventRef.current !== eventId) {
          lastTriggeredEventRef.current = eventId;
          const playerIndex = getPlayerIndex(players, swing.player_id);
          const speed = swing.ball_speed ? `${Math.round(swing.ball_speed)} km/h` : "";
          const position = ((swing.ball_hit.timestamp - rallyStart) / rallyDuration) * 100;

          setActiveEventTooltip({
            text: `P${playerIndex} – ${formatSwingType(swing.swing_type)}${speed ? ` – ${speed}` : ""}`,
            position,
            id: eventId,
          });

          setTimeout(() => {
            setActiveEventTooltip(prev => (prev?.id === eventId ? null : prev));
          }, CONFIG.EVENT_TOOLTIP_DURATION);
        }
        break;
      }
    }
  }, [currentTime, result, selectedRallyIndex]);

  return activeEventTooltip;
}

