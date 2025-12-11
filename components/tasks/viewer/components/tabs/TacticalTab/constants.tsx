import { TargetIcon, StackIcon, LayersIcon, GridIcon } from "@radix-ui/react-icons";
import type { SubTabConfig, BallTabConfig } from "./types";

export const SUB_TABS: SubTabConfig[] = [
  { 
    id: "all-shots", 
    label: "All Shots", 
    icon: <LayersIcon width={16} height={16} />,
    description: "Shot placement overview for all players"
  },
  { 
    id: "ball-sequence", 
    label: "Ball Sequence", 
    icon: <StackIcon width={16} height={16} />,
    description: "Analyze shot patterns through the rally sequence"
  },
  { 
    id: "court-dominance", 
    label: "Court Dominance", 
    icon: <GridIcon width={16} height={16} />,
    description: "Player positioning and territory control"
  },
];

export const BALL_TABS: BallTabConfig[] = [
  { 
    id: 1, 
    label: "1st", 
    name: "Serve", 
    description: "Where each player serves from and to", 
    originLabel: "Serve position", 
    countLabel: "serve", 
    ballType: "serve" 
  },
  { 
    id: 2, 
    label: "2nd", 
    name: "Return", 
    description: "Where each player returns serves", 
    originLabel: "Return position", 
    countLabel: "return", 
    ballType: "return" 
  },
  { 
    id: 3, 
    label: "3rd", 
    name: "Third Ball", 
    description: "Server's first shot after return", 
    originLabel: "Shot position", 
    countLabel: "shot", 
    ballType: "third-ball" 
  },
  { 
    id: 4, 
    label: "4th", 
    name: "Fourth Ball", 
    description: "Returner's second shot", 
    originLabel: "Shot position", 
    countLabel: "shot", 
    ballType: "fourth-ball" 
  },
  { 
    id: 5, 
    label: "5th", 
    name: "Fifth Ball", 
    description: "Server's second shot after serve", 
    originLabel: "Shot position", 
    countLabel: "shot", 
    ballType: "fifth-ball" 
  },
];



