import type { PlayerProfile } from "@/types/player-profile";
import { ATTRIBUTE_CONFIG } from "../constants";

/**
 * Convert profiles to radar data format for Nivo
 */
export function toRadarData(
  profiles: PlayerProfile[]
): Array<{ attribute: string; [key: string]: number | string }> {
  const attributeKeys: (keyof typeof ATTRIBUTE_CONFIG)[] = [
    "power",
    "agility",
    "consistency",
    "attack",
    "defense",
    "coverage",
    "variety",
  ];

  return attributeKeys.map((key) => {
    const config = ATTRIBUTE_CONFIG[key];
    const dataPoint: { attribute: string; [key: string]: number | string } = {
      attribute: `${config.emoji} ${config.label}`,
    };
    profiles.forEach((profile) => {
      dataPoint[profile.playerName] = profile.attributes[key as keyof typeof profile.attributes];
    });
    return dataPoint;
  });
}


