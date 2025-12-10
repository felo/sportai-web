import {
  RocketIcon,
  TimerIcon,
  CheckCircledIcon,
  ArrowTopRightIcon,
  LockClosedIcon,
  ViewGridIcon,
  ShuffleIcon,
} from "@radix-ui/react-icons";
import type { AttributeConfig } from "../types";

// Attribute display config with friendly explanations
export const ATTRIBUTE_CONFIG: Record<string, AttributeConfig> = {
  power: {
    icon: RocketIcon,
    label: "Power",
    description: "How hard you hit. Based on your ball speed and smashes.",
  },
  agility: {
    icon: TimerIcon,
    label: "Agility",
    description: "Your speed score. How fast you sprint and move around the court.",
  },
  consistency: {
    icon: CheckCircledIcon,
    label: "Consistency",
    description: "Shot reliability. How consistent and repeatable your shots are.",
  },
  attack: {
    icon: ArrowTopRightIcon,
    label: "Attack",
    description: "Offensive pressure. Your aggressive shots, smashes, and net plays.",
  },
  defense: {
    icon: LockClosedIcon,
    label: "Defense",
    description: "Defensive ability. Your lobs, defensive saves, and rally endurance.",
  },
  coverage: {
    icon: ViewGridIcon,
    label: "Coverage",
    description: "Court coverage. How much ground you cover and your positioning.",
  },
  variety: {
    icon: ShuffleIcon,
    label: "Variety",
    description: "Shot diversity. Your range of different shot types and unpredictability.",
  },
};


